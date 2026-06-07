# Profile Pack: R

Loaded for R codebases. Augments the generic pack with R-specific performance signals across R's
interpreted, copy-on-modify runtime, its vectorized C internals, and the common analytics/modeling
sub-stacks. R is heavily used at power utilities for load research, econometric and load forecasting
models, reliability/survival analysis, rate design, and program evaluation — so the examples lean
toward large tabular meter/SCADA data, forecasting backtests, and BLAS-bound matrix work.

This is the **core** R pack (always-loaded lanes + Runtime & copy-on-modify notes). Deep,
tech-specific lenses (`data.table`, the tidyverse, statistical modeling & forecasting) live in
load-on-detection modules under `profile-packs/r/` — see **`## Framework / sub-stack modules`** at the
bottom. The core lanes are deliberately kept as always-useful quick-hits; a module *deepens* its area
when its signals appear in scope (it does not merely restate the core bullet).

---

## Algorithmic complexity & data structures (lane `algorithmic`)
- Growing a vector/list in a loop with `x <- c(x, i)`, `append()`, or `x[[length(x)+1]] <- i` is **O(n²)**: copy-on-modify reallocates and copies the whole accumulator on (nearly) every iteration. Preallocate to final length (`vector("list", n)`, `numeric(n)`) and assign by index, or build a list and combine once at the end. This is the canonical R footgun and the highest-yield thing to scan for.
- `rbind()`/`cbind()` (or `df[i, ] <- ...` / `data.frame` row-append) inside a loop is the same O(n²) trap one level worse — each bind copies the entire growing frame. Collect rows in a list and `do.call(rbind, lst)` once, or `data.table::rbindlist()` / `dplyr::bind_rows()` on the whole list (verify against the currency brief for your version).
- The `*apply`/`Map`/`Reduce` family is **not** inherently faster than a `for` loop — both run R-level dispatch once per element; `apply()` over a matrix margin can even be *slower* than a `for` loop plus it coerces to a common type. The real win is a truly vectorized C-level function (`rowSums`, `colMeans`, `cumsum`, `findInterval`, `pmax`), not merely swapping `for` for `sapply`.
- `sapply()` guesses its return type at runtime and silently returns a list when results are ragged — `vapply()` pins the type/length up front, avoiding that surprise and shaving per-call overhead; prefer it in any non-interactive/hot path (verify against the currency brief for your version).
- Membership/lookup by scanning a vector with `%in%`, `which(x == key)`, or `match()` inside a loop is O(n) per probe; for repeated keyed lookups against meter IDs / account numbers use a named `list`/`environment` (hashed) or `fastmatch::fmatch` (builds a reusable hash so repeated lookups are O(1)) — base `match()` rebuilds its table every call.
- Calling a vectorizable function once per row/element (per-element `paste`, per-row arithmetic, scalar math in a loop) pays R interpreter overhead per iteration; rewrite as one whole-vector op (`paste(..., collapse=)`, column arithmetic, `ifelse`/`data.table::fifelse`) so the loop runs in C.
- Repeated `as.data.frame()` / `as.matrix()` / dtype coercions inside a loop silently copy and re-type the whole object each pass — hoist the coercion out, or keep the data in one representation for the duration of the loop.
- Re-sorting or re-`order()`-ing already-ordered data, or `factor()`-ing the same column repeatedly inside a loop, recomputes work that could be done once outside it.

## Memory & allocation (lane `memory`)
- **Copy-on-modify is the dominant cost model**: assignment binds without copying, but the first modification through a binding that R thinks has another reference duplicates the whole object. Confirm a suspected copy with `tracemem(x)` (prints `tracemem[old -> new]` on each duplication) or compare `lobstr::obj_addr()` before/after — do not guess whether a write copies.
- R's reference counter historically tracked only "0, 1, or many" and never decremented back from "many," so an object touched by two bindings stays flagged and keeps copying on modify even after one binding is gone; recent R reference-counts more precisely, but the conservative-copy reality persists — measure rather than assume in-place (verify against the currency brief for your version).
- Modifying one column of a base `data.frame` (`df$x <- ...`, `df[["x"]] <- ...`) historically deep-copied the whole frame; modern R shallow-copies the column-pointer vector and replaces just that column, but assigning into a **row** (`df[i, ] <- ...`) must copy every column. For wide meter/SCADA frames this is the difference between cheap and ruinous — `data.table`'s `:=` sidesteps it entirely (see the `data.table` module).
- `<<-` (super-assignment) and assigning into an `environment` mutate by reference and can silently retain large objects in an enclosing scope past their useful life — a common leak in accumulator closures and Shiny reactives.
- A function that takes a large object, modifies it, and returns it forces a copy at the modification (the caller still references the original); for very large frames this doubles peak memory — pass indices/keys, or use a reference-semantic container (`data.table`, `environment`, R6) when the copy is the bottleneck.
- `rm()` plus `gc()` only helps when nothing else still references the object; a forgotten binding (a captured variable in a closure, a column kept in a list, a model object that stored its training frame) pins it. `lobstr::obj_size()` (which accounts for shared structure) tells the truth about what an object actually costs.
- ALTREP lets some objects defer allocation — a compact integer sequence like `1:1e8` stores only start/end (not 400MB), and string/coercion results can be deferred — so an object can be far cheaper than its length implies until an operation forces materialization; conversely a seemingly cheap op can trigger that materialization. Don't reason about footprint from length alone (verify against the currency brief for your version).

