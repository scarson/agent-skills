# C++ performance module: Build & link toolchain (CMake/Bazel, LTO/PGO/BOLT, allocators)
> Load when the build/link toolchain is material — `CMakeLists.txt`, Bazel `BUILD`, `meson.build`, `conanfile.*`/`vcpkg.json`, `-flto`/`-fprofile-*`, unity builds / PCH / C++20 modules, custom allocator linkage — see the module map in `../cpp.md`. Core lanes + Compiler, build & ABI notes live in `../cpp.md`; this file is the build/link toolchain lens only.

## Build & link toolchain (CMake/Bazel/Meson, LTO/PGO/BOLT, linkers, allocators)

> Scope: the build *system* and the link step as performance surfaces — LTO flavor and its
> link-time/RAM cost, PGO and BOLT layout workflows, the compile-time levers (unity builds, PCH,
> C++20 modules, ccache/sccache, header hygiene) that govern developer iteration and CI spend, the
> link-time levers (linker choice, symbol visibility, section GC, static vs dynamic) that govern both
> link speed and runtime call overhead, and allocator selection wired in at link/preload time.
> The recurring theme is that **build/link cost is a performance dimension in its own right** —
> developer iteration latency and CI minutes — sitting alongside runtime, and many of the largest
> no-source-change runtime wins (cross-TU inlining, code layout, a better malloc) are configured here,
> not written in the code.
> Cross-reference the core **Compiler, build & ABI notes** in `../cpp.md` (LTO/PGO/`-march` at a high
> level, cross-TU inlining, exceptions/RTTI size) and the **Numeric & SIMD** sibling for target-CPU
> baseline vs runtime dispatch — this module is the toolchain mechanics those notes deliberately defer.

- **Full/fat LTO chosen where ThinLTO would do — link becomes the serial bottleneck.** Monolithic
  (full) LTO loads every translation unit's IR into one linker process and optimizes the whole program
  serially, so link time and peak link-RAM grow with total program size and can dominate the build or
  OOM a CI worker on a large binary. ThinLTO (`-flto=thin` on Clang, `-flto=auto`/parallel jobs on GCC)
  splits the cross-module work into per-function summaries and parallel backend jobs, recovering most of
  the cross-TU inlining benefit at a fraction of the link time and memory, and it caches partial results
  for faster incremental relinks. The trade-off is that ThinLTO's import decisions are summary-based and
  occasionally less aggressive than whole-program; for a large or memory-constrained build prefer Thin,
  and reserve full LTO for small binaries where the last few percent are worth a serial link. Confirm LTO
  link concurrency is actually parallel — a single-threaded LTO link silently serializes the whole build
  (verify against the currency brief for your version).

- **LTO interacting badly with distributed/cached builds.** LTO defers real optimization to link time,
  which is the one step a distributed compile farm or a compile cache (ccache/sccache, Bazel remote
  cache) cannot fan out the same way it parallelizes per-TU compiles — the cheap, cacheable `.o` step
  produces thin IR and the expensive whole-program work lands in one serial link. On a build already
  scaled out across many cores or machines, enabling full LTO can *lengthen* wall-clock build time even
  as it improves the binary. ThinLTO's parallel backend and its index/object cache mitigate this; weigh
  the runtime gain against the CI-time regression and measure both, rather than assuming LTO is free
  because it needs no source change (verify against the currency brief for your version).

- **PGO that was never collected on a representative workload — or whose profile has gone stale.**
  Profile-Guided Optimization (instrumented: `-fprofile-generate` → run → `-fprofile-use`) only helps if
  the profiling run exercises the *real* hot paths; a profile gathered from a unit-test suite or a toy
  input teaches the compiler the wrong hot/cold split and can pessimize the paths that actually matter in
  production. Profiles also rot: as the source drifts, the profile's function/edge identities stop
  matching and coverage silently decays, so a checked-in profile needs a refresh cadence and a staleness
  signal in CI. Sampling-based PGO (AutoFDO from `perf` data, or Clang CSIR/sampling) avoids the
  instrumented build's runtime slowdown and can be collected continuously from production with low
  overhead, at the cost of coarser profile fidelity — prefer it when an instrumented build is too slow to
  run on representative load (verify against the currency brief for your version).

