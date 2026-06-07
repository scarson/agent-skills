# Profile Pack: Cloudflare (Workers platform) (companion)

A **companion** pack for applications deployed on the **Cloudflare Workers** edge runtime — the
**runtime/architecture** performance of the app: request latency, the CPU-time budget, edge data-access
round-trips, and bundle/startup cost on the Workers isolate model. It loads **alongside** the
application's language pack — Workers apps are usually JS/TS (load that pack too), and Python or
Rust-compiled-to-WASM are possible (load those). This pack reframes the standard lanes around the
**Workers execution model**: what the platform charges for (CPU time, not I/O wait), where the dominant
latency lives (round-trips from an edge isolate to a data service), and what bounds startup (script size +
global-scope init).

**Content-detected** (`wrangler.toml` / `wrangler.jsonc` / `wrangler.json`; binding tables
`[[d1_databases]]` / `[[kv_namespaces]]` / `[[r2_buckets]]` / `[[durable_objects]]` / `[[queues]]`;
`@cloudflare/workers-types`, `cloudflare:` imports, an `export default { fetch }` Worker entrypoint). This
is a **runtime/architecture** lens — distinct from the IaC pack's *tooling* lens. The IaC pack asks "why
is `terraform apply` slow"; this pack asks "why is this Worker's request latency / CPU time high." If the
project also provisions Cloudflare resources via Terraform/Pulumi, that's the IaC pack's job, not this
one. Concrete API names and **every numeric limit** are tagged "(verify against the currency brief for
your version)" because the limits move and recall gets them wrong — per-service depth (D1/KV/Durable
Objects) lives in the modules mapped at the bottom.

---

## CPU budget & request-path compute (lane `algorithmic`)
- **Only CPU time counts against the limit — not wall-clock time spent awaiting I/O.** Time blocked on a
  `fetch()`, a KV read, or a D1 query does *not* burn the CPU budget, so a slow subrequest is a *latency*
  problem (data-access lane), not a CPU-cap problem. The defect this lane hunts is **compute** that runs on
  the request path: parsing, crypto, compression, image/text transforms, big loops — work the CPU clock is
  actually ticking through (verify against the currency brief for your version).
- **Heavy synchronous compute risks the CPU cap** — the default per-request CPU limit is small on Free and
  modest by default on Paid (verify: ~10 ms Free, ~30 s default / 5 min max Paid). A hot path doing JSON
  parse of a large body, JWT/signature verification per request, or an O(n²) transform can blow the budget;
  flag CPU-bound work that scales with input size on every request (verify against the currency brief for
  your version).
- **Large global-scope / top-level initialization runs once per isolate, not once globally** — code outside
  the handler (building a big lookup table, compiling a regex set, parsing an embedded dataset) executes
  every time the runtime spins up a fresh isolate for your Worker, and there is a hard global-scope startup
  ceiling (verify: ~1 second). Expensive eager init is both a startup cost and a recurring per-isolate tax
  (see the payload-startup lane) (verify against the currency brief for your version).
- **Recomputing a pure result every request instead of caching it** — a derived value, a parsed config, or
  a rendered template that's identical across requests can be hoisted to module scope (computed once per
  isolate) or stored via the Cache API; recomputing per request spends CPU budget on work the platform would
  let you skip.
- **Unbounded or input-proportional loops on the request path** — iterating over a user-supplied collection,
  expanding a fan-out that grows with payload size, or a regex with catastrophic backtracking turns a cheap
  request into a CPU-cap risk under adversarial input. The justification for flagging is the *cap*, not
  general tidiness: on Workers, "a bit slow" can mean "request killed" (verify against the currency brief for
  your version).
- **Streaming vs buffering large bodies** — reading an entire request/response into memory to transform it
  spends both CPU and the 128 MB isolate memory ceiling (verify); a `TransformStream` / streaming pipeline
  processes incrementally and keeps both bounded. Reserve full-buffer for when the transform genuinely needs
  the whole body (verify against the currency brief for your version).