## Data access & I/O (lane `data-access`)
- `read.csv`/`read.table` are slow and type-guess column-by-column (often producing `factor`/`character` surprises and `object`-like overhead) — for the large CSVs typical of meter/interval data use `data.table::fread`, `vroom`, or `arrow::read_csv_arrow`, which parse in C (multithreaded) and infer types far faster; pass explicit `colClasses`/`col_types` to skip inference entirely (verify against the currency brief for your version).
- Base `data.frame` carries copy-on-modify semantics on every transformation, while `data.table` updates **by reference** via `:=`/`set()` (no copy of the frame at all, any R version) — for repeated column updates on multi-million-row tables this is a categorical difference, not a constant factor. `dplyr` sits between (expressive, copies more than data.table); choose the backend to the data size (see the `data.table` and tidyverse modules).
- Pulling whole tables across `DBI` and filtering/aggregating in R wastes transfer and memory — push `WHERE`/`GROUP BY`/joins to the database. `dbplyr` translates `dplyr` verbs to SQL so a piped chain executes server-side and only the reduced result is collected; verify with `show_query()` that filters actually pushed down before a `collect()` (verify against the currency brief for your version).
- A `DBI` round-trip per row/iteration (parameterized `dbGetQuery` in a loop) is the R form of N+1 — batch with a single multi-row statement, `dbWriteTable`/`dbAppendTable` for bulk inserts, or a server-side join instead of per-key fetches.
- `saveRDS`/`readRDS` are convenient but single-threaded and comparatively slow for large frames; `qs`, `fst`, and `arrow`/`parquet` read/write multithreaded and compressed — `fst` additionally supports reading **only selected columns/rows** without touching the rest of the file, which turns a backtest's per-iteration reload into a cheap slice (verify against the currency brief for your version).
- `fread`/`vroom`/`arrow` reading all columns when a model or aggregation needs a few — pass `select=` (fread) / column selection (arrow/parquet) so unused interval channels never enter memory; with Parquet, predicate/partition pushdown can skip whole row groups.
- Reading an entire large file to process it once when chunked/streamed reading (`fread` in chunks, `arrow` Datasets, a `DBI` cursor with `dbFetch(n=)`) would bound peak resident memory — relevant when the meter extract exceeds RAM.

## Concurrency & parallelization (lane `concurrency`)
- R executes interpreted code **single-threaded** — a serial loop over independent units (per-feeder models, per-fold backtests, bootstrap replicates) is a parallelization candidate via `parallel` (`mclapply`/`parLapply`), `future`+`furrr`, or `foreach`+`doParallel`. *Confirm the iterations are truly independent (no shared mutable state, no ordering dependency) before suggesting it.*
- `mclapply` (forking) is Unix-only and cheap: workers inherit the parent's memory copy-on-write, so large read-only data (a fitted model, a reference table) is shared without serialization until a worker writes to it. `makeCluster(type="PSOCK")`/`parLapply` spins up fresh R processes and must **serialize and export** every needed object to each worker — the export cost can dwarf the compute for big data, and it is the only option on Windows. Match the backend to platform and data size.
- Per-worker data duplication is the usual parallel-R disappointment: splitting a giant frame so each worker gets a slice copies that slice across the process boundary (PSOCK) — for big-data work, parallelize *within* a single process via `data.table`'s internal threads (`setDTthreads`) or a multithreaded backend rather than forking R-level workers over copied chunks.
- **BLAS threading is a separate, often larger lever**: matrix-heavy work (`%*%`, `crossprod`, `solve`, `lm.fit`, `svd`) only runs fast when R is linked against an optimized multithreaded BLAS (OpenBLAS/MKL/Accelerate); the reference BLAS R ships is single-threaded and can be an order of magnitude slower. Check linkage with `sessionInfo()` / `extSoftVersion()` before assuming matrix ops are optimized (verify against the currency brief for your version).
- Stacking R-level workers *on top of* a multithreaded BLAS oversubscribes cores — N `mclapply` workers each spawning a full BLAS thread pool gives N×cores threads thrashing (the exact NumPy trap). Pin BLAS to one thread in workers (`RhpcBLASctl::blas_set_num_threads(1)` or `OMP_NUM_THREADS`/`OPENBLAS_NUM_THREADS=1`) and parallelize at one level only.
- True multithreaded compute inside one R session means dropping to C++: `Rcpp` for hot scalar loops the interpreter can't vectorize, `RcppParallel` (TBB) for data-parallel kernels — reserve this for a profiled bottleneck that resisted vectorization, not as a first move.
- Forking (`mclapply`, `future::multicore`) is unsafe with some external resources — open DB connections, GUI/Shiny event loops, and certain multithreaded libraries don't survive a fork; prefer PSOCK/`multisession` when the work touches those.

