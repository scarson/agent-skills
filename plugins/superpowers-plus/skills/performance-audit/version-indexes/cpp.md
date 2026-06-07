---
index_schema_version: 1
ecosystem: cpp
covered_through: "C++23 (C++26 in flight)"
built_on: 2026-06-05
sources:
  - https://en.cppreference.com/w/cpp/compiler_support     # per-feature, per-compiler support matrix
  - https://en.cppreference.com/w/cpp/23
  - https://en.cppreference.com/w/cpp/20
  - https://en.cppreference.com/w/cpp/17
  - https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html
  - https://clang.llvm.org/docs/UsersManual.html#profile-guided-optimization
  - https://learn.microsoft.com/en-us/cpp/build/reference/gl-whole-program-optimization
  - https://abseil.io/docs/cpp/guides/container          # flat_hash_map / btree
  - https://eigen.tuxfamily.org/dox/                     # Eigen fast paths
  - https://fmt.dev/latest/index.html                    # {fmt} / std::format
---
# C++ performance version index
> Build-once lookup. The idiom-currency lane consults this first; live research only extends past
> `covered_through`.
>
> Note: C++'s perf wins split into three durable buckets. **Build/optimization flags** (LTO, PGO,
> `-march`, O-levels) are version-independent and the largest no-source-change levers — carried first.
> **Standard-versioned language/library features** are gated by the project's `-std` AND by its
> compiler actually implementing them. **Library-API fast paths** (Eigen, {fmt}, flat hash maps,
> allocators) are version-independent idioms worth carrying because they ground an idiom-currency pass.

## Standard & compiler support gating (read first — the C++ analog of a support-cadence section)

C++ has no LTS/STS cadence like .NET or Node, but it has the equivalent trap: **"upgrade to use feature
X" is only valid advice when both the project's `-std` level allows it and the project's compiler
actually implements it.** A C++20/23 feature needs (a) `-std=c++20`/`c++23` and (b) a GCC/Clang/MSVC
version that ships it — these advance independently, and a feature can be "in C++20" yet unimplemented
or buggy in an older toolchain.

- **`-std` line is the first gate.** Pin every feature recommendation below to the project's `-std`.
  Recommending a higher `-std` is a deliberate, separate decision (it can change ABI, expose new warnings,
  and require a newer toolchain) — surface it as such, not as a free "just upgrade".
- **Compiler implementation is the second gate.** Consult cppreference's per-compiler support matrix for
  the exact landing version (e.g. `std::format` is C++20 but shipped in libstdc++ 13 / MSVC 19.29 /
  libc++ ~15; `std::flat_map` (C++23) shipped in **libstdc++ 15** (GCC 15, 2025) but is still absent from
  some mainstream stdlibs as of this index). Verify against the actual toolchain version, not just the standard.

## Build & optimization flags (version-independent — the biggest levers)

- **`-flto` / `/GL` + `/LTCG` (Link-Time Optimization)** — version-independent build-config — enables
  cross-translation-unit inlining and whole-program optimization the per-TU compile cannot do; commonly
  the largest no-source-change runtime win for CPU-bound binaries — supersedes per-TU-only optimization —
  use `-flto=thin` (Clang/LLVM, parallel & cheaper link) or `-flto=auto` (GCC) as the first step; full
  `-flto` costs more link time and memory.
- **PGO: `-fprofile-generate`/`-fprofile-use` (GCC/Clang), `/GENPROFILE`+`/USEPROFILE` (MSVC)** —
  version-independent tooling — instrument → run a representative workload → recompile with the profile so
  the compiler inlines and lays out hot/cold code by actual frequency; typically high-single-digit to
  low-double-digit percent on hot binaries — complementary to LTO, not a substitute — needs a
  representative workload or the profile misleads.
- **`-march=native` / `-march=x86-64-v3` / `-mcpu=` (RUSTFLAGS-equivalent in `CXXFLAGS`)** —
  version-independent — unlocks AVX2/AVX-512/NEON so auto-vectorization targets the real ISA instead of a
  baseline; large wins on numeric/string-heavy loops — `native` only for build-host-or-known-CPU binaries
  (crashes with illegal-instruction on older CPUs); for distributed binaries pick a baseline level
  (`x86-64-v2/v3`) + runtime dispatch / `__attribute__((target_clones(...)))`.
- **`-O2` vs `-O3` vs `-Os`/`-Oz`** — version-independent — `-O2` is the well-balanced default; `-O3`
  adds aggressive inlining/vectorization but can bloat code and regress i-cache-bound or
  branch-heavy workloads; `-Os`/`-Oz` optimize for size and can win when i-cache pressure dominates —
  change the O-level only with a measured basis, not by assumption.
