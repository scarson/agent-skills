# Running at scale — orchestration, recovery & durability

**Load this when:** the cycle is run over a large surface — a whole repo, many slices, 100+
findings, a multi-hour run that will cross a spend limit, a transient rate-limit, or a session
boundary. At that scale the per-phase prose ("dispatch lanes → synthesize → cross-validate → write")
is no longer enough on its own: hand-dispatching dozens of agents is untenable, and a long run *will*
hit interruptions the smaller-scope phases never see. This reference encodes what a large field run
had to invent so the next runner does not re-derive it. (RFC 2119 keywords are interpreted per the
parent skill's Terminology block.)

The keywords here are **schemas** (the portable contract that makes synthesis mechanical and coverage
checkable) and **durability** (knowing which artifacts survive an interruption, and which do not).

---

## The per-slice pipeline

One slice's audit is a four-stage pipeline. Stages run **per finding/lane independently** — there is
no barrier between them except where a stage genuinely needs the whole prior set (the merge stage
does; verification does not):

```
lanes (parallel, schema-validated)
   → merge / dedup           (1 agent, emits merged-finding[])
   → grouped adversarial verify (N co-located findings per agent, emits verdict[])
   → report writer            (writes raw lane reports already persisted + the consolidated + validated reports)
```

This is the mechanization of `performance-audit` Phase 2–3 (lanes + synthesis) plus the cycle's
Phase 3 (cross-validation). The stages map onto the three schemas below: lanes emit **lane-finding**,
merge emits **merged-finding**, verify emits **verdict**. Forcing each agent into a structured
`StructuredOutput` is what makes synthesis mechanical and completeness-accounting *checkable* — the
schemas are load-bearing, not decoration.

---

## The schemas (the portable contract)

These are the durable, harness-agnostic part of this reference. Any orchestration primitive that
can constrain an agent's output to a JSON Schema (a structured-output tool, a Workflow `schema`
option, a hand-validated prompt contract) can use them; they do **not** assume any particular tool.
Field names mirror `finding-model.md` so a schema-validated object and a hand-written report finding
carry the same information.

### `lane-finding` — one item from one lane

```json
{
  "type": "object",
  "required": ["lane", "title", "location", "problem", "impact", "confidence", "effort", "fingerprint"],
  "properties": {
    "lane":        { "enum": ["algorithmic","memory","data-access","concurrency","idiom-currency","cost-map","payload-startup","dynamic"] },
    "title":       { "type": "string" },
    "location":    { "type": "object", "required": ["file","symbol"],
                     "properties": { "file": {"type":"string"}, "symbol": {"type":"string"}, "line": {"type":["integer","null"]} } },
    "problem":     { "type": "string" },
    "impact":      { "type": "object", "required": ["rank","basis"],
                     "properties": { "rank": {"enum":["critical","major","minor"]},
                                     "basis": {"type":"string", "description":"reachability × frequency × per-occurrence cost"} } },
    "confidence":  { "enum": ["Measured","Strong-static","Heuristic"] },
    "on_cost_map": { "type": "boolean" },
    "effort":      { "enum": ["Localized","Contained","Cross-cutting"] },
    "verification_plan": { "type": "string", "description": "benchmark/argument + correctness guard" },
    "fingerprint": { "type": "string", "description": "<lane-id>:<file>:<symbol>:<title-slug>, per run-schema.md" },
    "scope_correction": { "type": ["string","null"], "description": "set when the lane corrected the scope brief from source — e.g. 'briefed O(log n); code is O(n)'" },
    "suspected_bug": { "type": "boolean", "description": "true if this is a correctness lead for bug-hunt, not a perf finding" }
  }
}
```

### `merged-finding` — one synthesized finding after dedup

