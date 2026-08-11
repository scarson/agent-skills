# Approved language blocks — superpowers-plus

Authoritative source for text blocks that appear verbatim in more than one skill. Skills carry **inline copies** between `<!-- approved-block: <name> vN -->` … `<!-- /approved-block: <name> -->` markers, so no runner ever chases a cross-skill pointer mid-execution and every skill reads complete standalone. This file is where edits happen: change the block here, bump the version in its heading, then run `node scripts/sync-approved-blocks.mjs --write` to refresh every copy listed under "Used by". `--check` (which the pre-commit hook runs) fails on any copy whose bytes, or whose marker version, have fallen out of step — line-wrap drift between copies is the known failure mode, so let the tool move the bytes rather than retyping them. Editing a copy in place without editing this file is drift, not authorship.

Blocks are deliberately artifact-neutral ("the artifact under review") and tier-neutral ("this skill's reviewer tier") so the same bytes are correct in every consuming skill.

**Deliberately deferred:** the YAGNI calibration paragraph is not tracked here — its authoritative source is cross-plugin (the `project-setup` CLAUDE.md/AGENTS.md template), which this per-plugin file cannot own; the consuming skills carry provenance notes pointing at it instead.

**Cross-plugin alignment:** the `self-identifying-references` block below condenses the `project-setup` template's §Self-identifying references section (the extended treatment: rationale, operational test, full example set). This file owns the condensed bytes; an edit to either text obliges the editor to check the other for alignment.

## cross-model-dispatch v1

Used by: `skills/design-review-cycle/SKILL.md` §Cross-provider policy · `skills/plan-review-cycle/SKILL.md` §Who runs each round

**Long-running dispatch discipline.** Cross-model CLI runs at high reasoning effort routinely take 15–45+ minutes — longer than many harnesses' maximum foreground command timeout (Claude Code caps foreground Bash at 10). Launch them **backgrounded, output redirected to a log file** — never as a foreground call gated on a timeout. Confirm liveness once, early (the log exists and is growing within the first couple of minutes), then wait: slow is the model thinking, not a hang. **A timeout or slow run is an environment failure and MUST NOT lower the reasoning effort** — a quietly-downgraded cross-model run is an undisclosed degradation the disclosures cannot show. Repeated errors (failures, not slowness) route to the same-provider fallback, with its disclosure.

## cross-provider-fallback v1

Used by: `skills/design-review-cycle/SKILL.md` §Cross-provider policy · `skills/plan-review-cycle/SKILL.md` §Who runs each round

**How to dispatch cross-provider:** the mechanism depends on the environment — a sibling skill that wraps another provider's CLI (e.g., a `codex` skill shelling out to OpenAI's Codex CLI), that CLI invoked directly via Bash, or an API the runner can call. Asking the user to hand-carry the artifact under review to another provider's interface is a MAY-offer, never part of a REQUIRED trigger. If no automated primitive is available the runner MUST NOT block: fall back to a dispatched subagent from the runner's own provider **at this skill's reviewer tier**, and disclose the substitution in the round table and completion summary.

## repo-tier-degradation v1

Used by: `skills/design-review-cycle/SKILL.md` · `skills/plan-review-cycle/SKILL.md` · `skills/writing-plans-enhanced/SKILL.md`

**Repo probe, three tiers, no invented anchors.** Before any step that commits, records a commit SHA, or hands one to another skill, probe: is the artifact inside a git work tree, and may the runner commit (project rules, hooks)? Never block on the answer — degrade and disclose. **Tier 1, work tree and committing allowed:** the full protocol, SHAs recorded and handed on as written. **Tier 2, work tree but committing unavailable** (project rules forbid agent commits, hooks fail, unusual repo state): stage rather than commit — or, where staging is itself unavailable or the project's convention prefers it, leave the artifact in place and say so — surface once rather than forcing, and use the artifact's current bytes wherever a commit SHA would have been the anchor. **Tier 3, no work tree at all** (research, operations, or docs work outside any repo): copy the artifact's bytes to a session scratch file before proceeding — that copy is the baseline anything downstream would otherwise have taken from a commit — and disclose that no durable audit trail exists, reporting the scratch path so the user can keep it. In the degraded tiers the missing field is dropped with a one-line note saying why, and MUST NOT be filled with a plausible-looking value: a requirement that cannot be met honestly is a prompt to invent, and an invented SHA is worse than an absent one because it reads as an anchor while resolving to nothing.

## self-identifying-references v1

Used by: `skills/writing-skills-enhanced/SKILL.md` §Reference discipline

**Self-identifying references.** Default: write the meaning in place — a reference is the exception, justified only by a stable, authoritative target. Every reference that does persist MUST pass this test: reading only the inline text, a cold reader can (i) tell what the target is and (ii) decide whether following it matters for their current task. Route by target:

- **No stable target** — session shorthand (`Option C`, `finding F3`), positional pointers (`above`, `the earlier rule`), bare numbers (`hook (8)`): no reference survives. Write the meaning: `Option C` → `on-device Apple Foundation Models`; `hook (8)` → `the base-didn't-commit hook`. If the meaning is not recoverable from what you have, say so in place — `finding F5 (content not captured in these notes)` — never delegate to an unnamed source and never invent the missing content.
- **Stable, authoritative target** (spec, ADR, doc section, ledger row): keep the link, add inline orientation, and do not hand-copy the content — the target stays the single source of truth. `see ADR-7` → `ADR-0007 — ASCII-only output to avoid mojibake`. Verbatim copies are legitimate only under tooling that detects drift between copies.
- **Target that does not exist yet** — written later, by another process: name the writer and the absent-until condition in place: `the review ledger pointer (written by the reviewing skill at its setup; absent until a review has run)`.

## rfc2119-terminology v1

Used by: `skills/brainstorming-enhanced/SKILL.md` §Terminology · `skills/bug-hunt-cycle/SKILL.md` §Terminology ·
`skills/bug-hunter-differential/SKILL.md` §Terminology ·
`skills/bug-hunter-exploratory/SKILL.md` §Terminology · `skills/bug-hunter-holistic/SKILL.md` §Terminology ·
`skills/bug-hunter-multipass/SKILL.md` §Terminology · `skills/build-robust-features/SKILL.md` §Terminology ·
`skills/design-review-cycle/SKILL.md` §Terminology · `skills/editorial-pass/SKILL.md` §Terminology ·
`skills/handoff/SKILL.md` §Terminology ·
`skills/health-review-cycle/SKILL.md` §Terminology · `skills/performance-audit-cycle/SKILL.md` §Terminology ·
`skills/performance-audit/SKILL.md` §Terminology · `skills/plan-review-cycle/SKILL.md` §Terminology ·
`skills/project-health-review/SKILL.md` §Terminology · `skills/wire-walk/SKILL.md` §Terminology ·
`skills/writing-plans-enhanced/SKILL.md` §Terminology ·
`skills/writing-skills-enhanced/SKILL.md` §Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.
