---
name: plan-review-cycle
description: Use after writing an implementation plan, before committing. Adversarial review for subagent-readiness — checks ambiguity, context gaps, interpretation drift, cross-task conflicts, and pitfall coverage across a minimum of 3 rounds that alternate the author's self-review with an independent, ideally cross-model adversarial reviewer (more rounds if any still finds substantive issues).
---

# Plan Review Cycle

## Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.

## Overview

Rigorously review an implementation plan for subagent-readiness before
committing. The runner MUST execute a minimum of 3 review rounds, and
MUST continue running additional rounds until a single round produces
zero substantive findings.

## How to run

### Round structure

Each round MUST review the plan against ALL of these dimensions:

**Ambiguity** — Can a subagent reasonably interpret any task description
two different ways? The runner MUST eliminate every instance. Look for
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
project's equivalent) exists, the runner MUST read it. If it doesn't
exist, the runner SHOULD note that absence in the round's findings. If
the doc is read, the runner MUST add warnings to any task that risks
falling into a documented pitfall. Common traps:
- Testing mock behavior instead of real behavior
- Asserting on substrings or log text instead of structural/semantic checks
- Covering only the happy path, never the error branches
- Tests coupled to implementation details (exact SQL, ordering, internal call sequences) that break on a behavior-preserving refactor

**Implementation pitfalls** — If `docs/pitfalls/implementation-pitfalls.md`
(or the project's equivalent) exists, the runner MUST read it. If it
doesn't exist, the runner SHOULD note that absence in the round's
findings. If the doc is read, the runner MUST add warnings to any task
that risks falling into a documented pitfall. Common:
- Swallowed errors, or errors that lose their original context
- Unvalidated external input flowing into a query, command, or template
- Building structured output (JSON, SQL, HTML, shell) by string concatenation without escaping
- Secrets leaking into logs, URLs, or request headers
- Resources never released: handles, connections, threads/goroutines

### Who runs each round

Rounds alternate between the runner and an **independent adversarial reviewer subagent**, so the plan is never reviewed only by the same context that wrote or last edited it — a self-review shares the very blind spots that produced the gaps.

- **Odd rounds (1, 3, 5, …): the runner** reviews the plan directly and fixes what it finds.
- **Even rounds (2, 4, …): the reviewer subagent.** It reviews the plan against the dimension checklist above and returns findings only — it MUST NOT edit the plan; the runner applies the fixes, since it owns the plan file.

**Fresh vs. persistent reviewer — choose by plan type.** The reviewer can be dispatched two ways, and the right one depends on the plan:

- **Fresh each round (maximum decorrelation).** A new subagent with **no conversation history** reads the plan cold every even round. A cold reader *is* the fresh, no-history subagent these dimensions exist to protect — the strongest catch for blind spots the author has normalized. Best for broad or straightforward plans — and for the *first* independent round regardless, since you want at least one genuinely cold read.
- **Persistent across rounds (sustained dialectic).** The *same* reviewer subagent carries its history forward and goes back and forth with the runner. The accumulated context sharpens both sides — the reviewer gets deep on this plan's specific subtleties and the rationale behind each fix, surfacing second-order issues a cold reader would miss. Best for intricate or subtle plans where the value is in a sustained dialogue. Trade-off: a persistent reviewer slowly absorbs the runner's framing, so its independence erodes over rounds — counter it by keeping at least one cold read in the mix (e.g. fresh first independent round, persistent after) or by re-dispatching cold periodically.

**At least one even round SHOULD use a leading model from a different provider** than the one running this skill (typically Claude ↔ OpenAI/Codex) when the environment offers a cross-provider primitive. Same-provider models share training-data blind spots, so a decorrelated second opinion is where independent review earns its keep. Use whatever cross-provider mechanism the environment provides, and fall back exactly as [`build-robust-features`](../build-robust-features/SKILL.md) Step 2 describes — don't reimplement that logic here.

**When the plan touches concurrency, data integrity, crash recovery, or security, a cross-model round is REQUIRED *if a cross-provider primitive is available*** — not merely recommended. Same-family reviewers share the blind spots that matter most on exactly these surfaces: in the field, three same-family review subagents missed two critical concurrency-safety errors in a plan's *own remediation approach* (a data-corrupting write race and a lost-update race) that an independent cross-model round caught immediately by reading the actual source. For these surfaces a decorrelated read is load-bearing, not a nicety. If no cross-provider primitive is available, the runner MUST NOT block — it falls back to same-provider independent review (per `build-robust-features` Step 2) and MUST note in the final summary that the cross-model round for a concurrency / data-integrity / crash-recovery / security plan could not be run, so the reader knows decorrelation was not achieved.

**Reviewer model selection.** The reviewer subagent SHOULD run on the **latest available Claude Opus model** or **GPT-5 (or successor) at x-high reasoning effort**, unless the user has instructed otherwise — plan review is correctness-critical and benefits asymmetrically from maximum reasoning bandwidth.

**If subagent dispatch is genuinely unavailable** in the environment, the runner MAY run all rounds itself, but MUST note in the final summary that every round was a self-review, so the independence the alternation provides was not achieved.

### Round execution

For each round, the reviewer for that round (the runner, or the subagent on even rounds) MUST:

1. Read the plan end-to-end
2. Check every dimension above
3. Note each finding with location (Task N, specific text)
4. Fix all findings in the plan — on subagent rounds the subagent returns its findings and the runner applies the fixes, reviewing each before it lands (the runner owns the plan file)
5. Record the round number, who reviewed it, and the finding count

### Completion criteria

- Round 1 (runner): expect 5+ findings (plans always have gaps on first review)
- Round 2 (independent reviewer): residual from round 1's fixes **plus** whatever the independent reviewer surfaces that the author missed — this can rival round 1, which is the point
- Round 3 (runner): second-order effects of the prior fixes
- Round 4: if 0 findings, the runner MAY stop. If any findings remain, the runner MUST run another round.
- Round 5+: the runner MUST continue running rounds until one produces 0 findings.

An independent or cross-model round can legitimately push the finding count back up — the independent reviewer surfaces gaps the author normalized away. That's the mechanism working, not a regression: keep alternating and running rounds until one genuinely lands at 0.

If round 1 produces 0 findings, the runner is not looking hard enough.
The runner MUST re-read the dimensions and run round 1 again.

### After completion

The runner SHOULD record observations about plan quality and recurring patterns in the project's **memory system**. Prefer a store the project has deliberately set up — a dated `docs/learnings/` file, a `gstack-learn`-style command, or an MCP journal (e.g. obra's private-journal) — since its presence signals where the team wants this kind of record to live. Failing that, fall back to the agent's own native memory (e.g. Claude's `MEMORY.md` / project memory, Codex's equivalent), which most harnesses provide. If neither is apparent, the runner MUST surface the observations to the user in the session and ask whether — and where — to record them; it MUST NOT silently drop them. When recording, capture:

- **Type:** pattern
- **Key:** `plan-review-[slug]`
- **Insight:** what patterns emerged, what was most commonly wrong

Then commit the reviewed plan.
