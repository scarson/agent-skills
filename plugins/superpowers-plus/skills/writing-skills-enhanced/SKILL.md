---
name: writing-skills-enhanced
description: Use when creating a new skill, editing an existing skill, or reviewing a skill or the templates it emits before deployment in this repo — instead of superpowers:writing-skills alone. Also use when checking any skill or persistent artifact for dangling, opaque, or forward references.
---

# Writing Skills (Enhanced)

Wraps `superpowers:writing-skills` with this repo's reference discipline. Every
section below is an addition to the base, never a restatement.

## Terminology

<!-- approved-block: rfc2119-terminology v1 — authoritative copy: ../../approved-blocks.md -->
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.
<!-- /approved-block: rfc2119-terminology -->

## Step 1: Invoke the base skill

Invoke `superpowers:writing-skills`. You MUST follow it completely — the Iron
Law (no skill without a failing test first), the RED-GREEN-REFACTOR cycle, and
the discovery-optimization guidance all stand unchanged. The section below adds
repo-specific requirements the base does not cover.

## Reference discipline

Skills are read cold, by agents under load; the artifacts they emit outlive
every session. Both MUST pass the rule below.

<!-- approved-block: self-identifying-references v1 — authoritative copy: ../../approved-blocks.md -->
**Self-identifying references.** Default: write the meaning in place — a reference is the exception, justified only by a stable, authoritative target. Every reference that does persist MUST pass this test: reading only the inline text, a cold reader can (i) tell what the target is and (ii) decide whether following it matters for their current task. Route by target:

- **No stable target** — session shorthand (`Option C`, `finding F3`), positional pointers (`above`, `the earlier rule`), bare numbers (`hook (8)`): no reference survives. Write the meaning: `Option C` → `on-device Apple Foundation Models`; `hook (8)` → `the base-didn't-commit hook`. If the meaning is not recoverable from what you have, say so in place — `finding F5 (content not captured in these notes)` — never delegate to an unnamed source and never invent the missing content.
- **Stable, authoritative target** (spec, ADR, doc section, ledger row): keep the link, add inline orientation, and do not hand-copy the content — the target stays the single source of truth. `see ADR-7` → `ADR-0007 — ASCII-only output to avoid mojibake`. Verbatim copies are legitimate only under tooling that detects drift between copies.
- **Target that does not exist yet** — written later, by another process: name the writer and the absent-until condition in place: `the review ledger pointer (written by the reviewing skill at its setup; absent until a review has run)`.
<!-- /approved-block: self-identifying-references -->

Skill-specific extensions:

- **Name internal rules; number only linear sequences.** A rule referenced from
  elsewhere in the skill MUST get a stable bold kebab-case handle
  (**pin-integrity**), never a positional number. Numbered steps MAY be used
  where they are read in order and never referenced from afar.
- **Ledger and finding IDs are references too.** Citing a persistent ledger's
  row outside the ledger — in a commit message, a summary, a sibling doc —
  MUST carry orientation: `L53 (the supersede-auto-invocation requirement)`,
  never bare `L53`. A commit subject like `fold L54-L75` with no orientation
  MUST NOT be written — name what the span was about.
- **Emitted text inherits the rule.** Every template, status line, note, or
  message the skill instructs its runner to write into a spec, commit, or
  artifact is persistent-artifact text — you MUST apply the cold-reader test
  to the template itself, not only to the skill's own prose.
- **Sweep before shipping** (a verification step, not advice). You MUST scan
  the draft for: `above` / `below` / `earlier` used as pointers, `§` + bare
  number, `(N)`-style numeric pointers, and single-letter or numbered labels
  (`Option C`, `F3`, `Followup #2`). Apply the cold-reader test to each hit.
  Hits are judgment triggers, not automatic failures — quoted counter-examples
  and legends flag too. Where this repo's tooling is available,
  `node scripts/reference-sweep.mjs <file>` automates the scan; the pattern
  list above is authoritative when it is not.

This wrapper deliberately ships narrow: further enhancements MUST NOT land
here without their own RED/GREEN cycles, per the base skill's Iron Law.
