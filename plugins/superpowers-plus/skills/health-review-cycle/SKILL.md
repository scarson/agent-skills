---
name: health-review-cycle
description: Full health review cycle — dispatch the sibling project-health-review skill (5-axis adversarial review), cross-validate findings, present design decisions, and write a fix plan via writing-plans-enhanced. Use periodically as a health check or before major milestones.
argument-hint: "[optional: specific area to focus on, or 'full' for all dimensions]"
---

# Health Review Cycle

## Terminology

<!-- approved-block: rfc2119-terminology v1 — authoritative copy: ../../approved-blocks.md -->
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.
<!-- /approved-block: rfc2119-terminology -->

## Overview

Running a full health review cycle for: **$ARGUMENTS** (default: full review across all dimensions)

This is a multi-phase workflow. The runner MUST follow each phase in order and MUST NOT skip phases.

This skill orchestrates three sibling workhorses in this plugin: [`project-health-review`](../project-health-review/SKILL.md) for the five-axis adversarial dispatch (Code Quality, Architecture, Test Quality, Ops Readiness, API Design), [`writing-plans-enhanced`](../writing-plans-enhanced/SKILL.md) for the fix plan, and [`plan-review-cycle`](../plan-review-cycle/SKILL.md) for the adversarial plan review. The cycle owns cross-validation, the user-decision loop, and health-review-specific plan instructions. It MUST NOT duplicate the subagent-proofing or plan-review discipline encoded in the delegated skills.

### Mode declaration — is the full cycle warranted?

Declare the mode before Phase 1 and state it in the validated report, naming the evidence:

- **Full cycle (default at a milestone).** All six phases. Honest cost: 5 adversarial agents + verification dispatches during cross-validation + whatever `writing-plans-enhanced` and `plan-review-cycle` spawn downstream. Warranted when the answer feeds a decision — a milestone, a refactor call, a go/no-go — and the remediation actually gets scheduled.
- **Snapshot (you want the picture, not the loop).** When the ask is "where does this project hurt" with no remediation committed to yet, the sibling [`project-health-review`](../project-health-review/SKILL.md) alone produces the five raw reports and the synthesis. Say so and recommend it. The validation, decision loop, plan, and plan review are the expensive half, and they only earn their cost once someone intends to act on the findings.

The runner MUST NOT run the full cycle silently when the snapshot answers the question asked. A user who wants the full cycle anyway says so and gets it.

---

## Phase 1: Dispatch Health Review

The runner MUST invoke the sibling [`project-health-review`](../project-health-review/SKILL.md) skill (or, if the framework cannot invoke skills by name, read its `SKILL.md` from the plugin install location), passing through the same scope (`$ARGUMENTS`) so the dispatched agents review the right area. This launches **5 parallel adversarial agents** (Code Quality, Architecture, Test Quality, Ops Readiness, API Design), each writing to `docs/health-reviews/`.

Follow the skill exactly through its Execution and Synthesis sections. This produces:
- 5 individual agent reports in `docs/health-reviews/`
- 1 consolidated synthesis report in `docs/health-reviews/`

**The runner MUST NOT proceed to Phase 2 until all 5 agents have completed and the consolidated report is written.**

---

## Phase 2: Cross-Validate Every Finding

The health review agents are adversarial by design — they look for problems. But adversarial agents also produce false positives, mischaracterize severity, and sometimes flag intentional design decisions as bugs. Every finding needs verification.

**COMPLETENESS REQUIREMENT:** The runner MUST account for every single finding from every agent report. Before starting cross-validation, the runner MUST enumerate all findings from all 5 agent reports and the synthesis. Every finding MUST appear in the validated report as one of: confirmed issue, design decision, false positive, or known/already-tracked — and in the §2f reconciliation table, which is what makes that claim checkable rather than asserted. **The runner MUST NOT decide what's "too minor" to include — that's the user's decision in Phase 3.** Silently dropping findings defeats the entire purpose of the adversarial review.

