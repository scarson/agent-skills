---
name: plan-review-cycle
description: Use after writing an implementation plan, before committing. Adversarial review for subagent-readiness — checks ambiguity, context gaps, interpretation drift, cross-task conflicts, and pitfall coverage across alternating author self-review and independent adversarial-reviewer rounds (ideally cross-model). The cycle ends when an independent round finds nothing substantive — or when its diminishing-returns circuit breaker terminates it for execution with verify-first flags annotated in the plan; further self-rounds run only while findings keep coming.
---

# Plan Review Cycle

## Terminology

<!-- approved-block: rfc2119-terminology v1 — authoritative copy: ../../approved-blocks.md -->
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.
<!-- /approved-block: rfc2119-terminology -->

## Overview

Rigorously review an implementation plan for subagent-readiness before
committing. The cycle is anchored on independence, not on a round
count: the runner MUST open with its own self-review, MUST include at
least one independent round, and the cycle ends only when an
**independent** round *raises* zero substantive findings against the
current plan text (the reviewer's own count — see Completion criteria)
— or when the convergence circuit breaker at the end of that section
terminates it for execution, the only other legal terminal.

## How to run

### Round structure

Each round MUST review the plan against ALL of these dimensions:

**Ambiguity** — Can a subagent reasonably interpret any task description
two different ways? The runner MUST eliminate every confirmed instance
(dispositions per Round execution step 4 apply). Look for
"handle this correctly," "fix the issue," "update as needed" — replace
with specific behavioral descriptions.

**Context gaps** — Would a subagent starting fresh (no conversation
history) have everything it needs? Check for:
- References to "the bug we discussed" (subagent wasn't in that discussion)
- Implicit knowledge of the codebase structure
- Assumptions about what packages are installed or what patterns exist
- Missing file paths or line numbers

**Interpretation latitude** — Could a subagent "improve" or "enhance"
beyond scope? Look for:
- Tasks that describe a goal without constraining the approach
- Missing "do NOT" boundaries on adjacent code
- Opportunities for a subagent to refactor, rename, or reorganize

**Cross-task dependencies** — Are ordering constraints explicit? Would
a subagent working on Task 3 know it depends on Task 1? Look for:
- Shared files modified by multiple tasks
- Tasks that create types/interfaces consumed by later tasks
- Test fixtures needed across tasks

**Testing pitfalls** — If `docs/pitfalls/testing-pitfalls.md` (or the
project's equivalent) exists, that round's reviewer MUST read it. If it doesn't
exist, the runner SHOULD note that absence once, in the round table's
notes — a run-level fact, not a recurring per-round finding. If
the doc is read, the runner MUST add warnings for every confirmed
pitfall risk (dispositions per Round execution step 4 apply). Common traps:
- Testing mock behavior instead of real behavior
- Asserting on substrings or log text instead of structural/semantic checks
- Covering only the happy path, never the error branches
- Tests coupled to implementation details (exact SQL, ordering, internal call sequences) that break on a behavior-preserving refactor

**Implementation pitfalls** — If `docs/pitfalls/implementation-pitfalls.md`
(or the project's equivalent) exists, that round's reviewer MUST read it. If it
doesn't exist, the runner SHOULD note that absence once, in the round
table's notes — a run-level fact, not a recurring per-round finding.
If the doc is read, the runner MUST add warnings for every confirmed
pitfall risk (dispositions per Round execution step 4 apply). Common:
- Swallowed errors, or errors that lose their original context
- Unvalidated external input flowing into a query, command, or template
- Building structured output (JSON, SQL, HTML, shell) by string concatenation without escaping
- Secrets leaking into logs, URLs, or request headers
- Resources never released: handles, connections, threads/goroutines

### Who runs each round

Rounds alternate between the runner and an **independent adversarial reviewer subagent**, so the plan is never reviewed only by the same context that wrote or last edited it — a self-review shares the very blind spots that produced the gaps. **The independent reviewer exists for independence, not double-checking:** a reviewer sharing the author's context re-walks the author's reasoning and re-misses what it missed, so decorrelation is the load-bearing property of the even rounds — the field case below (three same-family reviewers missing two concurrency races that an independent cross-model round caught immediately) is what this alternation exists to prevent.

- **Odd rounds (1, 3, 5, …): the runner** reviews the plan directly and fixes what it finds.
- **Even rounds (2, 4, …): the reviewer subagent.** It reviews the plan against the dimension checklist above and returns findings only — it MUST NOT edit the plan; the runner applies the fixes, since it owns the plan file. The dispatch hands the reviewer: the plan path; the repo root, with the instruction to verify the plan's file paths, structural assumptions, and named-surface reasoning against the actual source — the field case below was caught by a reviewer reading the source, not the plan — under a read boundary: do not read the plan's own git history or any prior review artifacts (the edit trail is the author's framing, more anchoring than the rationale file this dispatch already sequences); the pitfalls-doc paths (or a note of their absence); the dimension checklist verbatim, or this SKILL.md's path; the substantiveness calibration verbatim — "a finding is substantive if the plan's executor would be worse off not knowing, never judged by whether raising it extends the cycle; suppressing findings to finish and manufacturing findings to look rigorous are the same failure" (the reviewer's threshold is the cycle's exit threshold, so it must be calibrated in both branches of the checklist-or-SKILL.md choice); the instruction to return findings only — location (Task N, quoted text), dimension, claim — and never edit the plan; and, after the first independent round, the awaiting-concurrence rejection rationales **by file path, never inline** — with the instruction to complete its own whole-plan pass and write its findings down BEFORE opening that file. (In-prompt rationales are already read before any instruction fires; a path makes the sequencing real. The rationales are the author's framing, and reading them first would anchor the fresh eyes on exactly the contested spans.) The reviewer returns two separately labeled outputs: its findings, and a one-line verdict per rejection — concur or re-raise. Silence is not concurrence, and **a re-raise counts as a raised substantive finding** for both the termination count and the fixes-get-re-reviewed obligation.

The odd/even labels describe the typical alternation, not a constraint: consecutive independent rounds (a cold read followed by a cross-model read, say) are always legal. The binding rules live in Completion criteria — the full set, no summary here is exhaustive — and include: round 1 is the runner's own review; fixes get re-reviewed; no self-round terminates; no rejection may be left awaiting concurrence; and the named-surface cross-model obligation (below) is met or disclosed before the cycle ends.

**Fresh vs. persistent reviewer — choose by plan type.** The reviewer can be dispatched two ways, and the right one depends on the plan:

- **Fresh each round (maximum decorrelation).** A new subagent with **no conversation history** reads the plan cold every even round. A cold reader *is* the fresh, no-history subagent these dimensions exist to protect — the strongest catch for blind spots the author has normalized. Best for broad or straightforward plans — and for the *first* independent round regardless, since you want at least one genuinely cold read.
- **Persistent across rounds (sustained dialectic).** The *same* reviewer subagent carries its history forward and goes back and forth with the runner. The accumulated context sharpens both sides — the reviewer gets deep on this plan's specific subtleties and the rationale behind each fix, surfacing second-order issues a cold reader would miss. Best for intricate or subtle plans where the value is in a sustained dialogue. Trade-off: a persistent reviewer slowly absorbs the runner's framing, so its independence erodes over rounds — counter it by keeping at least one cold read in the mix (e.g. fresh first independent round, persistent after) or by re-dispatching cold periodically.

**At least one independent round SHOULD use a leading model from a different provider** than the one running this skill (typically Claude ↔ OpenAI/Codex) when the environment offers a cross-provider primitive. Same-provider models share training-data blind spots, so a decorrelated second opinion is where independent review earns its keep. <!-- approved-block: cross-provider-fallback v1 — authoritative copy: ../../approved-blocks.md -->
**How to dispatch cross-provider:** the mechanism depends on the environment — a sibling skill that wraps another provider's CLI (e.g., a `codex` skill shelling out to OpenAI's Codex CLI), that CLI invoked directly via Bash, or an API the runner can call. Asking the user to hand-carry the artifact under review to another provider's interface is a MAY-offer, never part of a REQUIRED trigger. If no automated primitive is available the runner MUST NOT block: fall back to a dispatched subagent from the runner's own provider **at this skill's reviewer tier**, and disclose the substitution in the round table and completion summary.
<!-- /approved-block: cross-provider-fallback -->

<!-- approved-block: cross-model-dispatch v1 — authoritative copy: ../../approved-blocks.md -->
**Long-running dispatch discipline.** Cross-model CLI runs at high reasoning effort routinely take 15–45+ minutes — longer than many harnesses' maximum foreground command timeout (Claude Code caps foreground Bash at 10). Launch them **backgrounded, output redirected to a log file** — never as a foreground call gated on a timeout. Confirm liveness once, early (the log exists and is growing within the first couple of minutes), then wait: slow is the model thinking, not a hang. **A timeout or slow run is an environment failure and MUST NOT lower the reasoning effort** — a quietly-downgraded cross-model run is an undisclosed degradation the disclosures cannot show. Repeated errors (failures, not slowness) route to the same-provider fallback, with its disclosure.
<!-- /approved-block: cross-model-dispatch -->

(This skill's reviewer tier is the Reviewer model selection paragraph below.)

**When the plan touches concurrency, data integrity, crash recovery, or security, a cross-model round is REQUIRED *if a cross-provider primitive is available*** — not merely recommended. Same-family reviewers share the blind spots that matter most on exactly these surfaces: in the field, three same-family review subagents missed two critical concurrency-safety errors in a plan's *own remediation approach* (a data-corrupting write race and a lost-update race) that an independent cross-model round caught immediately by reading the actual source. For these surfaces a decorrelated read is load-bearing, not a nicety. If no cross-provider primitive is available, the runner MUST NOT block — it falls back to same-provider independent review (per the cross-provider-fallback block above; reviewer tier per the Reviewer model selection paragraph below) and MUST record in the round table's notes (reproduced in the completion summary) that the cross-model round for a concurrency / data-integrity / crash-recovery / security plan could not be run, so the reader knows decorrelation was not achieved.

**Reviewer model selection.** The reviewer subagent SHOULD run at **high reasoning effort** (the literal effort-level string both providers accept; or the provider's equivalent) on the **latest available Claude Opus model** or **GPT-5 (or its successor at the same tier)**, unless the user has instructed otherwise — plan review is correctness-critical, and the flagship tier at high effort is the plugin-wide floor for adversarial dispatches. Do NOT default to `xhigh`: this skill runs many rounds, and the per-round latency and token cost of the maximum dial are not repaid by the accuracy difference at this tier. Step a single round up to `xhigh` deliberately if a plan's surface warrants it, not as the standing setting. "Successor" means the flagship tier's successor, not "or anything stronger": premium/max tiers (Claude Fable, GPT-Pro-class) only on explicit user request.

**If subagent dispatch is genuinely unavailable** in the environment, the runner MAY run all rounds itself, but MUST record in the round table's notes that every round was a self-review, so the independence the alternation provides was not achieved. In this degraded mode — and only in it — the final clean self-round substitutes for the terminating independent round (see Completion criteria).

### Round execution

For each round — steps 1–3 belong to that round's reviewer (the runner, or the subagent on independent rounds); steps 4–5 are always the runner's. Every step is a MUST, every round — step 5 in particular is the state carrier for the whole concurrence protocol, not bookkeeping to defer to the summary:

1. Read the plan end-to-end
2. Check every dimension above
3. Note each finding with location (Task N, specific text)
4. Disposition every finding: fix it in the plan, or record why not (false positive / out of scope / deliberate design choice) — a rejection costs one written line; findings are never silently dropped. **Fix like an author, not a litigator:** the preferred remedy for an ambiguity or latitude finding is rewriting the offending sentence so it can only be read one way — not appending the qualifier that answers the objection; deletion is a legal fix. A fix is integrated when the sentence reads as if written that way originally; a clause grafted onto an existing sentence is scar tissue the next cold round will re-flag. Stay span-local — replace the sentence, not the section. On subagent rounds the subagent returns findings only and the runner applies the fixes, reviewing each before it lands (the runner owns the plan file). For termination purposes the count that matters is the independent reviewer's **as-raised** count (re-raises included), never the post-disposition one — a runner rejection of an *independent round's* finding doesn't close it until a later independent round concurs (see Completion criteria). Rejecting a finding from your own self-round needs no concurrence: the one-line why suffices, and the next independent round reads the plan fresh regardless. The wave of fixes as a whole then clears §Repair discipline below before the next round reviews it.
5. Update the **cumulative round table** — round · reviewer (self-review, or independent with model and cold/persistent provenance) · findings raised · fixed · rejected-with-reason and its state (awaiting concurrence / concurred / re-raised → conceded-and-fixed / escalated → confirmed-and-fixed or user-ratified) — and emit it with the round's result. Awaiting-concurrence rows are additionally written to a **session scratch file** (temp directory or the harness scratchpad — never committed to the consuming repo; this skill emits no durable review artifacts of its own, though the reviewed plan and any memory record are of course durable) containing, per rejection: the finding as raised, quoted, and the rejection rationale. The file holds only rows currently in the awaiting-concurrence state — rows are removed on transition to any terminal state — and its path is exactly what the next independent dispatch hands over. The table carries a **notes** line for run-level disclosures (cross-model degradation, all-rounds-self-review, absent pitfalls docs). The final table appears in the completion summary; disclosures live in this table, not in prose recollection.

### Repair discipline

Step 4 governs each fix; these rules govern each round's fixes as a wave, before the round that verifies them:

<!-- approved-block: repair-wave-discipline v1 — authoritative copy: ../../approved-blocks.md -->
**Repair-wave discipline.** A repair is new, unreviewed text written under the finding's frame instead of the artifact's — which is why repair waves measure as a cycle's most defect-dense edits (40% of one field wave was itself defective). Four rules, each closing a defect class that has recurred across independently reviewed waves:

1. **State the claim delta, then sweep by claim.** Before editing, write one line: which claim changes, from what to what. After editing, sweep the artifact AND its companion records (status tables, decision logs, handoffs, review records) for the superseded claim **in any wording**, and fix or flag every instance in the same wave. A text search for the old wording does not discharge the sweep — the recurring survivor is the same claim in different words.
2. **Verify checkable assertions at write time.** A repair that asserts anything checkable — a signature, a file path, an interface, a command, a count, a behavior — is checked against the real thing in the same edit, and the fix record carries a one-line evidence note (what was checked, where). What cannot be checked now is written as an open question at the span, never as a fact.
3. **Derive numbers, never copy them.** Any count or enumeration written into a headline, summary, or table row is recomputed from the artifact it summarizes, at write time. A copied number is how one miscount propagates through four records and outlives the report that contradicts it.
4. **Re-read the wave as one diff.** Before the wave goes to its verifying round, read the complete diff end to end for fix-to-fix interactions and integration defects — grafted qualifiers, fixes that contradict each other, scar tissue a cold reader will re-flag. For a wave above roughly ten findings this read SHOULD be a dispatched fresh context rather than the fix author: integration failures are exactly what the author's context cannot see.
<!-- /approved-block: repair-wave-discipline -->

### Completion criteria

The cycle is bounded by independence, not by a round count — with one safety valve, the convergence circuit breaker at the end of this section, the only terminal that does not require a clean round:

- The runner's opening self-review and at least one independent round are both REQUIRED.
- After any round that produced substantive findings, the fixes MUST be reviewed by a subsequent round — remediation is where fresh errors enter (the field case above is about errors in a plan's *own remediation approach*).
- **Only an independent round can terminate the cycle — and only by the reviewer's own count.** The cycle ends clean when an independent round *raises* zero substantive findings; the circuit breaker below is the one non-clean terminal, and it too is evaluated only after independent rounds. Runner dispositions never zero-out a round: if the runner rejects an independent finding, the rejection rationale is handed to the next independent round, which either concurs (closing it — the concurred ruling gets the same one-line note in the plan at the contested span as a user-ratified one, so later cold readers meet it in the artifact rather than re-raising a settled question; an annotation-only edit recording a just-delivered ruling does not re-open the cycle or demand another round) or re-raises it. If the reviewer re-raises and the runner still rejects, the standoff is a genuine disagreement the runner MUST NOT resolve alone: escalate both rationales to the user. If the user upholds the finding, it is confirmed and gets fixed. If the user upholds the rejection, it becomes the terminal disposition **user-ratified** — recorded in the round table AND as a one-line note in the plan at the contested span, so later cold readers meet the ruling in the artifact itself instead of re-raising and re-escalating a question the user already answered. If the user is unreachable, the finding stands as confirmed and gets fixed — the conservative default. The fix author cannot certify its own fixes — and cannot reject its way to a clean round either. A runner self-round landing at zero is a signal to dispatch the independent round, never a stopping point; self-rounds continue only while rounds keep producing substantive findings. The terminating round SHOULD be a cold read — a persistent reviewer's independence erodes over rounds, and the round that ends the cycle is the one place erosion costs most.
- **Substantive, defined:** the tiebreak is whether the plan's executor would be worse off not knowing — never whether recording the finding extends the cycle. Downgrade drift (rejecting real findings to finish sooner) is the named hazard the concurrence rule above exists to catch.
- **The cycle cannot end while any rejection is awaiting concurrence.** A clean termination disposes them through the terminating round's verdict block — a missing verdict is a missing output, and the runner re-requests it from the reviewer rather than inferring concurrence from silence. A circuit-breaker termination disposes them as verify-first annotations at their spans. Neither route leaves a rejection undispositioned.
- On the named surfaces (concurrency, data integrity, crash recovery, security), the cross-model obligation above MUST be met — or its degradation disclosed in the round table's notes — before the cycle can end.
- In the degraded all-self-review mode (dispatch unavailable), the final clean self-round substitutes for the terminating independent round, with the table's notes disclosing that independence was not achieved. Rejections already awaiting concurrence when dispatch is lost mid-cycle cannot be tested: escalate them to the user directly, or — if the user is unreachable — treat them as confirmed and fix (the same conservative default as escalation standoffs), with the notes disclosing which path was taken. (In a run that was degraded from the start, no rejection ever enters the awaiting-concurrence state — self-round rejections need only their recorded why.)

Typical shape: the opening self-review finds plenty (plans always have gaps on first review — no target number; a quota invites manufacture); the first independent round surfaces what the author normalized away, often rivaling the opener, which is the point; a runner round then catches second-order effects of the fixes; a final independent round lands clean. An independent or cross-model round pushing the finding count back up is the mechanism working, not a regression.

If the opening self-review produces 0 findings, re-check the plan against each dimension once more (still round 1 — one table row); if it still yields nothing, proceed directly to the independent round rather than re-running your own review — zero findings from the author is weak evidence in either direction, and the independent round is the test that counts. Findings are not the metric in either direction: suppressing findings to finish and manufacturing findings to look rigorous are the same failure — the review stops tracking the plan.

In this cycle the block's "independent verification rounds" are simply the independent rounds — cold or persistent, same-provider or cross-model alike; self-rounds never qualify, exactly as they never terminate.

<!-- approved-block: convergence-circuit-breaker v3 — authoritative copy: ../../approved-blocks.md -->
**Convergence circuit breaker.** A cycle whose only exit is a clean independent verification has no reachable terminal on a large artifact: a cold flagship reader essentially always finds *something* worth an executor's attention in thousands of lines, each repair wave adds new unreviewed text, and the review's own records grow into reviewable surface — so finding counts plateau instead of decaying and the run converts budget into churn. Field case, an eleven-round cycle: counts decayed once (26 → 9) then plateaued (11, 10, 7) for four straight rounds; 40% of one wave's repairs were themselves defective; the last rounds' blockers sat in the review's own records; the cycle ended by improvised override — and execution then surfaced the residual defects in under an hour each, cheaper than any round had. The breaker is the legal exit for exactly that state, and it targets the repair-verification tail only: it never applies to the opening self-review, the first independent round, or a REQUIRED named-surface cross-model round — those run unconditionally.

**Triggers.** Evaluated after every independent verification round — each consuming skill's text beside this block names which of its reads qualify — once at least one full repair wave has been independently re-reviewed. Any one fires:

- **Plateau:** two consecutive independent rounds each raise at least half as many substantive findings (as-raised count) as the round before them — decay has stalled.
- **Repair recursion:** an independent round judges one third or more of the previous wave's repairs defective — the loop is generating its own input.
- **Self-reference:** more than half of an independent round's substantive findings sit in the review's own records (round tables, ledgers, handoffs, prior annotations) rather than in the artifact's operative content — the review has run out of artifact.
- **Backstop:** more than six independent rounds without a legal terminal; from the seventh onward the breaker MUST be evaluated after every round, and each continuation costs a one-line written justification in the cycle's record.

**Firing.** With a user turn in hand, present the trigger evidence and the continue-or-terminate choice as one decision. In an autonomous or unattended run, fire it and disclose — the conservative default, because past this point execution is the cheaper, higher-signal reviewer.

**Action — the terminated-for-execution terminal:**

1. Every open finding, every repair not yet independently re-reviewed, and every rejection awaiting concurrence is written into the artifact as a one-line annotation at its span: the claim at issue, its status (open / unverified repair / unresolved disagreement), and what an executor must verify before relying on that span. Where the span's existing checks were ever green while the finding stood, the annotation prescribes a **falsification probe**, not a re-run: disable the mechanism under test, confirm the guarding check FAILS, restore it — a check that was green for the wrong reason cannot vouch for its span by passing again. Nothing is dropped, downgraded, or reclassified — the breaker relocates open items and changes the verification medium from cold reads to execution; the substantiveness bar does not move, and firing the breaker to shed an unwelcome finding is downgrade drift by another route.
2. The terminal is recorded distinctly — `TERMINATED-FOR-EXECUTION after N rounds — M verify-first flags annotated in place` — in the cycle's record, the completion summary, and any review-record line the artifact carries. It MUST NOT be presented as convergence: the artifact is flagged as partially verified, never certified clean.
3. The handoff names the executor's side of the contract: annotated spans are verify-before-build, and defects execution surfaces come back to the artifact's owner as findings rather than being silently absorbed. Execution is the cycle's next reviewer, not the end of review.
<!-- /approved-block: convergence-circuit-breaker -->

### After completion

First, emit the **completion summary**: the final cumulative round table with its notes line — this is where the disclosures land for the reader, not only in mid-transcript per-round emissions. Then the runner SHOULD record observations about plan quality and recurring patterns in the project's **memory system**. Prefer a store the project has deliberately set up — a dated `docs/learnings/` file, a `gstack-learn`-style command, or an MCP journal (e.g. obra's private-journal) — since its presence signals where the team wants this kind of record to live. Failing that, fall back to the agent's own native memory (e.g. Claude's `MEMORY.md` / project memory, Codex's equivalent), which most harnesses provide. If neither is apparent, the runner MUST surface the observations to the user and ask whether — and where — to record them; it MUST NOT silently drop them. **That question MUST NOT block the cycle.** In a non-interactive or unattended run — or wherever the user is otherwise unreachable — do not wait on an answer: record the observations verbatim in the completion summary, note in the round table that no durable store was found, and carry on to the commit. The conservative default is the same one the escalation standoff takes: proceed and disclose. A finished review must never stall on a bookkeeping question, and the observations survive in the summary either way. Ask only when a user turn is already in hand. When recording, capture:

- **Type:** pattern
- **Key:** `plan-review-[slug]`
- **Insight:** what patterns emerged, what was most commonly wrong

**Then flip the plan's review record.** If the plan carries a `**Plan review:**` line in its `## Execution Status` section — every plan written by `writing-plans-enhanced` does — update it in the edit pass that precedes the commit, so the record and the reviewed text land together in one commit:

```markdown
**Plan review:** ✅ COMPLETED <YYYY-MM-DD> — N rounds, terminating round <independent | self-review> (<cold read | persistent>, <model>)
```

A circuit-breaker termination writes the same line with its own status, so an executor cannot mistake a flagged plan for a certified one:

```markdown
**Plan review:** ⚠️ TERMINATED-FOR-EXECUTION <YYYY-MM-DD> — N rounds, M verify-first flags annotated in place
```

If the plan already reads ✅ from an earlier review — the sibling cycles review a plan once inside `writing-plans-enhanced` and again in their own later phase — this line records the **most recent completed review**, and `N rounds` is that run's count, not a cumulative total. Replace the line rather than appending to it; the per-run detail lives in each run's round table, and a line that accretes history stops being scannable, which is the only thing it is for.

Record rounds, date, and the terminating round's provenance. Do **not** record a commit SHA here: the commit that lands this line is the one made below, so any SHA written would name a commit that does not yet exist, and an invented anchor is worse than an absent one (§Repo assumptions). Where the run was degraded — all rounds self-review, cross-model unavailable on a named surface — say so on this line as well as in the round table; this line is the disclosure a later reader is most likely to encounter, because it travels with the plan rather than with the session.

If the plan has no such line — a plan not written by `writing-plans-enhanced`, or a standalone document — do not fabricate the section. Note its absence once in the round table's notes and proceed.

Then commit the reviewed plan — **automatic and unprompted** (tier 1; see §Repo assumptions for the degraded tiers). The runner MUST NOT ask whether to commit; it commits and reports the SHA. Project rules forbidding agent commits override, and on hook failure or unusual repo state, surface once and stage instead of forcing.

Finally — automatic and unprompted, skipped on explicit user opt-out, skipped entirely on a terminated-for-execution terminal (the verify-first flags are load-bearing spans an executor must meet exactly where they sit; polish waits until they are resolved and a later review completes), and skipped by the pass itself where subagent dispatch is unavailable — invoke the sibling `editorial-pass` skill on the just-committed plan, handing it the plan path and, at tier 1, that commit's SHA as the certified baseline. It performs a meaning-preserving legibility rewrite under a closed remedy set (accept, or revert to the certified text, verified hunk-by-hunk by an independent dispatch) and lands as its own commit immediately on top of this one. It cannot raise findings, edit substance, or reopen this cycle — the review is over; this is the rendering.

## Repo assumptions

<!-- approved-block: repo-tier-degradation v1 — authoritative copy: ../../approved-blocks.md -->
**Repo probe, three tiers, no invented anchors.** Before any step that commits, records a commit SHA, or hands one to another skill, probe: is the artifact inside a git work tree, and may the runner commit (project rules, hooks)? Never block on the answer — degrade and disclose. **Tier 1, work tree and committing allowed:** the full protocol, SHAs recorded and handed on as written. **Tier 2, work tree but committing unavailable** (project rules forbid agent commits, hooks fail, unusual repo state): stage rather than commit — or, where staging is itself unavailable or the project's convention prefers it, leave the artifact in place and say so — surface once rather than forcing, and use the artifact's current bytes wherever a commit SHA would have been the anchor. **Tier 3, no work tree at all** (research, operations, or docs work outside any repo): copy the artifact's bytes to a session scratch file before proceeding — that copy is the baseline anything downstream would otherwise have taken from a commit — and disclose that no durable audit trail exists, reporting the scratch path so the user can keep it. In the degraded tiers the missing field is dropped with a one-line note saying why, and MUST NOT be filled with a plausible-looking value: a requirement that cannot be met honestly is a prompt to invent, and an invented SHA is worse than an absent one because it reads as an anchor while resolving to nothing.
<!-- /approved-block: repo-tier-degradation -->

For this cycle that means: the reviewed plan is committed at tier 1, staged or left in place at tiers 2 and 3, and `editorial-pass` is handed a certification SHA only where one exists. At the degraded tiers hand the plan path alone and name the tier that fired — that skill's §Step 0 takes the plan's certified bytes as its baseline in exactly that case, so the pass still runs.
