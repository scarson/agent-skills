# C++ performance module: Networking & async I/O (Asio, io_uring, epoll/kqueue, zero-copy)
> Load when networking/async I/O is material — Boost.Asio / standalone Asio, `io_uring`, `epoll`/`kqueue`, raw sockets, gRPC C++, high-throughput servers — see the module map in `../cpp.md`. Core lanes + Compiler, build & ABI notes live in `../cpp.md`; this file is the networking & async I/O lens only.

## Networking & async I/O (Asio, io_uring, epoll/kqueue, zero-copy)

> Scope: the event-loop and socket layer of high-throughput C++ servers and clients — Boost.Asio /
> standalone Asio (reactor/proactor, strands, coroutines, handler allocation), the readiness/completion
> kernel interfaces (`epoll` level- vs edge-triggered, `kqueue`, `io_uring`), raw-socket TCP tuning,
> kernel zero-copy paths, TLS overhead, and gRPC C++ channel/stream economics. Bullets are *conditions
> to look for*. The recurring themes are **syscalls-per-byte and wakeups-per-event** (the event-loop
> model and buffering decide both), **allocation-per-operation** at high QPS, **the threading model**
> (thread-per-connection vs a pool of event loops, and the strand/serialization cost), and **backpressure**
> when a fast producer outruns a slow socket. Do not restate the core `data-access` lane (buffering,
> many-small-syscalls, `mmap`, `string_view` zero-copy parsing, N+1) or the core `concurrency` lane
> (thread pools, oversubscription) — this is the wire-and-loop lens; the `concurrency-parallelism`
> module carries the threading-primitive depth.

- **A fresh read/write buffer allocated per async operation**: an async server that does
  `std::make_shared<std::vector<char>>` (or `new`s a buffer, or constructs a `std::string`) on every
  `async_read`/`async_write` turns the general allocator into the bottleneck at high connection/QPS
  counts — allocator lock contention and cache misses on the buffer churn dominate the actual I/O work.
  Reuse a per-connection buffer (the connection object owns one read buffer reused across operations),
  or draw from a pool / arena keyed to the connection or request lifetime (cross-reference the core
  **Memory & allocation** lane and the `numeric-simd` arena note). The completion-handler object itself
  allocates too — see the handler-allocator bullet below.

- **One syscall per small read or write instead of a batched event-loop model**: a hot loop issuing a
  `read()`/`write()` (or per-op `async_read_some`) per small message pays a syscall + mode switch each
  time, and the readiness/completion mechanism multiplies it — under `epoll`, every readable event that
  is serviced with a single small read leaves the loop to re-poll and re-wake. Coalesce with larger
  buffers and scatter/gather (`readv`/`writev`, Asio buffer *sequences*) so header+body or multiple
  framed messages move in one call; on the submission side, `io_uring` collapses many operations into
  one `io_uring_enter` (batched submission + completion) and can slash syscall count versus `epoll` on
  modern Linux — but it carries kernel-version, setup, and security-policy (`seccomp`) caveats that make
  it a deployment decision, not a free win (verify against the currency brief for your version).

