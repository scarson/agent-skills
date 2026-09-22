# pitfalls-docs-init

Initializes a project's `implementation-pitfalls.md` and `testing-pitfalls.md` from bundled templates that carry the maintenance framework plus universal cross-cutting entries. Invoked by an AI agent (Claude Code, Codex, Cursor, etc.) on behalf of the user — not a standalone CLI.

**Agents should read [SKILL.md](SKILL.md).** This README is the human-facing overview.

## What the skill does

Given a git repo (or project directory) and a user request like *"set up pitfalls docs in this project"*:

1. Searches for existing `implementation-pitfalls.md` and `testing-pitfalls.md` (exact basename match — templates and example files are not mistaken for deployed docs).
2. Auto-detects a sensible install path: `docs/pitfalls/` if `docs/` exists, `dev/pitfalls/` as fallback, prompts for custom otherwise.
3. Resolves install, move, merge, and skip choices; materializes every exact document, backup, move, and directory change; then presents the bound preview for confirmation.
4. Builds both document candidates from the bundled templates, substituting `[PROJECT NAME]` and the validation date.
5. Builds additive `CLAUDE.md` and `AGENTS.md` candidates under a sensible existing section (or a new §Pitfalls section).
6. **Preserves project-owned Markdown.** Before confirmation, project-owned spans must remain byte-identical, ordered, and under the same heading/list/fence context except for explicitly confirmed replacements. A non-blank-line comparison is an additional falsifier, not the proof. Merges classify exact template-owned replacements and repair accidental loss or movement in the candidate. Durable backups are planned user outputs, not rollback originals.
7. Applies only confirmed bytes under the shared project-setup lock and verifies or restores exact receipts.
8. Reports the human details and ends with one `PROJECT_SETUP_CHILD_RESULT_V1` block for `project-init`.

Step 6 exists because every other check describes the candidate's shape, not whether it preserved the input. A merge that drops a project's own entries can still contain all universal sections and links. Comparing the bound input with the candidate catches the loss before any target changes.

## Transaction and wrapper result

The skill retains its detailed human report, then ends every terminal path with one `PROJECT_SETUP_CHILD_RESULT_V1` block for `project-setup/pitfalls-docs-init`. `project-init` can distinguish verified changes and no-ops from whole-run skips, blocks, no-change failures, verified restoration, and uncertain partial state. A per-file `Skipped:` line in the human report is not the child outcome `USER_SKIPPED` when another target changed.

Durable timestamped backups are confirmed outputs retained after success. Ephemeral protected originals exist only for transaction restoration. Content-preservation repair changes candidate bytes before confirmation and is not transaction rollback.

## What the templates carry

**`implementation-pitfalls-template.md`** (fully populated maintenance framework + one universal cross-cutting pitfall):

- How to Use This Document (three audiences: implementer, reviewer, maintainer)
- Table of Contents (template with TODO placeholders)
- §Orchestration (ORCH-1) — trigger-and-pointer to `git-strategy.md` §Multi-agent coordination for the persistence-before-return rule
- Appendix A: Historical Changelog (empty, ready to append)
- Appendix B: Unified Summary Table (empty, ready to append)
- Appendix C: Document Maintenance Guide
    - When to Update This Document (update-first: strengthen the entry that owns the mechanism; add only when none does)
    - The Ownership Search (shared first step for every capture, role-scoped across the two pitfalls docs)
    - How to Update an Existing Pitfall (the default capture path)
    - How to Add a Pitfall (reached only when the ownership search comes up empty; condensed-vs-full format heuristic; mechanism-derived slug IDs recommended over sequential numbers)
    - How to Mark a Pitfall as Superseded
    - Completeness Checklist (split into every-capture items and new-entry-only items)
    - Voice and Style Reference (persuasion-principles reference)

Plus TODO placeholder section for the project's first domain-specific pitfalls.

**`testing-pitfalls-template.md`** (seven universal testing disciplines pre-populated):

1. Test Output Pristine
2. Skipped Tests Are Not Passing Tests
3. Error Path Coverage
4. Negative Property Testing (cleanup, bounded growth, edge cases)
5. Concurrency & TOCTOU
6. Boundary & Configuration Validation
7. Test Infrastructure Hygiene

Plus TODO placeholder section for project-specific topics and a "How to Add a Testing-Pitfall" maintenance guide.

## What the user sees

A typical invocation looks like:

```
You: set up the pitfalls docs in this project

Agent: [runs pre-flight checks silently]

       Pre-flight:
         Existing implementation-pitfalls.md:  NOT FOUND
         Existing testing-pitfalls.md:         NOT FOUND

       Install path:   docs/pitfalls/  (docs/ exists; pitfalls/ will be created)

       Planned actions:
         1. Create docs/pitfalls/implementation-pitfalls.md from template
         2. Create docs/pitfalls/testing-pitfalls.md from template
         3. Update CLAUDE.md (found): add references under §Conventions
         4. AGENTS.md: not found — skipped

       Confirm, or tell me what to change.

You: looks good

Agent: [writes files]

       Done.
         Created:  docs/pitfalls/implementation-pitfalls.md
                   docs/pitfalls/testing-pitfalls.md
         Updated:  CLAUDE.md  — added references under §Conventions
         Skipped:  AGENTS.md  — not found

       Next: fill in the TODO placeholders as you discover project-specific
       pitfalls. If git-strategy-init hasn't been run yet, consider running it
       next — the §Orchestration entry forward-references git-strategy.md
       which that skill installs.
```

## Updating the templates

If the canonical templates evolve, refresh the bundled copies:

```
cp /path/to/canonical/implementation-pitfalls-template.md references/implementation-pitfalls-template.md
cp /path/to/canonical/testing-pitfalls-template.md references/testing-pitfalls-template.md
```

The skill reads `references/*.md` and no other files — the bundled copies are authoritative.

After refreshing, verify the section-heading landmarks in `SKILL.md` Step 5's "substitute placeholders" logic still match the template structure.

## Cross-platform

Pure instructions, no bundled scripts, no runtime dependencies. Works with any agent framework that can read markdown skills, execute shell commands, and do file I/O.

Git is used only for listing tracked/untracked files during pre-flight; the skill works on non-git projects too (with a warning).

Does not depend on Claude Code-specific features. Codex, Cursor, and other agent frameworks run it equivalently.

## Changelog

- **v1.2** (2026-08) — adopted the shared proposal, lock, receipt, restoration, and `PROJECT_SETUP_CHILD_RESULT_V1` contract; made whole-run decline explicit; moved preservation before confirmation; and separated per-target skips, candidate repair, durable backups, and transaction restoration.
- **v1.3** (2026-08) — aligned shared application safety with child-owned discovery and lock-time revalidation, practical ordinary-file receipts, and fail-closed linked/junction/reparse targets. The pitfalls templates are unchanged; existing project documents need no content migration.

## Limits

- The skill installs, it doesn't maintain. When a real bug surfaces a missing pitfall, a human or agent captures it manually using the maintenance guide in the template — usually by strengthening the entry that owns the mechanism, adding a new one only when none does.
- The skill doesn't auto-populate project-specific pitfalls — those are by definition discovered over time as the project evolves.
- The §Orchestration entry forward-references `docs/git-strategy.md`. If `git-strategy-init` hasn't been run, the reference is dangling until it is. The templates don't break without it, but the cross-reference is temporarily inert.
