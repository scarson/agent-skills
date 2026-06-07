# Profile Pack: Observability (companion)

A **companion** pack for the **performance cost of the instrumentation itself** — the CPU, allocation,
latency, and storage-cardinality overhead that metrics, logs, and traces *add* to the workload they
measure. It loads **alongside** the application's **language** pack (the instrumentation is real code in
that language — load that pack too) and reframes the standard lanes around **telemetry overhead**: the
per-event work and label cardinality a metric/span/log incurs, the export I/O it generates, the hot-path
blocking it can cause, the SDK/agent startup it adds, and the version-currency of the telemetry stack.

**Content-detected** (OpenTelemetry deps — `@opentelemetry/*`, `opentelemetry-api`/`-sdk`,
`go.opentelemetry.io/otel`, `OpenTelemetry.*` NuGet; Prometheus/StatsD client libs — `prom-client`,
`prometheus_client`, `prometheus/client_golang`, `micrometer`, `prometheus-net`; structured-logging
libs — `structlog`/`pino`/`winston`/`zap`/`zerolog`/`slog`/`tracing`, Logback/Log4j2, Serilog,
`Microsoft.Extensions.Logging`; agent/collector configs — OTel Collector, Grafana Alloy/Agent,
Datadog, `vector`). This is an **overhead** lens, sharply distinct from observability *coverage*. The
boundary is hard, and it matters: **this pack audits whether the instrumentation is making the app slower
or the time-series database explode — never whether the app has *enough* telemetry.** "Is there a span
here?", "should we log this event?", "do we have a metric for that?" are **coverage** questions; they
belong to the skill's separate **Measurability** synthesis step, not to a perf finding. This pack asks
"why does this metric have four million active series" and "why is this request thread blocked writing a
log line," never "we should add a trace here." Concrete API names and **every default** are tagged
"(verify against the currency brief for your version)" because SDK surface and defaults move; per-signal
depth (OTel SDK, Prometheus/StatsD cardinality, structured logging, the agent/collector tier) lives in the
modules mapped at the bottom.

---

## Cardinality & per-event work (lane `algorithmic`)
- **Metric label cardinality is the dominant cost on the metrics signal — each unique label-value
  combination is a separate time series.** Prometheus is explicit: "Every unique combination of key-value
  label pairs represents a new time series." A high-cardinality label multiplies series combinatorially
  across every *other* label on the metric, so the active-series count — the quantity that bounds the
  TSDB's RAM, CPU, disk, and network — is the product of all label cardinalities, not their sum. This is
  the single highest-leverage thing this pack hunts; weight it first on any metrics-heavy scope (verify
  against the currency brief for your version).
- **An unbounded label value is the cardinality killer** — `user_id`, `request_id`, `email`, a full URL
  path with IDs, a raw error message, a session token. The docs name these directly: "Do not use labels to
  store dimensions with high cardinality … such as user IDs, email addresses, or other unbounded sets of
  values." One unbounded label turns a single metric into one series *per distinct value forever*, which is
  how a TSDB OOMs. The defect is the *unboundedness* of the dimension, not the label count; a label with
  ten stable values is fine, one with ten million is fatal (verify against the currency brief for your
  version).