- **`epoll` level-triggered where edge-triggered would cut wakeups, or edge-triggered without
  drain-to-`EAGAIN`**: level-triggered (`epoll`'s default) re-reports a fd as ready on every
  `epoll_wait` while data remains — simple and hard to misuse, but it can wake the loop more than
  necessary under sustained load. Edge-triggered (`EPOLLET`) reports the transition once, reducing
  wakeups, but is a *correctness* footgun: a handler that does not loop reading/writing until `EAGAIN`
  will stall a connection because the next readiness edge never arrives — a stall that masquerades as a
  throughput problem. Recommend ET only with the drain-loop discipline in place; otherwise level-
  triggered is the safer default and the wakeup difference is rarely the real bottleneck (verify against
  the currency brief for your version). `kqueue` (BSD/macOS) is the analogous interface with its own
  level/edge semantics — the same drain discipline applies.

- **Thread-per-connection at C10k scale**: spawning a thread (or blocking the connection's thread on
  synchronous I/O) per accepted socket does not scale past a few thousand connections — each thread's
  stack reserves memory (often ~1–8 MiB of address space, verify) and the scheduler thrashes context-
  switching across thousands of mostly-idle threads. The scalable shape is a reactor/proactor event
  loop multiplexing many connections per thread, with a **pool of loops** sized to the cores rather than
  to the connections; `SO_REUSEPORT` lets multiple acceptor sockets shard incoming connections across
  those loops in-kernel, avoiding a single-acceptor bottleneck and the thundering-herd of one shared
  listener (cross-reference the core **Concurrency & parallelization** lane and the
  `concurrency-parallelism` module).

- **Asio threading model and strand usage mismatched to the workload**: with one `io_context` and
  `run()` called from N threads, handlers for a *single* connection can run concurrently on different
  threads — correct only if a `strand` (or external locking) serializes access to that connection's
  state. A `strand` gives lock-free-looking serialization, but it is not free: it queues and may defer
  handlers, adding latency and an allocation per dispatched handler, and over-stranding (wrapping work
  that has no shared state) serializes throughput needlessly. Conversely, the per-thread `io_context`
  model (one loop per thread, connections pinned to a loop) avoids strands entirely but loses cross-loop
  load balancing. Look for missing serialization on shared connection state (a latent race read as
  intermittent slowness) *or* blanket stranding that throttles independent work (verify against the
  currency brief for your version).

- **Per-handler completion allocation, and coroutine vs callback overhead**: every Asio composed
  operation (`async_read`, `async_write`, timers) allocates to store the completion handler and its
  continuation state unless the handler's associated allocator is customized — at high op rates this is
  steady allocator traffic on the hot path. Asio exposes per-handler allocator hooks (and recycling
  small-block allocators) precisely so this churn can be eliminated for the busy path. The C++20
  coroutine (`awaitable` / `co_await`) style is usually competitive with callbacks and far more
  readable, but each suspension can incur a coroutine-frame allocation the compiler may or may not
  elide (HALO) — measure rather than assume the coroutine path is free or that it is slower (verify
  against the currency brief for your version). Separately, a `async_read_some`/`write_some` used where
  a *composed* `async_read`/`async_write` is needed yields **short reads/writes** — partial-transfer
  bugs that present as data corruption or stalls, not obviously as a perf issue.

- **`TCP_NODELAY` unset for small latency-sensitive messages**: Nagle's algorithm (on by default)
  withholds a small outbound segment until the prior one is ACKed, and when it interacts with the
  receiver's delayed-ACK it can inject ~tens-of-ms latency spikes per small write — a classic
  request/response latency footgun on interactive or RPC traffic. Set `TCP_NODELAY` for small-message
  low-latency paths; but for *bulk* streaming the opposite lever applies — `TCP_CORK` / `MSG_MORE`
  deliberately coalesces small writes into full segments to raise throughput. The right choice is
  workload-dependent: latency path wants Nagle off, throughput path wants batching on (verify against
  the currency brief for your version). Also check `SO_RCVBUF`/`SO_SNDBUF` sizing against the
  bandwidth-delay product (undersized buffers cap throughput on high-latency links) and `listen()`
  backlog sizing under connection bursts.

- **Large transfers copied through userspace instead of a kernel zero-copy path**: serving a file or
  proxying a large byte range with a read-into-buffer-then-write loop copies the payload kernel→user→
  kernel for no reason. `sendfile` (file→socket), `splice` (fd→fd via a pipe), and `MSG_ZEROCOPY`
  (large socket sends, with completion-notification semantics to learn when the buffer is reusable)
  move the bytes without the userspace round-trip on the qualifying paths (verify against the currency
  brief for your version). At the application layer, the analog is parsing the wire buffer in place with
  `std::string_view`/`std::span` rather than copying out each field (cross-reference the core
  **Data access & I/O** lane). Kernel-bypass stacks (DPDK, AF_XDP) push further but trade away the
  kernel networking stack entirely — a high-end specialization to note, not a general recommendation.

- **TLS handshake and per-record cost not amortized**: a full TLS handshake is an expensive
  asymmetric-crypto + round-trip event; a client or server that establishes a fresh session per request
  (no keep-alive, no session resumption / tickets) pays it repeatedly, dominating short-connection
  latency. Reuse connections and enable session resumption so most connections skip the full handshake.
  Per-record symmetric encryption is comparatively cheap on hardware with AES-NI (or offload) but is
  still bounded by record buffer sizing — many tiny TLS records add framing and MAC overhead versus
  fewer larger records. Look for per-request connection establishment over TLS, disabled resumption,
  and pathologically small write sizes through the TLS layer (verify against the currency brief for your
  version).

- **gRPC C++ channel created per call, or unary-in-a-loop instead of streaming**: a `grpc::Channel`
  negotiates the connection (TLS, HTTP/2) and multiplexes many RPCs over one connection — creating one
  per call serializes setup and forfeits multiplexing; reuse a long-lived channel (or a small keyed
  pool per target). Calling a unary RPC once per item pays per-call framing and a full round-trip each
  iteration — client/server **streaming** (or a repeated-field batch message) amortizes that to one call
  setup. On the server, the completion-queue threading model matters: too few CQ-draining threads
  starves throughput, too many oversubscribe; size to cores and offload blocking handler work. Also
  match `max_receive_message_length` and compression to actual payload sizes — raising the message
  limit to "fix" an error usually masks a payload that should stream, and gzip on small or already-
  compressed messages wastes CPU (this mirrors the Go **gRPC module**; verify against the currency
  brief for your version).

- **No client-side connection pooling / keep-alive, or unbounded queue growth under backpressure**:
  outbound clients that open a new connection per request (no keep-alive pool) pay TCP+TLS setup every
  call and exhaust ephemeral ports under load — reuse via a bounded pool. On the flow-control side, when
  a fast producer outruns a slow socket and the code keeps appending to an in-memory write queue without
  bound (or never observes the kernel send buffer filling / `EWOULDBLOCK`), memory grows without limit
  and latency balloons (bufferbloat in userspace). The fix is backpressure: stop reading from / pausing
  the producer when the outbound queue or window is full, and let TCP flow control and HTTP/2 / gRPC
  stream windows do their job rather than buffering around them (cross-reference the core **Memory &
  allocation** and **Concurrency & parallelization** lanes). Head-of-line blocking — one slow request
  stalling others sharing a connection or a single loop — is the latency-side symptom of the same
  shared-resource saturation.

## Sources
- **Boost.Asio / standalone Asio documentation** — `io_context` threading and `run()`, `strand`
  serialization semantics, composed operations (`async_read`/`async_write`) vs `*_some` partial
  transfers, buffer sequences (scatter/gather), associated/custom handler allocators, C++20
  `awaitable`/`co_await` integration.
- **Linux man pages** — `epoll(7)` (level- vs edge-triggered, `EPOLLET`, drain-to-`EAGAIN`),
  `sendfile(2)`, `splice(2)`, `send(2)`/`MSG_ZEROCOPY`/`MSG_MORE`, `tcp(7)` (`TCP_NODELAY`, `TCP_CORK`),
  `socket(7)` (`SO_RCVBUF`/`SO_SNDBUF`, `SO_REUSEPORT`), `listen(2)` backlog.
- **liburing / `io_uring` documentation and the "Efficient IO with io_uring" design notes** — batched
  submission/completion model, syscall amortization, setup and kernel-version/security caveats.
- **`kqueue(2)` man page** (FreeBSD/macOS) — readiness filters and level/edge behavior.
- **gRPC C++ performance documentation and best-practices** — channel reuse, streaming vs unary,
  completion-queue threading, message-size limits, compression.
- **C10k problem (Dan Kegel) and the reactor/proactor pattern literature** — event-loop scaling vs
  thread-per-connection, multi-acceptor sharding.
- **OpenSSL / TLS performance notes** — handshake cost, session resumption/tickets, AES-NI, record
  sizing.
