# superpowers-plus

Workflow orchestration that wraps the [`superpowers`](https://github.com/obra/superpowers) plugin into front-to-back workflows. Eighteen skills covering the full arc: design (brainstorm + the design-review-cycle adversarial review), planning (subagent-proofed plans + Living Document Contract + adversarial plan review), correctness audits (four hunter methodologies + cross-validation cycle), milestone audits (five-axis project health review + remediation cycle), performance audits (multi-lane performance review + execution-cost map + remediation cycle), a reachability gate (wire-walk — proves a real consumer can reach the shipped code), session handoff (structured context preservation), and a post-certification editorial pass (meaning-preserving legibility rewrite of review-certified docs).

**Agents should read each skill's `SKILL.md`.** This README is the human-facing overview of the plugin as a whole.

## Skills in this plugin

### Workflow orchestration

| Skill | What it does | When to invoke |
|---|---|---|
| [`build-robust-features`](skills/build-robust-features/SKILL.md) | End-to-end "design → plan → execute" workflow for non-trivial work. Chains brainstorming (via the sibling `brainstorming-enhanced`), delegates design review to the sibling design-review-cycle, then delegates to `writing-plans-enhanced`, and gates "shipped" on the sibling `wire-walk` reachability check | When building features, fixing planned bugs, or executing project to-dos that will be delegated to subagents — i.e., the start of any non-trivial body of work that needs both a stress-tested design *and* a subagent-ready plan |
| [`brainstorming-enhanced`](skills/brainstorming-enhanced/SKILL.md) | Wraps the base brainstorming skill with requirements pinning (user-confirmed verbatim status line), the docs/specs/ location convention, review-ready spec structure, plain-session-text questioning, and a self-brainstorm mode with an auditable decision log | Use INSTEAD of the base brainstorming skill whenever it would fire automatically; or when instructed to brainstorm yourself / self-brainstorm |
| [`wire-walk`](skills/wire-walk/SKILL.md) | Hard reachability gate run before declaring a feature shipped. The **operator** defines the key user flows greenfield (the agent MUST NOT draft them); the agent traces each flow verbatim to code (`file:line`) from its real cold-start state (fresh install / first launch / empty store / post-upgrade), hunting universal break-patterns (orphan producer, dead control, empty seam, unsatisfiable gate). Any broken operator flow = NOT shipped | Before claiming a feature is "done / shipped / end-to-end / complete / working", marking a PR ready, or closing a feature issue — especially when the wiring crosses a component, phase, agent, or release. Invoked as the final gate of `build-robust-features` |
| [`writing-plans-enhanced`](skills/writing-plans-enhanced/SKILL.md) | Wraps `superpowers:writing-plans` with subagent-proofing requirements, an Execution Strategy recommendation step, and the mandatory **Living Document Contract** that binds every executor to keep the plan synchronized with reality | Use *instead of* `superpowers:writing-plans` whenever the plan will be executed by subagents or across multi-session/multi-agent dispatches |
| [`writing-skills-enhanced`](skills/writing-skills-enhanced/SKILL.md) | Wraps `superpowers:writing-skills` with the repo's reference discipline — the self-identifying-references rule, named-handle conventions for internal rules, and a pre-ship reference sweep covering the skill's own prose and every template it emits | Use *instead of* `superpowers:writing-skills` alone when creating, editing, or reviewing skills in this repo |
| [`plan-review-cycle`](skills/plan-review-cycle/SKILL.md) | Adversarial multi-round review of a written plan — alternating self-review and independent rounds across 6 dimensions (ambiguity, context gaps, interpretation latitude, cross-task dependencies, testing pitfalls, implementation pitfalls); ends only when an independent round produces zero substantive findings | After writing any plan that subagents will execute, before committing. Invoked automatically and unprompted — never by asking — at `writing-plans-enhanced` Step 4, and by the plan-review phases of `bug-hunt-cycle` / `health-review-cycle` / `performance-audit-cycle` |
| [`design-review-cycle`](skills/design-review-cycle/SKILL.md) | Adversarial multi-round review of a **design doc** — the design-doc analog of `plan-review-cycle`. Runner pilot → independent review at mode width (light default; full 6-agent fan-out REQUIRED on named surfaces, with a cross-model round when available) → findings ledger + one batched user decision gate → conditional re-sweep → two-leg closure (cold reader + ledger verifier, both clean on the same snapshot) | On any written design doc before it becomes a plan — standalone, or invoked automatically as `build-robust-features` Step 2 |
| [`editorial-pass`](skills/editorial-pass/SKILL.md) | Meaning-preserving legibility rewrite of a review-certified document. A dispatched editor rewrites the whole doc; an independent verifier judges every changed hunk against the certified baseline; drifted hunks revert to certified text (at most one informed second attempt); lands as one polish commit on top of the certification commit | Auto-invoked by `plan-review-cycle` and `design-review-cycle` at their completed terminals; standalone on any finalized doc carrying review scar tissue |
| [`handoff`](skills/handoff/SKILL.md) | Structured context preservation across sessions or before fresh-agent dispatch. Five mining lenses (recent / mid-session / little to-dos / seams / naive-agent), routes content to the right durable artifact, then minimum 6 adversarial review rounds, then emits the continuation prompt into the session as a copyable block | When approaching auto-compaction, ending a long session, wrapping a multi-agent coordination cycle, or before dispatching a follow-up agent who won't share hot context |

### Bug-hunt workflow

| Skill | What it does | When to invoke |
|---|---|---|
| [`bug-hunt-cycle`](skills/bug-hunt-cycle/SKILL.md) | Full eight-phase bug-hunt: scope research → parallel dispatch of four hunter methodologies → cross-validation → test-gap analysis → user-decision loop → fix plan (via `writing-plans-enhanced` with bug-hunt-specific custom instructions) → plan review → commit | After finishing a phase / PR, before merging, or when auditing a body of work end-to-end |
| [`bug-hunter-differential`](skills/bug-hunter-differential/SKILL.md) | Differential / invariant hunter — identifies pairs or sets of functions that should agree (round-trip, plan/apply, producer/consumer) and checks whether the invariant actually holds | When the bug class lives in the gap *between* two functions rather than inside one — schema drift, missing inverse, plan/apply divergence |
| [`bug-hunter-exploratory`](skills/bug-hunter-exploratory/SKILL.md) | Depth-first hunter — identifies the riskiest code in scope and follows suspicious threads down through callers and callees | When you want focused deep analysis of the highest-risk parts of a codebase, not broad coverage |
| [`bug-hunter-holistic`](skills/bug-hunter-holistic/SKILL.md) | Holistic hunter — reads every source file in scope, then reasons about contracts, sibling consistency, failure modes, concurrency, and error propagation | When the scope is small enough to fit in one context and you want semantic analysis with the full picture loaded |
| [`bug-hunter-multipass`](skills/bug-hunter-multipass/SKILL.md) | Five-pass hunter — each pass targets one bug class (contract violations, sibling pattern deviations, failure modes, concurrency, error propagation) | When you want systematic coverage of known bug categories rather than open-ended exploration |

### Health-review workflow

| Skill | What it does | When to invoke |
|---|---|---|
| [`health-review-cycle`](skills/health-review-cycle/SKILL.md) | Full six-phase health review: dispatch the sibling `project-health-review` skill → cross-validation → user-decision loop → fix plan (via `writing-plans-enhanced` with health-review-specific custom instructions) → plan review → commit | When you want the end-to-end audit-and-remediate loop (not just the snapshot), typically before major milestones or large refactors |
| [`project-health-review`](skills/project-health-review/SKILL.md) | The five-axis adversarial dispatch on its own. Five parallel adversarial agents (Code Quality, Architecture, Test Quality, Ops Readiness, API Design), independent contexts, deduplication and severity ranking in a synthesis pass, raw + consolidated reports written to `docs/health-reviews/` | When you want a snapshot view of project health without committing to the full cycle. Useful pre-planning, pre-investor-demo, or before a major refactor decision |

### Performance-audit workflow

| Skill | What it does | When to invoke |
|---|---|---|
| [`performance-audit-cycle`](skills/performance-audit-cycle/SKILL.md) | Full eight-phase performance audit: scope research → dispatch `performance-audit` → cross-validation (hot-path reachability) → optional dynamic confirmation → user-decision loop → fix plan (via `writing-plans-enhanced` with a measurement/verification gate + no-severity-deferral discipline) → plan review → commit | Before scaling work, when chasing latency/throughput/resource regressions, or when you want the audit-and-remediate loop rather than just a snapshot |
| [`performance-audit`](skills/performance-audit/SKILL.md) | The parallel lane dispatch on its own. Stack/version detection → version-aware currency brief (anti-stale-training, repo-local cache) → independent lanes (algorithmic complexity, memory/allocation, data access & I/O, concurrency, framework-idiom currency, execution-cost map; conditional payload/startup; optional dynamic profiling) → calibrated synthesis. Raw + consolidated reports in `docs/perf-audits/` | When you want a performance snapshot without committing to the full cycle — pre-scaling, or to seed a "known bottlenecks" doc from the execution-cost map |

## Why one plugin, not three

Earlier versions of this marketplace split these skills across three plugins (`superpowers-plus` for orchestration, `bug-hunters` for hunter methodologies, `project-health-review` for the five-axis dispatch). That split optimized for architectural purity — workhorses as dependency-free leaves, orchestration tier above them — but the cycle skills (`bug-hunt-cycle`, `health-review-cycle`) had cross-plugin runtime dependencies that weren't declared anywhere. Claude Code's marketplace.json schema doesn't have a `requires:` field, so cross-plugin deps are honor-system: install `superpowers-plus` alone and the cycle skills fail at dispatch with no clear "plugin X is missing" guidance.

The collapsed structure (everything in one plugin) trades architectural purity for atomicity:

- **Atomic install.** One `superpowers-plus` install gives you the whole workflow surface — orchestration + workhorses + cycles. No partial-install footguns.
- **Intra-plugin dispatch.** All sibling skill invocations resolve via bare names (e.g., `bug-hunt-cycle` invokes `bug-hunter-exploratory`, not `bug-hunters:bug-hunter-exploratory`). Simpler resolution, no namespace prefixes.
- **No incoherent fallback sections.** When the cycle skills used to invoke other-plugin skills, every cycle had an "Inline fallback (when X is unavailable)" section that handwaved at "read the SKILL.md from the plugin source repo" — which doesn't make sense (a skill that's "unavailable" can't have its rules read either). All those sections are gone now.
- **Workhorse-only use case still works.** If someone wants only `bug-hunter-exploratory` for a one-off invocation, they invoke the skill directly — they just install superpowers-plus first. The "install only the workhorse plugin" case wasn't a real use pattern; for personal-marketplace use, atomic install wins.

## Why "plus"

The base `superpowers` plugin is the foundation: TDD, brainstorming, writing-plans, executing-plans, dispatching-parallel-agents, and so on. The skills here don't replace any of that — they encode operational discipline that the base skills assume but don't enforce, and chain the base primitives into front-to-back workflows:

- **`brainstorming-enhanced` exists** because `superpowers:brainstorming` produces specs with no user-confirmed requirements statement — so downstream design review must narrow its requirements trace — and because two workflow requirements (plain-session-text questioning, a self-brainstorm mode with a decision log) are not expressible in the base at all. The wrapper pins requirements the user confirms verbatim, owns the docs/specs/ location convention, and terminates at the committed spec — it never orchestrates review or planning itself.
- **`build-robust-features` exists** because brainstorming a design and then writing a plan are two disciplines with different failure modes — and the gap between them is where a lot of "the plan looked fine but the design was wrong" pain comes from. The skill chains `brainstorming-enhanced` → `design-review-cycle` → `writing-plans-enhanced` so the design is stress-tested *before* it gets baked into a plan.
- **`design-review-cycle` exists** because design review had the same problem plan review had before `plan-review-cycle`: an inline paragraph with example lenses, a fixed round count, and no owner. The cycle gives it a rubric (eight named lenses), an authority model (documentary gap / forced correction / genuine choice — the runner never decides genuine choices), a durable findings ledger, and a termination rule that can't be gamed by narrowing (only whole-doc rounds count; a two-leg closure terminates). Design defects cost multiples once they're baked into a plan — this is the cheapest station to catch them.
- **`bug-hunt-cycle` exists** because correctness-critical audits benefit from multiple independent hunting methodologies (depth-first, holistic, multipass, differential) running in parallel and being cross-validated. The cycle owns scope research, parallel dispatch, completeness-enforced cross-validation, test-gap analysis, and the user-decision loop. It delegates plan-writing (with bug-hunt-specific custom instructions) to `writing-plans-enhanced` and plan review to `plan-review-cycle`.
- **`health-review-cycle` exists** because milestone-level project audits need the five-axis adversarial review wrapped in validation, decision, and remediation discipline. Same delegation shape as `bug-hunt-cycle`.
- **`performance-audit-cycle` exists** as its own workflow — not a sixth health-review axis — because performance auditing has properties the others don't: it needs stack- *and version-specific* knowledge (an N+1 in Django ≠ one in EF Core; a fast React 17 pattern can be an anti-pattern in React 19), so it carries per-ecosystem profile packs and a version-aware currency brief that researches and caches version-specific guidance to counter stale training data; its findings use a perf model (impact = reachability × frequency × per-occurrence cost) with effort expressed as *work magnitude, never wall-clock*; and its fixes are uniquely risky (they often don't help, or break correctness), so remediation carries a measurement/verification gate. It also bans severity-based deferral — cheap minor wins get scheduled, not silently shelved. Same delegation shape as the other cycles. It surfaces an **Execution Cost Map** (where the program plausibly spends its time, for architectural awareness) and captures any incidental correctness bugs to a hand-off prompt for `bug-hunt-cycle` rather than chasing them.
- **`writing-plans-enhanced` exists** because `superpowers:writing-plans` produces plans that read naturally to a human but leave subagents room to interpret. Subagents under pressure default to over-engineering, weakening assertions, and improvising scope. The enhanced wrapper closes those gaps and adds the Living Document Contract — the single most important coordination primitive when multiple agents touch the same plan over multiple sessions.
- **`plan-review-cycle` exists** because plan quality is a place where review is asymmetrically cheap and missed problems are asymmetrically expensive. A subagent that misreads task 3 burns 30+ minutes; a review round that catches the ambiguity costs ~10 minutes. The skill alternates self-review with independent review and ends only when an independent round comes back clean.
- **`editorial-pass` exists** because adversarial review cycles converge on correct-but-scarred prose: fixes written to close findings graft qualifiers onto sentences, and after enough rounds the certified doc reads like a contract lawyers fought over — a misparse hazard for the fresh-context subagents who consume it, since no human deep-reads the final text either. The pass rewrites for legibility under a closed remedy set (accept, or revert to certified text, verified hunk-by-hunk against the frozen baseline by an independent dispatch) so it can run unaudited without meaning drift, and it structurally cannot reopen the review that certified the doc.
- **`handoff` exists** because hot context is a non-renewable resource. The skill encodes the discipline of mining lossy, routing everything to the right artifact, and adversarial-reviewing the handoff itself before declaring it done.
- **`wire-walk` exists** because the recurring "shipped but unreachable" defect — a correct, tested, CI-green backend wired to nothing a user can touch — survived a written "ship end-to-end" rule across multiple features and agents. Building correctly across a seam is unreliable; *auditing* reachability is reliable. The skill makes the operator (not the agent) define the user flows, then forces a per-flow `file:line` trace from the real cold-start state, and forbids the "done" claim while any operator flow is broken. It's the final gate of `build-robust-features` and a standalone gate before any "shipped" claim.
- **The hunter methodologies (`bug-hunter-*`) and `project-health-review` are workhorses** that the cycle skills compose. They're independently useful as one-off invocations, and they're the dispatch primitives the cycles parallelize.