- **Histogram buckets multiply the series count** — each configured bucket on a classic histogram is its
  own `_bucket` time series ("each bucket configured … will create a series suffixed with `_bucket`, no
  matter if the bucket is populated or not"), *plus* `_sum` and `_count`. So a histogram's series cost is
  `(buckets + 2) × (product of label cardinalities)`; ten buckets on a metric with a per-endpoint label is
  an order of magnitude more series than a counter. Audit bucket count and label set *together* — they
  compound (verify against the currency brief for your version).
- **Per-span / per-log attribute construction runs whether or not the telemetry is kept** — building an
  attribute map, interpolating a message, serializing a struct, or calling an expensive accessor to
  populate a tag is CPU and allocation spent *before* any sampling or level-filter decision. Work done to
  produce telemetry that's then sampled or filtered away is pure waste; flag eager attribute/message
  construction on the hot path that a guard or lazy closure would skip.
- **Eager string formatting at a disabled log level** — `log.debug(f"... {expensive()}")` (or any pre-
  formatted message passed to a level that's filtered out) evaluates the interpolation and the arguments
  regardless of whether the line is emitted. Structured loggers with lazy field evaluation or level guards
  avoid it; the eager form pays full formatting cost for output that's discarded. One point, durable across
  every logging library.
- **Instrumenting an inner loop that runs at very high frequency** — a metric increment, span, or log
  inside a path called hundreds of thousands of times per second has measurable per-call cost (counter
  updates and label lookups are not free), and the docs caution to limit metric updates in such inner
  loops and avoid labels there. The justification is the *call frequency*, not general tidiness: telemetry
  that's negligible per call becomes a hot-spot when the call is the hot path (verify against the currency
  brief for your version).

## Telemetry export I/O (lane `data-access`)
- **Export should be batched and off the hot path; per-event synchronous export is the trap** — a span
  processor or log appender that issues one network write *per span/log* turns every instrumented event
  into an I/O round-trip. OTel's `SimpleSpanProcessor` exports each span "as soon as they are finished" and
  serializes those calls; `BatchSpanProcessor` instead "create[s] batches of finished spans" and exports
  asynchronously. Flag the simple/synchronous processor (or a synchronous log shipper) on any
  non-trivial-volume path — batching collapses N writes into one (verify against the currency brief for
  your version).
- **Scrape/payload size scales with active series and metric count** — a Prometheus scrape transfers the
  full exposition of every series each interval, so the same cardinality explosion that bloats the TSDB
  also bloats every scrape payload and its parse cost. A `/metrics` endpoint emitting hundreds of thousands
  of lines is both an egress cost and a scrape-latency cost; the fix is the cardinality fix, not a bigger
  scrape timeout.
- **Ingest/egress volume is a direct, metered cost** — logs and traces shipped to a backend (or across a
  cloud egress boundary) are billed and bandwidth-bound by *volume*. Unsampled high-volume traces, DEBUG
  logging left on in production, or duplicate telemetry (app *and* agent both exporting the same signal)
  multiply the bytes on the wire. Flag volume that sampling/level-filtering would bound before it leaves
  the process (see the sampling note in the cost model).
- **The collector/agent tier is itself an I/O and buffering stage** — routing telemetry through an OTel
  Collector / Alloy / Vector adds a hop with its own batching, queueing, and retry buffers; misconfigured
  (tiny batches, unbounded retry queues, no compression) it becomes a latency or memory problem of its
  own. Audit the agent's batch/queue/compression config, not just the app's (defer to the agent/collector
  module).
- **Over-detailed telemetry that's read by no one** — a histogram with fifty buckets when five answer the
  question, attributes captured "just in case," or a log payload embedding a whole request body all pay
  full serialization and transport cost for data nothing queries. The justification test applies to
  telemetry too: bytes produced and shipped but never read are pure overhead (verify against the currency
  brief for your version).

## Hot-path blocking & contention (lane `concurrency`)
- **Synchronous export/logging on the request thread blocks it on I/O** — a log write that flushes to disk
  or ships over the network inline, or a span exported synchronously, stalls the request thread for the
  duration of that I/O. The fix is an async/batch processor with a bounded queue (OTel's
  `BatchSpanProcessor`, an async log appender) so the request thread enqueues and returns while a
  background worker drains. This is the concurrency face of the synchronous-export trap; flag inline
  telemetry I/O on any latency-sensitive path (verify against the currency brief for your version).
- **The bounded queue forces a drop-vs-block backpressure choice — know which one is configured** — a
  batch processor's queue has a finite size (OTel's `BatchSpanProcessor` defaults `maxQueueSize` to 2048,
  and "after the size is reached, spans are dropped"). When telemetry outpaces export you either *drop*
  (lose data, protect latency) or *block* (preserve data, stall the producer). Neither is wrong, but a
  pack-audit must surface which behavior is in effect: a blocking queue silently couples app latency to
  backend health (verify against the currency brief for your version).
