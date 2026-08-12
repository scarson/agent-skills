---
name: writing-plans-enhanced
description: Use when writing implementation plans for this project. Wraps superpowers:writing-plans with project-specific conventions — plan location, subagent-proofing requirements, TDD mandates, pitfall review, the Living Document Contract, and a mandatory adversarial plan-review gate that runs automatically before the plan is committed. Also defers the base skill's execution handoff until after that review.
---

# Writing Plans (Enhanced)

Wraps `/superpowers:writing-plans` with project-specific requirements
that prevent subagent failures during execution.

## Terminology

<!-- approved-block: rfc2119-terminology v1 — authoritative copy: ../../approved-blocks.md -->
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.
<!-- /approved-block: rfc2119-terminology -->

## Step 1: Invoke the base skill

Invoke `/superpowers:writing-plans`. Follow it through **saving the plan**, and
stop there.

Save the plan to `docs/plans/<date>-<slug>-plan.md`
(e.g., `docs/plans/2026-04-08-mcp-tools-plan.md`).

**Carve-out — this skill re-sequences the base skill's ending.** Once the plan
file is saved, do NOT offer execution options, do NOT ask which execution
approach to use, and do NOT begin executing any task — regardless of what the
base skill's closing section is called or how it is worded. Return here and
continue with Step 2.

The base skill ends by presenting an execution choice. This skill moves that
presentation to Step 5, after the plan has been reviewed and committed, because
a review routinely changes task count, dependencies, and what is parallelizable
— the very inputs the recommendation is made from. A recommendation offered
before the review is a recommendation about a plan that no longer exists.

This carve-out is the only place this skill overrides the base skill; everything
else in `/superpowers:writing-plans` applies as written.

## Step 2: Execution strategy recommendation (prepared here, presented at Step 5)

Decide which execution strategy you will recommend and write down the reasoning.
Do NOT present it yet — Step 5 owns the presentation, and Step 4's review may
change the answer. The three options:

1. **Subagent-driven** (`/superpowers:subagent-driven-development`) —
   fresh subagent per task, review between tasks. Best for independent
   tasks needing quality gates.
2. **Parallel session** (`/superpowers:executing-plans` in a worktree) —
   batch execution with checkpoints. Best for tightly coupled sequential
   tasks.
3. **Parallel agents** (`/superpowers:dispatching-parallel-agents`) —
   concurrent agents on independent workstreams. Best for 3+ independent
   tracks with different files.

Base the recommendation on:
- How much context this session has consumed
- Whether the plan is self-contained enough for a fresh session
- How many tasks are parallelizable vs sequential
- Whether any tasks are risky enough to warrant focused attention

## Step 3: Subagent-proof the plan

Subagents start fresh with zero context. The plan MUST prevent their
predictable failure modes:

### Eliminate ambiguity
For each task, specify:
- Exact files to create or modify
- Exact behavior change (current → desired)
- Exact test to write (input, expected output, edge cases)
- Ordering dependencies with other tasks

### Prevent context gaps
Each task description must be self-contained:
- Include evidence (file:line, what's wrong or what's needed)
- Include the approach (not just "fix the bug" or "add the feature")
- Include architectural context if the task depends on a design choice
- If the task touches shared code, list other callers that must still work

### Prevent interpretation drift
- Where there's one correct approach, state it explicitly
- Where there are multiple valid approaches, pick one and specify it
- Add "do NOT" boundaries where a subagent might over-engineer

### Mandate TDD
Every task MUST include:
```
BEFORE starting work:
1. Invoke /superpowers:test-driven-development
2. Read docs/pitfalls/testing-pitfalls.md
Follow TDD: write failing test → implement → verify green. Cover the
error paths and edge cases as you write the tests — that is part of
writing them, not a separate audit afterwards.
```

Every task MUST include:
```
BEFORE marking this task complete:
1. Review tests against docs/pitfalls/testing-pitfalls.md
2. Run tests and confirm green
```

Every logical group of tasks MUST include:
```
After completing this group:
Review the batch once, from a perspective the individual tasks did not
apply. Run further rounds only while the previous round produced
material findings; stop when one produces none. A round run to reach a
count, after findings have stopped, manufactures them — and a
manufactured finding is the same defect as a suppressed one.
```

