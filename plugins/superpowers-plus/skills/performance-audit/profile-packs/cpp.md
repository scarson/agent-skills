# Profile Pack: C++

C++-specific performance signals for the audit lanes. Use alongside `generic-pack.md`, which covers
language-agnostic patterns; this pack sharpens each lane for C++ idioms and footguns.

This is the **core** C++ pack (lanes + Compiler, build & ABI notes). C++ has no garbage collector or
managed runtime — its performance reality is **the compiler and memory layout**, so the cross-cutting
section that every lane shares is `## Compiler, build & ABI notes`, not a "runtime notes" section.
Tech-specific lenses (build/link toolchain, concurrency primitives, template metaprogramming, numeric
/ SIMD, networking & async I/O) live in load-on-detection modules under `profile-packs/cpp/` — see
**`## Framework / sub-stack modules`** at the bottom. Load the core for every C++ project; add a
module only when its technology is material to the scope.

---

## Algorithmic complexity & data structures (lane `algorithmic`)
- Node-based standard containers (`std::list`, `std::map`, `std::set`, `std::multimap/multiset`) heap-allocate every element separately and traverse by pointer-chasing across cache lines; for sequential access or small/medium collections a contiguous `std::vector` typically wins even when it costs O(n) middle inserts, because cache locality dominates the asymptotic difference at realistic sizes — default to `vector` and reach for a node container only when you have measured the need or require iterator/reference stability.
- `std::unordered_map`/`unordered_set` are also node-based (separate chaining): each entry is a separate allocation and buckets hold pointers, so lookups pointer-chase and iteration has poor locality. For lookup-heavy maps consider an open-addressing flat hash (abseil `flat_hash_map`, `boost::unordered_flat_map`, `robin_hood`/`ankerl::unordered_dense`) (verify against the currency brief for your version).
- A build-once / query-many lookup table is faster as a **sorted `std::vector` + `std::lower_bound`** (binary search) than `std::map`/`std::set`: same O(log n) comparisons but contiguous storage, one allocation, and far better cache behavior — reserve a node container for when the collection is mutated incrementally throughout its life.
- `std::unordered_map` without `reserve(n)` rehashes repeatedly as it grows (default max load factor 1.0), and each rehash re-buckets every element; pre-size when the final count is known or estimable (verify against the currency brief for your version).
- `std::map::operator[]` and `std::unordered_map::operator[]` **default-construct and insert** a value when the key is absent — using them for a pure lookup silently mutates the container and allocates; use `.find()`/`.contains()`/`.at()` for read-only access.
- `std::regex` is slow on every standard-library implementation and constructing a `std::regex` is especially expensive; a pattern compiled inside a loop, or `std::regex` used where a hand-written scan or a faster engine (RE2, `ctre`) fits, is a recurring footgun (verify against the currency brief for your version).
- Recomputing a derived value (a hash, a `.size()` on a node container, a formatted key) every iteration rather than hoisting it; and re-sorting or re-de-duplicating data that is already ordered.

## Memory & allocation (lane `memory`)
- Copies the compiler cannot elide: a large object passed or returned by value, or a `std::string`/`std::vector` copied where a `const&`, `std::string_view`, or `std::span` would observe it without owning it. Pass read-only large parameters by `const&`; take **sink** parameters by value and `std::move` them into place; do not write `return std::move(local)` — it *pessimizes* NRVO, which would otherwise elide the move entirely.
- `push_back` of an already-constructed temporary vs `emplace_back` that constructs in place: `emplace_back` saves a move/copy for non-trivial element types, but it is not magic for trivial types and can mask a wrong-constructor bug — apply it where the element is expensive to move, not reflexively.
- A `std::vector`/`std::string` grown by `push_back`/`+=` in a loop without `reserve()` reallocates and moves all existing elements on each capacity doubling; reserve when the final size is known or estimable. (`std::string` short-string optimization keeps small strings off the heap — threshold is implementation-defined, roughly 15 bytes on libstdc++/MSVC and ~22 on libc++ — so the win is for medium/large strings) (verify against the currency brief for your version).
- `std::shared_ptr` carries an **atomic** reference count: every copy is an atomic increment/decrement (a memory barrier), and the control block is a second heap allocation unless `std::make_shared` fuses it with the object. Use `std::unique_ptr` when ownership is unique, pass `shared_ptr` by `const&` (or pass a raw pointer/reference as a non-owning observer) to avoid refcount churn on a hot path, and reserve `shared_ptr` for genuinely shared ownership.
- `std::function` type-erases its target and heap-allocates when the captured state exceeds its small-buffer size; on a hot path prefer a template callable parameter, a plain function pointer, or a non-owning `function_ref`, and reserve `std::function` for where type erasure is actually needed.
- Many short-lived objects with a common lifetime (per-request, per-frame) allocated individually thrash the general allocator; an arena / pool / `std::pmr::monotonic_buffer_resource` (C++17) bulk-allocates and bulk-frees, removing per-object allocator traffic (verify against the currency brief for your version).
- Data layout for cache behavior: hot fields scattered across a large struct (or an array-of-structs walked for one field) waste cache-line bandwidth; group hot fields together, shrink integer widths where the range allows, and consider structure-of-arrays for columnar traversal (see the `numeric-simd` module for the SoA/AoS depth).

