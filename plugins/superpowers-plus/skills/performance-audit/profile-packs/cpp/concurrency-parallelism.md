# C++ performance module: Concurrency & parallelism (threads, atomics, memory model, parallel STL, OpenMP/TBB)
> Load when concurrency/parallelism is material — `<thread>`/`<mutex>`/`<atomic>`, `std::async`, `<execution>` (parallel STL), OpenMP `#pragma omp`, Intel TBB, thread pools, lock-free structures — see the module map in `../cpp.md`. Core lanes + Compiler, build & ABI notes live in `../cpp.md`; this file is the concurrency & parallelism lens only.

## Concurrency & parallelism (threads, atomics, memory model, parallel STL, OpenMP/TBB)

> Scope: the C++ thread/synchronization primitives (`<thread>`, `<mutex>`, `<shared_mutex>`,
> `<condition_variable>`, `<atomic>`, C++20 `<latch>`/`<barrier>`/`<semaphore>`), the C++ memory
> model (acquire/release vs seq_cst, CAS loops, lock-free vs mutex), thread pools and task systems,
> the parallel STL `<execution>` policies, OpenMP, and Intel TBB. The recurring themes are: the core
> pack already names the obvious footguns (oversized critical sections, seq_cst-by-default, contended
> atomics, false sharing, thread-per-task, `std::async` launch policy) — this module goes a layer
> deeper into *why* and into the parallel-runtime surface. The dominant judgments are: parallel
> overhead must be amortized by enough per-task work; multiple thread-pool runtimes coexisting
> oversubscribe the cores; and **every** parallelization recommendation must carry an
> independence/correctness guard — no shared mutable state, no ordering dependency — because a
> parallelization that introduces a race is a regression, not a fix.
> Cross-reference the **Concurrency** lane and Compiler, build & ABI notes in `../cpp.md`, the
> `numeric-simd` module for memory-bandwidth-bound scaling and SIMD-vs-thread tradeoffs, and the
> `build-toolchain` module for OpenMP/TBB linkage and the parallel-STL backend dependency.

- **seq_cst paid where acquire/release would suffice — and the precise reasoning the core only names.**
  The core pack flags that `std::memory_order_seq_cst` is the expensive default; the deeper judgment is
  *which weaker order is correct and why*. A producer that writes a payload then publishes a ready flag
  needs **release** on the store and **acquire** on the consumer's load — that pair establishes a
  happens-before edge so the consumer sees the payload, but it does **not** impose a single global total
  order across unrelated atomics, which is the extra cost seq_cst buys (on x86 seq_cst stores compile to
  `xchg`/`mfence`; on ARM/POWER the difference is larger because the weaker model needs fewer fences).
  A pure event counter or statistic that nothing synchronizes-with can be `relaxed`. The guard: downgrade
  only with an explicit order argument and a written argument for why the algorithm's correctness holds —
  a wrong relaxation is a silent, racy heisenbug, not a measurable regression (verify against the currency
  brief for your version).

- **`compare_exchange_weak` in a loop vs `_strong`, `fetch_add` over a CAS loop, and when lock-free
  actually beats a mutex.** A CAS retry loop (`while (!x.compare_exchange_weak(expected, desired)) {}`)
  should use the **weak** form: on LL/SC architectures (ARM, POWER) weak may fail spuriously even when
  the value matched, but it compiles to a tighter loop because it omits the inner retry the strong form
  must emit — and the outer loop already retries, so the spurious failure costs nothing extra. Use
  **strong** only where there is no surrounding loop and a spurious failure would be a logic bug (a
  one-shot initialize-once); `_strong` inside a hand-written retry loop is pessimal on LL/SC targets, a
  `_weak` with no loop is a correctness bug. But the weak/strong choice is secondary to *not writing a CAS
  loop at all* when a single RMW expresses it: a counter or sum should use `fetch_add`/`fetch_or` (one
  hardware atomic, x86 `lock xadd`), whereas a CAS loop spins, re-reads the cache line the winner just
  dirtied, and re-runs any non-trivial recompute of `desired` on every contended retry — so under
  heavy contention `fetch_add` wins decisively. More broadly, the core's "prefer lock-free" instinct
  needs its honest counterpart: a well-implemented `std::mutex` is *very cheap under low contention* (an
  uncontended lock is roughly one atomic on the fast path and never enters the kernel), so lock-free only
  wins under real, sustained contention or where lock-free progress guarantees (no thread blocked by a
  descheduled lock-holder) are required — and hand-rolled lock-free carries the **ABA problem** as a
  correctness caveat: a pointer reused between a thread's read and its CAS passes the comparison while the
  structure underneath changed, mitigated only with tagged pointers, hazard pointers, or RCU-style
  reclamation, none free. Recommend lock-free only with contention measured and a reclamation strategy
  named (verify against the currency brief for your version).

