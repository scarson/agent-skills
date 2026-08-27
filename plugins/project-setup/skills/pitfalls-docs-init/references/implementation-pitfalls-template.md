# [PROJECT NAME] — Implementation Pitfalls & Review Findings

> **Purpose:** Document implementation traps, design flaws, and corrected decisions that would cause production failures, security vulnerabilities, or data correctness bugs if shipped. This document is the primary code review reference for the [project name] codebase.
>
> **Relationship to testing-pitfalls.md:** This document specifies *what* to implement and *why*. `docs/pitfalls/testing-pitfalls.md` specifies *how to verify* those implementations work correctly. They are complementary — cross-references are noted inline.
>
> **Last validated against codebase:** YYYY-MM-DD (replace when you audit against the current code)

---

## How to Use This Document

This document serves three audiences. Start here, then go directly to the section you need.

**If you're implementing code:** Go to the domain section matching your work area. Each entry has a clear *Flaw → Why It Matters → Fix → Lesson* structure. Follow the Fix. The Lesson teaches the generalizable principle so you'll catch the next instance of this pattern.

**If you're reviewing code:** Go to your domain section's **Review Checklist** at the end. Each item is a pass/fail check derived from the pitfalls above it. If a checklist item fails, read the referenced pitfall for context.

**If you're maintaining this document:** Every generalizable implementation pitfall discovered during coding, review, or debugging MUST be captured here — usually by strengthening the entry that already owns the mechanism, not by adding a new one. (One-off bugs that don't generalize stay out — see §When to Update This Document. Test-design lessons go to `docs/pitfalls/testing-pitfalls.md`.) See the maintenance sections at the end of this file. Partial updates cause drift.

---

## Table of Contents

<!-- TODO: replace the example rows below with your project's actual domain sections. -->