## Framework-idiom currency (lane `idiom-currency`)
- Consult the currency brief for the detected stack (`data.table`, `dplyr`/tidyverse, `arrow`, `collapse`, modeling packages) — flag superseded patterns, newly available fast paths, and changed defaults the code still fights.
- The native `|>` pipe (base R) is a parser-level rewrite with effectively zero call overhead, whereas magrittr `%>%` is a function call that builds an environment per pipe; long magrittr chains in hot code carry measurable overhead the native pipe avoids — but the two are not fully interchangeable (placeholder/lambda differences). Flag at LOW confidence pending the brief (verify against the currency brief for your version).
- `dplyr` has moved on from several idioms: scoped verbs (`mutate_at`/`_all`/`_if`, `summarise_*`, `funs()`) are superseded by `across()`; `do()` by `reframe()`; ad-hoc `group_by()` + `ungroup()` around a single verb by the per-operation `.by`/`by` argument; string-keyed joins by `join_by()` (which also enables non-equi/rolling joins). Flag the superseded forms (verify against the currency brief for your version).
- Backend swaps can be a step change, not a tweak: `dtplyr` (dplyr syntax → data.table engine), `collapse` (C/C++ grouped statistics), and `arrow`/`duckdb` (out-of-core, pushdown) keep familiar syntax while changing the execution model — flag a profiled `dplyr` bottleneck on large data as a candidate for these, per the brief.
- Offline (no brief): note candidate idiom concerns at LOW confidence, flagged for manual currency check.

## Payload / startup / build (lane `payload-startup`, conditional)
- Heavy `library()`/`require()` calls at script top that load large stacks (tidyverse, an entire modeling toolchain) cost real startup latency on every batch/cron/Rscript invocation — load only what a given job uses, or reference functions with `pkg::fn` to skip attaching, for short-lived scheduled jobs.
- Work done at package-load / script-init time (reading a large reference table, fitting or `readRDS`-ing a big model, opening DB connections, sourcing many files) inflates cold start — defer to first use or cache the result, especially for serverless/Rscript/Plumber endpoints invoked per request.
- `Rcpp`/`sourceCpp` compilation happens on first run if not precompiled — a from-source compile per session adds seconds to startup; ship compiled code in a built package (or cache the compilation) rather than `sourceCpp`-ing on every invocation.
- Shiny reactive-init: expensive setup (data loads, model fits) placed in `server` runs per session/user instead of once at app start; hoist session-invariant work to global/`app.R` top level, and scope per-session work tightly so reactives don't recompute on unrelated input changes.

---

## Runtime & copy-on-modify notes (load for every R project)

R's execution model shapes every lane: a dynamically-typed, interpreted runtime with **value
(copy-on-modify) semantics**, where R-level loops are slow but vectorized C internals are fast, and
where interpreted code runs on a single thread. These durable realities are R's "variant notes" —
*how the engine behaves and how to measure it* — cutting across all the lanes above and the modules
below.

- **Copy-on-modify is the defining semantic.** Bindings share until a write, and a write duplicates
  the object whenever R cannot prove the binding is unique — so the cost of "modifying" data is
  really the cost of *copying* it, and the O(n²) grow-in-a-loop footgun, the whole-frame column-write
  copy, and large-object function returns are all the same phenomenon. Reason about copies explicitly;
  reference-semantic tools (`data.table` `:=`, `environment`, R6) exist precisely to opt out where the
  copy is the bottleneck.
- **The R↔C boundary is the real performance frontier.** R's built-in vectorized functions are C
  loops over a whole vector and run near C speed *in bulk*; the slow path is doing that work one
  element at a time at the R level (a `for`/`*apply` loop calling a vectorizable op per element),
  which pays interpreter dispatch on every iteration. The fix is almost always "express it as one
  whole-vector operation," and only when no vectorization fits does dropping to `Rcpp`/C++ to cross
  the boundary deliberately pay off — verify a bottleneck first.
- **ALTREP decouples an object's footprint and cost from its length.** Compact sequences (`1:1e8`),
  deferred string coercions, and memory-mapped backings let R represent or defer large objects without
  materializing them — so footprint can't be inferred from length, and an innocent-looking operation
  may be the one that forces materialization. Use `lobstr::obj_size()` (which accounts for ALTREP and
  shared structure) over naive size intuition (verify against the currency brief for your version).
