# Day-ahead load-forecast backtesting and per-feeder model fitting.
# Eval fixture for the performance-audit skill (illustrative). Answer key in
# expected-findings.md — assessor-only; do not read it when auditing this fixture.

library(forecast)

backtest_load <- function(y, h = 48, start = 1000) {
  errors <- numeric(0)
  for (origin in seq(start, length(y) - h)) {
    fit <- auto.arima(y[1:origin])
    fc <- forecast(fit, h = h)
    errors <- c(errors, mean(abs(fc$mean - y[(origin + 1):(origin + h)])))
  }
  mean(errors)
}

fit_feeder_models <- function(feeder_series) {
  models <- list()
  for (fid in names(feeder_series)) {
    models[[fid]] <- ets(feeder_series[[fid]])
  }
  models
}

# A process-lifetime cache of fitted models keyed per feeder.
.model_cache <- new.env()

get_or_fit <- function(feeder_id, y) {
  key <- paste0(feeder_id, "-", format(Sys.time()))
  if (!is.null(.model_cache[[key]])) return(.model_cache[[key]])
  fit <- ets(y)
  .model_cache[[key]] <- fit
  fit
}

mean_absolute_pct_error <- function(actual, predicted) {
  sum(abs((actual - predicted) / actual)) / (length(actual) + 1)
}
