---
name: pitfalls-docs-init
description: Use when the user asks to set up, initialize, adopt, or bootstrap implementation and testing pitfalls documentation.
metadata:
  version: "1.3"
---

# pitfalls-docs-init

Initializes project-specific `implementation-pitfalls.md` and `testing-pitfalls.md` from bundled templates. The templates carry the maintenance framework (how to add a pitfall, completeness checklist, voice and style guide) and pre-populate universal cross-cutting entries — the §Orchestration pitfall that points back to git-strategy, and universal testing disciplines (test output pristine, skipped ≠ passing, error path coverage, negative property testing, concurrency, boundary validation, test infrastructure hygiene).

**This file is for agents invoking the skill.** Humans should read [README.md](README.md) for the overview.

## When to use

Invoke when the user asks to:

- "set up pitfalls docs", "initialize pitfalls files", "add implementation-pitfalls.md and testing-pitfalls.md"
- "bootstrap the pitfalls discipline"
- set up a new project that will use the plan-writing flow where pitfalls are mandated reading

Do NOT use for:

- Editing existing pitfalls entries — that's a normal edit workflow, not an init.
- Projects that have both files and don't want the universal cross-cutting content re-added — this skill is additive and may prompt to merge, but the target audience is fresh projects.

## Inputs

- The bundled templates at `references/implementation-pitfalls-template.md` and `references/testing-pitfalls-template.md` (relative to this skill's root). Do NOT read templates from any other location.
- The shared transaction and result protocol at `../../references/strategy-initializer-protocol.md`. Read it completely before discovery. Its proposal binding, lock, receipt, restoration, and child-result rules govern every write and terminal path in this skill.
- The current working directory must be the root of a git repository (or at least a project directory the user wants to install into).

## Shared transaction and child result contract

Keep this skill's exact-basename discovery, install-path selection, merge, preservation, root-guidance, and human-report behavior. Apply these shared rules around it:

1. The considered domain target set includes both pitfalls documents and both root-guidance files. The proposed/result write set includes only confirmed mutations: changed pitfalls or root-guidance files, both sides of a confirmed move, directories the invocation creates, and durable backups for files actually changed. An untouched or skipped companion is not a write-set or attempted path. A user-visible backup is a planned durable output, not the protocol's ephemeral protected original.
2. Resolve output-affecting choices first. Then materialize exact candidate bytes and topology, run content preservation, validate the complete output set, and bind the proposal before final confirmation. A changed answer, input, path, backup name, topology, or output requires a new preview and confirmation.
3. After confirmation, acquire `PROJECT_SETUP_APPLY_LOCK_V1`, revalidate the complete `project-setup/pitfalls-docs-init` input scope, and apply only the confirmed bytes. Verify or restore every attempted path with canonical receipts.
4. A failed application restores every attempted target, including an invocation-created backup or directory whose prior state was absent. Use `FAILED_RESTORED` only when all before receipts verify. Any retained or uncertain backup/recovery material forces `FAILED_PARTIAL` and appears in `recoveryPaths` when known.
5. Restoring an accidentally dropped line in candidate bytes before confirmation is content-preservation repair, not transaction rollback. It does not populate `restoredPaths` or justify `FAILED_RESTORED`.
6. A whole proposal declined by the user is `USER_SKIPPED`. Skipping one absent or optional target does not override verified writes elsewhere in the child. A semantically valid requested state with no semantic, byte, or topology change is `CURRENT_NO_OP`; unresolved path, authority, or merge choices are `BLOCKED_NO_CHANGE` with the appropriate shared reason.
7. Every terminal path keeps the useful human report and ends with exactly one `PROJECT_SETUP_CHILD_RESULT_V1` block using child ID `project-setup/pitfalls-docs-init`, the protocol's exact key order and outcome rules, and no prose afterward.

## Workflow

### Step 1 — Pre-flight

1. **Verify current working directory.** If it's a git repo (`git rev-parse --is-inside-work-tree`), note that — the install path conventions will use it. If not a git repo, that's OK for this skill (pitfalls docs don't require git) — just warn the user and proceed if they confirm.

2. **Search for existing pitfalls files anywhere in the repo/project.** Match exact basenames (case-insensitive): `implementation-pitfalls.md` and `testing-pitfalls.md`. Do NOT match filenames that merely contain those strings as substrings (e.g. `implementation-pitfalls-template.md`, `testing-pitfalls-example.md`). Those are templates / reference copies, not deployed docs.
   - Tracked (if git): `git ls-files`, filtered to exact basenames
   - Untracked: `git ls-files --others --exclude-standard` with the same filter (or a direct filesystem search in non-git projects)

3. **Classify the state of each doc:**
   - `implementation-pitfalls.md`:
     - `FOUND` — file exists somewhere
     - `DIR_ONLY` — a `docs/pitfalls/` or `dev/pitfalls/` directory exists but the file doesn't
     - `MISSING` — neither file nor a natural parent directory exists
   - `testing-pitfalls.md`:
     - Same three classifications

4. **Check for existing references in CLAUDE.md / AGENTS.md** if those files exist at repo root. Note existing pitfalls paths those files reference — if they point to different locations than where we'll install, surface that conflict before writing.

### Step 2 — Auto-detect install path

Preferred install path (in order):

1. If a `docs/pitfalls/` directory already exists → install there.
2. If a `dev/pitfalls/` directory already exists → install there.
3. If `docs/` exists but no `pitfalls/` subdirectory → create `docs/pitfalls/` and install there.
4. If `dev/` exists but no `pitfalls/` subdirectory → create `dev/pitfalls/` and install there.
5. Otherwise → ask the user: (a) `docs/pitfalls/` (create docs/), (b) `dev/pitfalls/` (create dev/), (c) custom directory (user provides path), (d) root-adjacent (`./pitfalls/`).

### Step 3 — Resolve choices, materialize, present, confirm

Questions about install paths, moves, skips, and merges are decision prompts, not approval to write. Resolve them first using Step 4. Then use Steps 5–6.5 to materialize every exact file, backup, move, and directory change without applying it; repair accidental drops in candidate bytes; validate the complete output set; and bind the proposal under the shared protocol.

Present one consolidated final block with detected state, exact proposed actions, and the bound byte/topology preview. Ask the user to confirm or adjust. Example:

```
Pre-flight:
  Existing implementation-pitfalls.md:  NOT FOUND
  Existing testing-pitfalls.md:         NOT FOUND

Install path:   docs/pitfalls/  (docs/ exists; pitfalls/ will be created)

Planned actions:
  1. Create docs/pitfalls/implementation-pitfalls.md from template
     - Includes: maintenance framework, how-to-add, completeness checklist
     - Includes: §Orchestration (ORCH-1 trigger-and-pointer to git-strategy.md)
     - Includes: TODO placeholders for project-specific domain sections
  2. Create docs/pitfalls/testing-pitfalls.md from template
     - Includes: 7 universal testing disciplines pre-populated
     - Includes: TODO placeholder for project-specific topic sections
  3. Update CLAUDE.md (found): add references to both files under §Conventions or equivalent
  4. AGENTS.md: not found — skipped

Bound proposal: <lowercase SHA-256 from the shared protocol>
Outputs:        <every file, durable backup, move endpoint, and created directory>
Preview:        <exact byte/topology changes; sensitive spans redacted>

Confirm, or tell me what to change.
```

Wait for final user confirmation before applying. Any adjustment or changed input, path, topology, candidate byte, or backup name invalidates the proposal and restarts materialization. After confirmation, apply only the bound bytes and topology; do not rerender or repair them.

### Step 4 — Handle each doc's state

For each doc (`implementation-pitfalls.md` and `testing-pitfalls.md`):

- **If FOUND** at a location different from the install path:
  - Surface to user. Options: (a) leave existing, skip install at new path; (b) move existing to install path and apply template-derived universal content as additions; (c) abort the whole skill run for manual resolution.
  - Never silently overwrite or create a second copy.

- **If FOUND** at the install path:
  - Compare existing content to template. If the existing file has substantive prose (non-trivial pitfall entries, maintenance sections), surface to user: "This file exists and has real content. Options: (a) leave untouched, (b) merge the universal cross-cutting content (§Orchestration, universal testing disciplines) into the existing file where not already present, (c) abort."
  - Option (b) is the common helpful case: the file exists but was written before this skill's templates, and the user wants the universal content added without clobbering project-specific entries.

Option (b) in either case above **rewrites a file that already holds project content**—the most expensive operation this skill performs. Include a durable backup in the proposal and run Step 6.5 against the bound input and candidate before final confirmation. "Where not already present" and "as additions" describe intent; the gate establishes that the candidate preserves project content.

Resolve every selected option before the final Step 3 confirmation. Declining the whole materialized proposal returns `USER_SKIPPED`. Leaving one document untouched is only a per-target disposition; if another confirmed target changes, the child outcome reflects that verified transaction rather than the word `Skipped:` in the human report.

- **If DIR_ONLY or MISSING**:
  - Proceed to Step 5 (write from template).

### Step 5 — Materialize the document candidates

For each doc that the user confirmed to install:

1. **Materialize durable backups for every existing file the proposal touches.** Include the exact bound before bytes at `<FILENAME>.backup-<timestamp>` as a planned output for a merge, move-then-merge, or root-guidance edit. The durable backup is user-visible undo/evidence; preservation compares the bound input directly with the candidate. A clean create needs no backup. After verified success leave durable backups for the user; after transaction failure restore an invocation-created backup to its prior state, normally `ABSENT`.

2. **Read** the bundled template from `references/implementation-pitfalls-template.md` or `references/testing-pitfalls-template.md`.

3. **Substitute placeholders:**
   - `[PROJECT NAME]` → the project's name (ask user if not obvious from repo name)
   - `YYYY-MM-DD` in the validation-date line → today's date
   - Other TODO placeholders are left as-is — agents editing the doc later will fill them in

4. **Add** the exact candidate bytes to the bound proposal at the install path. If parent directories are missing, include each in the proposal and write-set receipts by binding the nearest existing ancestor and every absent segment under the shared protocol. Do not create or write anything before final confirmation.

### Step 6 — Update CLAUDE.md and AGENTS.md

Materialize these additive candidate edits before final confirmation; do not mutate root guidance yet.

For each of `CLAUDE.md` and `AGENTS.md` that exists at repo root:

1. **Read** the bound file. First determine whether an exact correct reference already exists. Only if a materialized edit is required, include the changed candidate and its durable backup per Step 5 sub-step 1. These are project agent-guidance rulesets, and this step reconstructs candidate bytes rather than appending directly to disk.

2. **Decide placement** — look for an existing section whose heading contains (case-insensitive substring match) any of the following, in priority order. The first match wins:
   - `Documentation` / `Docs` / `References`
   - `Conventions` / `Development Workflow` / `Workflow`
   - `Version Control` / `Git`
   - `Development`

3. **If a matching section is found:** append reference lines under it:
   ```markdown
   - **`docs/pitfalls/implementation-pitfalls.md`** — known implementation traps, review checklists, and the maintenance framework. READ BEFORE CODING.
   - **`docs/pitfalls/testing-pitfalls.md`** — test scenario checklist. READ BEFORE WRITING TESTS.
   ```
   (Adjust the path to match the install path chosen in Step 2.)

4. **If no matching section is found:** add a new top-level section:
   ```markdown
   ## Pitfalls

   - **`docs/pitfalls/implementation-pitfalls.md`** — known implementation traps, review checklists, and the maintenance framework. READ BEFORE CODING.
   - **`docs/pitfalls/testing-pitfalls.md`** — test scenario checklist. READ BEFORE WRITING TESTS.
   ```

5. **Do not** overwrite existing references if they're already present. Check for the exact paths (`implementation-pitfalls.md`, `testing-pitfalls.md`) in the file before appending; if found, verify they point at the install path and skip the append if so.

### Step 6.5 — Pre-confirmation content-preservation gate

**Run on candidate bytes before final Step 3 confirmation; never skip.** Every other check confirms that intended content is present in the candidate. None checks whether content from the bound input survived. A merge that regenerates rather than adds, or an edit around a section boundary, can silently drop project-specific entries. These files are accumulated project knowledge; a dropped pitfall entry is a deleted rule.

Applies to every file this run proposes to **rewrite or edit in place**: a Step 4 option (b) merge, a move-then-merge, and each root-guidance candidate from Step 6. **Does not apply to a clean create**—nothing existed, so nothing can be lost.

- **Use the bound input bytes as the reference.** The planned durable backup contains those same bytes but is not needed for the comparison.
- **Line-presence diagnostic:** compute the set of non-blank lines present in the bound input and absent from the candidate. This is a useful first falsifier, not proof of semantic preservation; moved Markdown can change meaning. One illustration, for an agent with a POSIX shell:

  ```sh
  grep -vE '^[[:space:]]*$' CANDIDATE > candidate.nonblank.tmp
  grep -Fxv -f candidate.nonblank.tmp BOUND_INPUT | grep -vE '^[[:space:]]*$'
  ```

  Delete the temp file afterwards — it is scratch, not an artifact of the install.

  Both `-F` (fixed strings, so markdown punctuation isn't read as a regex) and `-x` (whole line) are load-bearing, and the blank lines must come out of the pattern file: drop `-x` while a blank pattern is present and the empty pattern matches every line, so the check reports nothing and reads as a clean pass. Any equivalent set difference is fine (`comm -23` over two `sort -u` copies, PowerShell `Compare-Object`, or reading a short file yourself) — the semantics above are the requirement, the command is only an example.
- **Preserve project-owned Markdown structurally.** Outside exact template-owned spans that the user confirmed replacing, copy project-owned bytes unchanged, in their original order, under the same heading ancestry and list/code-fence context. Validate heading order, list containment, and balanced fences after merge. A moved heading, checklist item, paragraph, or fence delimiter is not preserved merely because its text remains present. If ownership or context cannot be established, stop for explicit repair/placement confirmation.
- **CLAUDE.md / AGENTS.md edits are purely additive, so both structural preservation and the line-presence diagnostic must be empty.** Any changed project-owned span is a bug in the candidate, not a judgment call—restore it before preview and confirmation.
- **Merges need every changed or absent span classified. Silence is not the pass condition; an explicit classification is.** A merge may supersede old template wording. Put each changed span in exactly one bucket:
  - **Intentional replacement** — an exact old *template-owned span* (maintenance framework, voice guide, or universal entry) superseded by current template wording, or content the user explicitly agreed to replace. Carry the behavior delta to the preview and report.
  - **Accidental loss or movement** — any project-specific pitfall entry/ID, checklist item, domain heading, code fence, comment, path, cross-reference, order, or section context not preserved exactly. **Restore its bytes and context in the candidate before preview and confirmation.**

  Do not skim the list and move on. A line you cannot confidently place is an accidental drop—restore it in the candidate. Never repair applied bytes under an already confirmed digest; a later problem requires verified restoration or a new proposal.
- **Report both outcomes** in Step 7: accidental drops repaired in the candidate and intentional replacements as **behavior deltas**, tied to the final verified receipt. A pitfall whose wording changed is a rule whose meaning may have changed.

### Step 7 — Report

Summarize with wording that matches the outcome. Use `Done.` only for `CHANGED` or `CURRENT_NO_OP`:

```
Outcome: [changed | current | skipped | blocked | failed and restored | failed with uncertain state]

Created:
  docs/pitfalls/implementation-pitfalls.md  (from template; TODO placeholders for your project's domains)
  docs/pitfalls/testing-pitfalls.md         (from template; 7 universal sections + TODO placeholder)

Updated:
  CLAUDE.md  — added references under §Conventions

Skipped:
  AGENTS.md  — not found

Durable backups (confirmed outputs retained after verified success):
  CLAUDE.md.backup-20260810T074500

Content preservation (bound input vs. confirmed candidate, then final receipt):
  CLAUDE.md  — no lines dropped (additive edit, empty result expected)

  (On a run that merged into an existing pitfalls doc, this block also
   lists: candidate lines repaired after the check found them dropped, and the
   intentional template-text replacements, called out as behavior deltas
   to review. An empty check is a result to state, not a reason to omit
   the block. Files created clean are reported as "not applicable".)
```

Suggest follow-ups:

- Fill in the TODO placeholders in both templates with project-specific content as pitfalls are discovered.
- If `git-strategy-init` has NOT been run yet in this project, consider running it next — the §Orchestration entry in `implementation-pitfalls.md` forward-references `docs/git-strategy.md` §Multi-agent coordination, and that reference will be dangling until `git-strategy-init` installs the target.

After the human report, emit the exact `PROJECT_SETUP_CHILD_RESULT_V1` block required by the shared protocol with child ID `project-setup/pitfalls-docs-init`. Include durable backups, move endpoints, and created directories in a successful write set because they are planned outputs. Do not confuse the report's `Skipped:` targets or content-preservation repairs with child outcome `USER_SKIPPED` or transaction `restoredPaths`. No prose follows the result block.

## Common mistakes

- **Matching template/example files in pre-flight search.** `grep -i implementation-pitfalls` matches `implementation-pitfalls-template.md`, `implementation-pitfalls-example.md`, `implementation-pitfalls-original.md`, etc. Filter by EXACT basename only.
- **Silently overwriting existing pitfalls files.** Always surface and ask. These files accumulate load-bearing project-specific content over time; clobbering destroys work. Asking is necessary but not sufficient — a merge the user approved can still drop entries it was supposed to keep, which is what Step 5 sub-step 1's backup and Step 6.5's gate exist to catch.
- **Treating "merge where not already present" as a guarantee rather than an intent.** Option (b) says the universal content is added without clobbering project-specific entries. Confirming the universal sections are present says nothing about whether the project's own entries survived. Run Step 6.5 against bound input and candidate bytes, classify every hit, and bind the repaired candidate before confirmation.
- **Skipping the CLAUDE.md / AGENTS.md update.** Without it, plan-writing skills won't find the pitfalls files via their mandated-read paths. The write alone doesn't make the docs discoverable.
- **Assuming the user wants the same path as the template's examples.** `docs/pitfalls/` vs `dev/pitfalls/` vs `pitfalls/` at root — projects vary. Detect then confirm, don't default.
- **Using Claude-Code-specific tooling.** This skill is cross-platform. Do not invoke `TodoWrite`, `AskUserQuestion`, `Skill`, or any other tool that isn't shell/file-I/O primitives.

## Quick reference

| Step | Action |
|---|---|
| 1 | Verify repo/project state; search for existing pitfalls files by EXACT basename |
| 2 | Auto-detect install path (docs/pitfalls > dev/pitfalls > create docs/pitfalls > ask) |
| 3 | Resolve choices; materialize, preserve, validate, and bind exact outputs; present the final byte/topology preview; await confirmation |
| 4 | Handle each doc's state: FOUND-at-other-path / FOUND-at-install-path / DIR_ONLY / MISSING |
| 5 | Materialize template/merge candidates, substitute project name + date, preserve TODO placeholders, and include durable backups plus missing directories in the proposal |
| 6 | Materialize additive root-guidance references under a matching section or new §Pitfalls section |
| 6.5 | Run the **content-preservation gate** against bound inputs and candidates; additive edits must be empty, while merges classify replacements and repair accidental drops before confirmation |
| 7 | Apply confirmed outputs under the shared lock; verify or restore receipts; report human details and one exact child result |

## Relationship to other skills

- **`git-strategy-init`**: separate, composable skill. The implementation-pitfalls template's §Orchestration entry forward-references `docs/git-strategy.md` §Multi-agent coordination. Running `git-strategy-init` first makes that reference resolve; running this skill first creates a temporarily dangling reference that resolves when `git-strategy-init` runs later. Either order is OK.
- **Plan-writing skills** (e.g. `superpowers:writing-plans`, `writing-plans-enhanced`): these typically mandate reading `implementation-pitfalls.md` and/or `testing-pitfalls.md` during plan authorship. This skill puts those files in place so the mandated-read discovery path works.
- **`project-init` wrapper**: runs this child after Git strategy and before Testing and Delivery. The wrapper consumes this child's structured result; domain discovery, rendering, and write safety remain here.

## Cross-platform notes

Pure instruction, no bundled scripts. Any agent framework with shell access and file read/write can execute it.

- **Git subcommands** used (file listing, optional) are portable. Skill works even on non-git projects.
- **File listing / existence checks** — use your agent's native file tools rather than shell `test -f`.
- **Basename filtering** must be case-insensitive to match `IMPLEMENTATION-PITFALLS.md` and other casings.

No dependency on Claude Code-specific features. Codex, Cursor, and other agent frameworks that can read markdown skills and execute shell commands can run it equivalently.