| § | Section | You're working on... | Entries | Checklist |
|---|---------|---------------------|---------|-----------|
| 1 | [EXAMPLE-DOMAIN-1](#1-example-domain-1) | TODO — describe what this section covers | N entries | §1.C |
| 2 | [EXAMPLE-DOMAIN-2](#2-example-domain-2) | TODO — describe what this section covers | N entries | §2.C |
| — | [Orchestration](#orchestration) | Parallel subagent dispatch and output persistence | ORCH-1 | §Orchestration.C |
| A | [Historical Changelog](#appendix-a-historical-changelog) | Provenance, validation dates, review process meta-observations | — | — |
| B | [Unified Summary Table](#appendix-b-unified-summary-table) | All pitfalls at a glance, with severity and status | — | — |

---

# Section 1: EXAMPLE-DOMAIN-1

<!-- TODO: rename this section to your project's first domain (e.g. "Authentication & Security", "Data Pipeline", "API Handlers"). Delete this comment. -->

> **Reader context:** I'm building or reviewing [what this domain covers].
>
> TODO — describe the shape of the pitfalls in this section and why they matter.

---

### `PREFIX-<mechanism-slug>`: TODO — First Pitfall Title

<!-- TODO: replace this example with a real pitfall entry. Use the Flaw → Why → Fix → Lesson structure for complex findings, or a single condensed paragraph for simple ones. See §How to Add a Pitfall below. -->

**The Flaw:** TODO — what the code does wrong or what's missing.

**Why It Matters:** TODO — the production failure mode. What breaks, for whom, and why it's hard to detect.

**The Fix:** TODO — the specific code change or pattern to apply. Include a code example when the fix is non-trivial.

**The Lesson:** TODO — the generalizable principle. What should the reader watch for in future code?

---

### Review Checklist

<!-- TODO: one checkbox per pitfall above. Each item is a pass/fail check. Example format: -->

- [ ] **Check derived from `PREFIX-<mechanism-slug>`** — TODO

---

# Section 2: EXAMPLE-DOMAIN-2

<!-- TODO: rename, or delete this section if not needed. Duplicate the Section 1 template for each additional domain. -->

TODO.

---

## Orchestration

Pitfalls that arise when a session dispatches parallel subagents and consolidates their output. The canonical rules live in `docs/git-strategy.md` → §Multi-agent coordination → Output persistence. This section is the discovery hook for plan writers who arrive here via the `writing-plans-enhanced` (or equivalent) mandated-read path — it does NOT restate the rules in full.

### ORCH-1: Analysis Dispatches Must Persist Findings Before Returning

**Trigger:** Your plan dispatches parallel subagents (bug hunts, audits, phased analysis, parallel investigations) whose findings would be expensive to regenerate if lost.

**What you need to do:** Every such dispatched subagent MUST write its complete report to a persistent file BEFORE returning; the response message is not the sole record.

**Read the full rule:** `docs/git-strategy.md` → §Multi-agent coordination → Output persistence. That section carries the copy-pasteable prompt block (with `<PERSISTENCE_PATH>` substitution), file-path conventions, orchestrator commit cadence, and the cases where the rule doesn't apply.

**Why this is in implementation-pitfalls:** because the plan-writing skill mandates reading this file, and this rule has to be noticed at plan-write time (when the dispatch prompts are being drafted), not at execution time (when it's too late). The failure mode — orchestrator context compacting mid-consolidation and lossily dropping findings — is predictable and preventable if the plan author builds persistence into the dispatch prompts from the start.

### Review Checklist

- [ ] **Dispatch prompts include the mandatory-persistence block** — copy from `docs/git-strategy.md` §Output persistence; substitute `<PERSISTENCE_PATH>` with a durable per-subagent path (ORCH-1)
- [ ] **Plan specifies exact persistence paths, not "write somewhere useful"** — ambiguous paths default to `/tmp` under pressure, which doesn't survive (ORCH-1)
- [ ] **Orchestrator commits subagent artifacts wave-by-wave** — committed files land on the campaign branch before consolidation begins (ORCH-1)

---

# Appendix A: Historical Changelog

<!-- TODO: Add changelog entries as the document evolves. Format: -->
<!-- ## YYYY-MM-DD — <event> -->
<!-- - Added PREFIX-<mechanism-slug> (<title>) — <what and why> -->
<!-- - Updated PREFIX-<other-slug> — <what changed> -->

TODO — add entries as this document evolves.

---

# Appendix B: Unified Summary Table

<!-- TODO: One row per pitfall for at-a-glance review. Keep in sync with the sections above. -->

| ID | Title | Severity | Status | Domain |
|----|-------|----------|--------|--------|
| ORCH-1 | Analysis Dispatches Must Persist Findings | HIGH | VALIDATED | Orchestration |
| `PREFIX-<mechanism-slug>` | TODO | TODO | TODO | Section 1 |

Severity levels: `CRITICAL` (production data loss / security), `HIGH` (correctness bug under predictable conditions), `MEDIUM` (correctness bug under edge cases), `LOW` (cleanliness / clarity).

Status values: `VALIDATED` (prescribed fix is implemented and tested), `UNIMPLEMENTED` (pitfall documented but fix not yet in code), `SUPERSEDED` (replaced by another entry or no longer applicable).

---

# Appendix C: Document Maintenance Guide

## When to Update This Document

Update this document when any of the following occur:

| Trigger | Action |
|---------|--------|
| Bug hunt or code review surfaces a generalizable pattern | Find the entry that owns the mechanism and strengthen it with the new case; add a new entry only if none does |
| Health review flags a cross-cutting issue | Strengthen the owning entry, or add one if none owns the mechanism |
| A pitfall documented here recurs in new code anyway | Rewrite the entry to be more persuasive — recurrence means it failed its reader (see §Voice and Style Reference) — and add the new example |
| Implementation reveals a prescribed fix was wrong | Update the existing pitfall to match reality — the code is the source of truth |
| A pitfall's prescribed fix is implemented | Update the entry's status in Appendix B |
| A feature is removed or an approach abandoned | Mark the pitfall as SUPERSEDED with a note explaining why |
| testing-pitfalls.md adds a new section | Check if a cross-reference should be added here |

**Do NOT update this document for:**

- One-off implementation bugs that don't generalize to a pattern
- Code style preferences or formatting choices
- Performance optimizations without correctness implications

And do NOT add a new entry for a finding whose mechanism an existing entry already describes — that is an update to that entry, however different the surface looks.

---

## The Ownership Search — Every Capture Starts Here

Before writing anything — update or new entry — grep this document AND `docs/pitfalls/testing-pitfalls.md` for the *mechanism* of your finding, not its surface: the owning entry usually describes the same failure in different code. In a large corpus, shortlist candidates by TOC and title (or the generated index, if the project keeps one) and read the shortlist in full — reading everything is not the bar, but a TOC line alone can only shortlist an entry, never rule one out. A shortlist that comes back **empty** is a signal to widen the search, not a green light to add: grep the failure's *symptom* vocabulary (the error text, the observable misbehavior) rather than the mechanism name you coined for it, and scan the relevant domain section's entries directly. "I searched and found nothing" is a claim — you should be able to say how you established it. Then route by the documents' roles:

- An entry **in this document** owns the mechanism → §How to Update an Existing Pitfall.
- A match **only in testing-pitfalls.md** owns the *verification* half, not the implementation half — it may mean your finding is purely test-design (capture it there and stop), or that this document still needs its own entry; either way wire the cross-reference.
- Nothing in this document owns the implementation half → §How to Add a Pitfall.

---

## How to Update an Existing Pitfall

This is the default way a new finding lands in this document. Most findings are a new surface of a mechanism an entry already owns — a different subsystem, a narrower case, a fresh example — and belong inside that entry, not beside it. Arriving here presumes §The Ownership Search above confirmed the entry you're extending is the true owner — if you matched an entry by title alone, run that search before editing. The converse guard: don't stretch an entry's mechanism to make a finding fit. If a reader hunting your finding would never look under the entry's title — or the entry would need a second title to stay honest — it's a new entry (or a split), not an update.

1. **Read the current entry** and understand its intent
2. **Check the code** to see what actually changed
3. **Update the entry** to reflect reality — never preserve a prescription that contradicts the code. Extend with the smallest addition that carries the new case; no session narratives.
4. **Update the section's Review Checklist** if the new case changes what a reviewer should check — a lesson captured only in the entry body never reaches the checklist reviewers actually run
5. **Update Appendix B** status if it changed (e.g., `UNIMPLEMENTED` → `VALIDATED`)
6. **Check cross-references** — does testing-pitfalls.md need the same case? Does the pattern exist elsewhere in the codebase? Grep for other instances.
7. **Check Appendix A** — add a changelog line noting the update date and reason

---

## How to Add a Pitfall (when no entry owns the mechanism)

Reached only via §The Ownership Search above — a new entry is justified by that search coming up empty for this document's role, not by the finding feeling new.

### Step 1: Choose the domain section

If the pitfall spans two domains, place it where the reader is most likely to look when they encounter the bug. Add a "See Also" cross-reference in the other section.

### Step 2: Assign an ID

Prefer a short mechanism-derived slug on the section's prefix (`AUTH-token-replay`, `DB-partial-commit`): concurrent branches adding entries never collide on a slug unless they document the same mechanism — which is exactly the conflict you want surfaced. Sequential numbers (`AUTH-3`, `DB-12`) are a shared counter that conflicts on *every* concurrent addition; use them only in a section that already carries multiple citation-locked numbered entries (existing citations lock the scheme — never renumber). The pre-seeded `ORCH-1` entry does NOT establish a numbering scheme — it keeps its number only because the init skills cite it cross-project by that ID; a second orchestration entry would take a slug (`ORCH-<mechanism-slug>`), and so does the first entry of every new section. Two consequences of that split are expected and fine: a section can legitimately hold a numbered legacy entry beside slug entries (`AUTH-1` next to `AUTH-token-replay`) — mixed schemes within a section are not a defect, and "tidying" them by renumbering breaks citations. And **before adopting slugs in a corpus that has grown ID-aware tooling** (a generated index, an ID-uniqueness checker, a citation linter, a CI gate), audit every pattern that extracts entry IDs first: tooling built against the numeric shape typically *filters out* a slug heading rather than erroring, so the entry silently vanishes from the index and the checks while every gate stays green. Either way, use a short section-matching prefix (2-5 letters, uppercase, descriptive). With slugs, the TOC's Entries column lists a count rather than an ID range.

### Step 3: Write the entry

**For complex findings** (non-obvious failure mode or architectural fix):

```markdown
### PREFIX-<mechanism-slug>: Title

**The Flaw:** What the code does wrong or what's missing.
**Why It Matters:** The production failure mode — what breaks, for whom, and why it's hard to detect.
**The Fix:** The specific code change or pattern to apply. Include a code example when the fix is non-trivial.
**The Lesson:** The generalizable principle. What should the reader watch for in future code?
```

**For simple findings** (one-line pattern substitution, self-evident why):

```markdown
### PREFIX-<mechanism-slug>: Title
[One paragraph: what's wrong, what to do instead, and why. No code example needed.]
```

(In a sequentially-numbered corpus, the heading is `### PREFIX-N: Title` instead — match the section's existing scheme.)

**Use the right heuristic:** If an implementing agent could correctly apply the fix from just a one-line description without understanding the failure mode, use the condensed format. If they'd need to understand WHY to apply it correctly, use the full format.

### Step 4: Update the review checklist

Add a checkbox item to the section's review checklist (§X.C) that captures the key check for this pitfall.

### Step 5: Update the Table of Contents

Update the section's Entries column in the TOC table — the count for slug IDs, or the range for sequential IDs (e.g., `AUTH-1 – AUTH-12` becomes `AUTH-1 – AUTH-13`).

### Step 6: Update the Summary Table

Add a row to Appendix B with the pitfall ID, title, severity, status, and domain.

### Step 7: Check for cross-references

- Does testing-pitfalls.md need a corresponding test guidance entry?
- Does another domain section need a "See Also" pointer?
- Does the same pattern exist elsewhere in the codebase? Grep for other instances.

### Step 8: Update the changelog

Add a line to Appendix A noting the date, the new entry's ID, and the source of the finding.

---

## How to Mark a Pitfall as Superseded

Do NOT delete pitfall entries. Mark them:

```markdown
### PREFIX-<mechanism-slug>: Title

> **SUPERSEDED (YYYY-MM-DD):** [Reason — e.g., "Feature removed in Phase 12" or "Replaced by PREFIX-<broader-slug> which covers the broader pattern"]

[Original content preserved below for historical context]
```

Update Appendix B status to `SUPERSEDED`.

---

## Completeness Checklist

**A capture — updating an entry or adding one — is not complete until ALL of the applicable items are done.** Partial updates are how this document drifts — and a drifted document is worse than no document, because it creates false confidence in protections that don't exist.

For every capture (update or new entry):

- [ ] Ownership search run (§The Ownership Search): the mechanism was grepped for in both pitfalls documents — confirming the entry you extended is the true owner, or that no entry in this document owns the implementation half
- [ ] Review checklist (§X.C) reflects the finding — extended or updated if the new case changes what a reviewer should check (no edit needed when the existing check already covers it)
- [ ] Appendix B summary table reflects the entry — row added for a new entry; title/severity/status corrected if the capture changed them (no change needed otherwise)
- [ ] Cross-references checked: testing-pitfalls.md, other domain sections, See Also block
- [ ] If the pattern could exist elsewhere in the codebase: grepped for other instances
- [ ] Appendix A changelog updated with date and source

Additionally, for a new entry:

- [ ] Entry written in the correct domain section with the correct format
- [ ] Entry ID follows the section's scheme (mechanism-derived slug preferred; next sequential number only in a section with multiple citation-locked numbered entries — the seeded `ORCH-1` alone doesn't count)
- [ ] TOC entry count updated

**If you skip any of these steps, the next agent to read this document will not find your pitfall.** The TOC is the routing table — without it, your entry is invisible. The summary table is the audit trail — without it, the next health review won't know your finding was addressed.

---

## Voice and Style Reference

This document uses persuasion principles to ensure agents follow critical practices:

- **Authority** for bright-line rules: "MUST", "Never", "Always", "No exceptions"
- **Implementation intentions** for triggers: "When writing a PATCH handler, ALWAYS use pointer types"
- **Social proof via failure modes**: "Without this, the webhook client follows redirects to internal metadata endpoints — every time"
- **Commitment** via checklists: the review checklists at the end of each section

When writing pitfall entries, apply these principles. A pitfall that says "consider using X" will be ignored under pressure. A pitfall that says "MUST use X — without it, Y happens every time" will be followed.

Reference: the `superpowers:writing-skills` skill (or equivalent in your skill library) carries the full persuasion-principles framework if you want to go deeper.