### Preserve assertion rigor under pressure

Subagents under CI or time pressure default to weakening assertions when tests race, flake, or fail nondeterministically. This converts coverage erosion into "flake fixes" that pass review because they're framed as CI stability, not as rigor regression. Plans MUST forbid this pattern explicitly in any task that writes tests for concurrency, cancellation, timing-sensitive code, or cross-task coordination.

Every such task MUST include:

```
BEFORE marking this task complete:
If any test assertion races, flakes, or fails nondeterministically, the
fix is deterministic synchronization (e.g., TaskCompletionSource,
SemaphoreSlim, awaitable fence) — NOT assertion removal or weakening.
If synchronization cannot make the assertion pass reliably, STOP and
raise to the dispatching agent. Do not ship a weaker test. Weakened
assertions rationalized as "CI stability fixes" are the exact pattern
this rule prevents.

Prefer mechanism assertions over symptom assertions where feasible: a
timing bound ("Elapsed < 10s") proves absence of a specific symptom;
an observation-of-state assertion ("peers observed cancellation")
proves presence of the mechanism. When racing forces a choice between
them, fix the synchronization rather than dropping the mechanism
assertion.
```

The commit subject for any change touching test assertions SHOULD state what happened to them — "add", "strengthen", "preserve", or explicitly "weaken" with rationale. Subjects like "CI timing fix" or "test stabilization" obscure whether coverage eroded and let regressions slip past review.

### Review against pitfalls
Read both pitfalls docs and check if any planned work could fall into
documented traps. Add explicit warnings to relevant task descriptions:
- `docs/pitfalls/implementation-pitfalls.md`
- `docs/pitfalls/testing-pitfalls.md`

### Minimize cross-task conflicts
If two tasks touch the same file, put them in the same task or
explicitly sequence them. Parallel subagents editing the same file
create merge conflicts.

## Step 4: Plan review gate

**When this runs.** This is the last action before the execution handoff, and it
runs on the *finished* plan — after Step 3's subagent-proofing and after the
Living Document Contract, Execution Status section, and per-phase banners required
by §Plan construction requirements are all in the file. That section sits below
this one because it specifies what the plan must *contain*; this step reviews the
plan that contains it. Reviewing first and pasting the contract afterwards would
certify a plan that no longer exists.

**The gate.** The runner MUST invoke the sibling
[`plan-review-cycle`](../plan-review-cycle/SKILL.md) on the finished plan —
**automatic and unprompted** — and MUST NOT ask whether to run it. Invoking
`writing-plans-enhanced` *is* the authorization to run that review at its normal
cost; the cost does not need separate approval. (If the skill cannot be invoked by
name, read its `SKILL.md` from the install path and follow it.)

**What "MUST NOT ask" covers.** It forbids asking *whether* the review happens. It
does not forbid the review's own legitimate user interactions once it is running —
`plan-review-cycle` escalates genuine reviewer/runner standoffs to the user by
design — and it does not forbid a platform-level approval the harness requires in
order to dispatch a subagent or reach a model. Those are approvals to *act*; this
rule is about not reopening a settled question.

**Opt-out.** A user MAY skip this review, but only via an instruction already
given, for this plan. The runner MUST NOT solicit that opt-out — asking permission
to skip is the precise behavior this gate exists to prevent, and a rule you can
satisfy by asking is not a rule. A skip granted for one plan does not carry to the
next plan, or to later plans in the same session.

**The review leaves a record.** The plan's `## Execution Status` section carries a
**Plan review** line, scaffolded to ⬜ NOT RUN when the plan is written
(§Plan construction requirements).
`plan-review-cycle` flips it on completion, and the Living Document Contract
forbids claiming any phase while it still reads ⬜. That is what makes this gate
checkable by the next reader instead of merely instructed here: a committed plan
that was never reviewed says so on its own face. If the user exempted this plan
under the opt-out above, the runner records that at the line itself as ⏭ SKIPPED
with the date — an exemption must be visible, and it must not be left as ⬜, which
would read as an omission and block every phase claim.

