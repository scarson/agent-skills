# C++ performance module: Templates & metaprogramming (instantiation bloat, type erasure, CRTP, constexpr)
> Load when heavy templates/metaprogramming is material — header-only/heavily-templated libraries, deep instantiation, CRTP, `constexpr`/`consteval`, type erasure, expression templates — see the module map in `../cpp.md`. Core lanes + Compiler, build & ABI notes live in `../cpp.md`; this file is the templates & metaprogramming lens only.

## Templates & metaprogramming (instantiation bloat, type erasure, CRTP, constexpr)

> Scope: the cost model of C++ templates and compile-time programming — code generated per
> instantiation, type erasure (`std::function`/`std::any`/virtual dispatch) versus static
> polymorphism (templates/CRTP), `constexpr`/`consteval`/`constinit`, expression templates, and
> the abstraction layers the optimizer must see through to deliver zero overhead.
> The defining theme is that templates have **three** cost axes, not one: compile time, binary
> size (which becomes runtime i-cache pressure), and runtime — and the axes trade against each
> other, so a finding must name which one it hits. The second theme is calibration: well-written
> templates are genuinely zero-overhead at runtime, so this lens steers toward the cases with a
> *measurable* size/compile/i-cache consequence and away from manufacturing style nits.
> Cross-reference the core **Compiler, build & ABI notes** and **Payload / startup / build** lane
> in `../cpp.md` (cross-TU inlining, debug-build slowness), the **build-toolchain** module
> (PCH/modules/`extern template`/LTO), and the **numeric-simd** module (expression templates).

- **Instantiation bloat is a binary-size and i-cache cost, not a per-call cost.** The same template
  body instantiated over many distinct type arguments produces a separate copy of the generated code
  for each — `sort<int>`, `sort<MyStruct>`, `vector<T>::push_back` for every `T`. Each copy is
  individually fast (often faster than a type-erased equivalent because it inlines and specializes),
  so the runtime hit is not at the call site; it is the aggregate code volume pushing the working set
  out of the instruction cache and inflating the binary, link time, and startup. Find it empirically,
  never by eyeballing: `bloaty` or `nm --size-sort`/`nm -C` on the release binary to attribute size to
  mangled instantiations, and `-ftime-trace` (Clang) / `templight` to attribute *compile* time to
  template instantiation. The lever is reducing the *number of distinct instantiations* (hoist
  type-independent code out of the template body into a non-template base, or erase the type at a
  cold boundary), not abandoning templates (verify against the currency brief for your version).

- **Header re-parse and re-instantiate is paid per translation unit.** A heavily-templated or
  header-only library is compiled afresh in every `.cpp` that includes it: the compiler re-parses the
  headers and re-instantiates every template the TU touches, and the linker later folds the duplicate
  instantiations (COMDAT) — so the *compile* cost multiplies by TU count while the binary keeps one
  copy. This is the dominant compile-time scaling problem of template-heavy codebases and is a
  first-class performance surface (build time is a deliverable). The durable mitigations — precompiled
  headers, C++20 modules, and `extern template` to suppress the redundant per-TU instantiation — live
  in the **build-toolchain** module; flag the *symptom* here (a large templated header pulled into
  many TUs) and route the fix there. `-ftime-trace` aggregated across the build, or a build profiler,
  quantifies it (verify against the currency brief for your version).

- **`extern template` declares "do not instantiate here — it exists elsewhere."** When a small set of
  template instantiations dominates compile time across many TUs, an `extern template class
  Foo<int>;` declaration in a header suppresses instantiation in every including TU, paired with one
  explicit `template class Foo<int>;` definition in a single `.cpp`. This is a targeted compile-time
  and binary-size lever: it trades the COMDAT-folding work (every TU instantiates, linker discards
  duplicates) for one instantiation total, at the cost of losing cross-TU inlining of those members
  unless LTO is on. Worth recommending only when profiling shows a specific heavy instantiation is
  re-paid widely — not as blanket policy (cross-reference the **build-toolchain** module; verify
  against the currency brief for your version).