## Living Document Contract

The most distinctive element of `writing-plans-enhanced` is the **Living Document Contract** — a block pasted into every plan that binds every future executor to update the plan as work progresses, not only at completion. The contract specifies:

- **Per-phase Execution Status banners** with claim/ship/defer/discovery semantics
- **🚧 / ✅ / ⏸ / ⬜ markers** that are scan-able above every phase body
- **A claim-time read-back** — before flipping your own banner, check the previous phase's against git. Every other obligation fires at write time, when the writing agent is finishing or handing off; this is the one that runs when someone arrives and needs the state to be true
- **A fixed layout** — the status table sits directly under the `## Execution Status` heading with Deviations and Discoveries below it, scaffolded at plan creation so nothing has to decide where they go later
- **Stale-claim reclaim protocol** based on observable signals (PR exists, branch has recent commits) rather than time arithmetic — agents can't reliably estimate their own wall-clock
- **Prose-description-plus-link** as the durable coordination pattern for deferred work, instead of brittle exact-string gate keys that break under paraphrase or scope edits

This is the mechanism that lets a follow-up dispatch say "Phase N's banner now shows ⏸ DEFERRED pending X; X's plan now shows ✅ SHIPPED; execute Phase N" instead of running a 30-minute archaeology session to figure out what's done.