**Wait for the terminal result.** Where the review runs, do not proceed to Step 5
until `plan-review-cycle` reports completion. If it cannot complete, say so plainly
and stop there — an uncompleted review is not a passed review, and Step 5 MUST NOT
present execution options for a plan that is neither reviewed nor exempted. Where
the opt-out applies, there is no terminal result to wait for: record ⏭ SKIPPED and
continue to Step 5.

**Non-interactive and unattended runs: run it, never defer it.** In a headless,
overnight, or operator-offline session the review still runs. `plan-review-cycle`
is autonomous-capable and defaults conservatively when the user is unreachable.
Deferring here would be exactly backwards: an unattended session is precisely the
case where nobody else will look at the plan before it executes. Sibling cycles
that defer plan review in headless mode do so because their own unresolved
`[DECISION]` blocks make review low-value at that moment; this step has no such
gate, so that deferral does not transfer to it.

**Nothing authorizes skipping on the runner's own initiative.** Plan simplicity,
execution urgency, the review's cost or latency, the user's prior review
frequency, or an intention to review during execution instead — none of these
authorize bypassing this gate or converting it into a question.

### Red Flags — STOP

If you hear yourself thinking any of these, a rationalization is forming:

> "This plan is simple enough to skip it." · "The user has been setting review
> cadence, so it's their call." · "I'll flag it and let them decide." ·
> "We're time-constrained — I'll review during execution." · "I'd run it, but I
> should check first." · "The caller will review it anyway."

The last one earns its own sentence. The sibling cycles (`bug-hunt-cycle`,
`health-review-cycle`, `performance-audit-cycle`) invoke this skill **and** run
`plan-review-cycle` in a later phase of their own. That does not make the review
their job instead of yours. This gate runs on every invocation of this skill,
including when a cycle called you.

## Plan construction requirements: the Living Document Contract

**This is a requirements section, not a step.** It specifies what every plan must
*contain*, so it is satisfied while the plan is being written — under Steps 1 and
3, and therefore before Step 4's review runs on the finished file. It carries no
step number because it is not a sequential action: Steps 1–5 are the pipeline, and
this is what the pipeline writes into.

Every plan produced by this skill MUST include a **Living Document Contract** block immediately after the Goal / Architecture / Tech Stack header. The contract binds every future executor to keep the plan synchronized with implementation state as work progresses — not only at completion.

### Why (pattern observation, not a measured study)

The observations below are recurring patterns from multi-agent coordination work, not a controlled comparison. They are stated as what has been seen to happen, and should be read at that strength.

Plans that go stale during execution impose a compounding cost on every future agent that re-enters the work. Reconstructing state from scattered PR notes, commit messages, and coord-log entries takes meaningful time per deferred or modified phase; updating the plan at ship time is much cheaper. The asymmetry favors writing at ship time and compounds across every downstream dispatch that consumes the plan.

Observed across multi-agent coordination cycles: when a plan executor writes per-phase ✅/⏸ banners at ship-time — each deferred phase carrying a prose description of its unblock condition + a link to the likely-unblocker artifact — the eventual follow-up dispatch becomes a short pointer ("Phase N says ⏸ DEFERRED pending X; X's own Execution Status banner now says ✅ SHIPPED; execute Phase N") instead of an archaeology session. The plan's living state carries the unblock condition and reader context across sessions with near-zero loss: the upstream unblocker updates their own plan's banner to ✅ SHIPPED when they ship, and the downstream executor reads that banner via the link embedded in their own deferred-phase banner. Reconstructing this state after the fact doesn't work — the information must be captured at the moment of deferral, by the agent who defers.

Prose description + artifact link is the resilient coordination pattern. Exact-string coordination across agents is not: paraphrases break it, scope edits on the unblocker's side break it, and it creates brittle action-at-a-distance semantics that require three separate agents (the deferrer, the unblocker, the follow-up dispatcher) to agree on a string they never negotiate.

### Repo assumptions