- **`-fno-exceptions` / `-fno-rtti` (`/EHsc-`, `/GR-` on MSVC)** — version-independent — drop unwind
  tables / RTTI metadata for codebases that genuinely use neither (embedded, some engines): smaller
  binary, marginally better optimization across former throwing boundaries — NOT a happy-path speedup
  (the zero-cost model already adds no non-throwing overhead); a code/library that throws or uses
  `dynamic_cast`/`typeid` cannot use these.
- **`-fno-semantic-interposition` + `-fvisibility=hidden` (GCC/Clang shared libs)** —
  version-independent — lets the optimizer inline and devirtualize within a shared library instead of
  routing exported calls through the PLT (the default on ELF allows symbol interposition, which blocks
  intra-library inlining) — apply to shared libraries whose internal calls are hot.
- **`-fprofile-use` + BOLT post-link layout** — version-independent tooling — `llvm-bolt` re-lays out an
  already-optimized binary using a perf profile to improve i-cache/branch locality; complementary to PGO,
  applied after link — Linux/ELF-focused (see the `build-toolchain` module).
- **`strip` / `-g0` for release; split debug info (`-gsplit-dwarf`)** — version-independent — strip
  symbols from shipped release binaries to cut size and startup mapping cost while keeping a separate
  debug file for symbolication.

## Language & standard-library perf features (gated by `-std` AND compiler)

- **Move semantics & rvalue references** — **C++11** — move-construct/assign transfers ownership of heap
  buffers instead of deep-copying; the foundation of `std::vector`/`std::string` growth, `std::move`,
  and sink-by-value-then-move — supersedes copy-everywhere — ensure user types are move-enabled
  (`= default` the move ops, or follow rule-of-zero) so containers move rather than copy them.
- **`emplace_back`/`emplace` & perfect forwarding** — **C++11** — construct elements in place from
  constructor args, avoiding a temporary + move for non-trivial types — use where the element is
  expensive to move; not a win for trivial types.
- **Function-local `static` thread-safe init ("magic statics")** — **C++11** — lazy, once-only,
  thread-safe initialization of a local static; supersedes hand-rolled double-checked-locking singletons
  for deferring startup cost to first use.
- **`std::string_view`** — **C++17** — non-owning view over character data; eliminates substring/argument
  `std::string` allocations on parsing/lookup paths — supersedes `const std::string&` parameters and
  per-token `std::string` construction — only valid when the backing buffer outlives the view.
- **`std::pmr` polymorphic allocators (`monotonic_buffer_resource`, `unsynchronized_pool_resource`)** —
  **C++17** — runtime-pluggable allocators enabling arena/pool allocation for many short-lived
  same-lifetime objects without templating the container type on the allocator — supersedes per-object
  global allocation on per-request/per-frame hot paths.
- **Parallel algorithms (`<execution>`: `std::execution::par`, `par_unseq`)** — **C++17** —
  execution-policy overloads parallelize/vectorize standard algorithms — note libstdc++ requires **Intel
  TBB** linked for `par` to actually run in parallel (else it falls back to serial); MSVC ships its own
  backend; libc++ support is partial — verify the backend is present before claiming a parallel win.
- **`if constexpr`** — **C++17** — compile-time branch elimination in templates; removes dead
  instantiations and runtime branches — supersedes tag-dispatch / SFINAE overload sets for
  compile-time selection.
- **`std::span`** — **C++20** — non-owning view over a contiguous range (array/vector/C-array) carrying a
  length; passes buffers without copying or decaying to a pointer — supersedes `(ptr, len)` parameter
  pairs.
- **`std::format` / `std::print` (C++23)** — **C++20** (`std::format`), **C++23** (`std::print`) —
  type-safe formatting that is faster and lighter than `iostream` and avoids the per-`<<` overhead and
  manual stream-state management — supersedes `iostream` and `sprintf` for formatting — if the toolchain
  lacks it, the **{fmt}** library is the drop-in equivalent (see Library-API fast paths).
- **Ranges (`<ranges>`, C++20) & lazy views** — **C++20** — composable lazy view pipelines
  (`views::filter`/`transform`/`take`) avoid materializing intermediate containers — use for clarity and
  to fuse passes; not automatically faster than a hand loop, and some early-implementation views had
  overhead — measure on hot paths (verify against the compiler version).
- **`[[likely]]` / `[[unlikely]]`** — **C++20** — branch-probability hints for the optimizer's code
  layout on genuinely skewed branches — supersedes compiler-specific `__builtin_expect` — apply only to
  measured-skewed branches, not decoratively.