## Typical use

**Building a feature from "I want X" to a subagent-ready plan:**

```
/superpowers-plus:build-robust-features
```

Walks you through brainstorming the design (via the sibling `brainstorming-enhanced`), runs the sibling design-review-cycle (pilot → independent review at mode width → batched decision gate → two-leg closure; cross-model on named surfaces), then hands off to `writing-plans-enhanced` for the plan-writing-and-review pipeline. Use this when both the *design* and the *plan* need to be sound — i.e., the start of any non-trivial body of work.

**Auditing a phase / PR / package for bugs:**

```
/superpowers-plus:bug-hunt-cycle Phase 9
```

Composes the four hunters with cross-validation, test-gap analysis, and a remediation plan written via `writing-plans-enhanced` and reviewed via `plan-review-cycle`. Plan filename suffix: `-bug-hunt-remediation-plan.md`.

**Running one bug-hunting methodology directly (no cycle):**

```
/superpowers-plus:bug-hunter-exploratory
```

Each hunter writes a report to `docs/bug-hunts/` with bug findings, file:line evidence, and severity. No consolidation, no fix plan — just the report. Use when you want a focused review of one area through one lens.

**Doing a milestone health check:**

```
/superpowers-plus:health-review-cycle
```

Composes the five-axis adversarial review with validation, user-decision loop, and a remediation plan via the same `writing-plans-enhanced` + `plan-review-cycle` pipeline. Plan filename suffix: `-health-review-remediation-plan.md`.