- **Single-threaded interpreter, but matrix work rides on BLAS.** Interpreted R code uses one thread;
  parallelism comes from `parallel`/`future`/`foreach` (with the fork-vs-PSOCK data-copy trade-off) or
  from C/C++ (`Rcpp`/`RcppParallel`). Separately, linear algebra is delegated to whatever BLAS R was
  linked against — reference BLAS is single-threaded and slow, OpenBLAS/MKL/Accelerate are
  multithreaded and fast — and stacking R-level workers over a multithreaded BLAS oversubscribes cores
  exactly as NumPy does. Treat BLAS linkage and thread layout as a first-class lever for matrix-bound
  forecasting/econometric models (verify against the currency brief for your version).
- **Profile before optimizing — R's tooling is good and cheap.** Justify hot-path claims with
  `Rprof()` / `profvis` (sampling profiler with line-level and memory attribution), and time
  alternatives with `bench::mark()` or `microbenchmark` (which run many iterations and surface
  variance, not a single noisy `system.time`). To settle whether a specific line copies, use
  `tracemem()` / `lobstr::obj_addr()`. Measure; do not optimize on intuition about an interpreted,
  copy-on-modify runtime.

## Framework / sub-stack modules (load on detection)

Load the core lanes + **Runtime & copy-on-modify notes** above for *every* R project. Additionally
load the matching module when its technology is *central* to the audit scope (materiality, not mere
presence — an incidental import doesn't trigger a load), and include it as ecosystem context in the
relevant lane prompts. Each module *deepens* its area beyond the core quick-hits — see the version
index `../version-indexes/r.md` for version-specific facts.

| Detected (signals) | Load module |
|---|---|
| **data.table** — `data.table`, `fread`, `:=`, `setDT`, `setkey`, `rbindlist` | [`r/data-table.md`](r/data-table.md) |
| **tidyverse** — `dplyr`, `tidyr`, `purrr`, `readr`, `tibble`, `ggplot2`, `%>%` | [`r/tidyverse.md`](r/tidyverse.md) |
| **Statistical modeling & forecasting** — `lm`/`glm`, `survival`, `forecast`/`fable`, `caret`/`tidymodels`, `glmnet` | [`r/modeling.md`](r/modeling.md) |

## Sources

Durable signals in this pack are grounded in these authoritative sources (version-specific facts and
their per-entry citations live in `../version-indexes/r.md`):

- *Advanced R* (Wickham) — "Names and values" / copy-on-modify, reference counting, `tracemem`, modify-in-place exceptions (adv-r.hadley.nz/names-values.html)
- *Advanced R* (Wickham) — "Improving performance" / vectorization, grow-in-loop O(n²), `vapply` vs `sapply`, method-dispatch cost (adv-r.hadley.nz/perf-improve.html)
- R Internals manual — `sxpinfo`/`ALTREP` bit, reference counting replacing `NAMED` (cran.r-project.org/doc/manuals/r-release/R-ints.html)
- R Installation and Administration manual — Appendix A.3 external BLAS (ATLAS / OpenBLAS / BLIS / Intel MKL / shared BLAS) (cran.r-project.org/doc/manuals/r-release/R-admin.html)
- R base manual — `matmult` / `%*%` and the `options("matprod")` settings (default / internal / blas / default.simd) (stat.ethz.ch/R-manual/R-devel/library/base/html/matmult.html)
- ALTREP design note (Tierney/Becker) — compact integer sequences, deferred string coercion, memory-mapped backings (svn.r-project.org/R/branches/ALTREP/ALTREP.html)
- `parallel` package vignette — `mclapply` forking (copy-on-write, Unix-only) vs `makeCluster`/`parLapply` PSOCK export cost (stat.ethz.ch/R-manual/R-devel/library/parallel/doc/parallel.pdf)
- data.table vignette — "Reference semantics" (`:=`/`set()` no-copy by reference) (cran.r-project.org/web/packages/data.table/vignettes/datatable-reference-semantics.html)
- data.table vignette — "Introduction" (`fread`, query optimization, `keyby`) (cran.r-project.org/web/packages/data.table/vignettes/datatable-intro.html)
- dplyr "Introduction" vignette — native `|>` pipe usage (dplyr.tidyverse.org/articles/dplyr.html); dplyr NEWS — `across()`, `.by`, `join_by()`, `reframe()` superseding `_at`/`_all`/`funs()`/`do()` (cran.r-project.org/web/packages/dplyr/news/news.html)
- fst package — random column/row access without full read, multithreaded LZ4/ZSTD, speed vs `readRDS` (fstpackage.org)