- **Registry/metric lock contention on every observation** — some metrics clients guard the registry or a
  shared metric with a lock taken on *each* increment/observe; under high concurrency that lock serializes
  the very hot path being measured. The contention scales with concurrency and observation frequency, not
  with cardinality; flag a single hot metric observed from many threads where the client's locking model
  makes the observation a synchronization point (defer to the per-client metrics module).
- **A blocking exporter coupling app health to backend health** — if export blocks (queue-full-blocks, or a
  synchronous exporter) and the telemetry backend slows or stalls, that backpressure propagates *into the
  application*, so an observability outage becomes an application latency incident. The defensive posture is
  bounded queues that drop under pressure plus exporter timeouts; flag a configuration where a slow
  collector can stall request threads (verify against the currency brief for your version).
- **Async export worker contending for the resource it's measuring** — a background export thread competes
  for CPU, GC, and allocator with the workload; on a saturated host the exporter's own work shows up *as*
  the overhead. Usually small, but on a CPU-bound service the exporter is not free — measure it (see the
  observer-effect note in the cost model).

## SDK / agent init & dependency weight (lane `payload-startup`)
- **SDK/agent initialization is a startup cost** — wiring up the OTel SDK (tracer/meter/logger providers,
  processors, exporters, resource detection) runs at process start; resource detectors that probe the
  environment, and exporter handshakes, add to cold-start. Flag heavy telemetry init on a cold-start-
  sensitive surface (serverless, short-lived CLIs) where it's a meaningful fraction of startup (verify
  against the currency brief for your version).
- **Auto-instrumentation instruments *everything* — overhead vs targeted coverage** — an auto-instrumentation
  agent (Java agent, OTel auto-instrumentation, eBPF/runtime hooks) wraps every supported library call,
  producing spans for paths that don't need them and paying per-call interception overhead broadly. It's
  the fast way to *get* coverage, but the overhead is untargeted; flag blanket auto-instrumentation on a
  hot service where selective manual instrumentation would cost far less per request (verify against the
  currency brief for your version).
- **The telemetry stack's dependency/bundle weight** — the OTel SDK plus exporters plus instrumentation
  packages is a non-trivial dependency tree (bundle size for JS/edge targets, binary size and init for
  compiled languages, transitive deps to audit). Importing the full meta-package for one signal pulls in
  the others; flag the whole-SDK pull where one signal is used (defer to the per-signal module for the
  minimal dependency set).
- **Eager creation of instruments/metrics that are never recorded** — registering a large catalog of
  counters/histograms at startup (especially with pre-declared label permutations) pre-allocates series
  and registry entries before any data flows, paying memory and init for telemetry that may never fire.
  Prefer lazy instrument creation where the recording site is conditional.
- **Resource detection and exporter discovery probing the environment at start** — cloud/k8s resource
  detectors making metadata-endpoint calls, or exporters resolving an endpoint, add network round-trips to
  startup. Usually minor, but on a fast-start surface they're on the cold path; flag synchronous
  environment probing during SDK init (verify against the currency brief for your version).

## Telemetry-stack currency (lane `idiom-currency`)
- **OTel API/SDK/exporter version drift** — the OpenTelemetry API, SDK, and exporters version
  independently and the spec moves (signals graduate from experimental to stable at different times,
  defaults change); a far-behind SDK or a mismatched API/SDK pair can mean slower export paths, missing
  batching/compression options, or known overhead regressions the current release fixes. Consult the
  currency brief for the version; offline, flag at LOW confidence for manual currency check (verify against
  the currency brief for your version).