**Running the five-axis review directly (no cycle):**

```
/superpowers-plus:project-health-review
```

You get five raw reports + one consolidated synthesis under `docs/health-reviews/`. No validation, no fix plan, no further work. Useful pre-planning, pre-investor-demo, or before a major refactor decision when you just need to know where the project hurts.

**Auditing performance before scaling work:**

```
/superpowers-plus:performance-audit-cycle the request pipeline
```

Detects the stack + version, researches version-specific perf guidance (cached in `docs/perf-audits/cache/`), dispatches the performance lanes, cross-validates findings against hot-path reachability, then writes a remediation plan via `writing-plans-enhanced` + `plan-review-cycle`. Plan filename suffix: `-perf-audit-remediation-plan.md`. Every fix task carries a measurement/verification gate, and minor findings are scheduled — not deferred by severity.

**Running the performance lanes directly (no cycle):**

```
/superpowers-plus:performance-audit
```

You get raw per-lane reports + one consolidated report (with an Execution Cost Map) under `docs/perf-audits/`. No validation, no fix plan. Useful for a pre-scaling snapshot or to seed a "known bottlenecks" doc.

**Writing a plan from a settled spec / bug-hunt findings:**

```
/superpowers-plus:writing-plans-enhanced
```

Walks you through `superpowers:writing-plans`, then layers in subagent-proofing, the Living Document Contract, and (at Step 4) hands off to `plan-review-cycle` automatically and unprompted. The base skill's execution-options question is deferred to Step 5, after the review — so an unattended run comes back to a reviewed, committed plan instead of a waiting question. Every generated plan carries a `**Plan review:** ⬜ NOT RUN` line that the review cycle flips on completion, and the Living Document Contract forbids claiming any phase while it still reads ⬜.