- **BOLT (or equivalent post-link layout) left on the table on a large hot binary.** BOLT is a
  post-link optimizer (Linux/ELF) that rewrites an already-linked binary using a `perf` profile to
  improve code layout — hot/cold splitting, basic-block reordering, function reordering for i-cache and
  iTLB locality, indirect-call promotion. It is *complementary to*, not a replacement for, compiler PGO:
  it operates on the final linked image where it can see cross-module layout the compiler couldn't, and
  often adds gains on top of an already-PGO+LTO build for front-end-bound (i-cache/iTLB-pressured) server
  binaries. The costs are an extra build stage, a relocation-preserving link (`--emit-relocs` or the
  documented link flags), and a profile collection step — worth it specifically when profiling shows
  front-end stalls on a large long-running binary, less so on a small or back-end-bound one (verify
  against the currency brief for your version).

- **Unity/jumbo builds traded against incrementality and isolation.** Concatenating many `.cpp` files
  into one translation unit (CMake `UNITY_BUILD`, Bazel/Meson equivalents) cuts redundant header parsing
  and template instantiation across the batch and gives the compiler cross-file inlining *without* LTO —
  often a large clean-build and CI speedup. The cost is on the other side of the iteration loop: a single
  edit now recompiles the whole unity blob (worse incremental builds), and merging TUs surfaces latent
  ODR/symbol clashes — anonymous-namespace collisions, leaked `using namespace`, macro bleed, duplicate
  internal-linkage names — that were previously hidden by TU isolation. Unity builds favor cold/CI build
  time; weigh them against developer edit-rebuild latency, and treat new ambiguity/redefinition errors as
  the expected tax, not a regression (verify against the currency brief for your version).

- **Header parse cost not addressed by PCH or C++20 modules.** In the textual `#include` model every TU
  re-parses every header it pulls in, so a heavy header (or a heavy transitive closure) is paid once per
  `.cpp` — the dominant compile-time cost in header-heavy and template-heavy codebases. Precompiled
  headers (PCH) snapshot a stable, widely-shared prefix once and reuse it, but only pay off for headers
  that are genuinely common and rarely changing (a churning header invalidates the PCH constantly), and a
  PCH is toolchain/flag-specific. C++20 modules (`import`) parse and semantically check an interface once
  into a binary module artifact that downstream TUs consume without re-parsing — a more fundamental fix
  than PCH — but adoption is gated by toolchain maturity, build-system module-dependency-scanning support,
  and the cost of restructuring headers into module units. Reach for PCH as the incremental win and
  modules as the structural one, pinned to what the toolchain actually supports (verify against the
  currency brief for your version).

- **A compile cache present but defeated by non-determinism.** ccache/sccache key on a hash of the
  preprocessed input and flags, so they only hit when that hash is stable across builds and machines.
  Common cache-busters: `__DATE__`/`__TIME__`/`__TIMESTAMP__` macros (every build differs), absolute
  paths baked into the command line or `__FILE__` (defeats sharing across checkout dirs / CI workers —
  use `-fdebug-prefix-map`/`-ffile-prefix-map` and relative paths, and configure the cache's
  base-dir/hash-dir handling), embedded build-id or VCS stamps in compiled sources, and unnormalized
  include orderings. A cache reporting a low hit rate is usually one of these, not a sizing problem;
  check the miss reasons before growing the cache. (Note ccache and LTO interact poorly — see the
  distributed/cached-build bullet above.) (verify against the currency brief for your version).