## Data access & I/O (lane `data-access`)
- `std::endl` **flushes** the stream on every call; in an output loop that is one syscall per line. Use `'\n'` and flush explicitly (or let the stream flush at exit) when batching output.
- `std::ios_base::sync_with_stdio(false)` removes the per-operation synchronization between C++ streams and C `stdio` — a measurable win for `iostream`-heavy bulk I/O programs that don't mix `printf`/`scanf` (verify against the currency brief for your version).
- `std::cin` tied to `std::cout` (the default) flushes `cout` before every `cin` read; `std::cin.tie(nullptr)` removes that flush for bulk interactive-style input loops.
- Unbuffered or many-small file/socket reads and writes turn into one syscall apiece; read/write in larger blocks (or set a larger stream buffer) so syscall count tracks data volume, not call count.
- Parsing that constructs a `std::string` (and allocates) for each token or substring where a non-owning `std::string_view` (C++17) over the source buffer would do — zero-copy views avoid the per-token allocation entirely when the backing buffer outlives the view (verify against the currency brief for your version).
- Reading a whole large file into memory when `mmap` (random access) or chunked streaming would bound peak memory and let the OS page on demand.
- N+1 access: one DB/RPC/file round-trip per item inside a loop (e.g. a per-row `libpq`/ODBC query) where a single batched query or request would collapse the round-trips; round-trip count dominates latency regardless of per-call speed.
- Re-serializing or re-parsing unchanged data on a hot path instead of caching the encoded/decoded form, and reusing a scratch buffer across calls rather than allocating one per call.

## Concurrency & parallelization (lane `concurrency`)
- **Exploit:** independent work executed serially — sequential computations with no data dependency that could run on separate threads / `std::async` / a thread pool, or a loop over independent elements that `std::execution::par` could parallelize. Before suggesting parallelization, verify the work is genuinely independent (no shared mutable state, no ordering dependency) and attach a correctness guard; a parallelization that introduces a data race is a regression, not a fix.
- A `std::mutex` critical section that spans I/O, allocation, or computation holds the lock far longer than the shared-state read/write needs; shrink it to just the shared access, and use `std::shared_mutex` for read-heavy data (its own acquire cost is higher, so it only pays when reads genuinely dominate and contend).
- Atomic memory ordering defaults to `std::memory_order_seq_cst`, the strongest and most expensive (full barriers / `mfence` on x86 for stores); `relaxed`/`acquire`/`release` are cheaper where the algorithm's correctness permits — but only downgrade with an explicit ordering argument, never reflexively (a wrong relaxation is a silent data race).
- A single hot atomic (a global counter, a shared flag) bounced between cores ping-pongs its cache line; accumulate per-thread and combine at the end rather than contending one atomic in the inner loop.
- False sharing: independent variables written by different threads that land on the same 64-byte cache line force coherence traffic on every write even though there is no logical sharing; separate them or pad/align to `std::hardware_destructive_interference_size` (verify against the currency brief for your version).
- `std::thread` per task in a loop pays kernel thread create/teardown each time and oversubscribes the cores when the count exceeds `std::thread::hardware_concurrency()`; a thread pool sized to the hardware reuses threads and bounds oversubscription.
- `std::async` **without an explicit launch policy** may run *deferred* (synchronously, on the calling thread when the future is waited on) rather than asynchronously — code relying on it for parallelism gets none; pass `std::launch::async` when you mean it (verify against the currency brief for your version).

