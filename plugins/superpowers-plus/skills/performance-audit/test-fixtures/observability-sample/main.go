// Observability eval fixture for the performance-audit skill (illustrative — NOT
// built; lives under test-fixtures/). A small HTTP service instrumented with
// prometheus/client_golang + zap + OpenTelemetry; the audit target is the cost of
// the instrumentation. The answer key is in expected-findings.md (assessor-only —
// do NOT read it when running a lane against this fixture).
package main

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.uber.org/zap"
)

var (
	requestsByUser = prometheus.NewCounterVec(
		prometheus.CounterOpts{Name: "requests_total", Help: "requests"},
		[]string{"user_id", "path"},
	)

	requestsByRoute = prometheus.NewCounterVec(
		prometheus.CounterOpts{Name: "http_requests_total", Help: "requests"},
		[]string{"method", "status"},
	)

	latency = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "request_latency_seconds",
			Buckets: prometheus.LinearBuckets(0.001, 0.001, 60),
		},
		[]string{"endpoint"},
	)
)

var log *zap.Logger

func handler(w http.ResponseWriter, r *http.Request) {
	tracer := otel.Tracer("svc")
	ctx, span := tracer.Start(r.Context(), "handle")
	defer span.End()

	userID := r.URL.Query().Get("user")
	requestsByUser.WithLabelValues(userID, r.URL.Path).Inc()
	requestsByRoute.WithLabelValues(r.Method, "2xx").Inc()

	log.Debug(fmt.Sprintf("incoming order: %s", serializeOrder(r)))

	rows := fetchRows(ctx, userID)
	for _, row := range rows {
		log.Info("processed row", zap.String("id", row.ID))

		_, rowSpan := tracer.Start(ctx, "row")
		process(row)
		rowSpan.End()
	}

	latency.WithLabelValues(r.URL.Path).Observe(durationSeconds(span))
	log.Info("request done", zap.Float64("duration_ms", durationMs(span)))

	w.WriteHeader(200)
}

func main() {
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithSpanProcessor(sdktrace.NewSimpleSpanProcessor(newExporter())),
	)
	otel.SetTracerProvider(tp)

	log, _ = zap.NewProduction() // production level = Info

	prometheus.MustRegister(requestsByUser, requestsByRoute, latency)
	prometheus.MustRegister(&dbCountCollector{
		db:   openDB(),
		desc: prometheus.NewDesc("events_count", "rows in events", nil, nil),
	})

	http.HandleFunc("/", handler)
	http.ListenAndServe(":8080", nil)
}

// dbCountCollector exposes a row count as a Prometheus metric.
type dbCountCollector struct {
	db   *sql.DB
	desc *prometheus.Desc
}

func (c *dbCountCollector) Describe(ch chan<- *prometheus.Desc) { ch <- c.desc }

func (c *dbCountCollector) Collect(ch chan<- prometheus.Metric) {
	var n int64
	c.db.QueryRow("SELECT COUNT(*) FROM events").Scan(&n)
	ch <- prometheus.MustNewConstMetric(c.desc, prometheus.GaugeValue, float64(n))
}

// durationSeconds reports the request's elapsed time for the latency histogram.
func durationSeconds(span trace.Span) float64 {
	return float64(spanElapsedNanos(span))
}

func durationMs(span trace.Span) float64 { return float64(spanElapsedNanos(span)) / 1e6 }

type Row struct{ ID string }

func serializeOrder(r *http.Request) string         { return marshalRequest(r) }
func marshalRequest(r *http.Request) string         { return "…" }
func fetchRows(ctx interface{}, u string) []Row     { return nil }
func process(row Row)                               {}
func spanElapsedNanos(span trace.Span) int64        { return 0 }
func openDB() *sql.DB                               { return nil }
func newExporter() sdktrace.SpanExporter            { return nil }