### 2a. Verify each finding against actual code

**If you dispatch verifiers rather than validating in-session, group them by file.** One verifier per finding does not scale — a five-axis review routinely returns dozens, and most verifiers would re-read the same files. Dispatch over **co-located findings**: up to ~3 *same-file* findings per verifier, each assessed independently and returned with its own verdict. The verifier shares the file read, not the judgment. Do NOT group across unrelated files — that dilutes attention and reintroduces the false-negative risk the grouping was meant to avoid. One verdict per finding either way, which is what keeps the reconciliation below mechanical. Architecture-dimension findings often have no single file to co-locate on; validate those in-session rather than forcing them into a file-keyed group.

For each finding in the consolidated report AND in individual agent reports (agents may have findings the synthesis missed):

1. **Read the actual code** at the cited location. Do not trust the agent's description alone — verify the evidence yourself.
2. **Check the project's plan and research docs** — is this an intentional design decision? Some "problems" are documented tradeoffs. (Common locations: `docs/plans/`, `docs/research.md`, `PLAN.md` if present.)
3. **Check `docs/pitfalls/implementation-pitfalls.md`** (or the project's equivalent) — is this a known pattern with documented rationale?
4. **Check git history if needed** — was there a deliberate choice here? (`git log --oneline -5 <file>` or `git blame`)
5. **Verify severity** — is the claimed risk actually reachable? Under what conditions? An agent may flag a theoretical risk that's architecturally impossible.

### 2b. Cross-agent validation

When multiple agents flag the same area:
- **Agreement strengthens the finding** — if Architecture and Ops Readiness both flag it, it's likely real
- **Contradiction resolves it** — if Code Quality says "this abstraction is unnecessary" but Architecture says "this abstraction enables X," investigate who's right

When only one agent flags something:
- **Increased scrutiny** — single-agent findings have a higher false-positive rate
- **Check if other agents examined the same code** — an agent that read the code and didn't flag it is a weak counter-signal (they might have missed it), but it's worth noting

### 2c. Classify each finding

- **Confirmed issue** — verified problem with evidence
- **Design decision needing user input** — legitimate concern but the correct response depends on product priorities, architectural tradeoffs, or scope decisions that require the user's judgment
- **False positive** — explain why the finding is incorrect or not applicable
- **Known / already tracked** — issue is real but already documented in an existing plan, bug hunt report, or implementation-pitfalls doc

### 2d. Blast radius analysis

For confirmed issues, assess fix complexity and blast radius:
- Is this a localized fix (one file, one function) or cross-cutting (touches many packages)?
- Would fixing this require API changes that affect downstream consumers?
- Would fixing this require migration changes?
- Are there ordering dependencies (must fix X before Y)?

### 2e. Write validated report

Write to `docs/health-reviews/<date>-<slug>-validated.md`, using the structure below. **Match its length to the findings, not to the template** — every confirmed issue earns its lines, and a section with nothing in it earns the word "None". Do not pad with restated summaries, per-dimension narration, or boilerplate scaffolding around an empty result; rank by what the reader acts on first, and let the minor tail sit below the findings that matter rather than competing with them.

```markdown
# <Scope> Health Review — Validated Findings

**Date:** <YYYY-MM-DD>
**Scope:** <description>
**Source:** Project health review (5-dimension adversarial)

---

## Confirmed Issues

### I1. <Title>
**Severity:** CRITICAL | MAJOR | MINOR
**Dimensions:** <which agents flagged it>
**Location:** <file:line or architectural description>
**Evidence:** <verified problem description>
**Blast radius:** <what would need to change>
**Fix approach:** <brief description>

(Repeat for each confirmed issue, ordered by severity)

---

## Design Decisions Requiring User Input

### D1. <Title>
**Flagged by:** <which agent(s)>
**The concern:** <what was flagged>
**Why this needs a decision:** <what tradeoffs are involved>
**Options:** <enumerate choices with pros/cons>
**Recommendation:** <if applicable>

---

## False Positives

### FP1. <Title>
**Flagged by:** <which agent>
**Why invalid:** <brief explanation>

---

## Known / Already Tracked

### K1. <Title>
**Flagged by:** <which agent>
**Where tracked:** <plan file, bug hunt report, or pitfalls doc>
```

### 2f. Reconciliation table (gating artifact)

"Every finding is accounted for" is only real if something checks it. Re-reading the reports and comparing counts is the check that silently fails — it passes whether or not a finding was dropped, because nothing names what should be there. Replace it with a table the validated report carries:

```markdown
## Reconciliation

| Dimension | Raw finding | Merged into | Disposition |
|---|---|---|---|
| ops-readiness | O3 — worker exits without draining claimed jobs | I2 | confirmed issue |
| architecture | A7 — same drain gap, framed as lifecycle ownership | I2 | duplicate |
| code-quality | C1 — error swallowed in retry helper | — | known / tracked (pitfalls IMPL-4) |
| api-design | P2 — list endpoint unpaginated | I5 | confirmed issue |
```

Every raw finding from every agent report appears exactly once, mapped to a validated ID or to a terminal disposition (duplicate / false positive / known-tracked / design decision). A raw finding in no row is a **coverage leak** and MUST block the Phase 6 commit until it is placed.

The table is the artifact, not the assertion: a reader — or the next agent — can check it against the five raw reports without redoing the validation, which a prose "I verified completeness" claim never allows. The sibling [`design-review-cycle`](../design-review-cycle/SKILL.md) enforces the same property at closure by mapping every diff hunk to a ledger row; this is that discipline applied to findings.

After writing the validated report, record observations in the project's memory store: what patterns emerged across dimensions, which findings surprised you, what the false-positive rate looked like, and any insights about the project's overall health. Prefer a store the project has deliberately set up — a dated `docs/learnings/` file, a `gstack-learn`-style command, or whatever the project uses — since its presence signals where the team wants this kind of record to live. Failing that, fall back to the agent's own native memory (Claude's `MEMORY.md` / project memory, Codex's equivalent). If neither is apparent, surface the observations to the user and ask whether and where to record them; they MUST NOT be silently dropped.

---

## Phase 3: Present to User

Present the validated findings to the user. Structure the presentation as:

1. **Executive summary** — X confirmed issues (N critical, N major, N minor), Y design decisions needing input, Z false positives, W already-tracked
2. **Critical issues** — table (title, dimensions, location, fix complexity)
3. **Major issues** — same format
4. **Minor issues** — same format. **The runner MUST NOT omit minors.** The user decides what to prioritize, not the runner.
5. **Design decisions** — present each with enough context for an informed decision. Think through each in the context of the project's plan, roadmap, and current phase. Make recommendations where you have a well-reasoned opinion.
6. **Already-tracked items** — briefly note these so the user knows the health review didn't miss them, but no action needed
7. **Scope question** — ask which issues the user wants in the fix plan:
   - All confirmed issues?
   - Critical + major only?
   - Critical only?
   - Specific subset?

**The runner MUST wait for the user's input on all design decisions and scope questions before proceeding to Phase 4.**

---

## Phase 4: Write Fix Plan

After the user has provided input, the runner MUST invoke [`writing-plans-enhanced`](../writing-plans-enhanced/SKILL.md) to create an implementation plan for the selected issues. `writing-plans-enhanced` owns the subagent-proofing discipline (eliminating ambiguity, preventing context gaps, mandating TDD, reviewing pitfalls, minimizing cross-task conflicts, the Living Document Contract) — the cycle MUST NOT duplicate those rules here.

When invoking `writing-plans-enhanced`, the runner MUST pass these health-review-specific instructions as additional context to layer on top of the wrapper's standard discipline:

- **Plan file path:** `docs/plans/<date>-<slug>-health-review-remediation-plan.md` (e.g., `docs/plans/2026-03-18-health-review-remediation-plan.md`). The `-health-review-remediation-plan.md` suffix distinguishes health-review remediation plans from other plan types so they are easy to identify and search for.
- **Source:** the validated findings report at `docs/health-reviews/<date>-<slug>-validated.md`.
- **Dimension tagging:** each task MUST cite the health-review dimension(s) it addresses (e.g., "Code Quality + Architecture") for traceability back to the validated findings report.
- **Counter the over-engineering propensity.** Health-review fixes are especially prone to over-engineering — an agent asked to "fix an architectural issue" will often redesign the architecture. The plan MUST specify the minimum fix that addresses the finding and explicitly state what NOT to change ("do not refactor X, only fix Y").
- **Order tasks by dependency, not severity.** Health-review fixes often have implicit ordering:
  - Infrastructure fixes before feature fixes (e.g., fix RLS bypass before adding new endpoints)
  - Schema changes before code changes
  - Shared utility fixes before fixes in code that uses those utilities
  - Group tasks that touch the same file to avoid merge conflicts
- **Separate quick wins from larger efforts.** If some findings are one-line fixes and others are multi-day refactors, group them separately. Quick wins can go in one task; larger efforts need their own tasks with clear scope boundaries.
- **Deferred issues appendix:** if the user chose not to fix some confirmed issues, the plan MUST include an appendix listing them (see template below).

When `writing-plans-enhanced` presents execution options, the runner MUST include a recommendation for which approach would be most effective. Common options: (1) subagent-driven in this session, (2) parallel session with `executing-plans` in a worktree, or (3) parallel agent dispatch for multi-agent execution. Base the recommendation on: how much context this session has consumed, whether the plan is self-contained enough for a fresh session, how many tasks are parallelizable vs sequential, and whether any tasks are risky enough to warrant focused attention rather than parallel dispatch. Explain the reasoning concisely.

### Deferred items appendix

If the user chose not to fix some confirmed issues, the plan MUST include this appendix:

```markdown
## Appendix: Issues Identified But Not Fixed in This Cycle

### <Title>
**Severity:** <CRITICAL | MAJOR | MINOR>
**Dimensions:** <which agents flagged it>
**Evidence:** <what's wrong>
**Why deferred:** <user's reasoning or scope decision>
**Recommended approach:** <brief fix description for when this is addressed>
```

This appendix is the persistent record. It MUST be written to the plan file — not left in conversation memory.

---

## Phase 5: Plan Review Cycle

Before committing, the runner MUST rigorously review the fix plan for subagent-readiness by invoking [`plan-review-cycle`](../plan-review-cycle/SKILL.md) (a sibling skill in this plugin — always present when this cycle is). `plan-review-cycle` owns the multi-round adversarial review discipline; the cycle MUST NOT duplicate it here.

After the review cycle completes, the runner SHOULD record observations about plan quality and recurring patterns to the project's memory store, following [`plan-review-cycle`](../plan-review-cycle/SKILL.md) §After completion's cascade (project store → agent-native memory → ask the user; never silently dropped) — the runner has just invoked that skill, so its guidance is already at hand and MUST NOT be restated differently here. Capture:

- **Type:** pattern
- **Key:** `plan-review-[slug]`
- **Insight:** what patterns emerged, what was most commonly wrong

---

## Phase 6: Commit Reports

**Gate:** the §2f reconciliation table MUST be complete before this commit — every raw agent finding mapped to a validated ID or a terminal disposition. An unplaced finding is a coverage leak and blocks the commit until it is placed.

The runner MUST stage and commit all health review cycle artifacts:

```bash
git add docs/health-reviews/<date>-*
git add docs/plans/<plan-file>  # if the plan was written
git commit -m "docs(health): <slug> — validated findings and fix plan"
```
