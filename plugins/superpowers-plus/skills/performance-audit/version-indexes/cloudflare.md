---
index_schema_version: 1
ecosystem: cloudflare
covered_through: "Cloudflare Workers platform limits as of 2026-06 (CPU/subrequests/script-size/memory); Workers KV; D1 (Sessions API / read replication); Durable Objects (SQLite storage, WebSocket Hibernation)"
built_on: 2026-06-05
sources:
  - https://developers.cloudflare.com/workers/platform/limits/
  - https://developers.cloudflare.com/workers/reference/how-workers-works/
  - https://developers.cloudflare.com/workers/configuration/smart-placement/
  - https://developers.cloudflare.com/workers/runtime-apis/context/
  - https://developers.cloudflare.com/kv/platform/limits/
  - https://developers.cloudflare.com/kv/concepts/how-kv-works/
  - https://developers.cloudflare.com/d1/platform/limits/
  - https://developers.cloudflare.com/d1/best-practices/read-replication/
  - https://developers.cloudflare.com/durable-objects/platform/limits/
  - https://developers.cloudflare.com/durable-objects/best-practices/websockets/
---
# Cloudflare performance version index
> Build-once lookup for the `cloudflare.md` companion pack + its modules. The idiom-currency lane consults
> this first. **Cloudflare's platform limits move** (and plans change them), so this whole index is
> "verify against the live limits page"; recall is unreliable on these numbers — these were fetched
> 2026-06.

## Workers runtime limits (verify against the live limits page)

- **CPU time** — **Free: 10 ms/request; Paid: 30 s default, 5 min (300 s) max, configurable.** Only **CPU
  time counts**, not wall-clock time awaiting I/O (a slow `fetch`/KV/D1 call does not burn the budget). A
  request killed for exceeding CPU is a compute defect, not an I/O one.
- **Subrequests per invocation** — **Free 50, Paid 1,000 (default; configurable higher).** Caps total
  outbound `fetch`/binding calls, so an N+1 fan-out can *fail* (not just slow) — the cap makes N+1 a
  correctness risk on Workers.
- **Memory** — **128 MB per isolate.** Buffering large bodies into memory risks it; stream instead.
- **Script size** — **Free 3 MB / Paid 10 MB gzipped** (64 MB uncompressed ceiling). *(Note: Free is 3 MB,
  not 1 MB — a common recall error.)* A bundle near the cap signals heavy deps dragging startup.
- **Global-scope startup** — top-level/global init must complete within **~1 second**, and runs **per
  isolate spin-up** (not once globally). *(Not ~400 ms — recall error.)* Expensive eager init is a
  recurring startup tax.
- **Simultaneous open connections** — **~6** connections waiting on response headers; a very wide
  `Promise.all` fan-out queues behind this, so concurrency only overlaps up to ~6.
- **`waitUntil` post-response window** — **~30 s, shared across all `waitUntil()` calls.** Work needing
  longer (or retries) belongs on **Queues**, not `waitUntil`.
- **Cache API** — `caches.default` is **per-data-center, not global** (contents don't replicate; `delete`
  purges only the local colo); call limits Free 50 / Paid 1,000 per request, 512 MB max object.
- **Isolates, not containers** — cold start ~100× faster than a Node process on a VM/container, so
  *cold-start avoidance is mostly a non-issue*; optimize bundle size + global-scope init instead.
- **Smart Placement** — no published numeric round-trip threshold ("significantly faster"); the docs' example
  is ~20–30 ms/query from a distant edge vs ~1–3 ms co-located. The trap is **N sequential dependent calls
  from a far edge to one backend** — fix order: parallelize → batch/cache → relocate.

## Workers KV (verify)

- **Eventual consistency** — a write takes **up to ~60 s (or more)** to propagate to other edge locations;
  not guaranteed immediately visible even at the writing location. Read-after-write logic is a correctness
  bug on KV → use Durable Objects / D1.
- **Write rate** — **1 write/sec per unique key** (Free + Paid). Counters/sessions/per-request writes hit
  this — wrong store (→ Durable Objects).
- **Sizes** — value **25 MiB**, key **512 B**, metadata **1024 B**.
- **Operations** — **1,000 KV ops per Worker invocation**; `list()` returns **default = max = 1,000** keys
  per call (cursor pagination), is central + not edge-cached.
- **`cacheTtl`** — default **60 s**, minimum **30 s**; tunes edge-cache duration (longer = fewer central
  reads, staler). Reads are edge-cached + cheap; writes/deletes/lists are central + costlier.

## D1 (SQLite at the edge — verify)

- **Limits** — DB size **10 GB Paid / 500 MB Free**; max response / string / BLOB / row **2 MB**; bound
  params per query **100**; SQL statement length **~100 KB**; columns/table **100**; query duration **30 s**.
- **`batch()`** — multiple prepared statements in **one round-trip**, run **sequentially** and as an
  **implicit transaction** (rolls back on failure). The N+1 fix; there is no documented max statements/batch
  (per-statement limits apply within it).
- **Sessions API / read replication** — routes reads to a nearby replica; **sequential consistency**
  (bookmark-gated, *not* loose "eventual"); read-your-writes via the `x-d1-bookmark` header + `withSession()`.
  Actively evolving — verify header/method names and defaults.
- **Billing/latency = rows read** — a scan bills every row scanned, not just returned; `D1Result.meta`
  carries `rows_read`/`rows_written`/`duration` as the measurement hook.

## Durable Objects (verify)

- **Throughput** — **~1,000 requests/sec soft limit per object** (single-threaded); **unlimited objects per
  namespace** — scale by sharding ids, not by a faster handler.
