---
name: design-review-cycle
description: Use on a written design doc before it becomes a plan — the design-doc analog of plan-review-cycle. Runner pilot, then independent review at mode width (light default = one all-lens reviewer; full = 6-agent fan-out, REQUIRED on named surfaces), findings ledger with a batched user decision gate, conditional re-sweep, and two-leg closure (cold reader + ledger verifier, both clean on the same snapshot). Standalone, or invoked by other skills.
---

# Design Review Cycle

## Terminology

<!-- approved-block: rfc2119-terminology v1 — authoritative copy: ../../approved-blocks.md -->
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.
<!-- /approved-block: rfc2119-terminology -->

## What success is

> Success is a design the user can depend on — one the plan author can build from without inventing decisions, and that implementation will not expose as wrong at multiplied cost. Zero findings at closure is the exit condition, not the goal: a clean round is evidence, exactly as good as the review that produced it. Findings are not the metric in either direction — suppressing findings to appear done and manufacturing findings to appear rigorous are the same defect: the review stops tracking the design.

Three judgment calls carry anchors bound to required emissions:

- **Substantiveness** (→ the "judged non-substantive" ledger disposition): the tiebreak is whether the plan author or implementer would be worse off not knowing — never whether recording it extends the cycle.
- **Route selection** (→ the Route column): route toward where undiscovered defects are most likely, never toward where review finishes fastest.
- **Completion** (→ the closure checklist): a clean closure earned by narrowed slices, softened thresholds, or thin routing is not completion — and once closure is clean and the checklist passes, running extra rounds to feel safe is the manufacture failure, not diligence.

## Red Flags — STOP

If you hear yourself thinking any of these, stop — it is a rationalization forming:

> "It's not *really* a new boundary." · "The plan author gets these for free." · "That finding was overtaken by the restructure." · "We clarified the contract, we didn't change it." · "I'll show the final table in the summary." · "Recommendations adopted, flagged for user review." · "The pilot's job is clearing shallow defects, so that wasn't a finding." · "The minimum legal sequence is the spec's statement of sufficiency." · "The verifier is ledger-briefed, so it's only advisory." · "It's a small doc — one agent can do both closure legs." · "The diff only touches sections whose findings I already fixed." · "The subagent inherits my model, so tier is handled." · "I'll write the ledger rows once the fixes are all in."

## When to use

Reviewing a **written design doc** before it becomes an implementation plan — standalone on any design regardless of origin, or invoked by another skill's workflow. (This skill follows `plan-review-cycle`'s naming convention — fixes land in the reviewed artifact itself; there is no fix-plan phase, unlike the `bug-hunt` / `health-review` / `performance-audit` cycles.)

**When NOT to use:** no design exists yet (finish brainstorming first); the artifact is an implementation plan (use `plan-review-cycle`); the artifact fails the Phase 0 readiness gate; the design is small enough that `plan-review-cycle` on the eventual plan covers it.

## The phase spine

The runner MUST follow each phase in order and MUST NOT skip phases. Sidecars: [`dispatch-prompts.md`](dispatch-prompts.md) (every reviewer prompt, pasted verbatim), [`artifacts.md`](artifacts.md) (ledger, round-table, checklist templates).

### Phase 0 — setup

In order:

1. **Materialize.** If the design lives only in conversation, write it to disk (project convention, or default `docs/specs/YYYY-MM-DD-<topic>-design.md`). This skill does not review conversation-resident designs.
2. **Readiness gate.** The artifact MUST be a reviewable design — a problem, decisions, enough structure for doc anchors. A stub, a README, or a plan: say so and stop ("this isn't reviewable yet" / "this is a plan; use `plan-review-cycle`"). Thirty findings that all say "underspecified" are dispatch waste, not review.
3. **Requirements decision point.** The *status line* is the opening paragraph of the doc's requirements statement, wherever that statement lives — a `## Requirements` heading is the family convention, not a precondition. Exactly one status is pinned: a dated verbatim user confirmation. Recognition is semantic, never a string match — the test is whether the line records that the user confirmed that exact requirements text, and when; where you cannot read it as that, treat it as unpinned rather than guessing. **Anything else — any other label, an unrecognized wording, a hand-written requirements block with no status line at all — is unpinned; unrecognized text never blocks the run.** Then: no requirements statement at all → ask the user for one now (one question), or proceed with the requirements-trace lens narrowed to internal consistency and a standing ledger entry routing completeness to the gate (the entry is a gate item — it keeps the gate non-empty until dispositioned). Pinned → treat as ground truth without re-asking (any commit history is audit the runner MAY note in the run header — never a gate). Present but unpinned → ask the user to confirm it as ground truth (one question). For either ask, a user who is unreachable or a session that is autonomous → proceed narrowed without asking. Record the outcome in the run header.
4. **Mode declaration.** Check the named-surface list (§Modes); declare light or full in the run header, naming which surface fired and one line of evidence.
5. **Ledger init + baseline snapshot.** Create the ledger from `artifacts.md`, write the run header, write the doc's ledger pointer line, then commit the doc as the baseline snapshot (tier 1; §Repo assumptions gives the snapshot's form when committing is unavailable or there is no repo) — the pointer line predates the baseline, so it never surfaces as an unmapped hunk at the verifier leg.