<!-- approved-block: repo-tier-degradation v1 — authoritative copy: ../../approved-blocks.md -->
**Repo probe, three tiers, no invented anchors.** Before any step that commits, records a commit SHA, or hands one to another skill, probe: is the artifact inside a git work tree, and may the runner commit (project rules, hooks)? Never block on the answer — degrade and disclose. **Tier 1, work tree and committing allowed:** the full protocol, SHAs recorded and handed on as written. **Tier 2, work tree but committing unavailable** (project rules forbid agent commits, hooks fail, unusual repo state): stage rather than commit — or, where staging is itself unavailable or the project's convention prefers it, leave the artifact in place and say so — surface once rather than forcing, and use the artifact's current bytes wherever a commit SHA would have been the anchor. **Tier 3, no work tree at all** (research, operations, or docs work outside any repo): copy the artifact's bytes to a session scratch file before proceeding — that copy is the baseline anything downstream would otherwise have taken from a commit — and disclose that no durable audit trail exists, reporting the scratch path so the user can keep it. In the degraded tiers the missing field is dropped with a one-line note saying why, and MUST NOT be filled with a plausible-looking value: a requirement that cannot be met honestly is a prompt to invent, and an invented SHA is worse than an absent one because it reads as an anchor while resolving to nothing.
<!-- /approved-block: repo-tier-degradation -->

For plans that means: the contract's git-shaped fields — ship SHAs, merge SHAs, branch names, PR numbers — are recorded wherever the project has them, and where it has none the banner records what the project does offer (a dated revision, a build identifier, a release tag) or states plainly that no durable ref exists. The stale-claim signals (§Plan construction requirements) degrade the same way — where there is no PR list and no branch history to read, the claim line names the coordination surface the project actually uses, or says none exists and the claim cannot be verified from the artifacts alone.

### What the contract binds

Paste the following block into every plan, immediately after the Goal / Architecture / Tech Stack header. The MUST / SHOULD / MAY keywords in the block are interpreted per BCP 14 (RFC 2119 + RFC 8174) — capitalized only when normative.

**What is actually load-bearing** — and therefore what MUST NOT change: the `## Living Document Contract` heading (that anchor is how a future executor finds the contract), the banner vocabulary (🚧 / ✅ / ⏸ / ⬜ paired with IN PROGRESS / SHIPPED / DEFERRED / NOT STARTED), and the obligations themselves. Paste the body verbatim by default — hand-adapted copies shed clauses, and the ones they shed are the deferral condition and the deviation record. If a project's conventions genuinely require different phrasing, the obligations and the anchor survive; the prose may flex. This is deliberately not exact-string coordination in the sense §On phase defer forbids: a stable heading in a file you already have open is durable, whereas a gate key three agents must independently agree on is not.

