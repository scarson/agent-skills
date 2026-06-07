# Expected Findings — Observability fixture (OpenTelemetry + Prometheus + zap)

**Purpose:** exercise the **Observability companion pack** + the **Instrumentation cost model** + the
`opentelemetry`, `metrics`, and `logging` modules on a Go service whose *instrumentation* is the audit
target (not its business logic). Code-shaped (a Go `main.go`); loads *alongside* the Go language pack.
Illustrative (not built).

**Pack slice to provide:** `observability.md` lane slices + the **Instrumentation cost model** section +
`observability/opentelemetry.md`, `observability/metrics.md`, `observability/logging.md` (+ the Go lane
slice as the always-loaded base). Do NOT let the agent read this rubric.

## Planted issues (should be found)

| # | Location | Lane / module | Issue |
|---|----------|---------------|-------|
| 1 | `requestsByUser` `user_id`/`path` labels | algorithmic / metrics | **unbounded metric labels** (`user_id`, raw `path`) → cardinality explosion / TSDB OOM; move IDs to logs/traces/exemplars |
| 2 | `latency` histogram (60 buckets × `endpoint`) | algorithmic / metrics | **bucket count × unbounded label** multiplies `_bucket` series; bound buckets and label by route template |
| 3 | `log.Debug(fmt.Sprintf(... serializeOrder ...))` | algorithmic / logging | **eager arg eval at a disabled level** — Sprintf + serialize run every request though Debug is off in prod; typed fields + level guard |
| 4 | `log.Info(...)` inside the `rows` loop | concurrency / logging | **per-row logging** (logging N+1) on a sync writer → hoist to a summary; blocks the request thread |
| 5 | `NewSimpleSpanProcessor` in `main` | concurrency / opentelemetry | **synchronous per-span export** blocks the request; use `BatchSpanProcessor` in production |
| 6 | `tracer.Start(...)` inside the `rows` loop | algorithmic / opentelemetry | **span per hot-loop iteration** → per-span alloc/context cost × rows; instrument at the operation boundary |

## Beyond-the-pack (floor-not-ceiling — bonus, not a recall requirement)

| Location | Issue | Why it's beyond the pack |
|----------|-------|--------------------------|
| `durationSeconds(span)` (histogram) + the `handle` span's own duration + `log.Info("request done", duration_ms=durationMs(span))` | the **same request latency is recorded three ways** (histogram + span + log) every request | No loaded bullet names **redundant cross-signal instrumentation** — the modules cost each signal *separately* (histogram buckets, span overhead, log volume), but none says "you're capturing the same measurement via metric AND span AND log, so two are pure observer-effect overhead." The agent must reason that one source of truth for latency suffices. Finding it rewards out-reasoning; missing it is not a recall miss, but consistent misses ⇒ checklist-drift. |

## Decoy (should NOT be flagged)

| Location | Why it must be ignored |
|----------|------------------------|
| `requestsByRoute` `method`/`status` labels | these are **bounded, low-cardinality** label sets (a few HTTP methods × a few status classes) — the correct, safe use of labels. It looks like the #1 "labels = cardinality" pattern, but the value domains are small and fixed. Flagging it (or recommending the labels be removed) is a precision/checklist failure; the agent must distinguish bounded labels from the unbounded `user_id`/`path` of #1. |

## Honeypot issues (boundary tests)

| Location | Issue | Perf-related? | Expected handling |
|----------|-------|---------------|-------------------|
| `dbCountCollector.Collect()` runs `db.QueryRow("SELECT COUNT(*) FROM events")` (HONEYPOT A) | a custom collector does a **DB query inside `Collect()`**, which Prometheus calls on every scrape → each scrape pays a DB round-trip and `/metrics` is slow | **Yes — the bug IS the slowness** | **Pursue as a performance finding** (heavy work in the scrape path); move the value to a gauge updated out-of-band |
| `durationSeconds()` returns `spanElapsedNanos` (nanoseconds) straight into the `request_latency_seconds` histogram (HONEYPOT B) — contrast `durationMs`, which divides by 1e6 | a **unit bug** — ns recorded into a second-scaled histogram makes the metric wrong | **No** | **Do NOT report as a perf finding** and do NOT chase; record to Suspected Bugs if noticed (a metric-correctness bug, not an instrumentation-cost problem) |

## Scoring

- **Recall** = (# of {1..6} found) / 6. #1 must name the unbounded label (not just "has labels"); #3 must
  name eager-eval-at-disabled-level (not just "logging"); #5 must name Batch-over-Simple.
- **Precision** = the `requestsByRoute` bounded-label decoy not flagged (or explicitly kept as safe);
  zero fabricated findings.
- **Beyond-the-pack** = the triple-recorded latency flagged → bonus signal the agent reasons about
  redundant cross-signal instrumentation rather than walking each module's bullets.
- **Honeypots** = A found and pursued (counts toward recall as a perf finding); B not reported as perf and
  not chased.

## How to run

Dispatch lane subagents (algorithmic, concurrency, data-access) with the shared preamble + that lane body
from `../../lane-prompts.md`, the `observability.md` lane slice + **Instrumentation cost model** + the three
modules (`opentelemetry`, `metrics`, `logging`) + the Go lane slice, and this directory as scope. Collect
findings; score against the tables above. Do not let the subagent read this file.

## Last run

**Run 1 — 2026-06-05, Sonnet (algorithmic + concurrency), against the *labeled* source — GREEN** (recall 6/6,
decoy rejected, beyond-the-pack found, honeypots handled). Superseded: that run was against a `main.go` that
still carried inline `// PLANTED`/`// HONEYPOT` labels, so it is *assisted*, not blind evidence.

**Source delabeled 2026-06-06 (decisions log Part NN):** the inline issue labels were removed and every issue
is now expressed in the **code itself** (e.g. honeypot A's DB query is a real `db.QueryRow("SELECT COUNT(*)…")`
in `dbCountCollector.Collect()`, not a comment; honeypot B is `durationSeconds` returning ns where the sibling
`durationMs` divides by 1e6). This rubric is the **only** answer key. A clean re-run (truly blind: unlabeled
source + agent does not read this file) is recorded below.

**Run 2 — 2026-06-06, Sonnet (algorithmic + concurrency), against the *delabeled* source — GREEN (the real,
blind result).** Recall **6/6** across the two lanes (algorithmic: #1,#2,#3,#5,#6; concurrency: #1–#6). The
**decoy was rejected** by the algorithmic lane (named `requestsByRoute`'s `method`/hard-coded-`2xx` as bounded,
"the correct, safe pattern … not a finding"). The **beyond-the-pack (redundant duration — histogram + span +
log) was found by the concurrency lane with NO label present** ("the same measurement is paid twice … the
duration is already available at the trace and metric layers") — a genuinely blind floor-not-ceiling result,
not the assisted one of Run 1. **Honeypot A is now found from the code itself** (the `db.QueryRow("SELECT
COUNT(*)…")` in `Collect()`), validating that delabeling didn't hide it; **honeypot B** (ns into a `_seconds`
metric) was routed to Suspected Bugs by the algorithmic lane. **Zero fabrications.** Valid extras: per-request
`otel.Tracer()` re-resolution (both lanes), and the nil-stub artifacts correctly routed to Suspected Bugs.
**Conclusion: the delabeled fixture is strictly better evidence — every issue stayed detectable from clean
code, and the bonus item is now found blind rather than assisted.**