## Framework-idiom currency (lane `idiom-currency`)
- Consult the version index / currency brief for the project's `-std` level and toolchain (GCC/libstdc++, Clang/libc++, MSVC STL) and the libraries in use (Boost, abseil, Eigen, {fmt}, Qt, etc.). Flag superseded idioms the brief/index marks, fast-path APIs they list that the code doesn't use, and changed defaults the code still fights (verify against the currency brief for your version).
- **Pin every upgrade suggestion to the project's `-std` and compiler.** A newer-standard fast path (`std::string_view` C++17, `std::span`/`std::format`/ranges C++20, `std::flat_map`/`std::expected` C++23) is only advice the project can take if it both compiles at that `-std` *and* its toolchain implements the feature — recommend the best option available on the project's standard line, or surface the `-std` bump as a deliberate tradeoff (see the version index's standard/compiler-support note).
- Offline (no brief): note candidate idiom concerns at LOW confidence, flagged for manual currency check; do not fabricate version-specific claims.

## Payload / startup / build (lane `payload-startup`)
- Heavy **static / global initialization** (non-trivial constructors for namespace-scope objects, large static tables built at load time) runs before `main` and inflates startup; the order across translation units is also unspecified (the "static initialization order fiasco"). Prefer function-local statics (lazy, thread-safe since C++11) or explicit init so the cost is paid on first use, not at every process start (verify against the currency brief for your version).
- Binary size feeds startup and i-cache pressure: template instantiation bloat, unstripped symbols, and exception/RTTI metadata add weight (see the `templates-metaprogramming` and `build-toolchain` modules); strip release binaries and consider `-fno-exceptions`/`-fno-rtti` only where the codebase genuinely uses neither.
- Eager construction of rarely-used subsystems at startup (opening connections, loading config/models) instead of on first use — guard with a function-local static or explicit lazy init.
- Build/link cost itself is a first-class C++ performance surface (compile-time and link-time, not just runtime); the durable levers — unity builds, precompiled headers, C++20 modules, LTO/PGO link cost, faster linkers — live in the `build-toolchain` module.

---

## Compiler, build & ABI notes (load for every C++ project)

C++ has no managed runtime; its performance is determined by **how the code is compiled and how memory
is laid out**. These realities cut across every lane above (and every module below) — treat them as the
C++ analog of a "runtime notes" section. The first two are the most important calibration rules in this
pack.

- **Measure RELEASE builds — `-O0` numbers are noise.** The default unoptimized build runs the same code
  many times slower: nothing is inlined, abstractions (iterators, ranges, smart pointers, templates) are
  not collapsed, and copies are not elided. A perf conclusion drawn from a debug build is meaningless.
  Also confirm debug **STL hardening** is off when profiling — `_GLIBCXX_DEBUG` (libstdc++),
  `_LIBCPP_HARDENING_MODE` (libc++), `_ITERATOR_DEBUG_LEVEL=2` (MSVC) add bounds/iterator checks that
  are correct to ship in some builds but must not be mistaken for inherent cost (verify against the
  currency brief for your version).
- **Don't fight the optimizer — the cardinal C++ calibration rule.** At `-O2` the compiler already
  inlines small functions, unrolls and auto-vectorizes simple loops, propagates constants, and elides
  copies/moves (RVO/NRVO). Steer findings to what `-O2` *cannot* fix — algorithmic and container choice,
  memory layout and cache behavior, allocation patterns, false sharing, copies it cannot prove safe to
  elide, and virtual/indirect calls it cannot devirtualize — and **away** from hand-uglifying what it
  already does (manual loop unrolling, the obsolete `register`, micro-rewrites of code that is already
  inlined). A "finding" the compiler already handles at `-O2` is not a finding; recommending one erodes
  trust.
- **`-O2` vs `-O3` vs `-Os`/`-Oz` is a tradeoff, not a ladder.** `-O3` enables more aggressive inlining
  and vectorization but can bloat code and increase i-cache pressure, and occasionally regresses real
  workloads; it is not universally faster than `-O2` — measure rather than assume. `-Os`/`-Oz` optimize
  for size and can *win* on i-cache-bound code. Recommend an O-level change only with a measured basis
  (verify against the currency brief for your version).
- **LTO and PGO are the largest no-source-change levers.** Link-Time Optimization (`-flto`) enables the
  cross-translation-unit inlining a per-TU compile cannot do; Profile-Guided Optimization
  (`-fprofile-generate` → run a representative workload → `-fprofile-use`) lets the compiler lay out
  hot/cold code and inline by *actual* frequency. For CPU-bound binaries these are typically the biggest
  wins available without touching source — their absence on a hot service is a missed lever (link-cost,
  BOLT, and toolchain specifics live in the `build-toolchain` module) (verify against the currency brief
  for your version).
- **`-march`/`-mtune` gate which SIMD the optimizer may emit.** Without an explicit `-march`, the
  compiler targets a baseline ISA (e.g. `x86-64-v1`) and auto-vectorizes only to baseline SIMD, leaving
  AVX2/AVX-512/NEON unused on hardware that has them. `-march=native` unlocks them for a binary that runs
  on the build host or a known CPU class, but produces instructions that **crash on older CPUs** — never
  for portably-distributed binaries (use a baseline `-march` + runtime dispatch / function
  multi-versioning instead) (verify against the currency brief for your version).
- **Exceptions and RTTI cost size and the throw path, not the happy path.** The zero-cost (table-based)
  exception model adds no overhead to code that does not throw, but unwind tables and RTTI add binary
  size and can inhibit some inlining across throwing boundaries. `-fno-exceptions`/`-fno-rtti` are
  legitimate for codebases (embedded, some engines) that genuinely use neither — but removing exceptions
  "for speed" on the non-throwing path is a misconception; the cost is on the throw path and in size
  (verify against the currency brief for your version).
- **`NDEBUG` controls `assert`.** A release build should define `NDEBUG` so `assert()` compiles out;
  an `assert` with an expensive or side-effecting predicate left active on a hot path is real, avoidable
  cost — and, reciprocally, never profile with asserts/debug-checks on.
- **Cross-TU and ABI boundaries block inlining.** The optimizer cannot inline a call whose definition is
  not visible in the translation unit — a function defined out-of-line in another `.cpp`, or behind a
  shared-library boundary — unless LTO is enabled; such hot small calls pay full call overhead and block
  further optimization across the boundary. Header-defined/`inline` definitions or LTO fix it; virtual
  calls and calls through function pointers/`std::function` are opaque to the optimizer in the same way.

### Standard & compiler variant (pin all advice to these)

The available idioms depend on two axes — like .NET's Modern-vs-Framework split — and upgrade advice is
only valid when both permit it:

- **The `-std` level (`c++11/14/17/20/23`) gates which language/library features exist.** Do not
  recommend `std::string_view` or PMR or parallel algorithms (C++17), `std::span`/`std::format`/ranges
  /`[[likely]]` (C++20), or `std::flat_map`/`std::expected` (C++23) below their standard. Read the
  project's `-std` from its build files and pin every suggestion to it, or surface a `-std` bump as a
  deliberate, separate decision.
- **The compiler and standard-library implementation matter independently of `-std`.** GCC/libstdc++,
  Clang/libc++, and MSVC STL differ in feature completeness and in implementation performance (SSO
  buffer size, hash-table internals, parallel-STL backend availability — libstdc++ needs Intel TBB for
  `std::execution::par`). A C++20/23 feature needs a compiler that actually implements it; check the
  toolchain version, not just `-std` (verify against the version index / currency brief for your
  toolchain).
- **Measurement discipline.** Profile with the platform's tools — `perf`/`valgrind --tool=cachegrind`
  (Linux), Instruments (macOS), VTune (Intel) — and microbenchmark with `google/benchmark`, always on a
  release build with realistic data. Sanitizers (ASan/UBSan/TSan) are **development-only** instrumentation
  — their overhead is never a "shipped runtime" finding. Undefined behavior enables optimizations (a
  signed-overflow or strict-aliasing assumption can change generated code); note it where it bears on a
  perf claim, but do not turn the pack into a UB hunt — that is not a performance lane.

### Whole-repo sizing note

When this pack is used inside a tiered whole-repo audit, C++ is sized **by translation unit**, not by a
flat LOC band (per `performance-audit-cycle/whole-repo-scoping.md`) — headers pull in large amounts of
code per `.cpp`, so a coherent slice is one TU / build target, not N lines.

## Framework / sub-stack modules (load on detection)

Load the core lanes + **Compiler, build & ABI notes** above for *every* C++ project. Additionally load
the matching module when its technology is **material** to the audit scope (not on an incidental include),
and include it as ecosystem context in the relevant lane prompts. See the version index
`../version-indexes/cpp.md` for version-pinned facts.

| Detected (signals) | Load module |
|---|---|
| **Build & link toolchain** — `CMakeLists.txt`, `*.bazel`/`BUILD`, `meson.build`, `conanfile.*`/`vcpkg.json`, `-flto`/`-fprofile-*` flags, unity-build / PCH / C++20 `module;` units, custom allocator linkage (tcmalloc/jemalloc/mimalloc) | [`cpp/build-toolchain.md`](cpp/build-toolchain.md) |
| **Concurrency & parallelism** — `<thread>`/`<mutex>`/`<atomic>`, `std::async`, `<execution>` (parallel STL), OpenMP (`#pragma omp`), Intel TBB, thread pools, lock-free structures | [`cpp/concurrency-parallelism.md`](cpp/concurrency-parallelism.md) |
| **Templates & metaprogramming** — heavily templated/header-only libraries, deep template instantiation, CRTP, `constexpr`/`consteval`, type erasure, expression templates | [`cpp/templates-metaprogramming.md`](cpp/templates-metaprogramming.md) |
| **Numeric & SIMD** — Eigen, BLAS/LAPACK, xtensor/Armadillo, SIMD intrinsics (`<immintrin.h>`/`<arm_neon.h>`), `std::experimental::simd`, `-ffast-math`, hot numeric kernels | [`cpp/numeric-simd.md`](cpp/numeric-simd.md) |
| **Networking & async I/O** — Boost.Asio / standalone Asio, `io_uring`, `epoll`/`kqueue`, raw sockets, gRPC C++, high-throughput servers | [`cpp/networking-async.md`](cpp/networking-async.md) |

---

## Sources

Durable signals in this pack are grounded in these authoritative sources (version-specific facts and
their per-entry citations live in `../version-indexes/cpp.md`):

- **cppreference.com** — container complexity guarantees and node-vs-contiguous storage, `std::string`
  SSO, `std::shared_ptr`/`make_shared` control block, `std::function`, `std::pmr`, `<atomic>` memory
  orders, `std::async` launch policies, `std::endl` vs `'\n'`, `sync_with_stdio`.
- **ISO C++ Core Guidelines** — Performance (Per.*) and Concurrency (CP.*) sections.
- **Compiler optimization docs** — GCC `-O`/`-flto`/`-march` options manual, Clang/LLVM optimization &
  PGO docs, MSVC `/O`/`/GL`/`/LTCG` docs.
- **Agner Fog** — *Optimizing software in C++* and the microarchitecture/instruction-tables manuals
  (cache behavior, branch prediction, SIMD).
- **Practitioner references** — Chandler Carruth, "Tuning C++: Benchmarks, and CPUs, and Compilers!"
  and "There Are No Zero-cost Abstractions" (CppCon); Kurt Guntheroth, *Optimized C++*; abseil/folly
  performance notes.

**Sub-stack modules** carry their own grounding; key sources per module:

- **Build & link toolchain** (`cpp/build-toolchain.md`) — CMake/Bazel/Meson docs, GCC/Clang LTO & PGO &
  BOLT docs, ccache, mold/lld, tcmalloc/jemalloc/mimalloc.
- **Concurrency & parallelism** (`cpp/concurrency-parallelism.md`) — `<thread>`/`<atomic>`/`<execution>`
  cppreference, the C++ memory model, OpenMP & Intel TBB docs, false-sharing literature.
- **Templates & metaprogramming** (`cpp/templates-metaprogramming.md`) — cppreference templates/`constexpr`,
  CRTP vs virtual dispatch, `ftime-trace`/`templight` build-profiling tooling.
- **Numeric & SIMD** (`cpp/numeric-simd.md`) — Eigen docs, BLAS/LAPACK, Intel/ARM intrinsics guides,
  auto-vectorization & `-ffast-math` semantics, SoA/AoS literature.
- **Networking & async I/O** (`cpp/networking-async.md`) — Boost.Asio/Asio docs, `io_uring`/liburing,
  `epoll`/`kqueue` man pages, gRPC C++ performance docs.
