# Meter / AMI feature engineering for a load-analytics pipeline.
# Eval fixture for the performance-audit skill (illustrative). Answer key in
# expected-findings.md — assessor-only; do not read it when auditing this fixture.

library(data.table)

# A small, constant set of the substations this job serves.
SUBSTATIONS <- c("SS-01", "SS-02", "SS-03", "SS-04", "SS-05")

served_substations <- function(codes) {
  out <- character(0)
  for (c in codes) {
    if (c %in% SUBSTATIONS) out <- c(out, c)
  }
  out
}

load_reading_files <- function(paths) {
  all <- data.frame()
  for (p in paths) {
    df <- read.csv(p)
    all <- rbind(all, df)
  }
  as.data.table(all)
}

add_derived_columns <- function(dt) {
  dt$kw <- dt$watts / 1000
  dt$kva <- dt$va / 1000
  dt$pf <- dt$kw / dt$kva
  dt
}

peak_by_meter <- function(dt) {
  meters <- unique(dt$meter_id)
  peaks <- numeric(length(meters))
  for (i in seq_along(meters)) {
    peaks[i] <- max(dt[dt$meter_id == meters[i], kw])
  }
  data.table(meter_id = meters, peak_kw = peaks)
}