### Phase 1 — pilot (runner self-review)

Review the doc against every lens in-session, before any dispatch, using the all-lens prompt as your rubric. This is `plan-review-cycle`'s round 1 — the author-adjacent pass expected to find plenty; every shallow defect it clears is one every dispatched agent would otherwise re-find in parallel.

**The pilot is its emission:** a per-lens coverage record in the ledger — findings or an explicit "no significant findings" per lens, by name. No record, no pilot. **Fix discipline (every runner fix, every phase): the ledger row is written before the edit** — claim and intended action first; action-taken and before/after at the edit. Fix like an author, not a litigator: prefer rewriting the offending sentence so it can only be read one way over appending the qualifier that answers the objection; deletion is a legal fix; a fix is integrated when the sentence reads as if written that way originally — a grafted clause is scar tissue a later cold reader will re-flag. Stay span-local (replace the sentence, not the section) so the hunk still maps to its row. The pilot fixes only documentary gaps and forced corrections; genuine choices wait for the gate. **Escape valve:** if the pilot finds the design solves the wrong problem entirely, the runner MAY pose that single question to the user before dispatching; default is proceed.

### Phase 2 — independent review (width is the mode)

Cold reviewers read the post-pilot snapshot — the whole current doc, fixes baked in, no "tracked changes" overlay (the unannotated read is the consumer-faithful test; an edit-region overlay would let the author-adjacent runner steer independent attention; fix-specific scrutiny happens at the verifier leg).

- **Light mode (default):** one independent reviewer carries the pre-composed all-lens prompt. Continue alternating runner/independent rounds while whole-doc rounds keep yielding substantive findings. Minimum legal sequence: pilot → independent whole-doc round → gate → closure; if the independent round found substantive findings, at least one further whole-doc round runs before the gate. Closure never counts toward the alternation minimum. Honest floor: pilot + 3 dispatched agents (one independent + two closure legs).
- **Full mode:** blind fan-out — 6 agents / 8 lenses (extent batch, seam batch, four solo). Minimum legal sequence: pilot → fan-out → gate → closure. Further pre-gate rounds are elective probes or light-width whole-doc rounds. Honest cost: 6 + possible re-sweep + 2 closure legs.

**A snapshot commit precedes every whole-doc round and follows every gate fold**; if nothing changed since the last snapshot, current HEAD is the snapshot.

### Phase 3 — disposition

For each round's findings, in the ledger: **validity pass first** (dedupe — merged findings retain ALL raising lenses; verify against doc/requirements/codebase; resolve cross-lens contradictions), **authority pass second** (classify per §Finding classes). Legal dispositions: confirmed · false positive · duplicate · already-tracked · out-of-scope · **judged non-substantive** (costs one written line of why) · **overtaken by revision** (MUST cite the revision and ledger entry that mooted it) · **annotated for execution** (circuit-breaker terminal only — §Convergence circuit breaker; the row's open item stands as a verify-first annotation in the doc). **Extent before content:** extent-batch findings are processed first. **Completeness:** every finding lands in exactly one disposition, as a ledger row — including every closure-round finding, before a leg may be called clean. Nothing is dropped as too minor to record.

### Phase 4 — user gate

**The gate is a drain, not a convergence test** — closure is the convergence test. When the decision list is stable, present ONE batched decision list (never streamed), each entry per the `health-review-cycle` template: concern, why it needs a decision, options with tradeoffs, recommendation. Record the gate basis as the gate row's footnote ("round N yielded X substantive, all dispositioned; no new escalations expected"). An empty gate is skipped with a "no decisions needed" line. When a gate decision would edit a requirements statement that is currently pinned, this phase's **Fold rule** governs whether the pin survives the fold — read it before composing the decision list, so rows can quote amended text.

**The runner MUST wait for the user's input on all gate items before proceeding.** Partial answers are normal — deferred items get the terminal disposition **deferred by user**, recorded in the doc as marked open questions. Autonomous/headless session or unreachable user → STOP and hand off (sibling `handoff` skill); the runner MUST NOT adopt its own recommendations and proceed. That stop is an intended terminal, not a failure. New genuine choices from later rounds — including closure — batch into a **supplementary gate** before the next closure attempt.

