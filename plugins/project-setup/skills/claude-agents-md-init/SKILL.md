---
name: claude-agents-md-init
description: Use when setting up a new or existing project with agent-guidance files (CLAUDE.md for Claude Code, AGENTS.md for Codex / Cursor / Cline / other AGENTS.md-aware frameworks). Triggers on "set up CLAUDE.md", "set up AGENTS.md", "initialize CLAUDE.md", "bootstrap agent guidance", "add CLAUDE.md and AGENTS.md", or similar. Installs ONE bundled template as two sibling files with per-target substitutions; both carry the RFC 2119 terminology block, a universal ruleset (principles, TDD, naming, testing, debugging, memory), placeholder sections for project-specific content, and a Sibling-sync reminder. Default writes both; use `--target claude|agents|both` to narrow scope. Alignment-checks any existing root file and STOPs for review before standing up a sibling against a divergent one. Any rewrite passes a content-preservation gate — a line-level diff against the pre-change backup. Cross-platform — git and standard file ops only. Pairs with `git-strategy-init` and `pitfalls-docs-init` but runs independently.
metadata:
  version: "2.11"
---

# claude-agents-md-init

Initializes project-root agent-guidance files from a single bundled template, rendered as one or both of:

- `CLAUDE.md` — consumed by Claude Code (`claude.ai/code`)
- `AGENTS.md` — consumed by Codex, Cursor, Cline, Aider, and other AGENTS.md-aware agent frameworks

The template carries the **universal** ruleset that applies across projects and frameworks (RFC 2119 terminology, principles, external-resource safety, relationship, proactiveness, completeness over shortcuts, TDD, writing code, naming, code comments, self-identifying references, version control short-form, testing, issue tracking, completion status & escalation, systematic debugging, thinking documentation, learning and memory, workflow skills table) plus **placeholder** blocks for project-specific content. At write time, two tokens substitute per target:

- `[AGENT_INTRO]` — the "This file provides guidance to …" intro line; per-target phrasing
- `[SIBLING_FILE]` — the name of the other file in the Sibling-sync reminder

All other content is identical between the two outputs.

**This file is for agents invoking the skill.** Humans should read [README.md](README.md) for the overview and rationale.

## Why one skill for two files

Claude Code and Codex/Cursor/Cline are used side-by-side in many teams. The rules in `CLAUDE.md` and `AGENTS.md` should stay identical except for a few platform-specific mentions — maintaining two parallel skills with two parallel templates risks drift. One skill, one template, per-target substitutions keeps the pair in sync by construction. The Sibling-sync reminder at the top of each output file keeps them in sync over time as users edit them.

## When to use

Invoke when the user asks to:

- "set up CLAUDE.md" / "set up AGENTS.md" / "set up agent guidance"
- "initialize CLAUDE.md" / "initialize AGENTS.md"
- "bootstrap Claude/Codex guidance" for a project
- "add a CLAUDE.md template" (equivalent for AGENTS.md)
- install project-root agent instructions following the modern-Claude-tuned convention (Opus 4.7+, reviewed against Opus 4.8 / Sonnet 5 / Fable 5 / Opus 5)

Do NOT use for:

- Editing existing CLAUDE.md / AGENTS.md content — that's a normal edit workflow, not an init.
- Projects that already have agent-guidance files with substantial custom content and don't want template-driven changes — this skill is additive but may prompt to merge; the target audience is fresh projects or projects whose guidance files have significantly diverged from modern conventions.

## Inputs