- **`std::atomic<shared_ptr>` / `atomic_ref` and the contention they hide.** Atomic operations on a
  `shared_ptr` (C++20 `std::atomic<std::shared_ptr<T>>`, or the older free-function
  `std::atomic_load`/`store` overloads) are far costlier than atomics on a scalar: the implementation
  typically serializes through an internal lock or a split-reference scheme to keep the control-block
  refcount and the pointer consistent, so a hot path that atomically swaps a shared_ptr per iteration is
  a contention point disguised as a lock-free read. For read-mostly shared configuration, an RCU-style
  pattern or a generation counter often beats per-access atomic shared_ptr churn. `std::atomic_ref`
  (C++20) lets you apply atomic operations to a non-atomic object for the duration of a phase — useful to
  avoid making a whole array `atomic<T>` when only a parallel reduction phase needs atomicity — but every
  atomic-ref operation still carries the per-access barrier cost, so it does not make contended writes
  cheap (verify against the currency brief for your version).

- **Lock granularity past the core: striping, multi-lock ordering, and spin-vs-block.** The core says
  shrink the critical section and use `shared_mutex` for read-heavy data; the deeper levers are (a) **lock
  striping / sharding** — one global mutex over a map serializes all access, whereas N shard locks keyed
  by `hash(key) % N` let independent keys proceed concurrently, trading a little memory and the loss of
  whole-structure atomic operations; (b) **`std::scoped_lock` (C++17) for deadlock-free multi-lock** —
  acquiring two mutexes with two separate `lock_guard`s in code paths that disagree on order deadlocks,
  while `std::scoped_lock(m1, m2)` uses a deadlock-avoidance algorithm to take both atomically; and (c)
  **spinlock vs mutex** — a spinlock wins only for critical sections of a few instructions held briefly
  with low contention on a machine with spare cores; under real contention or on an oversubscribed
  machine a spinning thread burns a core while the lock-holder is descheduled, so a blocking
  `std::mutex` (which can park the waiter) is usually the safer default. `std::shared_mutex` itself is
  heavier than a plain mutex, so it only pays when reads genuinely dominate *and* contend (verify against
  the currency brief for your version).

- **Condition-variable misuse: thundering herd, notify-under-lock, and lighter C++20 primitives.**
  `notify_all` on a condition variable wakes every waiter even when only one can make progress — the
  woken threads contend for the mutex, find the predicate false, and sleep again (a thundering herd);
  prefer `notify_one` when exactly one waiter can proceed, reserving `notify_all` for state changes that
  genuinely unblock many (e.g., a shutdown flag). Calling `notify` *while still holding the mutex* can
  cause the woken thread to wake and immediately block on the mutex the notifier still holds (a wasted
  wakeup on some implementations) — releasing the lock before notifying avoids it, though correctness is
  preserved either way. For the common rendezvous and counting patterns, the C++20 primitives are lighter
  and clearer than a hand-rolled mutex+condvar: `std::latch` (single-use countdown), `std::barrier`
  (reusable phase sync with an optional completion function), and `std::counting_semaphore` (bounded
  permits, often backed by a futex with no mutex at all) — reach for these instead of reimplementing them
  on a condition variable (verify against the currency brief for your version).