**Parked re-confirmations join the list.** If the reviewed doc carries a pending requirements re-confirmation — a status line recording that confirmed requirement text was later edited (the family label is `unconfirmed — edited after confirmation (date)`) — it enters the gate's single batched decision list as its own row, never a separate preceding message, backed by its own ledger row (class: genuine choice; the defect is "requirements changed after the user confirmed them"). The row carries what the user needs to act on it — the amended text and what changed — not the decision-entry template. It is a gate item: a gate holding only a re-confirmation is not empty and is not skipped. Items the user already dispositioned — deferred-by-user open questions — and `(bookkeeping)` notes are NOT re-surfaced; their terminal record already stands.

**Fold rule (every gate fold, initial or supplementary).** A fold that edits the requirements statement keeps the pin ONLY when the gate row quoted the amended requirement text verbatim as the option the user affirmed — an option label, a paraphrase, or "as recommended" does not qualify, and when in doubt the pin reverts. Gate rows whose options would amend requirements SHOULD therefore quote the resulting requirement text in the row, making affirmation and re-confirmation the same act; a preserving fold re-dates the pinned line, and that status-line hunk maps to the folded finding's own ledger row. Any other edit to the requirements statement reverts the status line to unpinned, written as the family label `unconfirmed — edited after confirmation (date)` — the same signal the **Parked re-confirmations** rule keys on. A reversion is recorded in the run header (requirements trace re-scopes from the next round) and as ONE dedicated ledger row — class genuine choice ("requirements changed after the user confirmed them"), its before/after the status-line edit so the verifier maps that hunk. That single row is simultaneously the narrowed state's standing completeness entry and the next gate's re-confirmation item — never two gate items for one reversion. A reversion with no gate remaining carries to closure as that row's terminal record — "unpinned at close; re-confirmation awaits the user" — which the closure legs read as its disposition, not as dirt; the verifier brief (prompts v3) names this record terminal.

### Phase 5 — conditional re-sweep (after every gate, initial or supplementary)

