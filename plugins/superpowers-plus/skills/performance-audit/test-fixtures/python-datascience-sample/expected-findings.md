# Expected Findings — Python data-science fixture (data-stack + scientific-computing + machine-learning)

**Purpose:** exercise the Python data-science modules on a power-utility-flavored
pipeline (smart-meter feature engineering, sparse state-estimation, fleet reliability
fitting, load-forecast tuning/scoring) with recall / precision / beyond-the-pack
scoring. This is the data-science *shape* of the Python ecosystem — distinct from the
stdlib/web `python-sample/` — so it is a second Python fixture by **workload shape**,
not a per-module matrix (the modules are exercised collectively by one realistic app).
Illustrative (not built).

**Pack slice to provide:** `python.md` lane slices + the **Runtime & interpreter
notes** section + (material to this scope) `python/data-stack.md`,
`python/scientific-computing.md`, and `python/machine-learning.md`. Do NOT let the
agent read this rubric.

## Planted issues (should be found)

| # | Location | Lane / module | Issue |
|---|----------|---------------|-------|
| 1 | `features.py` `build_feature_frame` | algorithmic / `data-stack` | **`pd.concat` inside a loop** → O(n²) reallocation+copy of the whole frame each iteration; collect rows and build one DataFrame |
| 2 | `features.py` `flag_overloads` | memory / `data-stack` | **`status` left as object dtype** (low-cardinality string) grouped on a hot path → should be `category` (vectorize + shrink memory); the **chained-indexing write** `df[mask]['overloaded'] = …` also double-allocates and may silently no-op (use `.loc`) |
| 3 | `network.py` `estimate_states` | scientific-computing | **`spsolve` re-factorizes the constant matrix `Y` every iteration**; factor once with `splu(Y)` (CSC) and reuse `lu.solve(i)` per RHS |
| 4 | `reliability.py` `fit_fleet_reliability` | `machine-learning` / scientific-computing | **`weibull_min.fit()` MLE per asset in a serial loop** over the fleet → independent optimizations dispatched one at a time; parallelize across assets and pin `floc=0` |
| 5 | `forecast.py` `tune_load_model` | `machine-learning` | **`GridSearchCV` over a `Pipeline` with no `memory=`** → the expensive PCA `fit` is recomputed for every candidate × fold; cache fitted transformers with `Pipeline(memory=…)` |
| 6 | `forecast.py` `score_all_meters` | `machine-learning` | **per-row `model.predict([row])` in a loop** → one Python→C boundary crossing + input re-validation per meter; stack rows and call `predict(X_all)` once |
| 7 | `reliability.py` `fit_fleet_reliability` | algorithmic / memory | **`np.concatenate` inside the loop** rebuilds the result array every iteration → O(n²) growth — the NumPy analog of #1's pandas `pd.concat`-in-loop; collect rows in a list, `np.vstack` once |

## Beyond-the-pack (floor-not-ceiling — bonus, not a recall requirement)