- **Deprecated exporters and the OTLP convergence** — older protocol-specific exporters (e.g. a legacy
  Jaeger or Zipkin exporter) and bespoke shippers are being superseded by **OTLP** as the common path;
  a stack still on a deprecated exporter may carry overhead or maintenance the OTLP path has shed. Consult
  the brief for what's current; offline, LOW confidence (verify against the currency brief for your
  version).
- **Deprecated agent/collector — Grafana Agent → Alloy** — the Grafana **Agent** is superseded by **Grafana
  Alloy**; an agent-tier still on the deprecated collector may miss batching/queueing/performance
  improvements and is on a maintenance dead end. Flag a deprecated agent/collector as a currency finding,
  not a runtime one; consult the brief for the current generation (verify against the currency brief for
  your version).
- **Sampling strategy currency** — sampling approaches and their defaults evolve (head vs tail, parent-based
  defaults, ratio configuration); a stack relying on an outdated sampler default, or no sampling where the
  volume now warrants it, is a currency-shaped overhead finding. Consult the brief for current sampler
  recommendations; offline, LOW confidence.

---

## Instrumentation cost model (read for every observability audit)

Observability is **overhead added to the thing being measured** — its whole job is to watch the workload,
so it must be *cheap relative to that workload* or it distorts what it measures. This is the runtime-notes
analog: how to reason about and *measure* telemetry overhead before concluding. The three signals have
**different cost profiles**, and conflating them is the most common analysis error.

- **Metrics are cardinality-bound.** A metric's cost is set not by how often it's observed but by how many
  **active time series** it produces — the product of all its label cardinalities (and, for histograms,
  bucket count). Series count drives the TSDB's RAM, CPU, disk, and network; the docs put soft cardinality
  budgets in the single-to-low-double digits per metric and warn that millions of series "is too much for
  the current implementation of Prometheus." **Cardinality is the metric killer** — an unbounded label
  (`user_id`, `request_id`, full path) is the defect to hunt first (verify against the currency brief for
  your version).
- **Logs are volume- and serialization-bound.** A log line's cost is the work to *build and serialize* it
  (structured-field assembly, JSON encoding) plus the *volume* shipped and stored. DEBUG-in-production,
  per-request verbose logging, and eager message formatting at filtered levels are the volume defects;
  level filtering and sampling are the controls.
