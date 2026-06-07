---
index_schema_version: 1
ecosystem: observability
covered_through: "OpenTelemetry SDK/Collector (span-processor + batch + sampling defaults) as of 2026-06; Prometheus client/practices (cardinality, native histograms, exemplars); cross-language structured loggers; Grafana Alloy / Agent (EOL 2025-11-01)"
built_on: 2026-06-05
sources:
  - https://opentelemetry.io/docs/specs/otel/trace/sdk/
  - https://opentelemetry.io/docs/concepts/sampling/
  - https://opentelemetry.io/docs/collector/configuration/
  - https://prometheus.io/docs/practices/naming/
  - https://prometheus.io/docs/practices/histograms/
  - https://github.com/grafana/agent
  - https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.processor.batch/
  - https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.processor.memory_limiter/
---
# Observability performance version index
> Build-once lookup for the `observability.md` companion pack + its modules. The idiom-currency lane
> consults this first. Most observability *idioms* are durable (in the packs); this index carries the
> **SDK/collector defaults and currency facts that move** — re-verify against the live docs each pass.

## OpenTelemetry (SDK + Collector)

- **`SimpleSpanProcessor` is synchronous; `BatchSpanProcessor` is async** — Simple exports each span inline
  (blocks the caller); production uses Batch. Batch SDK defaults: `maxQueueSize` **2048** (drops on full),
  `maxExportBatchSize` **512**, `scheduledDelay` **5000 ms**, `exportTimeout` **30000 ms**. The same
  Simple-vs-Batch split applies to the log-record processor.
- **Sampling** — head sampling is `ParentBased(TraceIdRatioBased(ratio))` at the SDK (cheap, but blind to
  outcome and still pays span creation); **tail sampling lives in the Collector** (`tail_sampling` processor)
  and is outcome-aware (keep errors/slow) at the cost of buffering each trace's spans in collector memory.
- **Collector `batch` processor** — `send_batch_size` ~**8192**, `timeout` ~**200 ms**, `send_batch_max_size`
  **0** (unbounded); place it **after** `memory_limiter` and any sampling/drop processors ("Batching should
  happen after any processing that drops data"). `memory_limiter` goes **first**.
- **Async/observable instruments** run their callback **once per collection interval** — a slow callback taxes
  every export. Cumulative vs delta temporality changes payload/statefulness.
- **Currency** — OpenCensus → OTel migration is done (OpenCensus EOL); Jaeger/Zipkin exporters converge on
  **OTLP**; the logs signal has matured. Verify exporter/SDK versions against the brief.

## Prometheus / metrics

- **Cardinality = the product of each label's distinct values**, and Prometheus memory/CPU/query-speed scale
  with **active series** — an unbounded label (user id, email, request id, raw path) multiplies series without
  limit and OOMs the TSDB. Keep a metric's label-combination count to roughly **single digits / low hundreds**;
  put high-cardinality identifiers in logs/traces or an **exemplar** (which attaches a trace id "without
  inflating cardinality"; OpenMetrics + `--enable-feature=exemplar-storage`).
- **Each histogram bucket is its own `_bucket` time series** (plus `_sum`/`_count`), multiplied by the metric's
  other labels — over-bucketing × labels is a quiet cardinality multiplier. **Native (exponential) histograms**
  are one series and are the modern recommended path (verify stability for your Prometheus version).
- **Client-library handle caching** — cache the `WithLabelValues(...)`/child-metric handle rather than
  re-resolving labels every observation (client_golang notes this "should be considered if performance is
  critical"); creating a *new* label combination on a hot path is costlier than updating an existing one.

## Structured logging (cross-language — mostly durable; verify per-library)

- **Disabled-level eager-eval** is the universal footgun, fixed per-library: Python lazy `%` args +
  `isEnabledFor`; SLF4J/Logback/Log4j2 parameterized `{}` ("outperform[s] concatenation by a factor of at
  least 30" when disabled); .NET message templates + `LoggerMessage` source-gen + `IsEnabled` (skips boxing);
  Go `zap`/`slog` typed fields (but slog "arguments … are always evaluated" → guard expensive ones); Rust
  `tracing` records fields only if a subscriber is interested.
- **Async appenders** keep log I/O off the request thread: Logback `AsyncAppender`, **Log4j2 async loggers
  (LMAX Disruptor)**, pino worker-thread transport, Serilog async sink, spdlog `async_logger` — all trade a
  drop-vs-block backpressure choice and possible loss-on-crash.
- **Zero-alloc loggers**: Go `zap`/`zerolog` (reflection-free, ~hundreds of ns / few allocs per message) over
  `logrus`/`Sprintf`; JS **pino** over **winston**. **Rust** `release_max_level_*` Cargo features strip
  disabled levels at **compile time** (zero runtime cost). Verify the relative benchmark figures per version.

## Grafana Alloy / Agent

- **Grafana Agent reached End-of-Life 2025-11-01** — verified against the project repo notice ("We recommend
  migrating to the Grafana Alloy collector, which is built on the foundation of Grafana Agent Flow"). A config
  still on Agent (static or flow mode) is a currency finding → migrate to **Alloy** (an OpenTelemetry Collector
  distribution, so the OTel `batch`/`memory_limiter`/`tail_sampling` processors apply).
- **Agent-tier cardinality drop** — `prometheus.relabel` / `metric_relabel_configs` with `drop`/`labeldrop`/
  `labelkeep` is the only place to bound cardinality for metrics you don't own (third-party exporters); applied
  before ingestion. `prometheus.scrape` defaults `scrape_interval` **60s** / `scrape_timeout` **10s**;
  `scrape_samples_scraped` vs `scrape_samples_post_metric_relabeling` is the before/after-drop measurement hook.
- **`memory_limiter` first, `batch` after** in an Alloy/Collector pipeline; `tail_sampling` `num_traces`
  (~50,000) and `decision_wait` (~30s) size its in-memory trace buffer (verify defaults per version).