Diff the doc against the snapshot the most recent **default-route** whole-doc round reviewed (elective rounds never advance this base; the snapshot after a re-sweep's fixes land does). A re-sweep is REQUIRED if the diff (a) adds or removes a section, or (b) restructures material carrying confirmed findings **other than the findings whose ledger-rowed fixes and gate decisions the diff implements** — a fix or fold landing in its own finding's span does not re-trigger; restructuring *other* findings' material does. Re-run the **lenses that bear on the changed material**, blind, against the revised doc — fan-out width if the change touches a named surface. Default mapping: component added/removed → extent batch + seam batch + alternatives & rationale; boundary contract changed → seam batch + downstream readiness; requirement added/re-scoped → extent batch + downstream readiness. Disclose lens selection in the Route column with one line of reasoning. The re-sweep is a default-route stage discharging a defined coverage obligation — the additive rule's restriction does not apply to it; it still never counts toward gate timing or termination. Its own fixes re-enter this diff check before the next closure attempt.

### Phase 6 — closure (two legs, both clean, same snapshot)

Two dispatches against the same snapshot commit, each judged against the ledger state at its dispatch:

- **Cold reader** — blind, all lenses, whole doc, the all-lens prompt, nothing else. Carries the "at least one cold read" requirement. MAY be strengthened (fan-out width, cross-model); never weakened.
- **Ledger verifier** — openly briefed with the full ledger, labeled ledger-briefed. Contract: map every diff hunk since baseline to a ledger row ID (**unmapped hunks are findings**); check every fix against its row's before/after; confirm every row terminally dispositioned. Verifier findings use a two-line contract (row ID or hunk + violation).

**Take the closure snapshot first.** Closure is a whole-doc round for snapshot purposes: commit at tier 1, fresh copy at tiers 2 and 3, and if nothing changed since the last snapshot that snapshot is the closure snapshot. Every closure re-run after a dirty leg takes a new one — the fixes that made the leg dirty are exactly the bytes the next legs must judge.

**Then materialize it once and hand that one path to both legs.** The runner writes the closure snapshot's bytes to a session scratch path (`git show <closure-snapshot-ref>:<doc path>` at tier 1; at tiers 2 and 3 the snapshot copy already is such a path) and dispatches both legs against it, never against the live doc path, which can move between the two dispatches. It also keeps the cold leg blind — it reads a file and needs no git access. Each leg opens its report with the closure-snapshot ref it was handed, and **a leg whose report omits the ref, or echoes a different one, is not clean**: without the echo the checklist records the runner's belief about what each leg read rather than what it read.

**Before declaring completed, re-compare the live document to the materialized closure snapshot.** Both legs judged the snapshot, so a live doc that moved after materialization is unreviewed no matter how clean the legs came back — and completion would commit, stage, or leave in place bytes no leg has seen while the checklist still passes. On any difference: take a fresh closure snapshot, materialize it, and re-run both legs. This is the same staleness the closure ref exists to prevent, one step further along the pipeline.

**Clean:** a leg is clean when it returns the closure ref it was handed and no finding that dispositions as confirmed-substantive — and every finding it returned, including demotions, has its ledger row written first. A dirty leg is not special: findings → Phase 3 → supplementary gate if needed → Phase 5 diff check → closure re-runs. **The cycle completes only when both legs pass against the same snapshot**; each checklist line records that SHA. The non-clean exits are §Completion's other terminals, including the circuit breaker's terminated-for-execution. **Degraded mode:** if dispatch is genuinely unavailable, the runner MAY perform both audits itself and MUST disclose that neither leg met the cold/independent requirement; it MUST NOT label a self-review "cold."

## Repo assumptions

<!-- approved-block: repo-tier-degradation v1 — authoritative copy: ../../approved-blocks.md -->
**Repo probe, three tiers, no invented anchors.** Before any step that commits, records a commit SHA, or hands one to another skill, probe: is the artifact inside a git work tree, and may the runner commit (project rules, hooks)? Never block on the answer — degrade and disclose. **Tier 1, work tree and committing allowed:** the full protocol, SHAs recorded and handed on as written. **Tier 2, work tree but committing unavailable** (project rules forbid agent commits, hooks fail, unusual repo state): stage rather than commit — or, where staging is itself unavailable or the project's convention prefers it, leave the artifact in place and say so — surface once rather than forcing, and use the artifact's current bytes wherever a commit SHA would have been the anchor. **Tier 3, no work tree at all** (research, operations, or docs work outside any repo): copy the artifact's bytes to a session scratch file before proceeding — that copy is the baseline anything downstream would otherwise have taken from a commit — and disclose that no durable audit trail exists, reporting the scratch path so the user can keep it. In the degraded tiers the missing field is dropped with a one-line note saying why, and MUST NOT be filled with a plausible-looking value: a requirement that cannot be met honestly is a prompt to invent, and an invented SHA is worse than an absent one because it reads as an anchor while resolving to nothing.
<!-- /approved-block: repo-tier-degradation -->

For this cycle that means: at tier 1 every snapshot is a commit, exactly as written throughout. At tiers 2 and 3 a snapshot is a scratch copy of the doc's bytes taken at the same points, and every rule naming a snapshot commit — the baseline snapshot at setup, the snapshot preceding each whole-doc round, the two legs judged against the same snapshot — reads on that copy unchanged, with "current HEAD is the snapshot" becoming "the most recent copy is the snapshot". The completion commit degrades the same way, and `editorial-pass` is handed the doc and ledger paths with a certification SHA only where one exists. A ledger row whose source would have been a git SHA cites the scratch copy instead, never a SHA the repo cannot resolve.

**Snapshot ref** is the tier-neutral name for whatever anchors a snapshot: a commit SHA at tier 1, that snapshot's scratch-copy path at tiers 2 and 3. Every snapshot-ref field in [`artifacts.md`](artifacts.md) takes the ref of the snapshot *that field names*. Three are in play and they are never interchangeable:

- **baseline ref** — anchors the Phase 0 snapshot; the verifier's left-hand side.
- **round-snapshot ref** — anchors the snapshot preceding each whole-doc round.
- **closure-snapshot ref** — anchors the single snapshot both closure legs judge.

Substituting refs is the whole of the change: the verifier's diff runs between the two files or commits its refs name, and both legs still judge the *same* closure snapshot. **A run that cannot name a closure-snapshot ref has not taken a snapshot and MUST NOT declare completed.**

## Route vocabulary and invariants

Rounds are described by five axes — **vocabulary for disclosure, not a menu**:

| Axis | Values |
|---|---|
| Reviewer | runner self-review · dispatched subagent (runner's provider) · cross-model |
| Slice | all lenses · a named batch (extent; seam) · any named subset |
| Scope | whole doc · delta since a named snapshot · named sections |
| Shape | single agent · fan-out (one agent per lens or batch) |
| Context | session · cold (see blind definition) · ledger-briefed |

"Blind" is never a reviewer label — it is a dispatch property on the Context axis.

- **Additive rule:** *elective* rounds (beyond the default route) that are narrowed, delta-scoped, or ledger-briefed are always legal and always additive — they surface findings but never count toward gate timing, termination, or any coverage obligation. Only whole-doc rounds inform gate timing; only the closure legs complete the run (§Convergence circuit breaker defines the one non-clean terminal a review round can trip). Carve-outs: the re-sweep (narrowed default-route stage whose slice is its defined coverage) and the ledger verifier (briefed by design, and a required termination gate precisely because it is briefed). A probe needs no precondition — it cannot shorten the cycle, only inform it.
- **Blind, operationally:** a blind dispatch consists of the doc (by path — passing the path is passing the doc; at closure that path is the materialized closure snapshot), the sidecar prompt block(s), the output contract, the closure ref to echo (closure legs only — a bare string, carrying no review context), the raw-report destination path (write-only — the read boundary still applies to everything else in `reviews/`), a fixed **context slot** (only legal contents: requirements-pinning status, pitfalls-doc paths), and a **read-boundary instruction** (do not read `reviews/`, the doc's git history, or prior review artifacts) — nothing else. The ledger verifier is briefed by design and has its own self-contained recipe; the cold-read preamble is never attached to it. The read boundary and harness-level context the runner doesn't control do not make a round briefed; session framing, prior findings, or edit regions do.
- **Reviewer tier:** every dispatched reviewer runs at the flagship tier at high reasoning effort (§Cross-provider) unless the user overrides. No effort dial in the framework → ensure a flagship-tier parent and note the limitation.
- **Closure floor, per leg:** cold reader — cold, independent, all lenses, whole doc; verifier — independent, ledger-briefed, every-hunk-and-row. Both clean, same snapshot. Strengthen any axis; weaken none.
- **Independence floor:** the mode's minimum sequence stands; self-review may be inserted, never substituted for a required independent leg; on named surfaces the cross-model obligation must be visibly met or visibly degraded in the round table.
- **Gate invariant:** escalations batched, never streamed; genuine choices never resolved by the runner; post-gate choices batch into a supplementary gate before the next closure attempt.

## Modes and triggers

**Named surfaces:** concurrency, data integrity, crash recovery, security, data migration, or a new boundary between **separately deployed, persisted, or trust-separated systems** (process, service, storage, protocol, privilege domain). Named surface → full mode REQUIRED + cross-model REQUIRED if an automated cross-provider primitive is available. Otherwise light mode. Declared at Phase 0 with evidence; a confirmed finding that establishes a named surface re-runs the declaration, obligations attaching from that round forward. The user can override either direction. (The boundary item is deliberately narrow — module-level seams are the seam batch's everyday work, not an escalation.)

## The lenses

Eight lenses — always by name, never by number, in every emission. Dispatches paste the **verbatim blocks from `dispatch-prompts.md`** and echo its version line on every dispatch route line ("prompts vN"). Every lens reports findings or an explicit "no significant findings," per round, in the coverage record.

- **Requirements trace** — bidirectional: every requirement addressed, and the mirror — any design no requirement asks for. Scope per the Phase 0 pinning outcome.
- **Unstated assumptions** — the design works *if* X; is X written down, is X checked. Solo: its power is being unanchored.
- **Alternatives & rationale** — chosen, or defaulted into? Rejected alternatives recorded with reasons?
- **Seams & contracts** — units, ownership, what crosses each boundary, the contract each side. Signature failure: a responsibility that lives nowhere.
- **Failure modes** — partial failure, crash mid-operation, concurrency, retry/idempotency, resource exhaustion; security explicitly: authz boundaries, trust seams, data exposure, hostile input.
- **Change & reversibility** — existing data/callers/users; migration path, back-out path, blast radius if wrong.
- **Downstream readiness** — could a plan be written from this without inventing decisions; can the result be verified. Reads both pitfalls docs where present; absence is noted, never silently skipped.
- **Simplicity & proportionality** — does a simpler shape satisfy every requirement; is each element's cost paid for. YAGNI-calibrated per the verbatim block — it MUST NOT flag cheap extensible shapes ("this interface has one implementation" is not a finding).

**Batching (full mode, 6 agents):** the **extent batch** (requirements trace + simplicity & proportionality — both need the element↔requirement map, and the calibration requires the trace) and the **seam batch** (seams & contracts + failure modes — failure modes concentrate at seams; map-first-then-attack); four solo. Principle: batch when one lens's work product is the other's required input; solo when power comes from being unanchored or the evidence base is distinct.

## Finding classes — runner authority

Two axes (objective/contestable; remedy determinate/choice) plus one discriminator: does the remedy **record** an existing decision or **repair** a defect? Ledger rows spell all three out.

- **Documentary gap** — objective, determinate, *records* — and the runner has epistemic access (row names the source: session / doc / repo / git SHA; "source: none" is illegal → reroute to ledger as "author must supply X" or mark an explicit open gap; never filled-in prose in the author's voice).
- **Forced correction** — objective, determinate, *repairs*. Runner fixes (row-before-edit), records what and why.
- **Genuine choice** — contestable, or objective with a choice of remedy. Ledger; defect stated as confirmed; options enumerated. The runner MUST NOT decide these.

Hazards: **downgrade drift** (genuine choice → "forced correction" to finish sooner) and its inverse (escalate everything to dodge work). Reviewers propose axes only; class assignment is the runner's.

## Repair discipline

Phase 1's fix discipline governs each fix (row-before-edit, span-local, author-not-litigator); the rules below govern each batch of fixes as a wave — a pilot's fixes, a gate fold, a dirty-leg repair, a re-sweep's fixes — before the round that verifies it:

<!-- approved-block: repair-wave-discipline v1 — authoritative copy: ../../approved-blocks.md -->
**Repair-wave discipline.** A repair is new, unreviewed text written under the finding's frame instead of the artifact's — which is why repair waves measure as a cycle's most defect-dense edits (40% of one field wave was itself defective). Four rules, each closing a defect class that has recurred across independently reviewed waves:

1. **State the claim delta, then sweep by claim.** Before editing, write one line: which claim changes, from what to what. After editing, sweep the artifact AND its companion records (status tables, decision logs, handoffs, review records) for the superseded claim **in any wording**, and fix or flag every instance in the same wave. A text search for the old wording does not discharge the sweep — the recurring survivor is the same claim in different words.
2. **Verify checkable assertions at write time.** A repair that asserts anything checkable — a signature, a file path, an interface, a command, a count, a behavior — is checked against the real thing in the same edit, and the fix record carries a one-line evidence note (what was checked, where). What cannot be checked now is written as an open question at the span, never as a fact.
3. **Derive numbers, never copy them.** Any count or enumeration written into a headline, summary, or table row is recomputed from the artifact it summarizes, at write time. A copied number is how one miscount propagates through four records and outlives the report that contradicts it.
4. **Re-read the wave as one diff.** Before the wave goes to its verifying round, read the complete diff end to end for fix-to-fix interactions and integration defects — grafted qualifiers, fixes that contradict each other, scar tissue a cold reader will re-flag. For a wave above roughly ten findings this read SHOULD be a dispatched fresh context rather than the fix author: integration failures are exactly what the author's context cannot see.
<!-- /approved-block: repair-wave-discipline -->

## Cross-provider policy

SHOULD generally; on named surfaces REQUIRED *if an automated cross-provider primitive is available*. Never a blocker. **Tier definition (this skill's reviewer tier):** flagship tier at high reasoning effort — latest Claude Opus at high, or the current OpenAI flagship (GPT-5.6 Sol-class) at high — or successors *at the same tier*: the tier's successor, not "or anything stronger." Premium/max tiers (Claude Fable, GPT-Pro-class) only on explicit user request.

<!-- approved-block: cross-provider-fallback v1 — authoritative copy: ../../approved-blocks.md -->
**How to dispatch cross-provider:** the mechanism depends on the environment — a sibling skill that wraps another provider's CLI (e.g., a `codex` skill shelling out to OpenAI's Codex CLI), that CLI invoked directly via Bash, or an API the runner can call. Asking the user to hand-carry the artifact under review to another provider's interface is a MAY-offer, never part of a REQUIRED trigger. If no automated primitive is available the runner MUST NOT block: fall back to a dispatched subagent from the runner's own provider **at this skill's reviewer tier**, and disclose the substitution in the round table and completion summary.
<!-- /approved-block: cross-provider-fallback -->

<!-- approved-block: cross-model-dispatch v1 — authoritative copy: ../../approved-blocks.md -->
**Long-running dispatch discipline.** Cross-model CLI runs at high reasoning effort routinely take 15–45+ minutes — longer than many harnesses' maximum foreground command timeout (Claude Code caps foreground Bash at 10). Launch them **backgrounded, output redirected to a log file** — never as a foreground call gated on a timeout. Confirm liveness once, early (the log exists and is growing within the first couple of minutes), then wait: slow is the model thinking, not a hang. **A timeout or slow run is an environment failure and MUST NOT lower the reasoning effort** — a quietly-downgraded cross-model run is an undisclosed degradation the disclosures cannot show. Repeated errors (failures, not slowness) route to the same-provider fallback, with its disclosure.
<!-- /approved-block: cross-model-dispatch -->

## Ledger and round table

All cycle state lives in the ledger file — `reviews/` subdirectory beside the design doc, doc-keyed name (`docs/specs/reviews/<doc-basename>.ledger.md`), templates in `artifacts.md`. Run header updated at every phase transition; round records written **at dispatch** (route, round-snapshot ref, roster, `dispatched → N of M returned`) and completed at return. Dispatched reviewers write raw reports to `reviews/<doc-basename>.round-N-<slug>.md` **before returning** (persist-before-synthesis). Ledger row IDs are the authoritative namespace; raw-report IDs are reviewer-local.

After **every** round — including no-change rounds — emit the cumulative round table, derived by counting ledger index rows. Column identity (review rounds only; gate rows, closure rows, and phase-minted rows — the Phase 0 standing entry, a gate fold's reversion row — sit outside it, carrying the minting phase in their Index Round cell: `P0`, `G1`): **raised = substantive + other; substantive = fixed + escalated; open accumulates escalated and unfixed items and drains at gates.** Every dispatch route line carries model + effort and the prompts-version echo. The final table appears in the completion summary; the doc carries only the ledger pointer line.

## Convergence circuit breaker

In this cycle the block's "independent verification rounds" are the independent whole-doc rounds and the closure legs. Elective rounds, probes, and the re-sweep never qualify: a narrowed slice's finding count is not comparable to a whole-artifact read's for the plateau test, and counting elective diligence toward the backstop would penalize running it. **Grouping:** for the plateau, repair-recursion, and self-reference tests, one closure attempt — its cold and verifier legs' findings pooled — is one round, as is each qualifying whole-doc round. The two legs judge the same snapshot and their remits yield findings at rates several-fold apart, so counting legs separately would alternate high-low and let a churning run evade the plateau test forever, while a verifier leg's one-or-two-item ledger-keeping residue would fire self-reference even as its sibling cold leg was still finding artifact defects. For the backstop, every dispatched qualifying read counts as a round — each qualifying whole-doc round and each closure leg: the backstop bounds spend, and each dispatch is spend.

**Firing-diagnostic measures** (the block's specification-drift diagnostic): size is the doc's line count against the Phase 0 baseline snapshot; decision-level content is its decision-log entry count plus answered gates; concentration is the section anchors of the last two qualifying rounds' substantive findings. A "repair wave" is any batch of runner fixes between qualifying rounds (a gate fold, dirty-leg repairs, a re-sweep's fixes); and the terminal the block defines is §Completion's **terminated-for-execution**. The annotations land in the doc; each open ledger row transitions to the disposition **annotated for execution** (Phase 3's disposition list scopes it to this terminal), and the run header's Terminal state line records the exit like any other terminal.

<!-- approved-block: convergence-circuit-breaker v4 — authoritative copy: ../../approved-blocks.md -->
**Convergence circuit breaker.** A cycle whose only exit is a clean independent verification has no reachable terminal on a large artifact: a cold flagship reader essentially always finds *something* worth an executor's attention in thousands of lines, each repair wave adds new unreviewed text, and the review's own records grow into reviewable surface — so finding counts plateau instead of decaying and the run converts budget into churn. Field case, an eleven-round cycle: counts decayed once (26 → 9) then plateaued (11, 10, 7) for four straight rounds; 40% of one wave's repairs were themselves defective; the last rounds' blockers sat in the review's own records; the cycle ended by improvised override — and execution then surfaced the residual defects in under an hour each, cheaper than any round had. The breaker is the legal exit for exactly that state, and it targets the repair-verification tail only: it never applies to the opening self-review, the first independent round, or a REQUIRED named-surface cross-model round — those run unconditionally.

**Triggers.** Evaluated after every independent verification round — each consuming skill's text beside this block names which of its reads qualify and how they group into rounds — once at least one full repair wave has been independently re-reviewed. Any one fires:

- **Plateau:** two consecutive independent rounds each raise at least half as many substantive findings (as-raised count) as the round before them — decay has stalled.
- **Repair recursion:** an independent round judges one third or more of the previous wave's repairs defective — the loop is generating its own input.
- **Self-reference:** more than half of an independent round's substantive findings sit in the review's own records (round tables, ledgers, handoffs, prior annotations) rather than in the artifact's operative content — the review has run out of artifact.
- **Backstop:** more than six independent rounds without a legal terminal; from the seventh onward the breaker MUST be evaluated after every round, and each continuation costs a one-line written justification in the cycle's record.

**Firing.** With a user turn in hand, present the trigger evidence and the continue-or-terminate choice as one decision. In an autonomous or unattended run, fire it and disclose — the conservative default, because past this point execution is the cheaper, higher-signal reviewer. Inventing a user decision in order to exit is not an alternative to firing: a runner that poses a new gate so a non-converging run can stop awaiting the user has substituted an illegal exit for a legal one (a breaker-less field run did exactly this, two closure attempts after the trigger evidence was complete). At firing, record one diagnostic beside the trigger evidence: the artifact's size growth since the review baseline against the growth of its decision-level content — each consuming skill's text beside this block names both measures — and where the last two qualifying rounds' findings concentrate. Swelling prose over stable decisions, with findings pooled in one section, is **specification drift**: its remedy is not another round but relocating the overgrown layer to the pipeline's next artifact (a design's implementation detail belongs to the plan; a plan's execution detail to execution), and the firing record SHOULD name the relocation.

**Action — the terminated-for-execution terminal:**

1. Every open finding, every repair not yet independently re-reviewed, and every rejection awaiting concurrence is written into the artifact as a one-line annotation at its span: the claim at issue, its status (open / unverified repair / unresolved disagreement), and what an executor must verify before relying on that span. Where the span's existing checks were ever green while the finding stood, the annotation prescribes a **falsification probe**, not a re-run: disable the mechanism under test, confirm the guarding check FAILS, restore it — a check that was green for the wrong reason cannot vouch for its span by passing again. Nothing is dropped, downgraded, or reclassified — the breaker relocates open items and changes the verification medium from cold reads to execution; the substantiveness bar does not move, and firing the breaker to shed an unwelcome finding is downgrade drift by another route. A run that fixed every finding within its own round still annotates: the newest repair wave is un-re-reviewed by definition, so the annotation set is never empty at firing — "no open findings" means the wave itself is the annotation list, not that there is nothing to annotate.
2. The terminal is recorded distinctly — `TERMINATED-FOR-EXECUTION after N rounds — M verify-first flags annotated in place` — in the cycle's record, the completion summary, and any review-record line the artifact carries. It MUST NOT be presented as convergence: the artifact is flagged as partially verified, never certified clean.
3. The handoff names the executor's side of the contract: annotated spans are verify-before-build, and defects execution surfaces come back to the artifact's owner as findings rather than being silently absorbed. Execution is the cycle's next reviewer, not the end of review.
<!-- /approved-block: convergence-circuit-breaker -->

One design-cycle nuance: items the user already dispositioned — deferred-by-user open questions and folded gate decisions — keep their terminal records untouched; the breaker annotates only rows still open. And a gate that has been posed but not answered is the **stopped awaiting user** terminal's territory, not the breaker's: the breaker never substitutes for a user decision the cycle already asked for.

## Completion

Four terminal states, reported to the user and to any invoking skill: **completed** (both legs clean); **abort to brainstorming** (a gate concluded wrong-problem — recorded without shame; the design goes back to design work, not onward to planning); **terminated-for-execution** (the convergence circuit breaker fired — open items stand as verify-first annotations in the doc; disclosed as partially verified, never presented as completed); **stopped awaiting user** (gate posed, user unreachable — run header holds the posed gate; `handoff` produces the artifact). **Whichever terminal fires, writing it to the run header's Terminal state line is the last ledger edit, and that update rides the terminal's single closing commit** — for completed, the automatic completion commit this section mandates; for abort, terminated-for-execution, and stopped-awaiting-user, an exit commit under the same pathspec discipline. One commit per terminal; no separate ledger commit. For anchor-stability purposes a run is **open** while the Terminal state line is blank **or reads stopped awaiting user** — that terminal resumes (the run header holds the posed gate, live until answered), so heading anchors stay held; only **completed**, **abort to brainstorming**, and **terminated-for-execution** release them. A stopped run the user chooses to abandon is closed by writing abort.

Before declaring completed: print and tick the closure checklist from `artifacts.md`. Then, as the final act, **commit — automatic and unprompted**: pathspec-limited to the doc, the ledger, and the raw reports (never a bare `git add`); project commit conventions apply; on hook failure or unusual repo state, surface once and stage instead of forcing; project rules forbidding agent commits override. The runner MUST NOT ask whether to commit — it commits and reports the SHA. Boundary-snapshot commits during the cycle follow the same pathspec discipline. Record observations to the project's memory store per `plan-review-cycle` §After completion (project store → agent-native memory → ask; never silently dropped).

**Completed terminal only — automatic editorial pass.** After the completion commit — never on abort, terminated-for-execution, or stopped-awaiting-user — invoke the sibling `editorial-pass` skill, handing it the doc path, the completion commit SHA as the certified baseline where tier 1 produced one, and the ledger path. Its remedy set is closed (accept, or revert to certified text, verified hunk-by-hunk by an independent dispatch); it cannot raise findings, edit substance, or reopen this run. Its polish commit lands directly on top of the completion commit, and the one-line `Polish:` record it appends to the run header rides that commit — together the single sanctioned exception to the last-ledger-edit rule above. Skipped on explicit user opt-out, and skipped by the pass itself where subagent dispatch is unavailable — the degraded mode below reaches a completed terminal without one, and an unrunnable polish step never blocks it.

## Inherited discipline

Reviewers return findings only — they MUST NOT edit the design doc; the runner owns the file and applies every fix. Batched escalations, never streamed. If the framework cannot dispatch subagents at all, the runner MAY run rounds itself and MUST disclose that independence was not achieved.