- **Storage** — `get`/`put`/`delete` batch **up to 128 keys** per call; un-awaited consecutive `put`s are
  **write-coalesced** into one atomic commit; **10 GB per SQLite object**.
- **SQLite storage backend** — Cloudflare **recommends all new namespaces use SQLite-backed storage**
  (`state.storage.sql`, synchronous ops, 30-day point-in-time recovery); backend is set at class creation via
  migration and isn't trivially switched.
- **`blockConcurrencyWhile`** — blocks **all** event delivery until it resolves (init-only); carries a
  timeout (~30 s, verify) that resets the object if exceeded.
- **WebSocket Hibernation** — "Billable Duration (GB-s) charges do not accrue during hibernation"; the DO is
  evicted from memory (constructor reruns, in-memory state resets — reattach via `serializeAttachment`/
  `deserializeAttachment`) while sockets stay connected. Without it, idle WebSocket DOs bill GB-s.
- **Alarms** — `setAlarm`/`getAlarm`/`deleteAlarm` wake an idle/hibernated object (at-least-once), replacing
  polling/keep-alive. **RPC** (`stub.method(args)`) over the legacy `stub.fetch()` shim, enabled by a recent
  compatibility date.

## R2 (verify)

- **Cost = operations, not egress** — **zero egress fees**; **Class A** ops (`PutObject`, `ListObjects`,
  `CopyObject`, multipart `CreateMultipartUpload`/`UploadPart`/`CompleteMultipartUpload`) bill at a much higher
  per-million rate than **Class B** reads (`GetObject`, `HeadObject`); `DeleteObject`/`AbortMultipartUpload`
  free. So serving bytes is cheap; per-request **writes/`list`s** are the expensive pattern.
- **`list` ≤ 1000 entries/page** (`truncated`/`cursor`/`prefix`/`delimiter`); `delete` up to 1000 keys/call.
- **Ranged reads** — `get(key, { range: { offset, length } | { suffix } })` / HTTP `Range` returns only the
  window; **`onlyIf`** (`etagMatches`/`etagDoesNotMatch`/`uploadedBefore`/`uploadedAfter`) for conditional
  revalidation. `get` body is a `ReadableStream` — stream it; `.arrayBuffer()/.text()` materializes the whole
  object in the 128 MB isolate. Multipart parts must be uniform size except the last.
- **Storage classes** — Standard vs **Infrequent Access** (lower storage rate, but a per-GB retrieval fee + a
  **30-day minimum storage duration**). Presigned URLs (S3 API, 1 s–7 day expiry) offload large transfers
  off the Worker.

## Queues (verify)

- **Consumer batching** — `max_batch_size` default **10** (range 1–100); `max_batch_timeout` default **5 s**
  (range 0–60 s); `max_retries` default **3** (max 100); `max_concurrency` range 1–250 (push consumers;
  recommended left unset to autoscale). Process the **whole batch** in one downstream op, not per-message.
- **Producer** — `sendBatch([...])` sends many in one call (limit **100 messages or 256 KB total**); a single
  message is ≤ **128 KB**. Use explicit per-message `ack()`/`retry()` so one failure doesn't retry the whole
  batch; route poison messages to a **dead-letter queue**.
- **Throughput/duration** — ~**5,000 msg/s** per queue; consumer invocation ~15 min wall-clock; pull consumers
  default `batch_size` 5. Durable/retriable background work belongs here, not on `waitUntil` (~30 s).

## Cache API & edge caching (verify)

- **`caches.default` is per-data-center** (not global; `delete` purges only the local colo) — a per-edge
  hit-rate optimization, not a coherent global store. **Tiered Cache** adds a regional upper tier to improve
  multi-colo hit ratio. Cache API call limits (Free 50 / Paid 1,000 per request, 512 MB max object) live on
  the Workers limits page.
- **`cache.put` won't cache** responses with `Set-Cookie`, `Vary: *`, status 206, or `413` bodies, and is
  GET-like only — an ineligible response silently never caches; **`ctx.waitUntil(cache.put(...))`** so the
  write isn't on the response path. A cache key built with a per-request value (`Date.now()`, nonce, volatile
  query params) **never hits**.
- **`fetch(url, { cf: { cacheEverything: true, cacheTtl, cacheTtlByStatus, cacheKey } })`** makes a normally-
  uncacheable origin/API subrequest cacheable at the edge; `cacheTtlByStatus` to avoid caching errors long.
  Edge TTL (`s-maxage`) vs browser TTL (`max-age`) — match to the data's change rate.

## Hyperdrive (verify)

- **Solves Workers' no-pooling problem** — Workers are stateless between requests, so a raw Postgres/MySQL
  driver pays a TLS+auth handshake per request from a distant edge and can exhaust the DB's connection limit;
  Hyperdrive maintains a **global pool** so per-request client creation is fast. Needs `nodejs_compat` + a
  supported driver (`pg`/`postgres`/`mysql2`).
- **Query caching default-ON for read-only queries** — default `max_age` **60 s**, `stale_while_revalidate`
  **15 s**, `max_age` cap **1 hour**; disable via `wrangler hyperdrive update <id> --caching-disabled true`.
  **Only `IMMUTABLE`-function queries cache** — `now()`/`current_date` (STABLE) and writes/transactions/
  non-deterministic queries **bypass** the cache (so caching helps read-heavy, not write-heavy, workloads).
- **What Hyperdrive does NOT fix** — N+1, missing indexes, and over-fetch are still per-query round-trips
  (now from a pooled connection); the SQL-level concerns in `../sql.md` and `cloudflare/d1.md` still apply.
  Smart Placement complements it for chatty, uncacheable workloads.