- **The default linker left in place when a faster one is available.** The link step is serial-ish and
  often the long pole of an incremental build; GNU `ld` (BFD) is the slowest common default. `lld` (LLVM)
  and `mold` are substantially faster parallel linkers, and `gold` sits between — switching the linker
  (`-fuse-ld=lld`/`mold`) is a near-free incremental-build and CI speedup with no source change. Caveats
  that make it a judgment call, not a reflex: a faster linker must support the platform and the linker
  features in use (linker scripts, specific `--wrap`/version-script/LTO-plugin behavior, platform object
  quirks), and LTO link time is dominated by the *optimizer*, not the linker, so a faster linker helps the
  non-LTO link far more than the LTO one. Recommend the swap where link time is shown to be the
  bottleneck (verify against the currency brief for your version).

- **Shared-library symbols exported by default, blocking cross-boundary inlining and slowing load.**
  On ELF the default visibility exports every external symbol from a shared object, which bloats the
  dynamic symbol table (slower startup symbol resolution), enables semantic interposition (the compiler
  must assume any exported function could be replaced at load time via `LD_PRELOAD`, so it cannot inline
  or constant-fold across that call — even within the same library), and enlarges the public ABI surface.
  Compiling with `-fvisibility=hidden` (plus explicit export annotations for the real API) and
  `-fno-semantic-interposition` lets the optimizer treat intra-library calls as non-interposable and
  inline them, and shrinks the export table. This is a high-value lever specifically for shared libraries
  with hot internal calls; it is a no-op for fully static binaries and changes the exported ABI, so it is
  a deliberate decision, not a default to flip blindly (verify against the currency brief for your
  version).

- **Dead code linked in because sections aren't separated and garbage-collected.** Without per-symbol
  sections, the linker can only drop whole object files, so unreferenced functions and data ride along
  into the binary — inflating size, startup, and i-cache footprint. Compiling with `-ffunction-sections
  -fdata-sections` and linking with `--gc-sections` (linker `/OPT:REF` on MSVC) lets the linker strip
  unreferenced sections at function/object granularity. The trade is a modest extra link cost and the
  fact that GC interacts with symbols kept alive by visibility/exports, dynamic lookup, or
  `KEEP`/`used` attributes — so it pairs naturally with hidden visibility on a binary you control.
  Most impactful when statically linking large libraries of which only a slice is used (verify against
  the currency brief for your version).

- **Static vs dynamic linking chosen by habit rather than by the workload's startup/locality profile.**
  Dynamic linking keeps the binary small and shares library code across processes, but pays per-process
  startup cost resolving symbols (PLT/GOT indirection and lazy binding), every cross-library call goes
  through an indirect stub the optimizer cannot inline across, and the shared pages may sit far apart in
  memory hurting locality. Static linking removes the runtime resolution and the PLT indirection, enables
  LTO/inlining across what were library boundaries, and improves code locality — at the cost of a larger
  binary, no shared-page reuse across processes, and rebuild-to-patch-a-dependency. For a short-lived CLI
  invoked many times, or a hot service where cross-library calls are on the critical path, static (or
  partially static) linking can be a real win; for a long-running daemon sharing big libraries with peers,
  dynamic is usually right. Decide by startup frequency, call-graph locality, and patch/deploy model, not
  by default (verify against the currency brief for your version).

- **Allocator left at default glibc malloc on a malloc-heavy multithreaded workload.** The general
  allocator is on the hot path of any allocation-heavy program, and the default (glibc `ptmalloc`) is
  conservative: under heavy multithreaded allocation it can suffer arena contention, fragmentation, and
  poor tail latency. Drop-in replacements — tcmalloc, jemalloc, mimalloc — use per-thread/per-CPU caches
  and different arena and size-class strategies that typically improve multithreaded throughput,
  fragmentation, and p99 latency, and can be wired in with zero source change at link time or via
  `LD_PRELOAD`. There is no universal winner: they differ in throughput vs memory footprint vs latency
  trade-offs, in huge-page/THP and arena/background-decay tunables, and in behavior under specific
  allocation-size distributions — so the recommendation is "evaluate a replacement allocator on *this*
  workload and measure both speed and RSS," not "switch to allocator X." Note `LD_PRELOAD` swaps the
  allocator only at runtime (handy for A/B measurement); linking it in makes it permanent and lets it
  cover early/static-init allocations (verify against the currency brief for your version).

