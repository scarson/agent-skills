---
index_schema_version: 1
ecosystem: r
covered_through: "R 4.6.0 (2026-04) / data.table 1.16 / dplyr 1.1.x / tidyr 1.3 / purrr 1.0 / arrow 17 / dtplyr 1.3 / collapse 2.x / fst 0.9 / qs 0.27 / forecast 8.x / fable 0.4 / survival 3.x / tidymodels(tune) 1.x"
built_on: 2026-06-05
sources:
  - https://cran.r-project.org/doc/manuals/r-release/NEWS.pdf
  - https://www.r-project.org/
  - https://tidyverse.org/blog/2023/04/base-vs-magrittr-pipe/
  - https://tidyverse.org/blog/2023/01/dplyr-1-1-0-joins/
  - https://dplyr.tidyverse.org/news/index.html
  - https://purrr.tidyverse.org/news/index.html
  - https://developer.r-project.org/Blog/public/2020/02/16/stringsasfactors/index.html
  - https://Rdatatable.gitlab.io/data.table/news/
  - https://dtplyr.tidyverse.org/
---
# R performance version index
> Build-once lookup. The idiom-currency lane consults this first; live research only extends past
> `covered_through`. Durable idioms live in `../profile-packs/r.md` and its modules; this file carries
> the version-pinned facts.

## Interpreter / Runtime (base R)

- **`stringsAsFactors = FALSE` is the default** — changed in **R 4.0.0** (Apr 2020) — `data.frame()`/`read.table()` no longer auto-convert character columns to `factor` — removes a class of accidental factor overhead (and bugs) on string columns; pre-4.0 code that relied on the old default may still pass `stringsAsFactors=` explicitly. Note `fread`/tibbles never factor-converted by default.
- **Native `|>` pipe** — landed in **R 4.1.0** (May 2021) — a *parser-level* rewrite (`x |> f()` → `f(x)`) with **zero call overhead**, vs magrittr `%>%` which is a function call that constructs an environment per pipe — so long `%>%` chains in hot code carry overhead the native pipe avoids. The `\(x)` lambda shorthand also landed in 4.1.0. They are not fully interchangeable with `%>%` (placeholder/lambda semantics differ).
- **`|>` placeholder `_`** — landed in **R 4.2.0** (Apr 2022) — `x |> f(y = _)` passes the LHS to a **named** argument (the one restriction); removes the main reason to fall back to `%>%`'s `.` placeholder or an anonymous function. Using `_` requires R ≥ 4.2.
- **ALTREP (alternate representations)** — enabled since **R 3.5.0** — compact integer sequences (`1:1e8` stores only bounds, not 400 MB), deferred string coercions, and memory-mapped backings mean an object's footprint/cost is decoupled from its length until an op forces materialization — use `lobstr::obj_size()` (ALTREP- and sharing-aware), not length intuition.
- **More precise reference counting** — replaced the old "0/1/many" `NAMED` scheme in **R 3.5.0** — reduces (does not eliminate) defensive copy-on-modify duplication; the conservative-copy reality persists, so measure with `tracemem()` rather than assume in-place. `options(matprod=)` (matrix-product method selection) is available since **R 3.4.0**.
- **JIT bytecode compilation on by default** — since **R 3.4.0** — base/package functions are byte-compiled automatically (`compiler::enableJIT`); narrows but does not close the gap to vectorized C — pure-R tight loops are still the cost edge.
- **Current release: R 4.6.0** (2026-04-24). R has no formal LTS; distributions/`renv` pin a version — recommend the best option on the project's pinned line and treat a major R upgrade as a deliberate (re-validate-packages) change, not an unconditional "just upgrade."

## data.table
> Durable engine facts (data.table moves slowly and is largely version-independent — verify the exact API against the lockfile).

