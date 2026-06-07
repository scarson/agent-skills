# Expected Findings — R fixture (core + data.table + tidyverse + modeling)

**Purpose:** exercise the R core lanes + the **Runtime & copy-on-modify notes** + the `data.table`,
`tidyverse`, and `modeling` modules on a power-utility load-analytics pipeline (AMI feature
engineering, per-reading transforms, load-forecast backtesting). Recall / precision / beyond-the-pack
scoring. Illustrative R (not run).

**Pack slice to provide:** `r.md` lane slices + the **Runtime & copy-on-modify notes** section +
(material to this scope) `r/data-table.md`, `r/tidyverse.md`, `r/modeling.md`. Do NOT let the agent
read this rubric.

## Planted issues (should be found)

| # | Location | Lane / module | Issue |
|---|----------|---------------|-------|
| 1 | `meter_features.R` `load_reading_files` | algorithmic / `data.table` | **`rbind()` inside the loop** → O(n²) frame growth (copy-on-modify); plus **`read.csv`** for large files. Fix: `fread` into a list, `rbindlist` once |
| 2 | `meter_features.R` `add_derived_columns` | memory / `data.table` | **base-R `dt$col <- …` on a data.table** falls back to copy-on-modify and copies the column every assignment; use `:=` update-by-reference |
| 3 | `meter_features.R` `peak_by_meter` | data-access / `data.table` | **unkeyed `dt[dt$meter_id == m]` scan inside a loop** → O(n) per meter; `setkey`/binary search or a single `keyby = meter_id` aggregation |
| 4 | `transforms.R` `normalize_readings` | algorithmic / `tidyverse` | **`rowwise()`** makes each row its own group → per-row R dispatch; reframe as a vectorized join + column arithmetic |
| 5 | `forecast_eval.R` `backtest_load` | `modeling` | **`auto.arima()` refit from scratch at every rolling origin** → O(n_origins) full order-selection+MLE fits; reuse the order via `Arima(model=)`, re-estimate periodically |
| 6 | `forecast_eval.R` `fit_feeder_models` | concurrency / `modeling` | **independent per-feeder fits in a serial loop**; parallelize (future/furrr/`fable`) — with the BLAS×workers oversubscription guard |

## Beyond-the-pack (floor-not-ceiling — bonus, not a recall requirement)

| Location | Issue | Why it's beyond the pack |
|----------|-------|--------------------------|
| `transforms.R` `label_load_band` | `ifelse(cond, expensive_score(x,"high"), expensive_score(x,"low"))` runs **both** `expensive_score` passes over the **whole** vector before selecting | This is an **anti-pattern-match** probe: `ifelse()` is vectorized (so a checklist-walker approves it), but R semantics evaluate **both branches fully** — so a row that needs one branch still pays for both. No loaded bullet names this (`data.table` names `fifelse` as a fast path, not *why* `ifelse` is wasteful). Catching it needs R-language knowledge, not bullet-matching. Fix: compute the score once, or evaluate each branch only where its mask is true. Finding it rewards out-reasoning; missing it is not a recall miss, but consistent misses ⇒ checklist-drift. |

## Decoys (should NOT be flagged)

| Location | Why it must be ignored |
|----------|------------------------|
| `meter_features.R` `served_substations` | `%in%` over a constant 5-element `SUBSTATIONS` vector, run once → cold/bounded. Flagging it (or recommending a hash) is a precision/checklist failure. |
| `transforms.R` `monthly_totals` | a `for` loop over the 12 `month.name` values — a bounded, constant-size loop run once. Flagging it as "loop / not vectorized" is a precision failure (the body is a fine vectorized sum per fixed month). |

## Honeypot correctness bugs (boundary test for bug-no-chase)