## Edge data access & subrequests (lane `data-access`)
- **Round-trips to edge data services are the dominant latency surface** — most of a Worker's response time
  is usually *waiting* on D1 / KV / R2 / Durable Object / origin calls, not computing. Audit the *number and
  shape* of these round-trips first; this lane is where the wins almost always are. Per-service depth (which
  store, which access pattern) defers to the modules.
- **The subrequest limit caps total outbound calls per invocation** (verify: ~50 Free / ~1,000 Paid, the
  Paid ceiling configurable higher). A handler that fans out one call per item, or chains many dependent
  fetches, can hit the cap and fail — and even below the cap, each round-trip is latency. The cap makes N+1
  a *correctness* risk here, not just a slowness one (verify against the currency brief for your version).
- **N+1 over a binding** — a loop issuing one `env.DB.prepare(...)`/`env.KV.get(...)` per item instead of one
  batched query or a single multi-key read multiplies both round-trips and subrequest count. Batch (D1
  `batch()`, a single `IN (...)` query, a KV bulk pattern) so the count scales with *queries* not *items*
  (see the D1/KV modules for the per-store batching API).
- **Sequential awaits to the edge where the calls are independent** — `await a; await b; await c` to three
  bindings serializes three round-trips when `Promise.all([a, b, c])` would overlap them into roughly one.
  This is the single most common edge-latency win. *Verify independence first: a call that consumes a prior
  call's result genuinely can't be parallelized* (see the concurrency lane).
- **No Cache API where recompute/refetch is avoidable** — `caches.default` (and `caches.open`) lets a Worker
  store a `Response` keyed by request and serve it without re-running compute or re-fetching origin. Note the
  cache is **per-data-center, not global** (verify) — contents don't replicate across colos and `cache.delete`
  only purges the local colo — so it's a per-edge hit-rate optimization, not a coherent global store. Flag
  hot, cacheable responses computed fresh every request (verify against the currency brief for your version).
- **Connecting to a traditional origin DB without Hyperdrive** — Workers are stateless between requests and
  can't hold a normal connection pool across invocations, so a raw Postgres/MySQL driver pays connection
  setup per request *and* round-trips from a distant edge to a regional DB. **Hyperdrive** pools connections
  globally (so client creation is fast) and adds default-on query caching; without it, the per-request
  connection handshake and pool absence is the latency floor (verify against the currency brief for your
  version).
- **Wrong store for the consistency/latency profile** — KV is low-latency-read but **eventually consistent**
  (writes propagate, reads may be stale); D1 is relational/SQL with stronger semantics; a Durable Object is
  the **strongly-consistent, single-instance** coordination point. Picking KV for read-after-write
  correctness, or a DO for a high-throughput cache, is a per-request cost or a correctness bug. Match the
  store to the access pattern (defer to the per-store modules) (verify against the currency brief for your
  version).
- **Over-fetching from R2 / origin** — pulling a whole object when a ranged read suffices, or fetching fields
  the handler discards, spends round-trip time and bandwidth on data the response never uses. Constrain the
  read (Range requests, narrow queries) to what's consumed.

## Concurrency & deferred work (lane `concurrency`)
- **Non-critical work on the response's critical path** — logging, analytics writes, cache *writes*, and
  audit pings that block the response add latency the user feels for no user benefit. `ctx.waitUntil(promise)`
  moves them *past* the response: the runtime keeps the work alive after the response is sent (verify: up to
  ~30 s post-response, shared across all `waitUntil` calls). Flag fire-and-await work that should be
  fire-and-`waitUntil` (verify against the currency brief for your version).
- **`Promise.all` for independent subrequests** — the concurrency face of the data-access N+1/sequential
  point: independent calls to different bindings should overlap, not serialize. The win is bounded by the
  *slowest* call instead of the *sum*. Guard correctness: only parallelize calls with no data dependency or
  ordering requirement between them.