- **Traces are per-span-bound, controlled by sampling.** A trace's cost is per-span creation/attribute work
  plus export of the spans kept; **sampling controls trace (and log) volume.** Sampling "is one of the most
  effective ways to reduce the costs of observability without losing visibility." **Head sampling** decides
  early (cheap, but can't see the whole trace — may miss errors); **tail sampling** decides after the full
  trace is buffered (can keep all error/slow traces, but needs stateful infrastructure). Note the cost
  asymmetry: head sampling can skip span *work*; tail sampling still *produces* every span before deciding,
  so work done for a span sampled away at the tail is paid in full.
- **Export belongs async + batched, off the hot path.** Whatever the signal, the request thread should
  *enqueue* telemetry and return; a background worker batches and exports. Per-event synchronous export
  (OTel's `SimpleSpanProcessor`, a synchronous log shipper) puts I/O on the request path; batch processors
  with bounded queues move it off — at the cost of a **drop-vs-block** choice when the queue fills (verify
  against the currency brief for your version).
- **You must measure the overhead itself — the observer effect is real.** Telemetry that's "probably cheap"
  is an assumption, not a measurement. **How to measure:** (1) run the workload **with and without
  instrumentation** and compare latency/CPU/allocation — that delta *is* the overhead; (2) watch the
  **active-series count** (e.g. `prometheus_tsdb_head_series` or the backend's series gauge) and alert on
  its growth — a climbing series count is cardinality leaking; (3) **profile the exporter/agent** as a
  first-class component (its CPU, its queue depth, its drop count). A service that is *legitimately*
  well-instrumented is not a defect; flag the *avoidable* cost — the unbounded label, the synchronous
  export on the request thread, the DEBUG logging left on, the fifty-bucket histogram nobody queries
  (verify against the currency brief for your version).

## Framework / sub-stack modules (load on detection)

Load the lanes + instrumentation-cost-model notes above for *every* observability audit. The
instrumentation is real code — also load the relevant **language** pack. Additionally load the module
matching the telemetry technology that is *central* to the scope.

| Detected (signals) | Load module |
|---|---|
| **OpenTelemetry** — `@opentelemetry/*`, `opentelemetry-api`/`-sdk`, `go.opentelemetry.io/otel`, `OpenTelemetry.*` NuGet; tracer/meter/logger providers, span/batch processors, OTLP exporters | [`observability/opentelemetry.md`](observability/opentelemetry.md) |
| **Prometheus / StatsD** — `prom-client`, `prometheus_client`, `prometheus/client_golang`, `micrometer`, `prometheus-net`; `/metrics` exposition, label/bucket definitions, registries | [`observability/metrics.md`](observability/metrics.md) |
| **Structured logging** — `structlog`/`pino`/`winston`/`zap`/`zerolog`/`slog`/`tracing`, Logback/Log4j2, Serilog, `Microsoft.Extensions.Logging`; appenders, levels, encoders | [`observability/logging.md`](observability/logging.md) |
| **Agent / collector tier** — OTel Collector, **Grafana Alloy** (or deprecated Grafana Agent), Datadog agent, `vector` configs; pipelines, batch/queue/retry settings | [`observability/grafana-alloy.md`](observability/grafana-alloy.md) |

## Sources

Load-bearing specifics — especially cardinality guidance, processor defaults, and the sampling model — are
grounded in official Prometheus and OpenTelemetry documentation fetched for this pack; per-tool keywords
and version-pinned defaults belong in the modules and the currency brief, and every default here carries a
verify-tag because these values move.

- **Prometheus — metric and label naming** (prometheus.io/docs/practices/naming/): "Every unique
  combination of key-value label pairs represents a new time series"; "Do not use labels to store
  dimensions with high cardinality (many different label values), such as user IDs, email addresses, or
  other unbounded sets of values."
- **Prometheus — instrumentation** (prometheus.io/docs/practices/instrumentation/): soft cardinality budget
  ("keep the cardinality of your metrics below 10 … aim to limit them to a handful across your whole
  system"; investigate alternatives above ~100); each labelset is "an additional time series that has RAM,
  CPU, disk, and network costs"; the 10,000-nodes × 10,000-users series-explosion example ("too much for
  the current implementation of Prometheus"); guidance to limit metric updates in >100k-calls/sec inner
  loops and avoid labels there.
- **Prometheus — histograms and summaries** (prometheus.io/docs/practices/histograms/): "each bucket
  configured … will create a series suffixed with `_bucket`, no matter if the bucket is populated or not";
  buckets are hard to pick in advance and disruptive to change; native histograms avoid the per-bucket
  series explosion.
- **OpenTelemetry — sampling** (opentelemetry.io/docs/concepts/sampling/): "Sampling is one of the most
  effective ways to reduce the costs of observability without losing visibility"; head sampling (early,
  cheap, can't see whole trace) vs tail sampling (after the full trace, can keep error/latency traces,
  needs stateful infrastructure).
- **OpenTelemetry — trace SDK spec** (opentelemetry.io/docs/specs/otel/trace/sdk/): `SimpleSpanProcessor`
  exports finished spans "as soon as they are finished" and serializes export calls; `BatchSpanProcessor`
  "create[s] batches of finished spans" and exports asynchronously, with `maxQueueSize` default **2048**
  ("after the size is reached, spans are dropped") and `maxExportBatchSize` default **512**.
- **OpenTelemetry — metrics signal** (opentelemetry.io/docs/concepts/signals/metrics/): instrument types
  (Counter, UpDownCounter, Gauge, Histogram; sync/async variants); Views customize which attributes are
  reported and the aggregation; async instruments collected once per export cycle.