- **Type erasure (`std::function`/`std::any`) costs an allocation, an indirect call, and an inlining
  barrier.** The core memory lane already names the heap allocation when captured state exceeds the
  small-buffer size and the indirect call. The deeper point for this lens: the indirect call through
  the type-erased boundary is **opaque to the optimizer** — it cannot inline through it or propagate
  constants across it, so it loses not just the call itself but every downstream optimization the
  inlined body would have enabled (this is often the larger cost). A template callable parameter
  (`template<class F> void f(F&&)`) or a non-owning `function_ref` keeps the concrete type visible and
  inlinable; the trade is that the template form generates a fresh instantiation per callable type
  (instantiation bloat) and cannot be stored heterogeneously in a container or crossed over an ABI
  boundary. Erasure is the right tool when you genuinely need heterogeneous storage, a stable ABI, or
  to break a template from spreading — reach for it deliberately at a *cold* boundary, not on a hot
  inner call (cross-reference the memory lane in `../cpp.md`; `move_only_function` (C++23) erases
  move-only callables without the copyability tax — verify against the currency brief for your
  version).

- **Virtual dispatch is type erasure too — same inlining barrier, with a vtable indirection.** A
  virtual call is a runtime-polymorphism form of erasure: it loads the vtable pointer, indirects to
  the function, and — like `std::function` — is opaque to the optimizer, so it blocks inlining and
  cross-call optimization unless the compiler can *devirtualize* (prove the dynamic type, e.g. via
  LTO/whole-program visibility or a `final` class/method). The per-call cost is small in isolation;
  the real cost is the lost inlining on a hot path and, for tiny bodies called in tight loops, the
  branch-misprediction on the indirect target. Flag a virtual call only when it sits on a measured hot
  path where the type is effectively monomorphic — there, CRTP or a concrete type removes both the
  indirection and the inlining barrier (verify against the currency brief for your version).

- **CRTP (static polymorphism) trades binary size for devirtualization.** The curiously-recurring
  template pattern (`struct D : Base<D>`) resolves "virtual" dispatch at compile time: calls inline,
  there is no vtable pointer in the object and no indirect call, and the optimizer sees through the
  whole chain — a real runtime win on hot polymorphic paths. The cost is the mirror of every template:
  each derived type instantiates its own copy of the base's code (binary-size/i-cache pressure and
  compile time), and you lose *runtime* polymorphism entirely — you cannot store mixed derived types
  behind one `Base*` or choose the type at runtime. CRTP wins when the set of types is fixed at compile
  time and the dispatch is hot; virtual wins when you need a runtime-heterogeneous collection or a
  stable ABI. C++23 "deducing this" (an explicit object parameter) expresses many CRTP mixins more
  directly without the recurring-template boilerplate, with the same static-dispatch cost model —
  prefer it where the toolchain supports it (verify against the currency brief for your version).

- **`constexpr`/`consteval` moves work to compile time — zero runtime cost, but reciprocal compile-time
  blowup.** Computing an invariant (a lookup table, a parsed format, a hash of a literal) in a
  `constexpr` function evaluated in a constant context, or forcing it with `consteval`/`constinit`,
  removes the work from the runtime entirely. The trap is symmetric: the constant evaluator is an
  interpreter running in the compiler, far slower than the optimized runtime equivalent, so a heavy
  `constexpr` computation (large table generation, deep recursion, big `constexpr` containers) can
  dominate build time — exactly the i-cache/runtime win bought with a compile-time cost. Verify the
  evaluation actually happens at compile time (assign to a `constexpr` variable or use it in a constant
  context; a `constexpr` function called in a runtime context just runs at runtime). `constinit`
  separately guarantees a static/thread-local is constant-initialized — no runtime initializer and no
  static-initialization-order fiasco — without forcing `const` (the core payload lane covers the
  fiasco; `constinit` is the compile-time-guaranteed escape) (verify against the currency brief for
  your version).