- **Work that must survive longer than `waitUntil` allows** — a deferred task exceeding the post-response
  window (verify: ~30 s) gets cancelled; durable/retriable background work belongs on **Queues** (a consumer
  Worker with its own longer duration budget), not `waitUntil`. Flag long deferred chains parked on
  `waitUntil` that risk truncation (verify against the currency brief for your version).
- **A Durable Object as the coordination point is single-threaded** — a DO serializes access to its state
  (that's the consistency guarantee), so routing high-throughput or independent work through one DO instance
  turns it into a serialization bottleneck. It's the right tool for ordered/consistent coordination, the
  wrong one for a parallelizable read fan-out. Audit the access pattern (defer to the Durable Objects module).
- **Spawning more concurrent subrequests than the platform allows in flight** — there's a ceiling on
  simultaneous open connections awaiting response headers (verify: ~6), so a very wide `Promise.all` fan-out
  doesn't run fully in parallel — excess calls queue behind the limit. Wide fan-out helps only up to that
  ceiling; past it, more concurrency adds no overlap (verify against the currency brief for your version).

## Bundle size & startup (lane `payload-startup`)
- **The compiled Worker has a hard script-size limit** (verify: ~3 MB gzipped Free / ~10 MB gzipped Paid;
  ~64 MB uncompressed ceiling). A bundle approaching it both deploys slower and signals heavy dependencies
  dragging startup; flag a bundle near the cap as a structural problem, not a cosmetic one (verify against
  the currency brief for your version).
- **Heavy or Node-only dependencies pulled into the bundle** — a large library imported for one helper, or a
  package assuming Node built-ins, inflates the bundle and the parse cost. Prefer a smaller dep, a
  platform-native API, or tree-shaking down to what's used. The bundle is shipped to and parsed by every
  isolate, so its weight is a recurring startup tax, not a one-time download.
- **`nodejs_compat` enabled when it isn't needed** — the Node compatibility layer pulls polyfills/shims into
  the runtime surface and the bundle; turning it on for convenience when the code uses no Node APIs adds
  weight and startup cost. Confirm it's actually required by imported APIs (verify against the currency brief
  for your version).
- **Tree-shaking defeated by import style** — namespace imports (`import * as x`), side-effectful module
  imports, or a bundler config that retains dead code ship bytes the Worker never runs. Confirm the build
  actually shakes the tree (named imports, `sideEffects` honored), since the size limit makes this load-bearing.
- **Expensive global-scope initialization** — top-level code (parsing an embedded JSON blob, building large
  Maps, compiling many regexes) runs on every isolate spin-up and counts against the global-scope startup
  ceiling (verify: ~1 s). Move rarely-used or per-request-derivable init *into* the handler (lazy), or
  precompute at build time, so isolate startup stays cheap (verify against the currency brief for your
  version).
- **Eagerly importing a code path most requests never take** — a top-level `import` of a heavy module used
  only on one route loads and parses it for every isolate regardless of route. A lazy/conditional dynamic
  `import()` inside the branch that needs it keeps the common-path startup lean. Weigh against the latency of
  loading on first use of the cold path (verify against the currency brief for your version).

## Platform-feature currency (lane `idiom-currency`)
- **Not using Smart Placement when the Worker makes many round-trips to a centralized backend** — by default
  a Worker runs at the eyeball edge; if it makes repeated sequential calls to one distant backend, Smart
  Placement can relocate it *near the backend* to collapse those round-trips. Consult the brief for current
  behavior; flag a back-end-chatty Worker still pinned to the eyeball edge (verify against the currency brief
  for your version).
- **Missing newer per-service fast paths** — e.g. D1 read replication / Sessions for read-heavy workloads,
  Durable Objects' SQLite storage backend and WebSocket **Hibernation** (so idle WebSocket DOs don't hold
  compute/billing), Static Assets for serving static files off the Worker's compute path. These move; consult
  the brief/version index, and flag a hand-rolled equivalent where a maintained primitive now exists (verify
  against the currency brief for your version).