- The bundled template at `references/claude-agents-md-template.md` (relative to this skill's root). Do NOT read the template from any other location.
- The bundled **policy file** at `references/external-resource-safety.md`. The template's `## External-resource safety` section is an always-loaded tripwire that points at `docs/security/external-resource-safety.md`; this bundled file is the depth written to that path. It is framework-neutral (no substitution tokens) and shared by both `CLAUDE.md` and `AGENTS.md`, so it is written **once** per project, not per target.
- The current working directory must be the root of the project (git repo preferred but not required).
- Optional inputs to ask the user for (Step 2):
  - Project name (default: basename of the current directory)
  - User name (how the agent should address the human partner; default: ask)
  - Primary branch name (default: detect from git; fall back to `main`)
  - Target (default: ask with smart default based on existing file state)

## Workflow

### Step 1 — Pre-flight

1. **Verify current working directory.** If it's a git repo (`git rev-parse --is-inside-work-tree`), note that and capture the primary branch name via `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'` or fall back to `git branch --show-current`. If not a git repo, proceed anyway and warn the user — neither file requires git.

2. **Search for existing agent-guidance files at the project root.** Check for:
   - `CLAUDE.md` (case-sensitive — Claude Code convention)
   - `AGENTS.md` (case-sensitive — Codex / AGENTS.md convention)
   - `.claude.md` (alternate lowercase; uncommon but respected by Claude Code)
   - `CLAUDE.local.md` (personal overrides; gitignored by convention)

3. **Classify the state for each of `CLAUDE.md` and `AGENTS.md`:**
   - `MISSING` — the file is not present.
   - `FOUND_ELSEWHERE` — the file exists in a subdirectory but not at root.
   - `FOUND_AT_ROOT` — the file exists at the project root. For each file in this bucket, sub-classify via the **alignment check** below.

4. **Alignment check for `FOUND_AT_ROOT` files.** An existing file is "template-aligned" if it shares the template's universal ruleset structure — that's what makes creating its sibling from the template safe. Grep the existing file for the following six markers; count hits:

   - `## Terminology` heading near the top (within first ~50 lines)
   - `RFC 2119` string
   - `## Principles` heading
   - `Rule #1:` phrase (prefix match — survives rewording of the rule body)
   - `## Our relationship` heading
   - `## Proactiveness` heading

   Classification:
   - **≥ 4 markers present** → `TEMPLATE_ALIGNED` (structure matches template; the content of each section may differ, and that's OK)
   - **< 4 markers present** → `DIVERGENT` (file doesn't follow this template's shape at all; standing up a sibling from the template will create an out-of-sync pair)

   Marker history: `Don't glaze me` was a marker through skill v2.2 but the phrase left the template; v2.3 replaced it with `## Proactiveness` and shortened the Rule #1 marker to a prefix. Files installed from any v2.1+ template match at least 4 of the current 6 markers (v2.1/v2.2 files carry `# Proactiveness` as an H1, which misses the H2 marker but still leaves 5 hits), so they remain `TEMPLATE_ALIGNED`.

5. **Sibling-sync block presence check.** For every `TEMPLATE_ALIGNED` file, additionally check whether the sibling-sync block is present. Grep for the literal string `**Sibling sync.**`. If present → `TEMPLATE_ALIGNED_WITH_SYNC`; if absent → `TEMPLATE_ALIGNED_NO_SYNC`. Files authored before this skill (or under earlier versions) will be in the `NO_SYNC` state even if their content is template-aligned.

6. **Security-section presence check.** For every `TEMPLATE_ALIGNED` file, also check whether the `## External-resource safety` section (added in v2.4) is present. Grep for the literal heading `## External-resource safety`. If absent → the file predates the supply-chain safety section and is a candidate for the additive migration in Step 4 (`MISSING_SECURITY_SECTION`). This is independent of the sync-block state above: a file can be `TEMPLATE_ALIGNED_WITH_SYNC` yet still lack the security section. Also note whether `docs/security/external-resource-safety.md` (the policy file the section points at) exists — the migration in Step 5.7 creates it if missing.

7. **Workflow-skills plugin availability.** The template's Skills & Subagents table carries its brainstorming/planning rows in three variant blocks (wrapper rows / base rows / omitted). Determine which applies now, using the ordered test in Step 5 sub-step 3a, so it can be presented for confirmation in Step 3 and applied at write time. Record the answer as `superpowers-plus` / `superpowers-base` / `none`.

8. **Smart default for `--target`:**
   - Both missing → default `both` (recommend the full install)
   - `CLAUDE.md` present, `AGENTS.md` missing → default `agents` (fill the gap; see Step 4 for sync-block injection and divergence handling)
   - `AGENTS.md` present, `CLAUDE.md` missing → default `claude`
   - Both present → default `both`, but Step 4 handles each file's state independently

### Step 2 — Collect substitution values

Ask the user (or infer, with confirmation) for:

- **Project name** — default to the basename of the current working directory. Used to substitute `[PROJECT NAME]` tokens.
- **User name** — the name the agent should address the human partner by (e.g., `Sam`, `Alice`). Used to substitute `[USER NAME]` tokens. Default: ask.
- **Primary branch** — `main`, `master`, `dev`, etc. Detect via `git` or ask. Used to substitute `[PRIMARY BRANCH]` tokens.
- **Brief project description** — one sentence. Used to substitute `[BRIEF PROJECT DESCRIPTION]` in the Project Overview placeholder. Optional — if not provided, leave as the literal token so the agent filling in the doc sees it.
- **Target** — `claude`, `agents`, or `both`. See Step 1's smart-default logic; confirm with the user if the default isn't obvious.
- **Output filename override (dogfood mode)** — optional. Default writes to `CLAUDE.md` and/or `AGENTS.md`. Override to `CLAUDE-TMP.md` / `AGENTS-TMP.md` (suffix applied to whichever targets are being written) when running as a dogfood / diff test against a project that already has those files. In dogfood mode: (a) skip the existing-file backup-and-replace logic in Step 4, (b) write to the overridden filenames regardless of whether the canonical files exist, (c) in Step 7's report, include a `diff` hint so the user can compare. Accept this as an explicit user flag — never infer "dogfood mode" from file state alone.

### Step 3 — Present & confirm

Present one consolidated block with detected state + proposed actions + substitution values, and ask the user to confirm or adjust:

```
Pre-flight:
  Existing CLAUDE.md:        NOT FOUND
  Existing AGENTS.md:        NOT FOUND
  Existing CLAUDE.local.md:  not found
  Git repo:                  yes, primary branch `main`

  (When a file is FOUND_AT_ROOT, this block also shows its alignment:
   TEMPLATE_ALIGNED_WITH_SYNC / TEMPLATE_ALIGNED_NO_SYNC / DIVERGENT.)

Substitutions:
  [PROJECT NAME]                 → my-project
  [USER NAME]                    → Alice
  [PRIMARY BRANCH]               → main
  [BRIEF PROJECT DESCRIPTION]    → (left as TODO placeholder)

Target: both (will write CLAUDE.md AND AGENTS.md)

Workflow-skills router rows:
  superpowers-plus available → wrapper rows
    (`superpowers-plus:brainstorming-enhanced`,
     `superpowers-plus:writing-plans-enhanced`)
  The other Skills & Subagents rows are unconditional.

Install paths:
  ./CLAUDE.md  (Claude Code — claude.ai/code)
  ./AGENTS.md  (Codex, Cursor, Cline, and other AGENTS.md-aware frameworks)

Planned actions:
  1. Create ./CLAUDE.md from template
  2. Create ./AGENTS.md from same template (different [AGENT_INTRO] + [SIBLING_FILE] substitutions)

  Both files will be identical except for:
    - The intro line (mentions Claude Code vs. mentions AGENTS.md-aware frameworks)
    - The Sibling-sync reminder at the top (points to the other file)

  Each file includes: RFC 2119 terminology, universal ruleset, workflow
  skills table, PLACEHOLDER sections for project-specific content.

Follow-ups to suggest after install:
  - Fill in the PLACEHOLDER sections with project-specific content
  - If using git-strategy-init: the "Keeping a clean git graph" section
    references docs/git-strategy.md — run git-strategy-init to install it
  - If using pitfalls-docs-init: several sections reference
    docs/pitfalls/implementation-pitfalls.md — run pitfalls-docs-init

Confirm, or tell me what to change.
```

Wait for user confirmation before proceeding.

### Step 4 — Handle existing-file cases (per target)

Runs independently for each target being written (`CLAUDE.md` and/or `AGENTS.md`). Handling depends on both the file's own state and on its sibling's state — creating a new sibling from the template when the existing file is `DIVERGENT` lands an out-of-sync pair at install time, which makes future cross-sync operations messy. That's the scenario this step's STOP paths exist to prevent.

**Dogfood-mode short-circuit:** if the user set a dogfood output override in Step 2, skip this step entirely for the relevant target(s) and proceed to Step 5. The override exists precisely to avoid touching the existing canonical file.

Otherwise, for each target file in the install set:

- **If MISSING, and the sibling is also MISSING or `TEMPLATE_ALIGNED*`**:
  - Proceed to Step 5: write the new file from the template. This is the happy path.

- **If MISSING, and the sibling is `DIVERGENT`**: **STOP.** Creating the missing file from the template now would mean the two files are not in sync at install time. The first cross-sync operation later would be a messy merge. Surface to the user:

  ```
  STOP — divergence detected before filling the gap

  Target: AGENTS.md (MISSING — you asked to create it)
  Existing sibling: CLAUDE.md (DIVERGENT from template)

  Why this STOP matters: the whole point of the claude-agents-md-init
  skill is to produce two sibling files that are identical except for a
  few framework-specific mentions, so a future agent asked to "update
  one, sync the other" can do so mechanically. If I stand up AGENTS.md
  from the template while CLAUDE.md has its own structure, the two
  files are out of sync at minute zero — the first sync operation
  faces a large structural diff, not a small edit.

  Options:
    (a) Align the existing CLAUDE.md to the template first. Exit this
        skill, run the template against the existing file with a merge
        tool (or rewrite CLAUDE.md to match the template shape), then
        re-run claude-agents-md-init. After that, the sibling AGENTS.md
        will land aligned.
    (b) Create AGENTS.md as a literal copy of the existing CLAUDE.md
        (ignore the template for this install). The pair starts
        identical; future template improvements require manual
        propagation. Sibling-sync block will still be injected into
        both.
    (c) Create AGENTS.md from the template anyway, accepting the
        divergence. The two files are out of sync at minute zero.
        Document the known divergence so the first sync operation
        doesn't produce surprises.
    (d) Abort. I'll make the decision elsewhere.

  Default recommendation: (a) if you can spare a few minutes to align
  the existing file; (b) if CLAUDE.md is load-bearing and preserving
  its exact content is the priority; (c) only if you have a specific
  reason to want the template content in the new file despite the
  known divergence.
  ```

  Wait for user decision. Per option:
  - (a): abort this run. Surface the recommendation to re-run after alignment.
  - (b): copy existing sibling content to the missing file, substitute only the per-target `[FILE_TITLE]`, `[AGENT_INTRO]`, `[SIBLING_FILE]` tokens where they appear (the existing file may have them hardcoded; if so, leave them). Inject the sibling-sync block into both files if missing.
  - (c): proceed to Step 5 normally. Add a callout to the final report explaining the known divergence and suggesting future agents read the existing file's content before editing either.
  - (d): abort silently.

- **If MISSING, and the sibling is `FOUND_ELSEWHERE`**: surface to user. Ask whether they want the new file at root to mirror the subdirectory copy (option b above), or create from template (option c).

- **If `TEMPLATE_ALIGNED_WITH_SYNC`**:
  - Leave as-is unless the user explicitly requests `--merge-template` to pull in new universal sections from the template since last install. Default: skip this target.
  - **Exception — security section.** If this file is also `MISSING_SECURITY_SECTION` (Step 1 found no `## External-resource safety`), offer the additive security-section migration below even without `--merge-template`. It's a security baseline (like "No secrets in CLI flags"), so surface it proactively; other new universal sections still wait for `--merge-template`.

- **If `TEMPLATE_ALIGNED_NO_SYNC`**:
  - The file is template-aligned but missing the sibling-sync block (e.g., authored under an earlier skill version or by hand). Inject the sibling-sync block at the top — specifically, insert it between the intro line and the `## Terminology` section. Report the injection. No other changes. This is a safe, minimal, additive edit.

- **If `MISSING_SECURITY_SECTION` (any `TEMPLATE_ALIGNED*` file lacking `## External-resource safety`)**:
  - Offer the **additive, non-destructive security-section migration** (mechanics in Step 5.7): propose inserting the verbatim `## External-resource safety` section plus its two pointers, previewed and confirmed — never silently applied. Our text lands verbatim; the user's own prose is never overwritten; only placement flexes. Because this is a security baseline, surface it proactively (see the `WITH_SYNC` exception above) rather than waiting for `--merge-template`. If the user declines, skip — do not nag on later runs beyond a single offer.

- **If `DIVERGENT`**:
  - The file exists at root but doesn't follow the template's shape. Surface to user. Options:
    - (a) Leave existing untouched; skip install for this target
    - (b) Create a backup at `<FILENAME>.backup-<timestamp>` and replace with template (destructive — preserves content in backup only)
    - (c) Merge: append any universal sections from the template that aren't already present (conservative — never overwrites existing sections with identical headings)
    - (d) Abort this run for manual resolution
    - (e) Dogfood: write template to `<FILENAME-TMP>.md` for diff inspection
  - Never silently overwrite. If the user picks (c), present a diff summary before writing.
  - **If the sibling is being filled from the template in the same run, the divergence-at-gap STOP from earlier also applies. Honor the stronger STOP (the gap case) if both trigger.**

- **If FOUND_ELSEWHERE**:
  - Surface to user. The new install goes at root regardless; the subdirectory file may still apply to its scope. Ask if the user wants to move it, leave it, or copy its content into the new root file.

### Step 5 — Write from template

For each target being written:

1. **Read** the bundled template from `references/claude-agents-md-template.md`.

2. **Substitute universal placeholders** (same values for all targets):
   - `[PROJECT NAME]` → project name (from Step 2)
   - `[USER NAME]` → user name (from Step 2)
   - `[PRIMARY BRANCH]` → primary branch (from Step 2; default `main`)
   - `[BRIEF PROJECT DESCRIPTION]` → description (from Step 2; if not provided, leave as the literal token so the agent filling in the doc sees it)

3. **Substitute target-specific placeholders:**

   For `CLAUDE.md`:
   - `[FILE_TITLE]` → `CLAUDE.md`
   - `[AGENT_INTRO]` → `This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.`
   - `[SIBLING_FILE]` → `AGENTS.md`

   For `AGENTS.md`:
   - `[FILE_TITLE]` → `AGENTS.md`
   - `[AGENT_INTRO]` → `This file provides guidance to AI coding agents (Codex, Cursor, Cline, Aider, and other AGENTS.md-aware frameworks) when working with code in this repository.`
   - `[SIBLING_FILE]` → `CLAUDE.md`

3a. **Handle the router-table variant blocks** — keep one, delete the rest, based on which workflow-skills plugin is available:

   The template's Skills & Subagents table wraps its brainstorming/planning rows in three HTML-comment-delimited blocks: `<!-- ROUTER: superpowers-plus -->`, `<!-- ROUTER: superpowers-base -->`, and `<!-- ROUTER: none -->` (each closed by its `<!-- /ROUTER: ... -->` marker). Every other row in that table is unconditional and sits outside the blocks — leave those alone.

   - **Detection.** Determine which of these is true in your environment, in order: (a) skills from the `superpowers-plus` plugin are available to you (e.g. a `writing-plans-enhanced` skill appears in your available-skills listing, or the plugin's directory exists in your platform's plugin cache) → keep the superpowers-plus block; (b) otherwise, skills from the `superpowers` plugin are available → keep the superpowers-base block; (c) otherwise → keep the none block (the rows are omitted). If you cannot determine availability, ask the user which applies — do not guess.
   - **Keep exactly ONE block:** delete the two blocks that do not apply — their marker lines and every row between them — and delete the surviving block's own two marker lines as well, leaving only its rows in the table. The `none` block is intentionally empty, so keeping it emits no rows at all.
   - **No `ROUTER:` marker may survive into the written file.** After the edit, grep the pending content for `ROUTER:` — expect zero hits — and confirm the table has exactly one header separator and no blank line between rows.
   - Apply the identical result to **both** targets: `CLAUDE.md` and `AGENTS.md` get the same block kept, so the pair stays in sync by construction (this is not a per-target substitution like `[SIBLING_FILE]`).
   - **Gap-fill runs, where you write only one sibling and the other already exists** (the `--target` smart default of Step 1): you cannot make the pair match by construction, because the existing file is not yours to silently edit. Any file written before v2.8 carries the base rows. So: after writing, compare the existing sibling's router rows against the block you kept. If they differ, say so in Step 7's report, show the two rows you wrote and the two the sibling carries, and offer to hand-port — apply that only on the user's say-so. Do not silently emit a divergent pair, and do not edit the existing sibling without asking.

4. **Preserve all `<!-- TODO: ... -->` / `<!-- PLACEHOLDER: ... -->` blocks untouched** — they are load-bearing for the agent that later customizes the doc. The `ROUTER:` markers are NOT such blocks: sub-step 3a deletes them.

5. **Write** to the output filename from Step 2. In non-dogfood mode, back up any existing file this run will rewrite or edit in place — replacement, merge, `--merge-template`, or either injection below — at `<FILENAME>.backup-<timestamp>` before the first write touches it. The backup is both the undo path and the *input* to sub-step 8's content-preservation gate, so it is required on every path that touches existing content, not only the destructive one. In dogfood mode, skip the backup — the override guarantees the existing file is untouched.

5a. **Write the shared policy file (three-artifact atomicity).** Whenever you write (or migrate in) any `CLAUDE.md`/`AGENTS.md` that contains the `## External-resource safety` section, also write `docs/security/external-resource-safety.md` — verbatim from `references/external-resource-safety.md`, no substitution, creating the `docs/security/` directory if needed. This is the target of the section's pointer. Rules: (a) it is written **once** per project regardless of `--target` (both siblings share it); (b) never emit a CLAUDE.md/AGENTS.md carrying the section's pointer on a fresh write without also landing this file — the section + its policy file land together; (c) if `docs/security/external-resource-safety.md` already exists with **different** content (a user-customized policy), do NOT overwrite it — report the divergence and leave it (the pointer still resolves); (d) in dogfood mode, write it next to the dogfood outputs or skip if the canonical file already exists, consistent with the dogfood short-circuit. The section's own fail-safe ("if that file is missing, apply the gates anyway and flag it") means a later deletion degrades gracefully rather than breaking the gate.

6. **Sync-block injection for existing `TEMPLATE_ALIGNED_NO_SYNC` files** (independent of whether we wrote anything else this run). If Step 4's alignment check found an existing CLAUDE.md or AGENTS.md that is template-aligned but missing the sibling-sync block, inject the block now. The block goes between the intro line (the first line after `# <TITLE>`) and the `## Terminology` section, matching the template's placement. Apply the per-target `[SIBLING_FILE]` substitution as you would when writing from template. Report this as a separate line in Step 7's summary ("injected sibling-sync block into existing CLAUDE.md").

7. **Security-section injection for `MISSING_SECURITY_SECTION` files** (additive migration, v2.4). For any `TEMPLATE_ALIGNED*` file that lacks `## External-resource safety`, propose an additive, non-destructive merge — previewed and confirmed, never silently applied. Our text lands verbatim; the user's prose is never overwritten; only placement flexes.
   - **Insert the section verbatim** from the template, with placement leeway: prefer immediately after `## Foundational rules` / before `## Our relationship`. If those exact anchors are missing or the file's structure has drifted, choose the nearest sensible section boundary in the same neighborhood rather than refusing — the text goes in verbatim; only *where* it lands adapts. Never split it mid-section or mid-sentence.
   - **Append the two pointers; don't overwrite.** Add the "Trust, then verify" precedence note and the `## Proactiveness` exception as new adjacent bullets/sentences near their targets. If the existing "Trust, then verify" bullet is still byte-for-byte the pre-v2.4 template text, you MAY upgrade it in place to the current wording (that's replacing the template's own old text). If it has been customized at all, leave it untouched and append a short pointer bullet instead. Either way the reader ends up routed to `## External-resource safety`.
   - **Both or neither, previewed, backed up.** When both `CLAUDE.md` and `AGENTS.md` exist, require normalized sibling equality first; show both proposed diffs; back up both (`<FILENAME>.backup-<timestamp>`); obtain Step-3-style confirmation; then apply to **both or neither**.
   - **Idempotent.** Afterward the section appears exactly once per file and sibling equality holds; a re-run produces no diff.
   - **Create the policy file too.** In the same confirmed step, also create `docs/security/external-resource-safety.md` (verbatim from `references/external-resource-safety.md`) if it does not already exist, so the injected pointer resolves — this is part of the both-or-neither set. If it exists with different content, leave it and report the divergence.
   - **Last resort only.** Surface manual instructions + `--merge-template` only if the file is so divergent that no sensible placement exists.
   Report each injection as a separate line in Step 7's summary ("injected External-resource safety section into existing CLAUDE.md").

8. **Content-preservation gate — run before Step 7, never skip.** Every other check in this skill validates the *shape* of what was written (no `ROUTER:` markers, no unresolved tokens, sibling equality, marker recount). None of them compares the output against the input, so none of them can catch a merge or regeneration that silently drops a project-specific rule — the most expensive failure available here, because these files are rulesets and a dropped line is a deleted rule.

   Applies to every file this run **rewrote or edited in place** (Step 4 DIVERGENT merge (c), a `--merge-template` regeneration, sync-block injection at sub-step 6, security-section injection at sub-step 7) and to a file **created as a copy of an existing sibling** (option (b) of Step 4's divergence STOP), where the reference is the sibling the content came from rather than a backup. **Does not apply to a clean create** — nothing existed, so nothing can be lost.

   - **The reference copy is the backup.** Once the file is overwritten, the backup from sub-step 5 is the only copy of the input. Do not delete, move, or overwrite a backup until this gate has run and its result is in the Step 7 report. This skill never deletes backups on its own — leave them for the user.
   - **What to compute:** the set of non-blank lines present in the reference copy and absent from the written file. Whole-line and order-insensitive — content that moved between sections is not a loss. One illustration, for an agent with a POSIX shell:

     ```sh
     grep -vE '^[[:space:]]*$' NEW > new.nonblank.tmp
     grep -Fxv -f new.nonblank.tmp OLD | grep -vE '^[[:space:]]*$'
     ```

     Delete the temp file afterwards — it is scratch, not an artifact of the install.

     Both `-F` (fixed strings, so markdown punctuation isn't read as a regex) and `-x` (whole line) are load-bearing, and the blank lines must come out of the pattern file: drop `-x` while a blank pattern is present and the empty pattern matches every line, so the check reports nothing and reads as a clean pass. Any equivalent set difference is fine (`comm -23` over two `sort -u` copies, PowerShell `Compare-Object`, or a read-and-compare in your own head for a short file) — the semantics above are the requirement, the command is only an example.
   - **Classify every hit. Silence is not the pass condition; an explicit classification is.** The check is noisy by design — a reworded template rule reads as "dropped" alongside a genuine loss. Put each line in exactly one bucket:
     - **Intentional replacement** — old *template* text superseded by the current template's wording, or content the user explicitly agreed to drop. Keep it out; carry it to the report.
     - **Accidental drop** — anything project-specific: a pitfall entry, a build or tooling note, an `<!-- ... -->` comment the project's authors wrote, a path, a rule with no counterpart in the new file. **Restore it before reporting.**

     Do not skim the list and move on. A line you cannot confidently place is an accidental drop — restore it.
   - **Report both outcomes** in Step 7: the accidental drops you restored, and the intentional replacements as **behavior deltas**. A rule whose wording changed is a rule whose meaning may have changed, and the user is the one who knows whether that matters.
   - **One exception — the declared destructive replace** (option (b) of Step 4's `DIVERGENT` case: back up and replace with the template, "preserves content in backup only"). Wholesale loss is the user's stated choice there, so run the gate but report only the count of non-blank lines that did not carry over, plus the backup path. A line-by-line classification of a file the user chose to discard is noise.

### Step 6 — Post-install pointers

Check for companion skills and surface actionable follow-ups:

1. **If `docs/git-strategy.md` does NOT exist:** the template's "Keeping a clean git graph" section references it. Suggest running `git-strategy-init`.

2. **If `docs/pitfalls/implementation-pitfalls.md` does NOT exist:** the template's "Language/Framework Gotchas" section references it. Suggest running `pitfalls-docs-init`.

3. **If both CLAUDE.md AND AGENTS.md were written:** remind the user that the Sibling-sync reminder at the top of each file is the durable mechanism for keeping them aligned — future edits should hit both.

### Step 7 — Report

Summarize per target:

```
Done.

Created:
  ./CLAUDE.md                             (from template; substituted project name, user name, primary branch)
  ./AGENTS.md                             (from same template; target-specific intro + sibling reminder)
  ./docs/security/external-resource-safety.md  (shared policy file targeted by the External-resource safety section; verbatim, one per project)

Backups (inputs to the content-preservation check — delete only once
you're satisfied with the result below):
  none — neither CLAUDE.md nor AGENTS.md existed before this run

Content preservation (pre-change lines vs. written file):
  not applicable — clean create, no prior content to lose

  (On any run that rewrote or edited an existing file, this block instead
   lists: lines restored after the check found them dropped, and the
   intentional template-text replacements, called out as behavior deltas
   to review. An empty check is a result to state, not a reason to omit
   the block.)

PLACEHOLDER sections to customize in BOTH files (find them via
`grep '<!-- TODO' CLAUDE.md AGENTS.md`):
  - ## Project Overview
  - ## Build & Dev Commands
  - ## Tech Stack
  - ## Architecture (Key Points)
  - ## Conventions
  - ## Language / Framework Gotchas (project-specific subsection)
  - ## Development Workflow (project-specific rules)
  - ## Project Layout
  - ## Skills & Subagents → "Project-specific skills" subsection
  - ## Skill routing → key routing rules list

Workflow-skills router rows:
  kept the superpowers-plus block (wrapper rows); other rows unconditional

Sibling-sync discipline:
  Both files carry a reminder at the top. When you edit one, also update
  the other. They should stay identical except for the intro line and
  the sibling reference.

Companion skills to consider:
  - git-strategy-init:    docs/git-strategy.md is referenced but not present — install it
  - pitfalls-docs-init:   docs/pitfalls/*.md are referenced but not present — install them
```

## Common mistakes

- **Installing at a non-root path.** CLAUDE.md / AGENTS.md are always at the project root. Subdirectory copies exist in monorepos but aren't managed by this skill.
- **Overwriting an existing file without a backup.** Always back up. Existing agent-guidance files accumulate load-bearing project-specific content; losing it is expensive. Making the backup is necessary but not sufficient — sub-step 8 *reads* it, so a backup nobody compares against is just an undo the user has to discover they need.
- **Passing every shape check and calling the merge verified.** Zero `ROUTER:` hits, zero unresolved tokens, intact TODO blocks, normalized sibling equality, 6/6 alignment markers — all of that describes the file you wrote, and none of it describes the file you replaced. A regeneration that dropped three project-specific lines passes all five. Sub-step 8's content-preservation gate is the only check pointed at the input: run it on every path that rewrites an existing file, classify each hit as intentional replacement or accidental drop instead of eyeballing the list, and keep the backup until you have.
- **Treating `--target=claude` and `--target=agents` as mutually exclusive by default.** They're not — the happy path is `--target=both`. Projects that use only one framework can narrow, but "both" is the default when neither file exists.
- **Letting the two files diverge silently.** The Sibling-sync reminder at the top of each output exists for a reason. If a user edits one file, surface the sibling and ask if the same edit should apply there.
- **Skipping the alignment check on existing files.** If the existing CLAUDE.md is `DIVERGENT` (doesn't follow the template shape), writing AGENTS.md from the template anyway creates an out-of-sync pair at minute zero. The alignment check + STOP (Step 4 "MISSING, sibling DIVERGENT") is what prevents that. Don't hand-wave past it.
- **Not injecting the sibling-sync block into existing `TEMPLATE_ALIGNED_NO_SYNC` files.** Projects that installed an earlier version of this skill (or hand-authored a template-aligned CLAUDE.md before this skill existed) won't have the sync block. Step 5 step 6 injects it — don't skip, or the pair silently lacks the drift-prevention reminder.
- **Leaving `ROUTER:` markers in the written file, or keeping more than one block.** Step 5 sub-step 3a is keep-exactly-one-then-delete-all-markers: the two blocks that don't apply go entirely, and the surviving block's own marker lines go too. Leaving a marker behind ships an HTML comment that breaks the markdown table it sits inside; keeping two blocks ships duplicate brainstorming/planning rows pointing at different skills. Grep the pending content for `ROUTER:` before writing — zero hits.
- **Letting the two siblings get different router blocks.** The availability answer is a property of the environment, not of the target file. `CLAUDE.md` and `AGENTS.md` MUST keep the same block; a per-target difference here is exactly the drift the sibling-sync discipline exists to prevent.
- **Substituting inside code fences or within backticks.** The template uses substitution tokens in prose, not in code examples. Only substitute in prose contexts.
- **Using Claude-Code-specific tooling.** This skill is cross-platform. Do not invoke `TodoWrite`, `AskUserQuestion`, `Skill`, or any other tool that isn't shell/file-I/O primitives.
- **Silently editing an existing file during the security-section migration.** The v2.4 migration is additive and confirmed: insert the verbatim `## External-resource safety` section (placement may flex, text may not), append pointers rather than overwriting user-customized prose, back up + preview + confirm both siblings, and stay idempotent. Never overwrite a user's edited "Trust, then verify" bullet — append a pointer instead.
- **Emitting the section without its policy file, or substituting into the policy file.** The `## External-resource safety` section points at `docs/security/external-resource-safety.md`; write that file (verbatim from `references/external-resource-safety.md`, no token substitution — it is framework-neutral and shared by both siblings) whenever the section is present. It is one file per project, not one per target. If a customized policy file already exists, leave it — do not clobber.

## Quick reference

| Step | Action |
|---|---|
| 1 | Verify repo/project state; search for CLAUDE.md AND AGENTS.md at root; run **alignment check**, **sibling-sync block check**, and **security-section check** on each FOUND_AT_ROOT file; determine **workflow-skills plugin availability** (superpowers-plus / superpowers-base / none); compute smart default target |
| 2 | Collect substitution values + target (claude/agents/both) + optional dogfood override |
| 3 | Present state (including alignment classification) + proposed actions + substitutions + target + **which router block will be kept**; await user confirmation |
| 4 | Per target: handle existing-file case. **STOP and surface options if filling the gap (sibling MISSING) while the existing file is DIVERGENT.** For TEMPLATE_ALIGNED_WITH_SYNC: leave (but offer the security-section migration if MISSING_SECURITY_SECTION). For TEMPLATE_ALIGNED_NO_SYNC: inject sync block. For MISSING_SECURITY_SECTION: offer the additive security-section migration. For DIVERGENT: standard replace/merge/skip options. |
| 5 | Per target: write from template with universal substitutions + target-specific substitutions (`[FILE_TITLE]`, `[AGENT_INTRO]`, `[SIBLING_FILE]`). **Keep exactly one `ROUTER:` block in the Skills & Subagents table and delete the others plus all markers** (same block for both targets). Also write the shared `docs/security/external-resource-safety.md` policy file once per project (verbatim, no substitution) whenever the External-resource safety section is present. Inject sync block into any existing TEMPLATE_ALIGNED_NO_SYNC file; inject the External-resource safety section + create the policy file (additive, previewed, both-or-neither) for any MISSING_SECURITY_SECTION file found in Step 1. Back up every file about to be rewritten or edited in place, then — before reporting and before any backup is cleaned up — run the **content-preservation gate** against that backup for each such file: compute the non-blank lines present before and absent after, classify each as intentional replacement or accidental drop, restore the drops. |
| 6 | Check for companion-skill prerequisites (git-strategy.md, pitfalls docs); suggest follow-ups; remind about Sibling-sync discipline |
| 7 | Report created files, sync-block injections, retained backup paths, the **content-preservation result** (lines restored + intentional replacements as behavior deltas), placeholders to customize, any divergence callouts, and follow-up skills |

## Relationship to other skills

- **`git-strategy-init`**: separate, composable. The agent-md template's "Keeping a clean git graph" section references `docs/git-strategy.md`. Running `git-strategy-init` before or after makes that reference resolve.
- **`pitfalls-docs-init`**: separate, composable. The agent-md template's "Language/Framework Gotchas" and "Development Workflow" sections reference the pitfalls docs. Running `pitfalls-docs-init` before or after makes those references resolve.
- **`project-init` wrapper** (in the same plugin): sequences `claude-agents-md-init` → `git-strategy-init` → `pitfalls-docs-init` in one bootstrap command. This skill runs first so later skills have well-formed CLAUDE.md / AGENTS.md files to append their references into.
- **`superpowers:*` workflow skills**: the template's Skills & Subagents table pre-populates a curated set of workflow skills (brainstorming, writing-plans, TDD, debugging, etc.) treated as standard across Claude Code and Codex/Cursor workflows. Adjust after install if your project doesn't use superpowers.

## Cross-platform notes

Pure instruction, no bundled scripts. Any agent framework with shell access and file read/write can execute it.

- **Git subcommands** used (branch detection) are portable; skill works even on non-git projects.
- **Token substitution** is a flat find-and-replace on the template. Case-sensitive tokens. Replace universal tokens first, then target-specific tokens.
- **No dependency on Claude Code-specific features.** Codex, Cursor, and other agent frameworks that can read markdown skills and execute shell commands can run it equivalently.

## Design decisions

See [README.md](README.md) § "Design decisions" for the rationale behind:

- Why one skill generates two files rather than two parallel skills.
- Why the template is tuned for modern Claude models (RFC 2119, scoped STOP rules, autonomous-mode valve, bias-to-action, scoped task-tracking).
- What's in the "universal" ruleset vs. what's placeholder.
- The Sibling-sync reminder as a drift-detection mechanism.
- The superpowers skills table pre-population choice.