| Location | Issue | Why it's beyond the pack |
|----------|-------|--------------------------|
| `features.py` `apply_temperature_derating` | `np.vectorize(derate_curve)` applied to a reading column **looks** vectorized but is a Python-speed per-element loop | This is an **anti-pattern-match** probe — the opposite of a structural clone. NumPy's own docs state `np.vectorize` "is provided primarily for convenience, not for performance. The implementation is essentially a for loop." No loaded bullet names `np.vectorize`; the pack names `.apply`/`.iterrows` row dispatch and the *theme* "vectorize over iterate" — and the function's **name actively baits a checklist-walker into approving it** as already-vectorized. Catching it requires knowing the library, not matching a bullet (the fix is `np.interp` / `np.where` / native ufuncs). A run that walks the pack as a checklist will *miss* this; finding it is real out-reasoning. Missing it is not a recall miss, but consistent misses ⇒ the pack is being walked as a checklist. *(Replaced the earlier `np.concatenate`-in-loop probe — a direct structural analog of #1 that every lane found trivially; that issue is retained as planted #7. See decisions log Part HH.)* |

## Decoy (should NOT be flagged)

| Location | Why it must be ignored |
|----------|------------------------|
| `features.py` `known_substations` | `c in SUBSTATIONS` is a membership scan that mirrors an O(n²) pattern, BUT `SUBSTATIONS` is a constant 5-element config list and this runs once at import → cold/bounded, zero aggregate impact. Flagging it (or recommending a set) is a precision/checklist failure. (`network.py` `build_admittance`, which builds `rows/cols/vals` lists with `+=` in a loop then constructs one COO matrix, is the *correct* O(n) pattern — flagging it as "list growth" is likewise a precision failure.) |

## Honeypot correctness bugs (boundary test for bug-no-chase)

| Location | Bug | Perf-related? | Expected handling |
|----------|-----|---------------|-------------------|
| `forecast.py` `WeatherAdjuster.adjust` (HONEYPOT A) | cache keyed by `id(weather)`; callers pass a fresh `weather` dict each call, so the key is never equal twice → the cache **never hits** and `_eval_curve` re-runs every call | **Yes — the bug IS the slowness** | **Pursue as a performance finding** (defeated memoization → recomputation on the hot path). Identifying the `id()` key as the root cause is the point. |
| `reliability.py` `mean_time_between_failures` (HONEYPOT B) | divides by `len(gaps) + 1` (off-by-one), understating MTBF | **No** | **Do NOT report as a perf finding** and do NOT fix/chase. If noticed, one line in the Suspected Bugs appendix, then move on. |

## Valid additional findings (credit — do NOT score as fabrications)

Real, reachable perf issues outside the planted set that a strong audit legitimately surfaces
(floor-not-ceiling — finding these is the lens working, not a precision failure):

- `forecast.py` `tune_load_model` — **`GridSearchCV(...)` is given no `n_jobs`**, so the 60 independent
  fits (12 grid points × 5 folds) run serially on one core (concurrency *exploit*); and adding `n_jobs`
  *naively* over the OpenMP-parallel `HistGradientBoostingRegressor` risks the `n_jobs` × OpenMP/BLAS
  over-subscription storm (concurrency *defend*). Both are correct `machine-learning`/`concurrency`
  findings. (This sits in the same function as planted #5 — the two are independent issues.)
- `network.py` `estimate_states` — beyond hoisting `splu`, the independent RHS vectors can be stacked into
  one matrix and solved in a single multi-RHS `lu.solve(I)` (BLAS-3) call. A valid deeper optimization.

## Scoring

- **Recall** = (# of {1..7} found) / 7. #3 should name factor-once-reuse (`splu`); #4 should
  name both the per-call MLE cost and that the fits are independent (parallelizable).
- **Precision** = `known_substations` decoy not flagged (or explicitly considered + rejected on
  bounded-n grounds); `build_admittance` not flagged; zero fabricated findings.
- **Beyond-the-pack** = the `np.vectorize` fake-vectorization flagged → bonus signal the agent
  knows the library rather than approving a "vectorized"-named call by pattern-match.
- **Honeypots** = A found and pursued (counts toward recall as a perf finding); B not reported as
  perf and not chased (record-and-move-on if noticed).

## How to run

Dispatch lane subagents (algorithmic, memory, data-access, concurrency) with the shared preamble +
that lane body from `../../lane-prompts.md`, the `python.md` lane slice + **Runtime & interpreter
notes** + the three material modules (`data-stack`, `scientific-computing`, `machine-learning`), and
this directory as scope. Collect findings; score against the tables above. Do not let the subagent
read this file.

## Last run

**Run 1 — 2026-06-05, Sonnet (4 lanes: algorithmic / memory / data-access / concurrency) — GREEN.**
Recall **6/6** of the then-planted set; the *then* beyond-the-pack (`np.concatenate`-in-loop) was found by
all four lanes; decoys (`known_substations`, `build_admittance`) correctly rejected; **zero fabrications**;
honeypot A (`id()`-keyed cache) pursued as perf, honeypot B (MTBF off-by-one) recorded-not-chased by every
lane. **Valid extra finds:** missing `GridSearchCV(n_jobs=…)` + over-subscription; multi-RHS batched
`lu.solve` (both recorded above). *Observation:* the `np.concatenate` beyond-the-pack proved only mildly
"beyond" — a direct structural analog of planted #1 — so it was found by pattern-match, not by out-reasoning.

**Probe hardened (2026-06-05):** promoted `np.concatenate`-in-loop to planted **#7** and replaced the
beyond-the-pack with the `np.vectorize` **anti-pattern-match** probe in `features.py`
`apply_temperature_derating` — an issue whose name *bait* a checklist-walker into approving it, so catching
it needs library knowledge (NumPy docs: "essentially a for loop") rather than bullet-matching.

**Run 2 — 2026-06-05, Sonnet (re-validation).** Algorithmic + memory re-run, *then* a clean re-run with the
**verbatim canonical algorithmic preamble + lane body (no hints)**: all three found the `np.vectorize` probe
and **each cited the NumPy "essentially a for loop" documentation** to justify it — i.e. found by genuine
library knowledge, not structural analogy. Recall on the full **7** planted set held (algorithmic alone
surfaced #1, #3, #5, #6, #7 + the BTP + honeypot A; #2 is the memory lane's, #4's parallelization angle is
concurrency's). *Caveat for the record:* the first two re-run prompts carried a mild directional nudge in the
lane framing; the clean verbatim re-run (no nudge) reproduced the find, which is the result of record. The
hardening achieved its goal — the probe now converts "found by pattern-match" into "found by knowledge"; a
weak model that walks only the bullets would approve the `np.vectorize` call and miss it.