```markdown
## Living Document Contract

This plan is a living document. Every executing agent MUST update it as
execution progresses, not only at completion.

Where this project has no git repository, every reference below to a SHA,
a branch, or a PR means the nearest durable equivalent the project does
offer (a dated revision, a build identifier, a release tag), and where
none exists the banner states that plainly. An invented SHA is worse than
an absent one: it reads as an anchor and sends the next agent looking for
a commit that never existed.

- **Before any phase claim:** no phase may be claimed while the
  **Plan review** line in Execution Status reads ⬜ NOT RUN. An unreviewed
  plan is not executable. Run the review (`plan-review-cycle`) and let its
  completion flip the line, or — if this plan was legitimately exempted by
  the user — record that at the line as ⏭ SKIPPED with the date, so the
  exemption is visible instead of indistinguishable from an omission. A
  line still reading ⬜ at execution time means the gate was skipped
  silently, which is the one state this record exists to make impossible.
- **On phase claim:** before flipping your own banner, the executor MUST
  check the preceding phase's banner against git reality — a ✅ SHIPPED
  banner's recorded SHA reachable on the default branch, a 🚧 banner live
  per the stale-claim signals below. If a banner does not match reality,
  correct it first. A plan's accuracy is checked by the next agent to
  arrive, not by the one who left it; this is the only read-back the
  contract has. Then flip your own banner to 🚧 IN PROGRESS
  with a claim timestamp (ISO 8601 UTC) and the active branch name. The
  banner MUST NOT include an expected-completion estimate — agents cannot
  reliably estimate their own wall-clock, and a fabricated duration
  becomes a stale anchor that misleads future readers. Followers
  encountering a 🚧 banner determine liveness by observable signals (PR
  existence, recent branch commits), not by arithmetic on expected times.
  See `/writing-plans-enhanced` §Plan construction requirements for the
  stale-claim reclaim protocol.
- **On phase ship:** the executor MUST update that phase's **Execution
  Status** banner with the shipped commit SHA(s) and date. If a PR is
  open, the PR number and URL MUST appear in the Execution Status table.
  Recorded SHAs stay resolvable because this project merges with
  `--merge` and preserves per-commit history; under a squash-merge
  workflow, record the squashed commit that landed on the default branch
  instead, or the banner points at a SHA no reader can find.
- **On phase defer:** the executor MUST update the banner with ⏸ status
  AND a prose description of the unblock condition + a link to the
  likely-unblocker artifact (plan page, task, or PR whose own Execution
  Status banner will signal completion). Prose + link is durable across
  paraphrases and scope edits; exact-string coordination between agents
  is not.
- **On PR merge:** the executor MUST record the merge SHA in the banner
  + the Execution Status table.
- **On deviation from the written plan** (scope edits, structural
  refactors, dropped tasks, reordered phases): the executor MUST
  inline-document the deviation in the affected task AND summarize it
  in the Execution Status section's "Deviations" subsection.
  Deviation state MUST NOT live only in PR notes or status reports.
- **On discovery** (pre-existing drift surfaced during execution, new
  bugs found, architectural issues noted): the executor MUST record it
  in the Execution Status section's "Discoveries" subsection with
  pointers to the files/lines affected. Follow-up dispatches read this
  subsection to avoid duplicate discovery work.

**Layout invariant.** Only the two one-line headers — **Plan review** and
**Overall** — sit above the status table; the table follows them directly.
Deviations and Discoveries are subsections
*below* it and MUST NOT be placed above it — the table is what a reader
needs in the first screen, and it stops being that the moment a growing
narrative sits on top of it. Entries in both subsections are a one-line
summary plus a pointer to where the detail lives (the affected task, the
file:line); they are not the place to tell the story.

The plan SHOULD reflect reality at the end of every session that touches
it. Anything worth putting in a status report to the user is worth
putting in the plan.

Rationale: `/writing-plans-enhanced` §Plan construction requirements.
Writing at ship time is
cheap; reconstruction by downstream readers is expensive, compounds
across dispatches, and fails silently when state is split across PR
notes and commit messages.
```

### What format to use

Plans MUST include per-phase **Execution Status** banners at the top of every phase section. Banners SHOULD use this format (keep the emoji markers — they are load-bearing for scan-ability):

```markdown
## Phase N — [Phase Name]

**Execution Status:** ⬜ NOT STARTED
```

_or_

```markdown
**Execution Status:** 🚧 IN PROGRESS — claimed <YYYY-MM-DD HH:MMZ>
(branch `fix/<slug>`, N/M tasks shipped; PR #<N> if open)
```

_or_

```markdown
**Execution Status:** ✅ SHIPPED at `<SHA>` on <YYYY-MM-DD>
(PR #<N> merged at `<merge-SHA>`)
```

_or_

```markdown
**Execution Status:** ⏸ DEFERRED pending [prose description of the
unblock condition — what must exist or ship for this phase to be
pickable]. See [link to the likely-unblocker artifact — its plan
page, its task, its PR — whose Execution Status banner will signal
completion]. Follow-up dispatch verifies by reading the linked
artifact's banner, not by grepping for strings.
```

Plans MUST carry the **Execution Status** section from the moment the plan is written — table and both subsections scaffolded, every phase ⬜, not deferred until something ships. Creating it lazily is what puts it in the wrong place: if a discovery lands before any phase ships, the Discoveries subsection gets written first and the table arrives underneath it, permanently inverted. Scaffolding it empty costs six lines and removes the ordering decision from the executor entirely — the same reason per-phase banners are initialized to ⬜ rather than added on first use.

```markdown
## Execution Status
<!-- Plan review and Overall are the only lines above the table. New content goes
     in the Deviations / Discoveries subsections below it — never above the table. -->

**Plan review:** ⬜ NOT RUN
**Overall:** N/M phases shipped, K deferred pending upstream gates.

| Phase | Status | Ship SHA(s) | Notes |
|---|---|---|---|
| 1 — [name] | ✅ Shipped | `<SHA>` | PR #N merged YYYY-MM-DD |
| 2 — [name] | 🚧 In progress | — | on branch `fix/<slug>` |
| 3 — [name] | ⏸ Deferred | — | pending [prose condition] — see banner |
| 4 — [name] | ⬜ Not started | — | — |

### Deviations
- Task N.M: [one-line summary + pointer to inline task note]
- Phase K Task K.L: [summary]

### Discoveries
- [Surfaced file/pattern + status: shipped fix / deferred / flagged only]
```