| Location | Bug | Perf-related? | Expected handling |
|----------|-----|---------------|-------------------|
| `forecast_eval.R` `get_or_fit` (HONEYPOT A) | cache key appends `format(Sys.time())`, unique every call → the cache **never hits** and `ets()` refits every call | **Yes — the bug IS the slowness** | **Pursue as a performance finding** (defeated memoization → recompute on the hot path); the fix is keying on `feeder_id` alone |
| `forecast_eval.R` `mean_absolute_pct_error` (HONEYPOT B) | divides by `length(actual) + 1` (off-by-one), understating MAPE | **No** | **Do NOT report as a perf finding** and do NOT fix/chase; one line in the Suspected Bugs appendix if noticed |

## Valid additional findings (credit — do NOT score as fabrications)

Real, reachable issues outside the planted set that a strong audit legitimately surfaces:
- `meter_features.R` `load_reading_files` — `as.data.table(all)` makes a **full copy** of the
  already-grown frame; `setDT()` (or `fread`+`rbindlist`) converts by reference (`data.table` module).
- `forecast_eval.R` `backtest_load` — `errors <- c(errors, …)` grows a vector in the loop → **O(n²)**
  (same grow-in-loop family as #1), independent of the planted refit-per-origin (#5). Credit either.
- `forecast_eval.R` — **latent BLAS×workers oversubscription** (no `blas_set_num_threads(1)` guard) if the
  loops are run inside an outer parallel harness — a valid DEFEND finding.

## Scoring

- **Recall** = (# of {1..6} found) / 6. #2 should name `:=`/by-reference; #3 should name `setkey`/`keyby`;
  #5 should name reuse-the-fit (not refit-per-origin); #6 must include the independence guard + the
  BLAS-oversubscription caveat.
- **Precision** = both decoys (`served_substations`, `monthly_totals`) not flagged (or explicitly
  rejected on bounded-n grounds); zero fabricated findings.
- **Beyond-the-pack** = the `ifelse` both-branches evaluation flagged → bonus signal the agent knows R
  semantics rather than approving a "vectorized"-looking call.
- **Honeypots** = A found and pursued (counts toward recall as a perf finding); B not reported as perf
  and not chased.

## How to run

Dispatch lane subagents (algorithmic, memory, data-access, concurrency) with the shared preamble +
that lane body from `../../lane-prompts.md`, the `r.md` lane slice + **Runtime & copy-on-modify notes**
+ the three material modules (`data.table`, `tidyverse`, `modeling`), and this directory as scope.
Collect findings; score against the tables above. Do not let the subagent read this file.

## Last run

**2026-06-05, Sonnet (4 lanes: algorithmic / memory / data-access / concurrency) — GREEN.**
Recall **6/6** (most planted issues caught by ≥2 lanes); beyond-the-pack (`ifelse` both-branches) found by
the algorithmic and memory lanes, each citing R's eager-evaluation semantics (knowledge, not analogy); both
decoys (`served_substations`, `monthly_totals`) rejected/not-flagged; honeypot A (`Sys.time()` cache)
pursued as perf by all four lanes; honeypot B (MAPE off-by-one) recorded-not-chased by every lane; **zero
fabrications**. Valid extras surfaced (the `as.data.table`-vs-`setDT` copy, the `c(errors,…)` O(n²) growth,
the BLAS-oversubscription hazard — all recorded above). The run validated the pack: the `data.table`
`:=`/`setkey`/`keyby`, `tidyverse` `rowwise`, and `modeling` refit-per-origin / serial-fits /
BLAS-oversubscription bullets, plus the copy-on-modify Runtime notes, all fired.
*Caveat for the record (consistent with Part HH cont.):* the algorithmic/memory prompts carried a mild
directional nudge ("a call that looks vectorized/idiomatic may not actually be") that points toward the
`ifelse` probe — so the beyond-the-pack find here is **assisted** evidence, not fully blind. Recall (6/6) is
uncontaminated (the planted issues don't depend on the nudge). A clean **verbatim-canonical-prompt** re-run
is the definitive beyond-the-pack measure.
