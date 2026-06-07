# Per-reading transforms for the load-analytics pipeline (tidyverse-flavored).
# Eval fixture for the performance-audit skill (illustrative). Answer key in
# expected-findings.md — assessor-only; do not read it when auditing this fixture.

library(dplyr)

normalize_readings <- function(df, calib) {
  df %>%
    rowwise() %>%
    mutate(kw_adj = kw * calib[[as.character(meter_id)]]) %>%
    ungroup()
}

label_load_band <- function(df) {
  df %>%
    mutate(band = ifelse(kw_adj > 100,
                         expensive_score(kw_adj, "high"),
                         expensive_score(kw_adj, "low")))
}

expensive_score <- function(x, mode) {
  # stand-in for a costly per-element scoring pass
  vapply(x, function(v) sum(log1p(abs(v - seq_len(64)))) , numeric(1)) * if (mode == "high") 1.5 else 1.0
}

monthly_totals <- function(df) {
  months <- month.name
  totals <- numeric(length(months))
  for (i in seq_along(months)) {
    totals[i] <- sum(df$kw_adj[df$month == months[i]])
  }
  setNames(totals, months)
}