The **Plan review** line takes one of three states, and only `plan-review-cycle`'s completion or an explicit user exemption may move it off the first:

```markdown
**Plan review:** ⬜ NOT RUN
**Plan review:** ✅ COMPLETED 2026-08-12 — 4 rounds, terminating round independent (cold read, Opus)
**Plan review:** ⏭ SKIPPED 2026-08-12 — user exemption for this plan
```

It records rounds, date, and the terminating round's provenance — deliberately **not** a commit SHA. The review's own commit is the one that lands this line, so any SHA written here would either name a commit that does not yet exist or have to be invented, and an invented anchor is worse than an absent one (§Repo assumptions).

**Always initialize ⬜; never inherit.** Plans are routinely drafted by copying an earlier plan. A copied ✅ is a review nobody ran — a forged record produced without anyone intending to forge anything. When a plan is created from any template or prior plan, this line MUST be reset to ⬜ NOT RUN before anything else.

At plan-creation time that section is written with every phase ⬜ and both subsections present but empty — `- _None yet._` under each. The placeholder is doing work: a bare empty heading reads as unused and invites a later agent to reorganize around it, while a line that looks live invites appending to it.

### Why banners over bottom-of-plan tables alone

Banners sit **above** every task body. An executor scanning the plan sees execution state BEFORE reading the task — no way to accidentally start a deferred phase without first hitting the banner that tells them the unblock condition and where to check its live status. A bottom-of-plan status table alone relies on the executor reading to the bottom before starting work, which is not the failure mode we're protecting against.

The top-of-plan Execution Status table provides the at-a-glance summary; the per-phase banners provide the context-at-point-of-use. Both SHOULD appear together. Neither is sufficient alone.

### Stale claim reclaim protocol

A 🚧 banner claim persists as long as no agent updates it. If the claiming agent dies (session timeout, rate limit, abandoned session, orchestrator-subagent cascade failure, compaction without handoff), the claim becomes a silent lock blocking all follower agents. Followers need a cheap way to detect and reclaim stale claims without derailing into investigation.

**The check:** two observable signals, both under a minute, neither requiring time arithmetic.

1. **Is a PR open for the claimed branch?**
   ```bash
   gh pr list --head <branch>
   ```
   If yes, the work is visible and under review. Trust the claim, move on.

2. **If no PR, has the branch had any recent commits?**
   ```bash
   git log -1 origin/<branch>
   ```
   Any commit in recent memory (the follower's own read of "recent") means the claim is active. The follower does NOT calculate elapsed time — they look for ANY activity signal and trust their instinct on whether it feels fresh.

If BOTH signals are absent (no PR AND no recent commits, or the branch does not exist on origin at all), the claim is stale. The follower MAY reclaim by:

1. Adding a reclaim note inline to the banner:
   ```markdown
   **Reclaim note:** prior claim at <prior-timestamp> reclaimed at <now-timestamp>
   — no PR, no branch activity. Prior branch `<name>` preserved for archaeology.
   ```
2. Updating the banner's timestamp and branch to the new claim.
3. Proceeding as a fresh claim.

The follower MUST NOT delete prior banner history or coord-log entries. Layer new on top; preserve the arc. Future readers should see the full transition trail.

The follower SHOULD assume any uncommitted work from the prior agent is lost. Reconstruct from the plan's task spec; do NOT try to infer the prior agent's local-only progress.

**Why observable signals instead of time-based staleness:**

- Agents cannot reliably estimate their own wall-clock. Claim banners with "expected 2h" anchor future readers to a fabricated number. Observing "there's activity" or "there isn't" is grounded in git; estimating "is it overdue" is not.
- Arbitrary staleness thresholds ("4h → stale," "24h → stale") are project-specific and drift out of calibration as work patterns change. The follower's own judgment of "is this fresh" converges correctly without a fixed threshold, because the two signals (PR + commits) are binary present/absent.
- A follower who thinks 20 min is "recent" just waits longer; a follower who thinks 24h is "recent" waits longer still. Both eventually reach the "no signal present" state and make the right decision.

**Failure modes the protocol does NOT cover:**

- **Agent died before pushing the branch.** No PR, no branch on origin, but the banner says 🚧. Follower concludes stale and reclaims. Prior agent's uncommitted state is lost. Acceptable — the alternative (wait forever for a resumed agent that isn't coming) is worse.
- **Two followers reclaiming simultaneously.** Git's push-reject-on-stale-ref handles this naturally: the second follower's banner-flip commit fails to push because the first got there first; the second re-reads and sees the claim is no longer stale.
- **Orchestrator-subagent cascade death where the subagent keeps progressing.** The branch keeps receiving commits even though the parent orchestrator's status reporting is dead. Branch-activity signal correctly shows the claim as live. The "orphaned by parent orchestrator" state is invisible at the claim level and warrants a separate discipline around parent-child lifetime management.