- **A hand-rolled pattern the platform now does natively** — manual connection handling where Hyperdrive
  fits, a custom in-Worker cache where the Cache API fits, polling where a DO alarm/Queue fits. Flag where the
  native feature covers the use case; offline, LOW confidence for manual currency check.

---

## Workers execution model (read for every Cloudflare audit)

Workers performance is judged against the **V8-isolate edge runtime**, not against a container/VM serverless
mental model. This is the runtime-notes analog: how to reason and measure before concluding. Verify every
limit below against the live limits page — these numbers move and recall is unreliable on them.

- **V8 isolates, not containers — so don't over-worry cold start.** A Worker runs in a lightweight V8 isolate
  (one runtime instance hosts hundreds/thousands of them, switching between them); an isolate starts roughly
  two orders of magnitude faster than a Node process on a VM/container. The classic "warm up the function"
  serverless anxiety mostly doesn't apply. What *does* still cost startup is **large bundles** (more to parse)
  and **expensive global-scope init** (runs per isolate spin-up, under a startup ceiling — verify: ~1 s). Aim
  optimization there, not at cold-start avoidance.
- **Only CPU time counts toward the limit — not time awaiting I/O.** Time blocked on `fetch()`, KV, D1, R2,
  or a DO call does **not** burn CPU budget. Consequence: a slow subrequest is a *latency* defect (fix in
  data-access), while a compute loop is a *CPU-cap* defect (fix in algorithmic). Don't conflate them — the
  default CPU limit is small (verify: ~10 ms Free; ~30 s default / 5 min max Paid), but a request can take
  far longer in wall-clock while waiting on I/O without hitting it.
- **Stateless between requests — no traditional connection pooling.** There's no guarantee two requests hit
  the same isolate, and global state may be evicted, so you can't hold a normal DB connection pool across
  requests. Cross-request connection reuse comes from **Hyperdrive** (pooled origin DB), **Durable Objects**
  (a stateful single instance), or an external pooler — not from caching a client in global scope. Treat any
  "keep a warm connection in a module variable" pattern as unreliable.
- **Smart Placement vs the sequential-round-trip latency trap.** By default the Worker runs near the *user*;
  but a Worker that makes many *sequential* round-trips from a distant edge to one centralized backend pays
  the inter-region latency on each hop (the Sydney-eyeball → Frankfurt-DB example: ~20–30 ms/query vs ~1–3 ms
  if co-located — verify). Smart Placement can move the Worker near the backend when that's significantly
  faster. So the classic trap is *N sequential dependent calls from far away*; the fixes are parallelize
  (`Promise.all`), reduce round-trips (batch/cache), or relocate (Smart Placement) — in that order of
  preference where each applies.
- **`waitUntil` for post-response work.** Non-critical work (logging, cache writes, analytics) belongs in
  `ctx.waitUntil()` so it doesn't block the response; it survives past the response within a window (verify:
  ~30 s, shared across calls). Work that must outlive that window or be retried belongs on **Queues**.