- **Expression templates eliminate temporaries at runtime but explode compile time and errors.** The
  Eigen/Blaze-style technique encodes an expression like `a + b + c` as a nested template type that is
  evaluated lazily in one fused pass on assignment, eliminating the intermediate vector/matrix
  temporaries a naive `operator+` would materialize — a large runtime and allocation win for numeric
  code. The cost is paid in the other two axes: deeply nested expression types are expensive to
  instantiate (compile time) and produce notoriously inscrutable diagnostics, and a mis-stored
  expression-template proxy (e.g. `auto x = a + b;` holding a reference to an expiring temporary) is a
  correctness footgun, not a perf one. When auditing numeric code built on such a library, treat the
  expression-template machinery as the *intended* fast path and look instead for code that defeats it
  (forcing materialization, `auto` capturing proxies) — depth on this lives in the **numeric-simd**
  module (verify against the currency brief for your version).

- **Zero-cost abstraction is only zero-cost when fully inlined — an inlining barrier turns it real.**
  Deep wrapper/adaptor/iterator chains (range adaptors, smart-pointer and span wrappers, policy
  layers) collapse to nothing at `-O2` *only if the optimizer can see and inline through every layer*.
  Any barrier — an out-of-line definition in another TU without LTO, a virtual or `std::function`
  boundary mid-chain, a shared-library edge, or simply too-deep a chain for the inliner's budget —
  strands the abstraction as real call overhead plus lost downstream optimization, and the cost
  compounds per layer. This is the unifying failure mode behind type erasure, virtual dispatch, and
  cross-TU calls above. Confirm collapse by inspecting generated assembly on a release build, not by
  trusting that "it's templated, so it's free"; the fix is restoring inlinability (header/`inline`
  definitions, LTO, removing the mid-chain erasure), covered cross-cuttingly in the core **Compiler,
  build & ABI notes** (cross-TU inlining) in `../cpp.md` (verify against the currency brief for your
  version).

- **Concepts (C++20) compile faster than SFINAE/tag-dispatch — a compile-time idiom.** Constraining a
  template with a `concept`/`requires` clause is typically cheaper for the compiler to check and gives
  far better diagnostics than the older `std::enable_if`/SFINAE/tag-dispatch machinery, which forces
  the compiler to instantiate and discard candidate overloads to probe substitution failures. On a
  template-heavy codebase the SFINAE-to-concepts migration is a genuine compile-time lever (and a
  maintainability one), not just style. It is purely a build-time/diagnostics concern — there is no
  runtime or binary-size difference — so frame any suggestion as such, and pin it to the project's
  `-std` and toolchain support (concepts require C++20 and a compiler that implements them; verify
  against the currency brief for your version).

## Sources

- **cppreference.com** — templates and template instantiation, explicit instantiation and
  `extern template`, `constexpr`/`consteval`/`constinit`, `std::function`/`std::any`/
  `std::move_only_function`, concepts and `requires`, the constant-evaluation rules, "deducing this"
  (explicit object parameter).
- **ISO C++ Core Guidelines** — Templates and generic programming (T.*) and Performance (Per.*)
  sections; type-erasure and static-vs-dynamic-polymorphism guidance.
- **Compiler & build-profiling tooling** — Clang `-ftime-trace` and the Chrome-trace build profile,
  `templight`/`templight++` template-instantiation profiler, `bloaty` and `nm`/`size` for binary-size
  attribution; GCC/Clang devirtualization and LTO docs.
- **Practitioner references** — Chandler Carruth, "There Are No Zero-cost Abstractions" (CppCon);
  CppCon talks on type erasure (Klaus Iglberger), CRTP / "deducing this", and template compile-time
  cost; Eigen / Blaze documentation on expression templates; Agner Fog, *Optimizing software in C++*
  (i-cache and indirect-branch cost).
