# Expected Findings — C++ fixture (core lanes + Compiler, build & ABI notes)

**Purpose:** exercise the C++ core lanes (`algorithmic` / `memory` / `data-access` / `concurrency`) +
the **Compiler, build & ABI notes** cross-cutting section, with recall / precision / beyond-the-pack
scoring. Illustrative C++ (not built). Unlike `go-sample`, the source carries **no `PLANTED`/`DECOY`
labels** — the agent discovers blind; the mapping lives only here.

**Pack slice to provide:** `cpp.md` lane slices + the **Compiler, build & ABI notes** section (shared
context). No sub-stack module is material to this scope (no build files, threading library, templates,
numeric, or networking in the fixture — `std::async` would be the natural *fix* for #5, not a present
technology), and the version index is **not** provided (the `idiom-currency` lane is not run here — that
is what keeps the `std::ostringstream` issue genuinely beyond-the-pack). Do NOT let the agent read this
rubric.

## Planted issues (should be found)

| # | Location | Lane | Issue |
|---|----------|------|-------|
| 1 | `inventory.cpp` `find_duplicate_skus` | algorithmic | **O(n²)**: `std::find` linear membership over `seen` inside the loop; `seen` grows with request-sized input. Use a `std::unordered_set<std::string>` (O(1) average membership). |
| 2 | `inventory.cpp` `build_labels` | memory | `labels` grown by `push_back` from empty with no `reserve(items.size())` → repeated reallocations + element moves as capacity doubles. |
| 3 | `service.cpp` `handle_order` | data-access | **N+1**: one `db.query_item(id)` round-trip per id in the loop; should be one batched query (`WHERE id IN (...)`). Round-trip count dominates latency. |
| 4 | `service.cpp` `handle_order` | data-access | `std::endl` in the per-item loop **flushes** the stream every iteration (a syscall per line); use `'\n'` and let the stream flush at exit / batch the flush. |
| 5 | `service.cpp` `compute_totals` | concurrency | three **independent** DB aggregate round-trips executed **sequentially** — latency is the sum; they could run concurrently (`std::async(std::launch::async, …)` / threads). Independence holds (read-only, no ordering dependency) → safe to parallelize. The finding **must** state the correctness guard. |

## Beyond-the-pack (floor-not-ceiling — bonus, not a recall requirement)

| Location | Issue | Why it's beyond the pack |
|----------|-------|--------------------------|
| `inventory.cpp` `build_labels` | `std::ostringstream oss; oss << it.price;` to convert an `int` to a string on a per-item path | Constructing a `std::ostringstream` per call is heavy: it builds and imbues a locale, uses virtual-dispatched stream buffers, and allocates — far slower than `std::to_string(it.price)` or (fastest) `std::to_chars`. **No core lane bullet names stringstream-for-number-formatting** (the `data-access` lane names `std::endl`/`sync_with_stdio`/`string_view`; `memory` names copies/`shared_ptr`/`std::function`). The agent must reason it. Finding it rewards out-reasoning the lens; missing it is **not** a recall miss, but consistent misses across runs ⇒ checklist-drift signal. (The `std::to_chars` fast path *is* in `version-indexes/cpp.md`, deliberately withheld here.) |

## Decoys (should NOT be flagged)

| Location | Why it must be ignored |
|----------|------------------------|
| `inventory.cpp` `is_supported_region` | `std::find` over `kDefaultRegions` mirrors the #1 O(n²) pattern, BUT `kDefaultRegions` is a `constexpr std::array` of **3** elements and this is a single membership test (not nested in a request loop). O(3) is bounded/cold → not a finding. Recommending "use a `set`/`unordered_set`" here is a precision/checklist failure. (The fixture deliberately uses `std::string_view` for the parameter and a `constexpr std::array<std::string_view>` so the *only* available bait is the bounded linear scan, not an incidental `const std::string&`/`vector<std::string>` allocation nit.) |
| `inventory.cpp` `sum_prices` (+ `unit_price`) | The trivial `unit_price` accessor is called once per element in `sum_prices`. A checklist-walker fixated on "function-call overhead" would suggest manually inlining it, or hand-unrolling / hand-SIMD-ing the sum loop. At `-O2` `unit_price` is inlined and the loop is trivially auto-vectorizable — flagging this is **fighting the optimizer** (the cardinal C++ calibration rule in the Compiler/build notes). Not a finding. |

## Scoring

- **Recall** = (# of {1..5} found) / 5. #5 must include the independence/correctness guard.
- **Precision** = neither decoy flagged (or each explicitly considered + rejected — `is_supported_region`
  on bounded-n grounds, `sum_prices`/`unit_price` on don't-fight-the-optimizer grounds); zero fabricated
  findings.
- **Beyond-the-pack** = `std::ostringstream` int→string flagged → bonus signal that the agent out-reasons
  the lens.

## How to run

Dispatch lane subagents (`algorithmic`, `memory`, `data-access`, `concurrency`) with the shared preamble
+ that lane body from `../../lane-prompts.md`, the `cpp.md` lane slice + **Compiler, build & ABI notes**
(no module is material), and this directory as scope. Score against the tables above. Run on **Sonnet**
(the stricter "typical executor" bar).

## Last run

**2026-06-05, Sonnet (4 lanes dispatched blind) — GREEN.**

- **Recall 5/5.** #1 O(n²) `std::find` membership — CRITICAL (algorithmic). #2 missing `reserve` on the
  growing `labels` vector — flagged MINOR standalone + folded into the MAJOR `build_labels` finding
  (memory), and the algorithmic lane independently recommended `labels.reserve(items.size())`. #3 N+1
  per-item `query_item` — CRITICAL (data-access **and** concurrency, with a batched `IN (...)` fix). #4
  `std::endl` per-iteration flush — MAJOR (data-access). #5 three independent aggregates run sequentially
  — CRITICAL (concurrency), **with the independence/correctness guard stated** (read-only `db`, no shared
  mutable state, no ordering dependency) *and* a sharp `Db` thread-safety caveat (`const` ≠ thread-safe →
  needs per-thread handles / pool) recorded as a Suspected Bug.
- **Beyond-the-pack: found.** `std::ostringstream` int→string flagged by three lanes, each recommending
  `std::to_string` (and `std::to_chars` named) — explicitly reasoned, not pattern-matched from a bullet.
- **Precision: clean.** Neither planted decoy taken — no lane recommended a hash set for the bounded
  3-element `is_supported_region` scan, and no lane flagged `sum_prices`/`unit_price` (no "inline the
  accessor" / "hand-unroll the loop" — the don't-fight-the-optimizer rule held). Zero fabrications.
- **Valid extra findings (not penalized):** `handle_order`'s `items` vector grown without
  `reserve(ids.size())` and the redundant `Item` copy at `push_back` (use `std::move`/`emplace_back`);
  `find_duplicate_skus`'s `seen`/`dupes` copying SKU strings where a `std::unordered_set<std::string_view>`
  avoids the copies. All real, in-scope memory issues beyond the planted set.

**Note on fixture iteration:** an initial run's memory lane surfaced two cold-path config micro-nits on
`is_supported_region` (`const std::string&`→`string_view`) and `kDefaultRegions` (`vector<std::string>`).
Those were *real but unintended* secondary temptations, not the planted decoy. Per the eval discipline
("fix the fixture, not the agent"), the fixture was hardened — `is_supported_region` now takes
`std::string_view` and `kDefaultRegions` is a `constexpr std::array<std::string_view, 3>` — so the only
bait left on that function is the intended bounded linear scan. The memory lane re-run was then clean on
that function while still catching every planted + valid-extra memory issue.