```json
{
  "type": "object",
  "required": ["id", "title", "lanes_agreeing", "location", "fingerprint", "problem", "impact", "confidence", "effort"],
  "properties": {
    "id":            { "type": "string", "description": "per-slice P-number, e.g. P1" },
    "title":         { "type": "string" },
    "lanes_agreeing":{ "type": "array", "items": {"type":"string"}, "description": "lane ids that flagged this — agreement is a confidence signal" },
    "location":      { "type": "object", "required": ["file","symbol"],
                       "properties": { "file": {"type":"string"}, "symbol": {"type":"string"}, "line": {"type":["integer","null"]} } },
    "fingerprint":   { "type": "string" },
    "status":        { "enum": ["new","persisting","resolved"] },
    "problem":       { "type": "string" },
    "impact":        { "type": "object", "required": ["rank","basis"],
                       "properties": { "rank": {"enum":["critical","major","minor"]}, "basis": {"type":"string"} } },
    "confidence":    { "enum": ["Measured","Strong-static","Heuristic"] },
    "on_cost_map":   { "type": "boolean" },
    "effort":        { "enum": ["Localized","Contained","Cross-cutting"] },
    "verification_plan": { "type": "string" },
    "source_fingerprints": { "type": "array", "items": {"type":"string"}, "description": "lane-finding fingerprints merged into this one" }
  }
}
```

### `verdict` — one cross-validation result per merged-finding

```json
{
  "type": "object",
  "required": ["finding_id", "classification", "code_verified", "rationale"],
  "properties": {
    "finding_id":     { "type": "string", "description": "the merged-finding id this verdict is for" },
    "classification": { "enum": ["confirmed","design-decision","false-positive","out-of-scope"] },
    "code_verified":  { "type": "boolean", "description": "did the verifier read the actual code at the cited location" },
    "reachability":   { "type": "string", "description": "hot-path reachability assessment — confirm or correct the lane's claim" },
    "impact_rerank":  { "enum": ["critical","major","minor","unchanged"] },
    "blast_radius":   { "type": ["string","null"], "description": "for confirmed: callers, API/signature changes, ordering deps, behavior-change/correctness risk" },
    "rationale":      { "type": "string", "description": "why this classification; for false-positive, why it is not real" }
  }
}
```

**Every merged-finding MUST get exactly one verdict.** The verdict array length equals the
merged-finding array length — that equality is the mechanical completeness check the cycle's Phase 3
COMPLETENESS REQUIREMENT asks for, made trivially auditable.

---

## Grouped verification

The cycle's Phase 3 describes cross-validation as one verifier per finding. At 130 findings that is
130 agents. Instead, **group up to ~3 co-located (same-file) findings per verifier** — the verifier
is already reading that file, so it assesses each independently and returns one `verdict` per
finding. This is ~3× fewer agents at the same rigor (each finding still gets an independent verdict;
grouping shares only the file read, not the judgment). Do **not** group findings across unrelated
files into one verifier — that dilutes attention and re-introduces the false-negative risk grouping
is meant to avoid. Group by locality, verify each finding on its own merits.

---

## Abort on any failed lane — never emit an undercount report

**A slice run with any failed lane MUST NOT emit a final (consolidated or validated) report.** Abort
and resume instead.

The hazard is a **false negative that reads as a pass**: when a slice loses (say) 3 of 6 lanes to a
rate-limit, a pipeline that merges and writes over the 3 survivors emits a normal-looking report with
few findings — *indistinguishable from a slice that was fully audited and is genuinely clean*. An
undercount that reads as "audited, few findings" is the most dangerous output this cycle can produce,
because it actively tells the operator to stop looking.

So the rule is hard: if any dispatched lane errors, times out, or returns nothing, the merge stage
MUST abort the slice — do not synthesize, do not write a report. Surface which lanes failed and
resume from the failure (see recovery below). Persisted raw reports from the lanes that *did* succeed
are kept (they are not wasted on resume), but they MUST NOT be assembled into a final report on their
own. This mirrors `performance-audit`'s "MUST wait for all lanes" gate, sharpened: *waiting* is not
enough — a lane that completes by *failing* must also block the report.

---

## The run-result object is the recovery substrate

Persist-before-synthesis (each lane writes its raw report immediately) protects the lanes. It does
**not** protect the *synthesis* — the merged findings and verdicts. If a slice's synthesis is lost
(spend limit mid-merge, then a journal-cache loss), the only structured record of the merged set is
the orchestration's **run-result return value**.

Therefore the run-result object **MUST carry the full set of merged-findings and their verdicts — not
a top-N summary.** A `topFindings.slice(0, 12)` return value is lossy exactly when you need it most: a
17-finding slice recovered from a top-12 cap silently drops 5 findings, and the dropped ones can
include the critical (top-N by display rank ≠ the ones safe to lose). Return everything; rank for
*display* downstream, never by *truncating the durable record*. This is also stated in
[`run-schema.md`](../performance-audit/run-schema.md) §4 — the run-result is the fourth durable
artifact alongside the report frontmatter, the ledger, and the fingerprints.

