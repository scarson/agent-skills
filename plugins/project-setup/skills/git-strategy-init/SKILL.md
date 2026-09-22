---
name: git-strategy-init
description: Use when the user asks to set up, initialize, adopt, or bootstrap a repository Git strategy, worktree workflow, or docs/git-strategy.md.
metadata:
  version: "1.6"
---

# git-strategy-init

Initializes a project-specific `git-strategy.md` from the bundled template, handles path/branch substitutions, and wires references into existing agent instruction files.

**This file is for agents invoking the skill.** Humans should read [README.md](README.md) for the overview and contribution notes.

## When to use

Invoke when the user asks to:

- "set up git strategy", "initialize git workflow", "init git-strategy"
- "adopt the worktree workflow", "add git-strategy.md to this project"
- set up an existing repo with the branch/worktree policy described in the template

Do NOT use for:

- Editing an existing, already-adapted `git-strategy.md` — that's a normal edit workflow, not an init.
- Projects that need dedicated `release/*` branch flows, hotfix-branch flows, or environment branches (`staging` / `production`). The template's scope is feature-work-onto-integration-branch plus an optional §Release branch section for the simple two-branch (integration + release) gitflow case; surface this limit before proceeding for anything more elaborate.

## Inputs

- The bundled template at `references/git-strategy-template.md` (relative to this skill's root). Do NOT read the template from any other location — the version bundled here is the authoritative one.
- The bundled **forge mappings** at `references/forge-mappings.md`. The template is written against GitHub + `gh`; this file carries the per-forge adaptations (GitLab, Azure DevOps, Azure DevOps Server, Bitbucket, unknown / self-hosted) that Step 8 applies. Read only the section for the detected forge.
- The shared transaction and result protocol at `../../references/strategy-initializer-protocol.md`. Read it completely before discovery. Its proposal binding, lock, receipt, restoration, and child-result rules govern every write and terminal path in this skill.
- The current working directory must be the root of a git repository.

## Shared transaction and child result contract

Keep this skill's branch, forge, worktree, template, root-guidance, and pitfalls behavior. Apply these shared rules around it:

1. The proposed write set includes the selected `git-strategy.md`, `.gitignore`, root guidance, the optional pitfalls cross-reference, every durable timestamped backup, and every missing parent directory the invocation must create. Durable backups are planned user-visible undo/evidence outputs, not the protocol's ephemeral protected originals.
2. Resolve output-affecting questions first. Then materialize the exact bytes and directory topology, run the content-preservation gate on candidate bytes, validate the complete output, and bind the proposal before final confirmation. A changed answer, input, target, backup name, topology, or output requires a new preview and confirmation.
3. After confirmation, acquire `PROJECT_SETUP_APPLY_LOCK_V1`, revalidate the complete `project-setup/git-strategy-init` input scope, and apply only the confirmed bytes. Verify or restore every attempted path with canonical receipts.
4. A failed application restores every attempted target, including invocation-created backups and directories whose prior state was absent. Use `FAILED_RESTORED` only when every before receipt verifies. Retained or uncertain material forces `FAILED_PARTIAL` and is named in `recoveryPaths` when known.
5. Content-preservation repair changes candidate bytes before confirmation. It is not transaction rollback and never populates `restoredPaths`. A preservation problem found after application requires verified restoration or a new proposal and confirmation.
6. A whole proposal declined by the user is `USER_SKIPPED`. A valid requested state with no semantic, byte, or topology change is `CURRENT_NO_OP`. Conflicting candidates or canonical links are `BLOCKED_NO_CHANGE` with `CONFLICT`; an unresolved adopt/repair/abort choice uses `UNCONFIRMED`.
7. Every terminal path keeps the useful human report and ends with exactly one `PROJECT_SETUP_CHILD_RESULT_V1` block using child ID `project-setup/git-strategy-init`, the protocol's exact key order and outcome rules, and no prose afterward.

## Workflow

### Step 1 — Pre-flight

Run from the repo root.

1. **Verify git repo.** `git rev-parse --is-inside-work-tree` — if exit nonzero, abort and tell the user this skill requires a git repo.

2. **Search for existing `git-strategy.md` anywhere in the repo.** Both tracked and untracked. Match the EXACT filename `git-strategy.md` (case-insensitive) — do NOT match filenames that merely contain `git-strategy` as a substring (e.g. `git-strategy-template.md`, `git-strategy-old.md`, `git-strategy.draft.md`). Those are template / draft artifacts, not deployed policy docs.
   - Tracked: `git ls-files` and keep only paths whose basename matches `git-strategy.md` case-insensitively.
   - Untracked (respecting .gitignore): `git ls-files --others --exclude-standard` and apply the same basename filter.
   - Reliable cross-platform pattern: list candidates, then in your own filter compare the basename against `git-strategy.md` / `GIT-STRATEGY.md` / etc. Shell `grep git-strategy` is too loose and will false-positive on templates.

3. **Classify the candidate set before deciding to create or overwrite.** Never silently create a second normative copy.
   - More than one exact-basename or semantically equivalent candidate is `BLOCKED_NO_CHANGE` with `CONFLICT` until the user establishes one canonical owner and a disposition for every other candidate.
   - For exactly one readable candidate, run the semantic-validity check below. A valid candidate is adopted as the canonical existing strategy; continue only to reconcile `.gitignore`, root links, and the optional pitfalls pointer. Do not overwrite the strategy merely because the initializer was invoked.
   - For one malformed or semantically uncertain candidate, show the concrete failures and ask whether to adopt it unchanged, repair it from a preview, or abort. Repair may be a conservative edit with each replaced claim named, or an explicitly destructive template replacement with a loss count and durable backup; bind the selected form and exact bytes. Adoption or abort does not make the document semantically current: if no other confirmed output changes, report `USER_SKIPPED`, not `CURRENT_NO_OP`. An unresolved choice is `BLOCKED_NO_CHANGE` with `UNCONFIRMED`.
   - With no candidate, continue to new-document inference.

   **Existing-document semantic validity.** Heading presence is necessary but not sufficient. Require all of the following before treating the document as current:
   - Exactly one readable document with these six unique headings in order: `# Git Strategy`, `## Why this exists`, `## Invariants`, `## Day-one workflow for any new work`, `## Merge authority`, and `## Red flags (stop and diagnose)`.
   - Every required section has a substantive non-placeholder body. Reject empty, contradictory, truncated, or corrupted sections, unbalanced fenced code blocks, unresolved template-control tokens, and an unresolved `[RELEASE_BRANCH]`. Intentional command metasyntax such as `<repo-root>` is not a template-control token.
   - `Why this exists` names a concrete purpose or failure prevented. `Invariants` contains at least one observable normative rule. The day-one workflow coherently covers an isolated workspace, work and verification, publication or a merge request, and cleanup. `Merge authority` maps routine and consequential/review-sensitive conditions to explicit dispositions. Each red flag has an observable trigger and response.
   - Branch roles, worktree path, forge commands, merge mode, and any release branch are internally consistent and do not contradict the detected repository facts or an explicit user confirmation. Configuration proves presence, not successful forge or CI operation.

4. **Validate every existing root-guidance link to a Git strategy.** A link is valid only when its resolved project path is the sole canonical candidate and any fragment names an anchor that exists in that document. Missing links may be proposed as additive reconciliation. A fragment whose anchor is absent from the otherwise canonical target requires repair/adopt/abort confirmation; explicit abort or adopt-unchanged with no other confirmed output is `USER_SKIPPED`. A stale link whose path resolves to a different or nonexistent strategy target is `BLOCKED_NO_CHANGE` with `CONFLICT`, as is a link to another normative candidate. A `CURRENT_NO_OP` requires every existing root-guidance link to resolve and the requested `.gitignore` and pitfalls-reference state to need no change.

### Step 2 — Auto-detect project state

Collect these values silently (do not prompt yet):

| Value | How to detect |
|---|---|
| Current branch | `git branch --show-current` |
| `main` branch present (local or remote) | `git show-ref --verify --quiet refs/heads/main` OR `refs/remotes/origin/main` |
| `master` branch present (local or remote) | Same pattern for `master` |
| `dev` branch present (local or remote) | Same pattern for `dev` |
| `develop` branch present | Same for `develop` |
| Remote URL | `git remote get-url origin` (may fail if no remote — that's OK) |
| Forge | Parse remote URL. `github.com` → GitHub; `gitlab.com` → GitLab; `bitbucket.org` → Bitbucket; `dev.azure.com` or `*.visualstudio.com` → **Azure DevOps** (hosted). A host that is none of these but serves the Azure DevOps URL shape (`/<collection>/<project>/_git/<repo>`) — e.g. `tfs.example.com` — is **Azure DevOps Server (on-premises)**, which is a SEPARATE section from hosted Azure DevOps, not the same one: `az repos` does not work against Server, so the two map to different commands entirely. Self-hosted GitLab is just GitLab. Only fall back to "unknown/self-hosted" when neither host nor URL shape identifies it. |
| Forge CLI available | Run the check **for the detected forge**: GitHub → `gh --version`; GitLab → `glab --version`; Azure DevOps (hosted) → `az repos -h` (which also proves the `azure-devops` extension is installed, where a bare `az --version` would not); **Azure DevOps Server → skip this check entirely** — there is no CLI for it, and its mapping targets the REST API, so record `n/a (REST)` rather than probing for `az`. Non-zero exit = not installed. Do NOT run `gh --version` as a generic "forge CLI" probe: `gh` is installed on plenty of machines whose repos live elsewhere, so a bare `gh` success on an Azure DevOps repo reports GitHub capability the project does not have. |
| Azure DevOps MCP available (ADO only) | If the forge is Azure DevOps, note whether an Azure DevOps MCP server is connected — it is an alternative to the `az` CLI. Informational only; it does not change which forge section Step 8 applies. |
| `docs/` directory exists | File-system check for directory at `./docs` |
| CLAUDE.md at repo root | File-system check for file at `./CLAUDE.md` |
| AGENTS.md at repo root | File-system check for file at `./AGENTS.md` |
| `.gitignore` exists | File-system check for `./.gitignore` |
| Chosen worktree path effectively ignored | Use `git check-ignore --no-index -- <representative-path-inside-chosen-worktree>` after the path is inferred. Bind `.gitignore`, applicable exclude files/configuration, the checked path, and the result. A broader correct pattern counts; literal line containment is insufficient. |
| `implementation-pitfalls.md` present | EXACT-basename search (same filter as Step 1) — common locations: `docs/pitfalls/implementation-pitfalls.md`, `dev/pitfalls/implementation-pitfalls.md` |
| `§Orchestration` section already in pitfalls doc | If pitfalls doc present, grep for `^## Orchestration` — determines whether Step 6.5 needs to append or skip |

When Step 1 adopts one semantically valid canonical strategy, parse its declared integration/release branches, worktree path, forge assumptions, and merge mode. Use those as the initial requested values. Repository detection may confirm or challenge them, but initializer defaults must not replace them. Ask only about contradictions or an explicit requested change. The `.gitignore` check uses this chosen path, including a representative child such as `<chosen-worktree-path>project-setup-ignore-probe`, without creating it.

### Step 3 — Infer decisions, materialize, present, confirm

Infer as much as possible. Questions that select a branch model, canonical document, output path, forge disposition, or optional cross-reference are decision prompts, not approval to write. Once those answers are resolved, use Steps 4–6.6 to materialize every exact candidate byte and directory output without applying it. Run semantic validation and content preservation, bind the complete proposal under the shared protocol, and only then present one consolidated final preview for confirmation.

**Inference rules:**

- **Integration branch:**
  - If current branch is `main` or `master` and `dev`/`develop` is absent → integration branch is current branch.
  - If current branch is `dev` or `develop` → integration branch is current branch; `main` (or `master`) is the release branch.
  - If both an integration-candidate (`main`/`master`) AND a release-candidate (`dev`/`develop`) exist but the current branch is the release one (`main`/`master`) → ambiguous; ask.
  - Else → ask.

- **Branching pattern:**
  - `main` (or `master`) only → GitHub flow (default) or Trunk-based — ask the user which (affects worktree duration prose only; minor).
  - `main`/`master` + `dev`/`develop` AND user picked the dev-side as integration → **Two-branch / simplified gitflow**. The skill retains the bundled §Release branch section in the output doc (Step 4 sub-step 4 below) and substitutes its `[RELEASE_BRANCH]` placeholder. For all other patterns, the section is removed entirely from the output along with its Contents-list entry.
  - Other → ask.

- **Release branch identification (two-branch case only):**
  - If integration is `dev` and `main` is present → release branch is `main`.
  - If integration is `dev` and `master` is present (no `main`) → release branch is `master`.
  - If integration is `develop` and `main` is present → release branch is `main`.
  - If integration is `develop` and `master` is present (no `main`) → release branch is `master`.
  - Else → not two-branch gitflow; the §Release branch section will be removed in Step 4.

- **Forge:** From remote URL parsing (Step 2). The detected forge selects one section of `references/forge-mappings.md`, which Step 8 applies. Do NOT treat an unidentified forge as GitHub-compatible — that assumption is what silently ships a wrong merge command. Route it to the **Unknown / self-hosted** section, which leaves the `gh` commands in place *and* emits a note saying they are unverified. Surface the detected forge and its CLI availability in the confirmation block so the user can correct a misdetection before anything is written.

- **Output location:**
  - If Step 1 adopted one canonical strategy, keep that exact path. Moving it is a separate explicit proposal that must also reconcile every reference; directory defaults never relocate an adopted document.
  - Otherwise, if `docs/` exists → default `docs/git-strategy.md`.
  - Otherwise, if `docs/` does NOT exist → ask the user explicitly:
    1. Write to `./git-strategy.md` (repo root)
    2. Create `docs/` and write to `docs/git-strategy.md`
    3. Custom directory (user provides path)

- **Worktree path:** For an adopted valid strategy, use its declared path. Otherwise default to `.claude/worktrees/`. If the user is on a non-Claude-Code agent, mention in the confirmation that this is conventional and can be changed.

**Present to user** (adapt as needed):

```
Detected / inferred:
  Integration branch:   main
  Branching pattern:    GitHub flow
  Forge:                GitHub (origin: git@github.com:org/repo.git)
  Forge CLI:            gh — installed
  Forge adaptations:    none (template is written for GitHub)
  Output path:          docs/git-strategy.md
  Worktree path:        .claude/worktrees/
  Will update:          CLAUDE.md (found), AGENTS.md (not found)
  .gitignore update:    add '.claude/worktrees/' (not currently ignored)
  Pitfalls cross-ref:   docs/pitfalls/implementation-pitfalls.md (found, no §Orchestration yet)
                        → will offer to append the §Orchestration trigger-and-pointer
  Bound proposal:       <lowercase SHA-256 from the shared protocol>
  Outputs:              <every file, durable backup, and created directory>
  Preview:              <exact byte/topology changes; sensitive spans redacted>

Confirm, or tell me what to change (branch name, output path, worktree path, etc.).
```

For two-branch gitflow projects, the confirmation block also includes a release-branch line:

```
Detected / inferred:
  Integration branch:   dev
  Release branch:       main           (two-branch gitflow detected)
  Branching pattern:    Two-branch / simplified gitflow
  ...
  Release section:      will retain §Release branch (and substitute
                        [RELEASE_BRANCH] → main) covering the dev → main
                        publication PR mechanic, classification rules,
                        and main-branch invariants. Reply 'no release
                        section' to remove the section instead, if you
                        prefer to write your own release policy elsewhere.
  ...
```

If `implementation-pitfalls.md` is NOT found, the confirmation block instead says:

```
  Pitfalls cross-ref:   implementation-pitfalls.md not found
                        → will note in report; user can run `pitfalls-docs-init`
                          after this skill to install it, which will wire the
                          §Orchestration trigger automatically via its template.
```

Wait for final user confirmation before applying. Any adjustment or changed input, path, topology, repository fact, candidate byte, or backup name invalidates the proposal and restarts materialization. After confirmation, apply only the bound bytes; do not rerender or repair them.

### Step 4 — Materialize the strategy candidate

Run this step before final confirmation when creating or repairing a strategy. After confirmation it supplies immutable bound bytes to the shared application transaction; it does not rerender them.

- **Create or destructive template replacement:** use sub-steps 1–8 below to derive the candidate from the bundled template.
- **Conservative repair:** start from the sole candidate's bound existing bytes and apply only the exact named behavior deltas shown in the repair preview. Do not rebuild from the template or import unrelated template changes. Validate the repaired whole document with Step 1's semantic predicates and apply a forge mapping or substitution only when that exact change is one of the named deltas. Then continue with backup/output materialization in sub-steps 9–10.

1. **Read** the template from `references/git-strategy-template.md` (relative to this skill's root).

2. **Validate** the template contains the expected section headings. If any of these are missing, stop and report a bug:
   - `## Branching model`
   - `## Adapting this doc to your project`
   - `## Why this exists`
   - `## Invariants`
   - `## What NOT to do`
   - `## Release branch`
   - `## Red flags (stop and diagnose)`

3. **Remove the pre-adoption sections:**
   - Delete from `## Branching model` through the line immediately before `## Why this exists`. This removes both the Branching model section AND the Adapting-this-doc section, since they only exist to guide adaptation and are not useful in the final project-specific doc.

4. **Handle the §Release branch section** — keep or remove based on detected branching pattern:
   - **If two-branch gitflow detected** (per Step 3) AND the user did NOT opt out: leave the `## Release branch` section in place. Its `[RELEASE_BRANCH]` placeholder is substituted in step 7 below; its integration-branch mentions (literal `main`) are substituted in step 5 below along with the rest of the doc.
   - **Otherwise** (single-branch project, or user opted out): delete the entire `## Release branch` section — from the `## Release branch` heading through the line immediately before `## Red flags (stop and diagnose)`. ALSO delete the `[Release branch](#release-branch)` line from the `## Contents` list above (otherwise the contents has a dead link). After this deletion, no `[RELEASE_BRANCH]` tokens remain in the doc, so step 7 below is a no-op.

5. **Substitute the integration branch name** — only if it is not `main`:
   - Find-replace `main` → chosen branch name throughout the remaining content.
   - Do NOT do this before step 3 — the Branching model section uses both `main` and `dev` as concrete branch names and a naive replace breaks it.
   - For two-branch gitflow projects (where §Release branch was retained in step 4), this substitution naturally and correctly converts that section's integration-branch mentions as well — the section uses literal `main` for integration mentions and `[RELEASE_BRANCH]` for release-branch mentions, so only the integration ones are touched here.

6. **Substitute the worktree path** — only if it is not `.claude/worktrees/`:
   - Find-replace `.claude/worktrees/` → chosen path.

7. **Substitute `[RELEASE_BRANCH]`** — only if §Release branch was retained in step 4 (two-branch gitflow):
   - Find-replace `[RELEASE_BRANCH]` → user's release branch name (e.g. `main` for `dev`+`main`, `master` for `develop`+`master`).
   - Skip if the section was removed in step 4 — there are no `[RELEASE_BRANCH]` tokens left to substitute.

8. **Forge-specific adjustments** — read `references/forge-mappings.md` and apply the section for the forge detected in Step 2.

   That file is the authoritative mapping; do not reconstruct commands from memory, and do not read it from any other location. It carries a stable **site index** (S1–S12) naming every forge-dependent site in the template, then one section per forge keyed by those IDs.

   - **GitHub** → no changes. Skip to sub-step 9.
   - **Any other forge** → apply that section's **Site replacements**, then insert its **Forge note** (if it has one) as a blockquote immediately before the `## Why this exists` heading. Sites S10–S12 live in the §Release branch section; skip them if step 4 removed it.

   Two properties of that file matter enough to state here, because getting them wrong produces a doc that looks right and is not:

   - **No forge is a pure flag rename.** Every non-GitHub section carries at least one behavior that changes what a *correct* command looks like, which is why each emits a forge note into the generated document. The sharpest case: `gh` expresses no-squash by *omitting* `--squash`, while both Azure DevOps variants read the completion strategy from a service-side default and need it stated outright (`--squash false` on hosted, `"mergeStrategy": "noFastForward"` on Server). On GitLab the trap is different — `glab mr merge` has no `--merge` flag at all, and auto-merge defaults on whenever a pipeline is running, so the command can return success having only *scheduled* the merge. A mechanical rename loses each of these.
   - **Where there is no equivalent, say so.** Two ADO sites (reading a file at a PR head, watching CI) have no single-command counterpart. The mapping supplies a git-based or Monitor-based replacement *and* names the absence in prose, so the next reader does not go hunting for a flag that was never there. Do not substitute a command that does something subtly different in order to keep the shape of the original.

   **Verify before writing:** unless the forge is GitHub, grep the pending content for `gh ` and expect zero hits on any forge whose section supplies replacements. Bitbucket and Unknown deliberately retain them as placeholders — there, confirm the forge note is present instead.

9. **Materialize every durable backup before confirmation.** For each existing file the proposal will touch, include the exact before bytes at `<FILENAME>.backup-<timestamp>` as a planned output. This covers a confirmed `git-strategy.md` replacement, `.gitignore`, root guidance, and the optional pitfalls edit. The durable backup is user-visible undo/evidence; content preservation compares the bound input directly against the candidate. A file created from nothing needs no backup. After verified success leave durable backups for the user; after transaction failure restore each invocation-created backup to its prior state, normally `ABSENT`.

10. **Add** the filled-out content to the bound proposal at the chosen output location. Do not write it during materialization.

    If the output directory does not exist, include every required directory in the proposal and shared write-set receipts. Bind the nearest existing ancestor and absence topology under the shared protocol; do not create the directory before confirmation.

### Step 5 — Update .gitignore

Materialize this additive edit as candidate bytes before final confirmation; do not mutate `.gitignore` yet.

Skip this step if the chosen worktree path is already gitignored (detected in Step 2).

Otherwise:

1. If `.gitignore` does not exist, create it.
2. Append (don't overwrite) the following, preceded by a blank line if the file is non-empty:
   ```
   
   # Git worktrees — see <relative-path-to-git-strategy.md>
   <chosen-worktree-path>
   ```
   Example:
   ```
   
   # Git worktrees — see docs/git-strategy.md
   .claude/worktrees/
   ```

### Step 6 — Update CLAUDE.md and AGENTS.md

Materialize each additive root-guidance edit before final confirmation; do not mutate either root file yet.

For **each** of `CLAUDE.md` and `AGENTS.md` that exists at repo root:

1. **Read** the file.

2. **Decide placement** — look for an existing section whose heading contains (case-insensitive substring match) any of the following words or phrases. Substring match, not exact: `Key Conventions` matches `Conventions`, `Development Workflow` matches both `Development` and `Workflow`. Priority order (take the first match when multiple apply):
   - `Git strategy` (most specific — prefer if present)
   - `Git workflow`
   - `Git`
   - `Version Control`
   - `Development Workflow`
   - `Workflow`
   - `Conventions`
   - `Development`
   - `Documentation`
   - `Docs`
   - `References`
   - `Reference`

3. **If a matching section is found:** append a reference line at the end of that section (before the next `##` heading), using this format:
   ```markdown
   - **Git strategy:** see [<relative-path>](<relative-path>) for branch/worktree policy, merge authority, recovery steps, and multi-agent coordination rules.
   ```
   The relative path is relative to the file being edited (e.g. if CLAUDE.md is at repo root and the strategy doc is at `docs/git-strategy.md`, the link is `docs/git-strategy.md`).

4. **If no matching section is found:** add a new top-level section. Place it before any trailing "License" / "Acknowledgements" section if present; otherwise append at the end of the file. Format:
   ```markdown
   
   ## Git strategy
   
   See [<relative-path>](<relative-path>) for branch/worktree policy, merge authority, recovery steps, and multi-agent coordination rules. The doc is the authoritative reference — do not duplicate the rules here.
   ```

5. **Do not** overwrite or rewrite existing content by default. Append only.

6. **Drift check when a link already exists.** If the file already contains a link to `git-strategy.md` at the expected path:
   - Locate the section containing that link.
   - Count non-link prose in that section (bullet points, paragraphs — anything other than the link line itself).
   - If the section is JUST the link line (no surrounding prose summary): skip this file — the reference already exists and there's nothing to drift.
   - If the section has a non-trivial prose summary (rule of thumb: more than 3 lines or more than 2 bullets of non-link content): STOP and surface to the user. Show the existing summary content and note that the canonical `git-strategy.md` may have moved on since the summary was written. Ask whether the user wants to:
     1. Leave it (summary is still accurate)
     2. Refresh selected bullets (user points to specific stale content)
     3. Rewrite the whole summary from the current doc's §Invariants + §Merge authority
   - Do NOT attempt to auto-diff the summary against the canonical doc — semantic drift is a judgment call, not a mechanical one. Surface and ask.

### Step 6.5 — Offer to wire §Orchestration into `implementation-pitfalls.md`

Resolve this optional choice before final confirmation. If accepted, materialize the additive candidate bytes; do not mutate the pitfalls document yet.

This step is the complement to §Multi-agent coordination → Output persistence in the git-strategy doc just written. The goal is to put a trigger-and-pointer to that rule in the project's `implementation-pitfalls.md` so plan writers hit it via their mandated-read path (e.g. `writing-plans-enhanced`).

1. **If `implementation-pitfalls.md` is NOT present** (from Step 2 detection): skip this step. Note in the Step 7 report that the user can run `pitfalls-docs-init` next to install pitfalls docs with the §Orchestration trigger pre-populated.

2. **If `implementation-pitfalls.md` is present AND already has a `## Orchestration` section** (from Step 2 grep): skip this step. The wiring is already done; do not duplicate.

3. **If `implementation-pitfalls.md` is present AND does NOT have a `## Orchestration` section**: offer to append the following block. Show the user what you'll append and get confirmation before writing:

   ```markdown
   ---

   ## Orchestration

   This section is the discovery hook for plan writers who arrive here via the `writing-plans-enhanced` (or equivalent) mandated-read path. The canonical rules live in `docs/git-strategy.md` → §Multi-agent coordination → Output persistence. This section does NOT restate those rules — it exists to make sure plan writers notice they apply.

   ### ORCH-1: Analysis Dispatches Must Persist Findings Before Returning

   **Trigger:** Your plan dispatches parallel subagents (bug hunts, audits, phased analysis, parallel investigations) whose findings would be expensive to regenerate if lost.

   **What you need to do:** Every such dispatched subagent MUST write its complete report to a persistent file BEFORE returning; the response message is not the sole record.

   **Read the full rule:** `docs/git-strategy.md` → §Multi-agent coordination → Output persistence. That section carries the copy-pasteable prompt block (with `<PERSISTENCE_PATH>` substitution), file-path conventions, orchestrator commit cadence, and the cases where the rule doesn't apply.

   **Why this is in implementation-pitfalls:** because the plan-writing skill mandates reading this file, and this rule has to be noticed at plan-write time (when the dispatch prompts are being drafted), not at execution time (when it's too late). The failure mode — orchestrator context compacting mid-consolidation and lossily dropping findings — is predictable and preventable if the plan author builds persistence into the dispatch prompts from the start.

   ### Review Checklist

   - [ ] **Dispatch prompts include the mandatory-persistence block** — copy from `docs/git-strategy.md` §Output persistence; substitute `<PERSISTENCE_PATH>` with a durable per-subagent path (ORCH-1)
   - [ ] **Plan specifies exact persistence paths, not "write somewhere useful"** — ambiguous paths default to `/tmp` under pressure, which doesn't survive (ORCH-1)
   - [ ] **Orchestrator commits subagent artifacts wave-by-wave** — committed files land on the campaign branch before consolidation begins (ORCH-1)
   ```

   Adjust the `docs/git-strategy.md` path to match wherever git-strategy.md was written in Step 4 (it may not be exactly `docs/git-strategy.md` if the user chose a different location).

4. **Placement within the pitfalls doc:** append after the last domain/topic section but BEFORE `# Appendix A: Historical Changelog` (if present). If the pitfalls doc has no appendices, append at the end of the file.

5. **Do not alter existing content** in `implementation-pitfalls.md` beyond adding the new section. If the file's structure is unclear (no clear end-of-domain-sections landmark), surface to the user rather than guess at placement. Step 6.6 is what establishes you didn't — "append only" is an intent, and an insertion placed before `# Appendix A` rewrites the file around that point.

### Step 6.6 — Pre-confirmation content-preservation gate

**Run on candidate bytes before final Step 3 confirmation; never skip.** Every other check in this skill confirms the intended content is *present*: the reference line, worktree ignore, or §Orchestration addition. None checks whether the candidate retained the bound input. These edits are described as appends, but whole-file reconstruction can drop lines anywhere. These are project rulesets; a dropped line is a deleted rule.

Applies to every file this run proposes to **rewrite or edit in place**: a replaced `git-strategy.md`, `.gitignore`, each root-guidance file, and `implementation-pitfalls.md` when selected. **Does not apply to a file created from nothing**—there is no prior content to lose.

- **Use the bound input bytes as the reference.** The planned durable backup contains those same bytes but is not needed to perform the comparison.
- **What to compute:** the set of non-blank lines present in the bound input and absent from the candidate. Whole-line and order-insensitive—content that moved within the file is not a loss. One illustration, for an agent with a POSIX shell:

  ```sh
  grep -vE '^[[:space:]]*$' CANDIDATE > candidate.nonblank.tmp
  grep -Fxv -f candidate.nonblank.tmp BOUND_INPUT | grep -vE '^[[:space:]]*$'
  ```

  Delete the temp file afterwards — it is scratch, not an artifact of the install.

  Both `-F` (fixed strings, so markdown punctuation isn't read as a regex) and `-x` (whole line) are load-bearing, and the blank lines must come out of the pattern file: drop `-x` while a blank pattern is present and the empty pattern matches every line, so the check reports nothing and reads as a clean pass. Any equivalent set difference is fine (`comm -23` over two `sort -u` copies, PowerShell `Compare-Object`, or reading a short file yourself) — the semantics above are the requirement, the command is only an example.
- **Every additive edit has an empty expected result.** Step 5 appends to `.gitignore`, Step 6 adds a reference line or section, and Step 6.5 appends §Orchestration. Any bound-input line absent from those candidates is an accidental drop: restore it before preview and confirmation.
- **Strategy repair has explicit replacement semantics.** A conservative repair may omit only the exact claims or sections the preview identifies as replaced and must show each replacement as a behavior delta. Anything else absent from the candidate is an accidental drop. For a user-selected destructive template replacement, report the count of non-blank input lines not carried over plus the durable-backup path; a line-by-line list would be noise. The confirmed proposal binds which repair form applies.
- A preservation problem found after application requires verified transaction restoration or a newly materialized and confirmed proposal; never repair applied bytes under the old digest.
- **Report the result** in Step 7 for every file the gate covered, including empty results, and tie it to the final verified receipt.

### Step 7 — Report

Summarize what was done with wording that matches the outcome. Use `Done.` only for `CHANGED` or `CURRENT_NO_OP`:

```
Outcome: [changed | current | skipped | blocked | failed and restored | failed with uncertain state]

Wrote:              docs/git-strategy.md
                    (retained §Release branch; substituted [RELEASE_BRANCH] → main
                     — two-branch gitflow detected: dev → main)
.gitignore:         added '.claude/worktrees/'
CLAUDE.md:          appended reference under '## Development Workflow' section
AGENTS.md:          not found — skipped
Pitfalls cross-ref: appended §Orchestration to docs/pitfalls/implementation-pitfalls.md
                    (OR: implementation-pitfalls.md not found — run pitfalls-docs-init
                     to install pitfalls docs with §Orchestration pre-populated)

Durable backups (confirmed outputs retained after verified success):
                    .gitignore.backup-20260810T074500
                    CLAUDE.md.backup-20260810T074500
                    docs/pitfalls/implementation-pitfalls.md.backup-20260810T074500

Content preservation (bound input vs. confirmed candidate, then final receipt):
                    .gitignore                 — no lines dropped
                    CLAUDE.md                  — no lines dropped
                    implementation-pitfalls.md — no lines dropped
                    docs/git-strategy.md       — created, not applicable
```

Every edited file gets a line here, including the clean ones — the empty
result is the thing being reported. A non-empty result means lines were
dropped and restored (say which), or, for a `git-strategy.md` the user
chose to overwrite, a count plus the backup path.

The `(retained §Release branch ...)` annotation appears only when two-branch gitflow was detected and the user did not opt out. For single-branch projects (GitHub flow / trunk-based) the section is silently removed and no annotation is needed — that's the standard fill-out.

Mention any follow-ups:

- Commit the new file and updates (suggest a commit message, e.g. `docs: adopt worktree-based git strategy`).
- Name the detected forge and which `forge-mappings.md` section was applied. For Bitbucket / unknown, say that the `gh` commands were deliberately left in place as placeholders and a forge note was added. For Azure DevOps, point at the emitted forge note — particularly the `--squash false` requirement, which is the one that silently breaks the no-squash invariant if dropped.
- If the template scope doesn't cover the project's needs (release branches, hotfix flow), remind the user they'll need separate policy for those.
- If `implementation-pitfalls.md` was missing: recommend running `pitfalls-docs-init` next. That skill installs `implementation-pitfalls.md` and `testing-pitfalls.md` from templates; the implementation-pitfalls template has the §Orchestration trigger pre-populated, so no manual wiring is needed afterward.

After the human report, emit the exact `PROJECT_SETUP_CHILD_RESULT_V1` block required by the shared protocol with child ID `project-setup/git-strategy-init`. Include durable backups and created directories in a successful write set because they are planned outputs. Keep preservation repairs separate from transaction `restoredPaths`. No prose follows the result block.

## Common mistakes

- **Deleting the Branching model section AFTER find-replace instead of before.** The section contains both `main` and `dev` as concrete branch names in the descriptive patterns. A naive `main → dev` replace on that section produces `integration branch is dev; dev is release-only` — broken. ALWAYS delete the pre-adoption sections FIRST, then do the branch-name substitution.
- **Writing over existing `git-strategy.md` without the pre-flight search.** There can be ghost copies at `git-strategy.md` and `docs/git-strategy.md` from different team members or past runs. Always search both tracked and untracked before writing.
- **Trusting "append only" instead of verifying it.** Steps 5, 6, and 6.5 are all described as additive, and that's the intent — but the mechanic is read-file, modify, write-file-back, and an insertion placed mid-file (a reference line before the next `##`, §Orchestration before `# Appendix A`) rewrites everything around it. A run that dropped three lines from CLAUDE.md still ends with the reference line present, `.gitignore` correct, and §Orchestration in place — every check passes. Step 6.6 is the only check pointed at the input. Since these edits are additive, its pass condition is strictly empty: a non-empty result is a bug to fix, never something to justify.
- **Treating durable backups as transaction originals.** Preservation compares bound inputs to candidates before confirmation. Durable backups are planned user outputs retained after verified success; ephemeral protected originals serve rollback and are removed after verified success or restoration. On transaction failure, restore an invocation-created durable backup to its prior state.
- **Assuming the branching pattern.** If both `main` and `dev` exist, DO NOT guess. Ask the user which is the integration branch — two-branch gitflow looks different from a GitHub-flow repo that happens to have a stale `dev` branch.
- **Updating only one of CLAUDE.md / AGENTS.md when both exist.** Both should be updated if found. Different agent frameworks read different files; projects that have both need both wired up.
- **Using Claude-Code-specific tooling.** This skill is cross-platform. Do not invoke `TodoWrite`, `AskUserQuestion`, `Skill`, or any other Claude-Code-specific tool in your implementation. Use plain shell commands, file operations, and natural-language prompts to the user.
- **Treating an unidentified forge as GitHub, or probing with a bare `gh --version`.** `gh` is installed on plenty of machines whose repos live on other forges, so a success proves the binary exists, not that it can talk to this repo. Detect the forge from the remote first, then check *that* forge's CLI. Shipping the GitHub commands to an Azure DevOps repo produces a doc whose every PR command is wrong.

- **Mechanically renaming `gh` to `az` for Azure DevOps.** The no-squash invariant is expressed in the template as the *absence* of a `--squash` flag. Azure DevOps takes the completion strategy from a service-side default, so the renamed command inherits whatever branch policy allows — the doc still says "never squash" while the command it gives you may well squash. `references/forge-mappings.md` carries the explicit `--squash false` and the other hazards; apply it rather than transliterating.

- **Sending an on-premises Azure DevOps Server repo to the hosted Azure DevOps section.** They are different sections for a hard reason: Microsoft does not support the `az` CLI against Azure DevOps Server, so a Server repo mapped to `az repos` gets a document whose every PR command fails at the CLI. Server maps to the REST API. The tell is the host — anything that is not `dev.azure.com` / `*.visualstudio.com` but serves `/<collection>/<project>/_git/<repo>`.

- **Forgetting the .gitignore update.** Without it, worktree contents will appear in `git status` and can be accidentally committed — the first failure mode the strategy doc is designed to prevent.
- **Creating `git-strategy.md` without the user's confirmation on output location.** When `docs/` doesn't exist, the default is not obvious. Always ask.
- **Matching template files in the pre-flight search.** `grep -i git-strategy` matches `git-strategy-template.md`, `git-strategy.draft.md`, etc. Filter by exact basename (`git-strategy.md`, case-insensitive) only. A template is not a deployed policy doc.
- **Silently skipping a CLAUDE.md / AGENTS.md that already links to `git-strategy.md`.** The link being present does not mean the surrounding summary is still accurate. If there's a prose summary of more than a few lines, surface it for the user to review — summaries drift as the canonical doc evolves.
- **Forgetting to remove the §Release branch entry from the Contents list when removing the section.** Step 4 sub-step 4 says to delete BOTH the `## Release branch` section AND its `[Release branch](#release-branch)` line in the Contents list. Removing only the section leaves a dead link in Contents. (Removing only the Contents line leaves the section orphaned in the doc — also wrong.) Both go together.
- **Substituting `[RELEASE_BRANCH]` BEFORE the `main` → integration substitution.** Order matters. If `[RELEASE_BRANCH]` → `main` is done first (for a `dev`+`main` project), then the subsequent `main` → `dev` body substitution would turn the release-branch mentions into `dev` — wrong. The required order is: integration-branch substitution first (step 5), then `[RELEASE_BRANCH]` substitution (step 7). Forge swaps come last (step 8) so they operate on already-substituted command lines.

## Quick reference (condensed workflow)

| Step | Action |
|---|---|
| 1 | Verify git repo; classify exact strategy candidates; semantically validate one candidate or block conflicting candidates; validate root links |
| 2 | Auto-detect branch (incl. `master`), forge **and its matching CLI** (never `gh` as a generic probe), paths, CLAUDE.md/AGENTS.md presence |
| 3 | Resolve choices; materialize, validate, preserve, and bind exact outputs; present the final byte/topology preview; ask for confirmation |
| 4 | Materialize the strategy candidate; remove pre-adoption sections and any inapplicable §Release branch; substitute branch/worktree/forge values; include durable backups and missing directories in the proposal |
| 5 | Materialize the `.gitignore` candidate if the worktree path is not already ignored |
| 6 | Materialize additive references for existing root guidance |
| 6.5 | Resolve and materialize the optional §Orchestration pointer before final confirmation |
| 6.6 | Run the **content-preservation gate** against bound inputs and candidate bytes; restore additive drops before confirmation; a declared strategy replacement reports only a count |
| 7 | Apply confirmed bytes under the shared lock, verify or restore receipts, report human details, then emit one exact child result |

## Relationship to other skills

- **`pitfalls-docs-init`**: separate, composable skill that installs `implementation-pitfalls.md` and `testing-pitfalls.md` from templates. The templates include the §Orchestration trigger-and-pointer back to this skill's `git-strategy.md`. Either skill can run first; this skill's Step 6.5 handles the case where `implementation-pitfalls.md` already exists (appends §Orchestration if missing, skips if present), and the Step 7 report flags the case where it doesn't exist yet (recommends running `pitfalls-docs-init` next). No direct skill invocation between them.
- **`superpowers:using-git-worktrees`**: the canonical skill for worktree creation mechanics (directory priority, gitignore verification, project setup, baseline tests). This doc's Day-one workflow forward-references it. If your agent framework has access to it, use it when creating worktrees per the output doc.
- **Plan-writing skills** (e.g. `superpowers:writing-plans`, `writing-plans-enhanced`): these typically mandate reading the pitfalls docs during plan authorship. After this skill runs (and `pitfalls-docs-init` has populated the pitfalls files), the §Orchestration trigger is discoverable on the plan-writing mandated-read path.
- **`project-init` wrapper**: runs this child after agent guidance and before pitfalls, Testing, and Delivery. The wrapper consumes this child's structured result; domain discovery, rendering, and write safety remain here.

## Cross-platform notes

This skill is pure instruction — no bundled scripts. Any agent framework with shell access and read/write file operations can execute it.

- **Git subcommands** used are portable (Windows, macOS, Linux, Git Bash).
- **File existence checks** should use your agent's native file-inspection tools rather than shell `test` — `test -f` doesn't work on Windows cmd.
- **File listing** — prefer `git ls-files` over `find` / `dir` for portability.
- **Grep / search** — prefer your agent's Grep tool over piping `git ls-files | grep`, since `grep` isn't on Windows cmd by default.
- **Path handling** — use forward slashes in all paths you write into files. Git handles them on Windows.

The skill does not depend on any Claude Code-specific tool (`Skill`, `TodoWrite`, `AskUserQuestion`, etc.). Instructions are agent-agnostic.