- **How to MEASURE.** Use Workers analytics and `wrangler tail` for live request traces; read **CPU time** in
  the dashboard (it's the billed/limited quantity — distinct from total wall-clock duration); and check the
  **limits page** for the plan's current CPU/subrequest/script-size/duration numbers before concluding a limit
  is the cause. A Worker that is *inherently* I/O-bound (legitimately waiting on a backend) is not a CPU
  defect; flag the *avoidable* cost — the sequential round-trips that could overlap, the N+1 over a binding,
  the uncached recompute, the heavy global-scope init, the bloated bundle (verify against the currency brief
  for your version).

## Framework / sub-stack modules (load on detection)

Load the lanes + Workers-execution-model notes above for *every* Cloudflare audit. Workers apps are real
JS/TS (or Python / Rust-WASM) — also load the relevant **language** pack. Additionally load the module
matching the edge data service that is *central* to the scope.

| Detected (signals) | Load module |
|---|---|
| **D1** — `[[d1_databases]]` binding, `env.DB.prepare(...)` / `.batch(...)`, SQL query strings | [`cloudflare/d1.md`](cloudflare/d1.md) |
| **KV** — `[[kv_namespaces]]` binding, `env.KV.get/put/list`, eventual-consistency reads | [`cloudflare/kv.md`](cloudflare/kv.md) |
| **Durable Objects** — `[[durable_objects]]` binding, `DurableObjectNamespace`, `class … extends DurableObject` | [`cloudflare/durable-objects.md`](cloudflare/durable-objects.md) |
| **R2** — `[[r2_buckets]]` binding, `env.<BUCKET>.get/put/list`, object/ranged reads, multipart | [`cloudflare/r2.md`](cloudflare/r2.md) |
| **Queues** — `[[queues.producers]]`/`[[queues.consumers]]`, `env.<Q>.send`/`sendBatch`, a `queue(batch, env)` handler | [`cloudflare/queues.md`](cloudflare/queues.md) |
| **Cache API / edge caching** — `caches.default`/`caches.open`, `cache.match`/`put`, `fetch(…, { cf: { cacheEverything, cacheTtl } })` | [`cloudflare/cache.md`](cloudflare/cache.md) |
| **Hyperdrive** — `[[hyperdrive]]` binding, `env.<HD>.connectionString`, a Worker connecting to Postgres/MySQL | [`cloudflare/hyperdrive.md`](cloudflare/hyperdrive.md) |

*All five edge data services (D1, KV, Durable Objects, R2, Queues) plus the Cache API and Hyperdrive now
have modules; the core data-access lane still applies the round-trip framing to any not-yet-modularized
surface (Workers AI, Vectorize, Workflows, Email).*

## Sources

Load-bearing specifics — especially every numeric limit — are grounded in official Cloudflare Workers
documentation fetched for this pack; per-service keywords and version-pinned numbers belong in the modules
and the currency brief, and every limit here carries a verify-tag because these values move.

- **Workers — Limits** (developers.cloudflare.com/workers/platform/limits/): CPU time (Free 10 ms/request;
  Paid default 30 s, max 5 min, configurable); **"Waiting on network requests … does not count toward CPU
  time"**; global-scope startup must complete within **1 second**; subrequests (Free 50, Paid 1,000 default
  and configurable higher) per invocation; memory **128 MB per isolate**; Worker script size (Free 3 MB /
  Paid 10 MB gzipped, 64 MB uncompressed); ~6 simultaneous open connections; Cache API call limits per request
  (Free 50 / Paid 1,000, 512 MB max object).
- **Workers — How Workers works** (developers.cloudflare.com/workers/reference/how-workers-works/): V8
  isolates vs containers ("hundreds or thousands of isolates," start "around a hundred times faster than a
  Node process on a container or virtual machine"); single-threaded event loop; statelessness ("no guarantee
  that any two user requests will be routed to the same or a different instance," avoid mutable global state).
- **Workers — Smart Placement** (developers.cloudflare.com/workers/configuration/smart-placement/): default
  placement at the eyeball edge; relocates near a centralized backend when "significantly faster"; the
  Sydney-user → Frankfurt-DB multi-round-trip example; ~20–30 ms/query distant vs ~1–3 ms co-located.
- **Workers — ExecutionContext / `ctx.waitUntil`** (developers.cloudflare.com/workers/runtime-apis/context/):
  `waitUntil()` continues work after the response, 30-second post-response limit "shared across all
  `waitUntil()` calls"; use Queues for longer work; `passThroughOnException` fail-open.
- **Workers — Cache API** (developers.cloudflare.com/workers/runtime-apis/cache/): `caches.default` /
  `caches.open`, `match`/`put`/`delete`; **"contents of the cache do not replicate outside of the originating
  data center"**; `cache.delete` purges only the local data center; `Set-Cookie` responses not cached.
- **Hyperdrive — overview** (developers.cloudflare.com/hyperdrive/): global connection pooling so "creating a
  new client is fast," default-on query caching, transparent driver/ORM integration — addresses Workers'
  inability to pool connections per-request to a regional Postgres/MySQL origin.