---

## Recovery & durability

A multi-hour cycle *will* cross a spend limit, a transient model rate-limit, and possibly a session
boundary. Plan for all three.

**What is durable, and what is not** — internalize this hierarchy before a long run:

| Artifact | Survives interruption? | Survives a session boundary? |
|---|---|---|
| Committed per-slice reports + `runs.jsonl` ledger (commit-per-slice) | ✅ yes | ✅ yes — **the durable record of record** |
| The run-result object (full merged-findings + verdicts) | ✅ if captured | ✅ if captured/written down |
| Raw per-lane reports (persist-before-synthesis) | ✅ yes | ✅ yes |
| The orchestration journal cache (replays completed agents on resume) | ✅ within a session | ❌ **same-session only** |

**Spend-limit mid-run → resume from the journal cache.** Resuming from the journal replays completed
agents instantly and only re-runs the failed tail. This works beautifully *within a session*.

**Session boundary → the journal is gone; do not trust a "resume."** A session boundary invalidates
the journal cache (and may silently reset the task list). A "resume" after a boundary then RE-RUNS
all lanes — which can hit a fresh rate-limit, and a naive report writer can **overwrite a good
17-finding report with a 3-finding one**. After a boundary, treat the committed reports + the
captured run-result as the record of truth, and reconstruct rather than blindly re-running:
reconstruct a lost synthesis from the slice's preserved raw lane reports + the captured run-result
via a single writer agent, and **flag the reconstruction honestly in the report header** (a finding
whose severity was inferred during reconstruction is provisional until a real measurement or
cross-model challenge confirms it — and in the field, exactly such a finding was later vindicated by
both, which is the discipline working).

**Persistent rate-limit on one model tier → fall back per task.** Go hybrid: keep the strongest model
for high-stakes lanes (the critical-bearing dimensions, the verifiers) and a cheaper tier for the
rest plus the report-writers. Make the per-task model choice **conditional on a dispatch arg**, not a
hard-coded change: a model change is a journal cache-key change, so an *unconditional* swap busts the
cache on resume and re-runs everything, whereas a conditional swap preserves cache hits for the
phases whose model did not change.

---

## Optional binding — a Workflow-tool script

> **This is illustrative, not assumed.** One field run mechanized the pipeline above as a single
> Claude-Code **Workflow-tool** script and it worked well — but the cycle does **not** assume a
> Workflow primitive exists. The portable contract is the **schemas + the pipeline shape above**; any
> harness that can dispatch schema-constrained agents can implement them (subagents, a structured-
> output tool, or hand-dispatch for a small slice). Treat the sketch below as one binding to adapt,
> not a dependency.

```js
// per-slice audit. The *_ARRAY schemas below wrap the lane-finding / merged-finding / verdict
// objects defined above as JSON-Schema arrays (a lane emits many findings; a verifier many verdicts).
// args may arrive as a JSON *string* despite "objects pass verbatim" — parse defensively:
const cfg = typeof args === 'string' ? JSON.parse(args) : args
const { slice, packPaths, briefPath, model } = cfg

phase('Lanes')
const lanes = await parallel(LANES.map(l => () =>
  agent(lanePrompt(l, slice, packPaths, briefPath), { label: `lane:${l}`, schema: LANE_FINDING_ARRAY,
    model: highStakes(l) ? model.strong : model.cheap })))   // conditional model → cache-preserving on resume
if (lanes.some(r => r == null)) throw new Error('lane failed — ABORT, do not write a partial report')

phase('Merge')
const merged = await agent(mergePrompt(lanes.flat()), { schema: MERGED_FINDING_ARRAY })

phase('Verify')                                              // group co-located findings, ~3 per verifier
const groups = groupByFile(merged, 3)
const verdicts = (await parallel(groups.map(g => () =>
  agent(verifyPrompt(g), { label: `verify:${g[0].location.file}`, schema: VERDICT_ARRAY })))).flat()

phase('Write')
await agent(writeReportsPrompt(merged, verdicts, slice))     // raw lane reports already persisted by each lane
return { slice, merged, verdicts }                           // FULL set — the recovery substrate, never top-N
```

Two sharp edges this binding hit, both encoded above: the `args`-as-string parse, and the
conditional-model trick that keeps journal-cache hits intact across a hybrid-model resume.