- **`constexpr`/`consteval` expansion (incl. `constexpr` containers/algorithms)** — **C++20** — move
  invariant computation (tables, parsing of fixed inputs) to compile time so it costs nothing at runtime;
  `consteval` forces compile-time evaluation — supersedes runtime initialization of values knowable at
  build time.
- **`std::flat_map` / `std::flat_set`** — **C++23** — sorted-vector-backed associative containers
  (contiguous storage, cache-friendly lookup, slow insert) standardizing the "sorted vector + binary
  search" idiom — supersedes `std::map`/`std::set` for build-once/query-many tables — **shipped in
  libstdc++ 15** (GCC 15, 2025); still missing from some stdlibs (older libstdc++; verify MSVC STL / libc++)
  — use `boost::container::flat_map` or abseil `btree_map` where it's unavailable (verify against the compiler version).
- **`std::move_only_function`** — **C++23** — a move-only, more efficient type-erased callable than
  `std::function` (no copyability requirement, better small-buffer behavior) — use for one-shot
  callbacks/tasks that need not be copyable.
- **`std::mdspan`** — **C++23** — non-owning multidimensional view with custom layouts (row/column-major,
  strided) over a flat buffer; enables zero-copy SoA/tiled access for numeric code — supersedes manual
  index arithmetic and nested `vector<vector<T>>`.
- **`std::to_chars` / `std::from_chars`** — **C++17** — locale-independent, non-allocating
  number↔text conversion; the fastest standard path for parsing/formatting numbers — supersedes
  `stringstream`, `sprintf`, `stoi`/`stod` (which allocate and/or consult the locale) on hot paths.

## Library-API fast paths (version-independent idioms)
> Durable library idioms (not tied to a C++ standard). Verify the exact API against the library version
> in the project's lockfile/`conanfile`/`vcpkg.json`.

- **abseil `absl::flat_hash_map`/`flat_hash_set` (or `boost::unordered_flat_map`, `ankerl::unordered_dense`)** —
  version-independent — open-addressing hash tables store entries inline (no per-node allocation, far
  better cache locality) and are typically much faster than `std::unordered_map` for lookup-heavy use —
  supersedes `std::unordered_map` where pointer/reference stability across rehash is not required (these
  move elements on growth) — `absl::node_hash_map` keeps stability where needed.
- **abseil `absl::btree_map`/`btree_set`** — version-independent — B-tree ordered container with
  contiguous nodes; better cache behavior than red-black `std::map` for ordered iteration/range queries —
  supersedes `std::map`/`std::set` when ordering is needed and pointer stability is not.
- **`{fmt}` library** — version-independent — fast, type-safe formatting; the source of `std::format` and
  ahead of stdlib implementations on some platforms; `fmt::format_to` writes into an existing buffer to
  avoid allocation — supersedes `iostream`/`sprintf`; use when `std::format` is unavailable or slower in
  your stdlib.
- **`simdjson` / `rapidjson`** — version-independent — SIMD-accelerated (simdjson) or in-situ/DOM-light
  (rapidjson) JSON parsing that vastly outperforms allocation-heavy parsers — supersedes general-purpose
  JSON libraries on high-throughput parse paths; simdjson favors on-demand/iterative access over building
  a full tree.
- **tcmalloc / jemalloc / mimalloc as the process allocator** — version-independent — drop-in malloc
  replacements (link-time or `LD_PRELOAD`) that cut fragmentation and lock contention and improve
  multi-threaded allocation throughput and tail latency on allocation-heavy workloads — supersedes the
  default system/glibc allocator — measure on your workload; gains are workload-dependent (see the
  `build-toolchain` module).
- **Eigen — expression templates, `.noalias()`, fixed-size types, aligned storage** — version-independent
  — Eigen fuses `a = b + c*d` into a single loop with no temporaries via expression templates;
  `.noalias()` on assignment skips the aliasing-safety temporary for matrix products; fixed-size
  `Matrix<…,N,M>` avoids heap allocation and enables full unrolling for small matrices — supersedes
  hand-written loops and naive temporaries (see the `numeric-simd` module).
- **Eigen / numeric — link a tuned BLAS (OpenBLAS/MKL) and respect storage order** — version-independent
  — large matrix products dispatch to a tuned BLAS when enabled, vastly outperforming a triple loop;
  mismatched row/column-major storage forces copies — supersedes naive GEMM and accidental
  layout-conversion copies.
- **Boost.Asio / Asio — reuse buffers, scatter/gather I/O, `io_uring` backend** — version-independent —
  preallocated/pooled buffers and `async_*` with `buffer` sequences (scatter/gather) avoid per-operation
  allocation; Asio can use an `io_uring` backend on modern Linux for lower syscall overhead — supersedes
  per-operation buffer allocation and one-buffer-per-read (see the `networking-async` module).