**Reviewing an already-written plan:**

```
/superpowers-plus:plan-review-cycle
```

Runs the 6-dimension adversarial review loop until you converge.

**Closing out a long or multi-agent session:**

```
/superpowers-plus:handoff
```

Mines hot context across five lenses, updates every stale living artifact, creates new artifacts for material that doesn't have a home yet, runs minimum 6 adversarial review rounds (including at least one session-specific perspective), and produces a handoff doc that lets the next agent resume in 2 minutes instead of 30. The continuation prompt is always echoed into the session in a fenced code block, so you can paste it into a fresh agent without opening the doc.

**Proving a feature is actually reachable before calling it shipped:**

```
/superpowers-plus:wire-walk
```

Asks *you* for the key user flows (greenfield — it won't draft them), then traces each one to code with `file:line` from its real cold-start state and reports a per-flow ✅ wired / ❌ broken-at-`file:line` verdict. Any ❌ means the feature is not shipped, and the broken hops are the spec for finishing it. Runs automatically as the final gate of `build-robust-features`; invoke it directly before any standalone "done / shipped" claim.

**Adversarially reviewing a design doc (standalone):**

```
/superpowers-plus:design-review-cycle docs/specs/2026-07-26-widget-design.md
```

Pilot self-review, then independent review at mode width, then one batched decision list for anything that's genuinely your call, then a two-leg closure. Fixes land in the design doc itself; the review ledger lands in a `reviews/` subdirectory beside it. Runs automatically as Step 2 of `build-robust-features`.

## Design choices worth knowing

- **All skills assume `docs/` layout.** Plans land in `docs/plans/`, pitfalls live at `docs/pitfalls/...`, bug-hunt artifacts in `docs/bug-hunts/`, health-review artifacts in `docs/health-reviews/`, performance-audit artifacts (and the currency-brief cache) in `docs/perf-audits/`, design-review ledgers in a `reviews/` subdirectory beside the reviewed design doc (e.g. `docs/specs/reviews/`) — matching the convention installed by [`project-setup`](../project-setup/). The skills work without that layout but read most coherently when bootstrapped with `project-init`.
- **RFC 2119 terminology.** Every skill uses MUST / SHOULD / MAY precisely. The strength of the obligation matters — "MUST update the banner on phase ship" is non-negotiable; "SHOULD include an Execution Status table" is recommended-with-judgment.
- **Cycle skills delegate, they don't duplicate.** `bug-hunt-cycle` and `health-review-cycle` MUST NOT restate the subagent-proofing rules from `writing-plans-enhanced` or the multi-round review rules from `plan-review-cycle` — they invoke those skills and pass cycle-specific custom instructions on top. This keeps the rules in one place and prevents drift.
- **Plan-filename suffixes are consistent and distinct.** `-bug-hunt-remediation-plan.md` for bug-hunt cycles; `-health-review-remediation-plan.md` for health-review cycles; `-perf-audit-remediation-plan.md` for performance-audit cycles. Easy to identify and search for.
- **Performance findings ban two anti-patterns.** Effort is expressed as *work magnitude* (Localized / Contained / Cross-cutting), never wall-clock — agents anchor on human calendar-time training data. And there is *no severity-based deferral*: every finding is scheduled by default; dropping one needs an explicit user opt-out or a substantive reason naming a specific mechanism, never "it's only minor."
- **Hunter outputs are correctness-only.** The `bug-hunter-*` skills explicitly do NOT report coverage gaps, weak assertions, style nits, or refactoring opportunities. Their job is to find code that does the wrong thing — test-quality work happens in `project-health-review`'s Test Quality dimension instead.
- **Flagship tier at high effort for adversarial dispatches, everywhere.** `design-review-cycle`, `bug-hunt-cycle` Phase 2, `project-health-review`, and `performance-audit`'s lanes all dispatch at the flagship tier (latest Opus, or the current OpenAI flagship, or a successor at that tier) at high reasoning effort, with premium tiers (Fable / GPT-Pro-class) reserved for explicit user request. Adversarial review is correctness-critical, so the flagship tier is a floor rather than a nice-to-have — but "always the maximum dial" is a weaker claim, since current-generation review accuracy holds well at high. Step a dispatch up deliberately, not by default. Where a harness exposes no effort knob, the skills record `default (harness exposes no knob)` rather than claiming a level nobody requested. `plan-review-cycle` used to diverge at xhigh; it was brought back to the flagship-at-high floor (user decision, 2026-07-27) because its many-round loop paid the maximum dial's latency and token cost on every round without a matching accuracy return.
- **Review depth is driven by yield, not by a round count.** `handoff` requires *covering* six adversarial perspectives — that's a coverage floor — and then repeats only while rounds keep producing material findings. `design-review-cycle` states the same rule as a minimum legal sequence plus continuation while whole-doc rounds yield. The reason is symmetric: a round run to hit a number after findings have stopped manufactures them, and a manufactured finding damages a review exactly as much as a suppressed one.
- **Review floors are anchored on independence.** `plan-review-cycle` ends only when an *independent* round finds nothing substantive — the fix author never certifies its own fixes; a self-round at zero is a signal to dispatch the independent round, not to stop, and not to manufacture findings either.
- **Completeness is a checkable artifact, not an assertion.** `bug-hunt-cycle` and `health-review-cycle` reconcile every raw finding to a disposition in a table that gates their commit; `performance-audit-cycle` reconciles confirmed findings to plan tasks per slice; `design-review-cycle` maps every diff hunk to a ledger row at closure. All four replace a prose "I verified everything is accounted for" — a claim that reads identically whether or not something was dropped.
- **Self-propagating discipline.** Plans written by `writing-plans-enhanced` carry the Living Document Contract. Future executors reading the plan inherit the contract automatically, and on phase claim they check the previous phase's banner against git before writing their own — the one read-back that keeps a living document living. The skill seeds the convention; the convention sustains itself.

## Relationship to other plugins

- **[`project-setup`](../project-setup/)** — bootstraps the `docs/plans/`, `docs/pitfalls/...`, `docs/bug-hunts/`, `docs/health-reviews/`, and `CLAUDE.md` / `AGENTS.md` layout that these skills assume.
- **`superpowers`** (external) — base primitives that this plugin wraps: `superpowers:brainstorming` (wrapped by `brainstorming-enhanced`), `superpowers:writing-plans` (used by `writing-plans-enhanced`), `superpowers:writing-skills` (wrapped by `writing-skills-enhanced`), `superpowers:test-driven-development`, `superpowers:executing-plans`, `superpowers:subagent-driven-development`, `superpowers:dispatching-parallel-agents`. Install superpowers from its upstream marketplace before using these skills.

## Cross-platform notes

- **Claude Code:** invoke each skill via the `Skill` tool by name (`brainstorming-enhanced`, `build-robust-features`, `wire-walk`, `bug-hunt-cycle`, `bug-hunter-differential`, `bug-hunter-exploratory`, `bug-hunter-holistic`, `bug-hunter-multipass`, `design-review-cycle`, `editorial-pass`, `health-review-cycle`, `project-health-review`, `performance-audit-cycle`, `performance-audit`, `writing-plans-enhanced`, `writing-skills-enhanced`, `plan-review-cycle`, `handoff`). All cross-skill invocations are intra-plugin (bare names work).
- **Codex / Cursor / generic shell-based:** read the relevant `SKILL.md` from the plugin install location and follow it end-to-end. Each skill is self-contained, with explicit fallback notes for environments that can't invoke skills by name.
- **No bundled scripts.** Pure instruction. Paste the Living Document Contract block from `writing-plans-enhanced` rather than rewriting it: hand-adapted copies shed clauses, and the clauses they shed are the deferral condition and the deviation record. Its `## Living Document Contract` heading, banner vocabulary, and obligations are what future executors depend on and MUST survive; the prose around them may flex where a project's conventions require it.
