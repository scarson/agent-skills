# Expected Findings — Cloudflare fixture (Workers + D1 + KV + Durable Objects)

**Purpose:** exercise the **Cloudflare companion pack** + the **Workers execution model** + the `d1`, `kv`,
and `durable-objects` modules on a dashboard-API Worker (`index.js`). Unlike the CI/CD and IaC fixtures
(config-shaped), this is **code-shaped** (a JS Worker) — the lanes exercised are the Workers-remapped ones
(CPU budget / edge data access & subrequests / deferred work). Loads *alongside* the JS/TS language pack.
Illustrative (not deployed).

**Pack slice to provide:** `cloudflare.md` lane slices + the **Workers execution model** section + the
`cloudflare/d1.md`, `cloudflare/kv.md`, `cloudflare/durable-objects.md` modules (+ the JS/TS language pack
lane slice as the always-loaded base). Do NOT let the agent read this rubric.

## Planted issues (should be found)

| # | Location | Lane / module | Issue |
|---|----------|---------------|-------|
| 1 | three sequential `await`s (KV `config` + D1 `account` + `weather` fetch) | concurrency / data-access | **independent reads serialized** → `Promise.all` overlaps the three round-trips |
| 2 | `for (meterId of meterIds)` D1 loop | data-access / d1 | **N+1**: one D1 round-trip per meter → one `IN (...)` query or `db.batch([...])` |
| 3 | `env.KV.put("hits:"+accountId)` per request | data-access / kv | **per-request KV write** (eventual + ~1 write/sec/key) → wrong store; use the Durable Object |
| 4 | `await fetch(".../track")` analytics | concurrency | **non-critical work awaited on the response path** → `ctx.waitUntil(...)` |
| 5 | `unique`/`.some()` de-dup loop | algorithmic / CPU | **O(n²) request-path compute** risks the CPU cap on a large `meters` list → Set/Map |
| 6 | `SELECT * FROM invoices` + JS `.filter` | data-access / d1 | **whole-table read filtered in JS** → over-reads/over-bills rows; filter + paginate in SQL |

*(Structural credit if raised: #3's counter belongs in the `RateLimiter` Durable Object that's already
bound — a run that connects "per-request KV counter → use the DO" is making the highest-value store-choice
call, not padding.)*

## Beyond-the-pack (floor-not-ceiling — bonus, not a recall requirement)

| Location | Issue | Why it's beyond the pack |
|----------|-------|--------------------------|
| `await fetch(".../account/"+accountId)` (`enrich`) | the request-path subrequest has **no timeout** — a slow/hung upstream stalls the whole request and **holds one of the ~6 simultaneous-connection slots** | No loaded bullet names the **missing-`fetch`-timeout / tail-latency** footgun. The pack names subrequest *count*, latency, and the ~6-connection ceiling, but not "set `AbortSignal.timeout()` so a hung upstream can't stall the request or pin a connection slot." The agent must connect tail-latency + the connection ceiling. Finding it rewards out-reasoning; missing it is not a recall miss, but consistent misses ⇒ checklist-drift. |

## Decoy (should NOT be flagged)

| Location | Why it must be ignored |
|----------|------------------------|
| `primary` then `tariff` D1 reads | these look like a #1-style "parallelize with `Promise.all`" target, but the `tariff` query **depends on `primary.results[0].tariff_id`** — it genuinely cannot start until `primary` resolves. Recommending `Promise.all` here is a precision/correctness failure (it would break the data dependency). The agent must distinguish this from the genuinely-independent #1. |

## Honeypot issues (boundary tests)

| Location | Issue | Perf-related? | Expected handling |
|----------|-------|---------------|-------------------|
| `cacheKey = new Request(... + Date.now())` (HONEYPOT A) | the Cache API key embeds `Date.now()`, so it's unique every request → the cache **never hits** and the expensive render runs every time | **Yes — the bug IS the slowness** | **Pursue as a performance finding** (defeated cache → recompute every request); fix the key to omit the per-request nonce |
| `if (hits > limit + 1)` (HONEYPOT B) | off-by-one (`>` + `+1`) lets requests past the intended rate limit | **No** | **Do NOT report as a perf finding** and do NOT chase; record to Suspected Bugs if noticed (a logic/correctness bug, not a latency/CPU cost) |

## Scoring

- **Recall** = (# of {1..6} found) / 6. #1 must state the three calls are independent (the guard); #3 should
  name the store-choice (→ Durable Object); #5 should name the CPU cap (not just "it's O(n²)").
- **Precision** = the `primary`/`tariff` dependent-reads decoy not flagged as a parallelization target;
  zero fabricated findings.
- **Beyond-the-pack** = the missing-`fetch`-timeout flagged → bonus signal the agent reasons from the
  connection ceiling + tail-latency rather than walking the bullet list.
- **Honeypots** = A found and pursued (counts toward recall as a perf finding); B not reported as perf and
  not chased.

## How to run

Dispatch lane subagents (algorithmic, data-access, concurrency) with the shared preamble + that lane body
from `../../lane-prompts.md`, the `cloudflare.md` lane slice + **Workers execution model** + the three
modules (+ the JS/TS lane slice), and this directory as scope. Collect findings; score against the tables
above. Do not let the subagent read this file.

## Valid additional findings (credit — do NOT score as fabrications)

- `RateLimiter.fetch()` (`index.js`) — re-reads `state.storage.get("count")` on **every** invocation instead
  of hydrating once and keeping the count in memory (the `durable-objects.md` in-memory-state anti-pattern).
  A real finding beyond the planted set; all three lanes surfaced it.
- The non-atomic KV read-modify-write race on the hit counter (lost updates under concurrency) — correctly
  routed to Suspected Bugs as a correctness issue, subsumed by planted #3's store-choice fix.

## Last run

**2026-06-05, Sonnet (3 lanes: algorithmic / data-access / concurrency) — GREEN.**
Recall **6/6** (every planted issue found, most by ≥2 lanes; #3 named the store-choice → the bound
`RateLimiter` DO). The **beyond-the-pack (missing `fetch` timeout) was found by all three lanes — with NO
nudge in the prompts** — each reasoning from the ~6-connection ceiling + tail-latency + `AbortSignal.timeout`
(the **third consecutive clean blind** floor-not-ceiling result, after `cicd-sample` and `iac-sample`). The
`primary`/`tariff` dependent-reads **decoy was explicitly examined and rejected** by the concurrency lane on
data-dependency grounds. Honeypot A (`Date.now()`-keyed cache) was pursued as a perf finding; honeypot B
(rate-limit off-by-one) was recorded to Suspected Bugs as "correctness, not performance" by all three lanes.
**Valid extras:** the DO storage re-read and the KV read-modify-write race (recorded above). **Zero
fabrications.** The run validates the Cloudflare companion end-to-end: the Workers-execution-model framing
drove the CPU-vs-I/O distinction (CPU lane took the O(n²); the I/O lanes took the round-trips), the
store-choice call landed, and the subrequest/connection-ceiling reasoning produced the beyond-the-pack.