- **`:=` / `set()` update by reference (no copy) — any version** — the core escape from R's copy-on-modify; `set()` additionally bypasses `[.data.table` dispatch in tight loops (docs benchmark it as thousands of times faster than an `[`-based loop). Base `$<-`/`[[<-`/`[<-` on a data.table fall back to copy-on-modify — audit them.
- **GForce optimized grouped aggregation** — internal `g*` implementations for a *closed* set of reducers (`min/max/mean/median/var/sd/sum/prod/first/last/head/tail` + `.N`) under `by`/`keyby`; wrapping/namespacing/combining the function in `j` silently drops to per-group R dispatch — verify the optimized-function set and `getOption("datatable.optimize")` level for your version.
- **Multithreading: `fread`/`fwrite`, GForce, and `frollmean`/`nafill` etc. are parallel** — `setDTthreads(n)`/`getDTthreads()` control the pool; **this is the in-process parallelism to prefer over forking R-level workers over copied chunks**, and the thread pool that oversubscribes if stacked with `parallel` workers or BLAS.

## tidyverse
> Idiom currency for dplyr/tidyr/purrr — these move faster than base R, so re-verify against the brief.

- **dplyr 1.1.0 (Jan 2023): per-operation `.by=`, `join_by()`, `reframe()`** — `.by=`/`by=` scopes grouping to a single verb and returns ungrouped (avoids the persistent-`grouped_df` stale-grouping cost and the forgotten-`ungroup()` bug); `join_by()` enables **non-equi and rolling joins** (previously a data.table-only fast path); `reframe()` generalizes `summarise()` to many rows per group — supersedes ad-hoc `group_by()`+`ungroup()` wrapping and `do()`.
- **dplyr 1.0.0: `across()`** superseded the scoped verbs (`mutate_at`/`_all`/`_if`, `summarise_*`, `funs()`) — one tidy-selected call instead of N copy-pasted column expressions (maintainability/correctness; ~cost-neutral per column, not itself a speedup).
- **purrr 1.0.0 (Dec 2022): `map_dfr()`/`map_dfc()` superseded** by `map() |> list_rbind()` / `list_cbind()` — both do the one-shot bind; the antipattern to flag is `bind_rows()` *inside a loop* (O(n²) under copy-on-modify), not the chosen bind helper.
- **Backend swaps (step-change, not a tweak):** `dtplyr` (`lazy_dt()` → data.table engine; translation cost is proportional to code, not data; `immutable=FALSE` to allow in-place `mutate`), `collapse` (C/C++ fast grouped stats `fmean`/`fsum`/…), and `arrow`/`duckdb` (out-of-core, predicate/projection pushdown) keep dplyr syntax while changing the execution model — reach for them on a *profiled* grouped-aggregation/large-join bottleneck.

## Serialization & I/O
- **`fread`/`fwrite` (data.table) and `vroom` (ALTREP lazy) over `read.csv`/`write.csv`** — multithreaded C parsing; `vroom` indexes and materializes columns lazily (benefit evaporates once you touch all data). Pass `select=`/`col_types=` to skip unused columns and type-guessing.
- **`fst` / `qs` over `saveRDS`/`readRDS`** — multithreaded, compressed; **`fst` reads selected columns/rows without touching the rest of the file** (turns a backtest's per-iteration reload into a cheap slice). `arrow`/Parquet adds predicate/partition pushdown and cross-language columnar interchange.

## BLAS & parallelism
- **Optimized BLAS is an order-of-magnitude lever for matrix-bound work** — `%*%`/`crossprod`/`solve`/`lm.fit`/`svd` ride the linked BLAS; stock **reference BLAS is single-threaded and slow**, OpenBLAS/MKL/Accelerate are multithreaded — confirm linkage with `sessionInfo()`/`extSoftVersion()`. `crossprod(X)` over `t(X) %*% X` (one symmetric-product call vs transpose + general matmul).
- **Oversubscription: R-level workers × BLAS threads × engine threads** — stacking `parallel`/`future` workers over a multithreaded BLAS (or `ranger`/xgboost/lightgbm engine threads, which default to all cores) gives `workers × cores` threads thrashing (the NumPy trap). Pin BLAS in workers (`RhpcBLASctl::blas_set_num_threads(1)` / `OMP_NUM_THREADS=1`) and parallelize at one level. `mclapply` (fork, Unix-only) shares read-only data copy-on-write; PSOCK clusters **copy data per worker** (N workers ≈ N+1 copies in RAM).