**When this protocol is insufficient:** if coordination gets busy enough that stale-claim detection becomes routine work (4+ concurrent agents regularly, claim disputes happening in practice), consider adopting a dedicated coordination tool with first-class claim + dependency tracking. The lightweight protocol above handles ~80% of cases at ~5% of the adoption cost of a full coordination tracker.

### What this skill does when wrapping `/superpowers:writing-plans`

When producing the initial plan:

1. Paste the Living Document Contract block (above) after the base skill's `**Tech Stack:**` header, preserving its heading, banner vocabulary, and obligations.
2. Add an `## Execution Status` section with the layout comment, `**Plan review:** ⬜ NOT RUN`, `**Overall:** Not started.`, a table with all phases marked `⬜ Not started`, and empty `### Deviations` / `### Discoveries` subsections below the table (`- _None yet._` under each). If the plan was drafted from an earlier plan, reset the Plan review line to ⬜ rather than carrying the source plan's state forward.
3. Add an **Execution Status** banner at the top of every `## Phase N` section, initialized to `⬜ NOT STARTED`.
4. Include a brief "why this matters" sentence pointing at this skill's §Plan construction requirements so future executors know where the discipline comes from.

Executors reading the finished plan then inherit the contract automatically. The contract is self-propagating: every session that touches the plan leaves it in the shape the next session needs.

## Step 5: Execution handoff (terminal)

**When a parent workflow invoked this skill, this step does not run.** If
`build-robust-features`, `bug-hunt-cycle`, `health-review-cycle`,
`performance-audit-cycle`, or any other workflow called this skill as one of its
phases, stop after Step 4 and return control to the caller with the plan's path and
its review state. Those workflows have their own remaining phases — further review,
their own commits, their own handoff — and presenting execution options here would
either start implementation before those phases run or strand the caller waiting on
a user turn it never asked for. This step belongs to a *direct* invocation of
`writing-plans-enhanced`, where there is no caller to return to.

Otherwise, this is where the execution choice deferred at Step 1 finally gets
presented — after Step 4's review has completed (or been recorded as exempted) and
the reviewed plan is committed. At the degraded repo tiers the plan is staged or
left in place rather than committed (§Repo assumptions); that still satisfies this
step, since what matters is that the reviewed text is durable and the review state
is recorded, not that a commit object exists.

First, re-check the recommendation prepared at Step 2 against the *reviewed* plan.
The review may have changed the task count, the ordering dependencies, or what is
genuinely parallelizable; a recommendation formed before the review was formed
against a different plan.

Then present all three options from Step 2 — subagent-driven, parallel session,
parallel agents — with your recommendation and its reasoning. This replaces the
base skill's two-option closing list, which omits parallel agents. The base
skill's routing for each choice still applies:

- **Subagent-driven** → `/superpowers:subagent-driven-development`, staying in
  this session.
- **Parallel session** → a new session running `/superpowers:executing-plans` in
  the worktree.
- **Parallel agents** → `/superpowers:dispatching-parallel-agents`.

Presenting these options is the one user turn this skill owns, and it belongs
here: by this point the plan is reviewed and durable, so the session has a real
artifact behind it whichever way the user answers — and if the user is away,
nothing is lost by waiting, because the work that needed doing is done.