- **Thread pools and task systems: the queue is the contention point and granularity sets the floor.**
  A pool with one global task queue serializes every push/pop on that queue's lock — at high task rates
  the queue lock becomes the bottleneck regardless of how many workers exist. **Work-stealing** pools
  (per-worker local deques, steal from others' tails when idle) keep the common case lock-free/local and
  only synchronize on a steal; this is why TBB and most modern pools use it. Orthogonally, **task
  granularity** dominates: tasks that are too fine (a few microseconds of work each) let scheduling,
  enqueue/dequeue, and cache-migration overhead swamp the useful work, so the parallel version loses to
  serial — coarsen by batching many items per task. The correctness guard applies to every task split:
  confirm the per-task work touches no shared mutable state and has no cross-task ordering dependency
  before recommending the split. Thread **affinity/pinning** can help cache-resident workloads by keeping
  a thread on one core (and its warm caches), but over-pinning can starve cores and fight the OS
  scheduler — recommend it only with a measured locality benefit.

- **Parallel STL `<execution>`: policy semantics, the TBB backend requirement, and the work threshold.**
  The three policies are not interchangeable: `seq` is serial; `par` runs element work on multiple
  threads (the body **may** synchronize, e.g. take a lock); `par_unseq` additionally permits SIMD
  vectorization and interleaving of element steps within a thread, which **forbids** the body from
  synchronizing or allocating (a mutex or `new` in a `par_unseq` body is undefined behavior, not just
  slow). The biggest practical trap on libstdc++: the `par`/`par_unseq` algorithms are implemented on top of
  **Intel TBB**, so using them without linking `-ltbb` is a **link error** (undefined references to
  `tbb::` symbols) — the missing `-ltbb` is the actual finding. (Only where a libstdc++ was itself built
  without TBB available do the policies instead degrade to serial; either way you get no parallelism.
  libc++ and MSVC have their own backend stories — verify per toolchain.) And as with all parallelism, there is a per-element work
  threshold below which `par` loses to a plain serial algorithm because thread dispatch and result
  merging cost more than the work saved — for cheap per-element bodies over modest ranges, serial wins.
  Parallel STL beats hand-rolled threads when the algorithm maps cleanly to one of the standard
  algorithms and you want the library to own chunking; it loses when you need custom scheduling, staged
  pipelines, or to reuse a long-lived pool the standard algorithm cannot see (cross-reference the
  `build-toolchain` module for the backend linkage) (verify against the currency brief for your version).

- **OpenMP: schedule choice, reduction false sharing, and the `reduction` clause.** `#pragma omp parallel
  for` with no `schedule` clause uses the implementation-defined default (`def-sched-var`), which is
  `schedule(static)` (contiguous equal chunks) in practice on GCC/Clang/MSVC — ideal for uniform per-iteration cost,
  but it load-imbalances badly when iteration cost varies, leaving fast threads idle while one slow chunk
  finishes; `schedule(dynamic)` or `guided` rebalances at the cost of per-chunk scheduling overhead
  (tune the chunk size so rebalancing doesn't dominate). The classic OpenMP performance bug is a manual
  shared accumulator — each thread updating `sum[tid]` in a shared array false-shares adjacent cache
  lines (the core names false sharing; this is its OpenMP instance) — fixed cleanly by the
  `reduction(+:sum)` clause, which gives each thread a private accumulator and combines at the end with
  no sharing. Watch thread-count and affinity env (`OMP_NUM_THREADS`, `OMP_PROC_BIND`/`OMP_PLACES`) being
  left unset or wrong for the deployment, and **nested parallelism** (an outer `parallel for` whose body
  enters another) exploding the thread count into oversubscription unless `OMP_NESTED`/`max_active_levels`
  bounds it (verify against the currency brief for your version).

- **Intel TBB and the multi-runtime oversubscription clash.** TBB's `parallel_for`/`parallel_reduce`
  schedule onto a **global task arena** sized to the hardware concurrency by default, with work-stealing
  and a partitioner that adapts grain size — `parallel_reduce` is the idiomatic answer to the shared-sink
  problem (per-task private partial results merged by a combiner), avoiding the contended accumulator
  entirely. The dominant cross-cutting hazard whenever TBB is present: **oversubscription when multiple
  thread-pool runtimes coexist**. A process that runs TBB *and* OpenMP *and* a hand-rolled thread pool —
  or calls a BLAS that spins up its own OpenMP pool inside a TBB task — ends up with several runtimes
  each sizing to `hardware_concurrency()`, so 4× the cores' worth of threads thrash on context switches
  and evict each other's caches. The fix is to pick one runtime for CPU parallelism where possible, or
  explicitly cap each (`OMP_NUM_THREADS`, TBB `global_control`/arena size, the manual pool's size) so the
  sum is a sane core budget — this mirrors the rayon-inside-tokio oversubscription pattern in the Rust
  `data-parallelism` module (verify against the currency brief for your version).

- **Futures, `std::async`, and packaged tasks: shared-state allocation and spawn cost.** The core flags
  the `std::async` deferred-launch trap; the deeper cost is that `std::future`/`std::promise` allocate a
  heap **shared state** per future to hold the result, the ready flag, and synchronization — so a pattern
  that creates thousands of small futures pays thousands of allocations plus the synchronization on each
  `get()`. `std::async(std::launch::async, …)` additionally may **spawn a fresh thread per call** (the
  standard does not require it to use a pool), making it a poor fit for fine-grained fan-out where a
  reused thread pool amortizes thread creation. `std::packaged_task` is the right tool to wrap a callable
  whose result you want as a future but whose *execution* you schedule yourself onto an existing pool —
  it decouples the future's shared state from `std::async`'s thread-spawn policy. As a high-level note
  only (coroutines are not this module's focus): C++20 coroutines can allocate a frame per coroutine
  invocation unless the compiler elides it (HALO), so a hot path spawning many short-lived coroutines is
  an allocation surface worth checking, but treat it as a pointer, not a deep lane here (verify against
  the currency brief for your version).

- **Adding threads to a memory-bandwidth-bound loop does not scale (cross-ref, not restated).** A
  parallel loop that mostly streams memory with low arithmetic intensity (vector add, copy, simple
  element-wise transform) is limited by DRAM/cache bandwidth, not by core count — adding threads
  saturates the shared memory bus sooner but the wall time plateaus or regresses, because all threads
  draw on one bandwidth budget. Distinguish bandwidth-bound from compute-bound (roofline, `perf stat`
  memory counters) before parallelizing; the payoff for parallelizing memory-bound work is rarely
  proportional to thread count. The full numeric/bandwidth treatment, SoA/AoS layout, and SIMD-vs-thread
  tradeoffs live in the `numeric-simd` module — consult it rather than re-deriving here.

## Sources

- **cppreference.com** — `<thread>`, `<mutex>`/`<shared_mutex>`, `<condition_variable>`, `<atomic>`
  (memory orders, `compare_exchange_weak`/`strong`, `fetch_add`, `atomic<shared_ptr>`, `atomic_ref`),
  `std::async`/`std::future`/`std::promise`/`std::packaged_task`, `<execution>` policies (`seq`/`par`/
  `par_unseq`), and the C++20 `<latch>`/`<barrier>`/`<semaphore>` primitives.
- **ISO C++ standard — memory model** ([intro.races], [atomics.order]) and the **ISO C++ Core
  Guidelines** Concurrency (CP.*) section.
- **OpenMP Application Programming Interface specification** — `parallel for`, `schedule`
  (static/dynamic/guided), the `reduction` clause, nested parallelism, and the `OMP_*` environment
  controls (`OMP_NUM_THREADS`, `OMP_PROC_BIND`, `OMP_PLACES`).
- **Intel oneTBB documentation** — `parallel_for`/`parallel_reduce`, the task arena and scheduler,
  work-stealing, partitioners/grain size, and `global_control` for thread limits.
- **Memory-model & lock-free literature** — Herb Sutter, "atomic<> Weapons" (CppCon); Anthony Williams,
  *C++ Concurrency in Action*; the ABA problem and hazard-pointer/RCU reclamation references; false-
  sharing and `hardware_destructive_interference_size` background (cross-referenced from the core pack).
- **Practitioner references** — Fedor Pikus, *The Art of Writing Efficient Programs* (atomics,
  spin-vs-mutex, lock-free tradeoffs); the libstdc++ parallel-STL / Intel TBB backend dependency note.