- **Debug-info and debuggability knobs paid as if they were free, or not at all.** `-O0` is not the only
  way to keep a build debuggable: `-Og` optimizes while preserving a usable debugging experience, giving
  far more realistic performance than `-O0` for builds that still need to be stepped (though still not a
  profiling target — measure release per the core notes). Full `-g` debug info dramatically inflates
  object size and *link time* because the linker copies and relocates DWARF; `-gsplit-dwarf` emits debug
  info into separate `.dwo` files so the linker handles far less, cutting link time and binary size while
  keeping symbols available. These are pure build-iteration levers (and link-time, which is a perf
  dimension here) with no runtime effect — relevant when debug builds or CI link time are the complaint
  (verify against the currency brief for your version).

- **A release build silently contaminated by debug or `-O0` dependencies via the package manager.**
  Conan and vcpkg build dependencies according to a *profile*/triplet, and a mismatch — a `Debug` or
  unoptimized dependency profile linked into a `Release` application, an ABI/`-std`/runtime-library
  mismatch between deps and app, or deps built without the LTO/`-march`/visibility flags the app uses —
  silently ships unoptimized third-party code (and STL hardening, see the core notes) into an otherwise
  optimized binary, and the slowdown looks like it lives in the app. When a hot path traces into a
  dependency, verify *how that dependency was built*, not just how the app was: confirm the profile/triplet,
  build type, and optimization/LTO flags propagated to dependencies, since a per-dependency miscompile is
  invisible in the app's own build flags (verify against the currency brief for your version).

## Sources

- **CMake documentation** — `UNITY_BUILD` and unity-build properties, `target_precompile_headers`
  (PCH), `INTERPROCEDURAL_OPTIMIZATION` (LTO/IPO), C++20 modules support and dependency scanning.
- **Bazel & Meson documentation** — C++ toolchain/feature configuration, ThinLTO and PGO build settings,
  remote cache/remote execution, Meson `unity` and `b_lto`/`b_pgo` options.
- **GCC documentation** — LTO (`-flto`, `-flto=auto`, partitioning), PGO (`-fprofile-generate`/`-use`,
  AutoFDO), `-ffunction-sections`/`-fdata-sections`, `-fvisibility`, `-fno-semantic-interposition`,
  `-Og`, `-gsplit-dwarf`, `-f*-prefix-map`.
- **Clang/LLVM documentation** — ThinLTO design and incremental/cache behavior, instrumented vs
  sampling/CSIR PGO and AutoFDO, `-fvisibility`/`-fno-semantic-interposition`, control-flow/section GC.
- **LLVM BOLT documentation & paper** — post-link binary optimization, profile collection, relocation
  requirements, complementarity with PGO.
- **Linker documentation** — `lld` and `mold` design/usage and `-fuse-ld`, GNU `ld`/`gold`,
  `--gc-sections`, version scripts; MSVC `/LTCG`, `/OPT:REF`, `/GL`.
- **ccache & sccache documentation** — hashing/cache-key model, common cache-defeating inputs
  (`__TIME__`, absolute paths), `base_dir`/prefix-map and LTO caveats.
- **Allocator documentation** — tcmalloc, jemalloc, and mimalloc design notes (per-thread/per-CPU
  caches, arenas, fragmentation, huge-page/decay tuning) and `LD_PRELOAD` usage.
- **Conan & vcpkg documentation** — build profiles/triplets, build-type and ABI/flag propagation to
  dependencies.
- **include-what-you-use** and `-ftime-trace`/`-ftime-report` build-profiling documentation — locating
  header/parse compile-time cost.
