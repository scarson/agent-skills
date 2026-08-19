# git-strategy-init

Initializes a project-specific `git-strategy.md` from a bundled template that codifies a worktree-based, multi-agent-safe git workflow. The skill is intended to be invoked by an AI agent (Claude Code, Codex, Cursor, etc.) acting on behalf of the user — it is not a standalone CLI.

**Agents should read [SKILL.md](SKILL.md).** This README is the human-facing overview.

## What the skill does

Given a git repo and a user request like *"set up the git strategy in this project"*:

1. Confirms it's running in a git repo and searches for any existing `git-strategy.md` (tracked or untracked).
2. Auto-detects the current branch, the presence of `main` / `dev` / `develop`, the forge (GitHub / GitLab / Azure DevOps / Bitbucket), the CLI **for that forge**, and whether `CLAUDE.md` / `AGENTS.md` exist.
3. Presents the detected values and asks the user to confirm or adjust.
4. Fills out the bundled template — removes the pre-adoption guidance sections, substitutes the integration branch name, substitutes the worktree path, and applies the detected forge's section of `references/forge-mappings.md`.
5. **Handles the bundled `## Release branch` section based on detected pattern:**
    - **For two-branch gitflow projects** (integration branch is `dev`/`develop`, with `main`/`master` present as the release branch): retains the section in the output and substitutes its `[RELEASE_BRANCH]` placeholder with the detected release branch name. The section covers the integration → release publication PR mechanic, classification rules, and release-branch invariants. The user can opt out at the confirmation step (in which case it's removed instead).
    - **For single-branch projects** (GitHub flow / trunk-based): removes the section entirely from the output, including its entry in the `## Contents` list.
6. Writes the filled-out doc (default: `docs/git-strategy.md` if `docs/` exists; prompts otherwise).
7. Appends the worktree path to `.gitignore` if not already ignored.
8. Appends a reference to the new doc under an appropriate section in `CLAUDE.md` and `AGENTS.md` (whichever exist).
9. **Verifies nothing was lost.** Every existing file the run touches — `.gitignore`, `CLAUDE.md` / `AGENTS.md`, `implementation-pitfalls.md`, and an overwritten `git-strategy.md` — is backed up first, then compared line-for-line against that backup before the run is reported. Because all of this skill's edits are additive, the expected result is empty: any line present before and absent after is a dropped line to restore, not a judgment call. (The one exception is a `git-strategy.md` the user explicitly chose to overwrite, which reports a count instead.) Backups are left in place for the user.
10. Reports what was changed, the retained backups, the content-preservation result per edited file, and suggests next steps.

Step 9 exists because "append only" describes the intent, not the mechanic. These edits are read-file → modify → write-back, and an insertion placed mid-file (a reference line before the next `##` heading, §Orchestration before `# Appendix A`) rewrites everything around it. A run that dropped three lines from `CLAUDE.md` still ends with the reference line present and `.gitignore` correct — every other check passes.

## What the template covers

The bundled template at `references/git-strategy-template.md` codifies:

- One long-lived integration branch; ephemeral worktree-isolated branches for everything else.
- No `git checkout` in the root checkout; no commits directly to local integration branch; no `git pull` on the integration branch (reset instead).
- Day-one workflow, recovery-from-messy-state workflow, verification steps.
- Multi-agent coordination rules: per-agent worktrees, orchestrator-merges-worker-pushes, fetch-before-comparing.
- Merge authority split: agents may auto-merge routine PRs (docs / tests / mechanical refactor); user merges anything touching production code or architecture. Classification is required in the PR body.
- Rationale table, red-flags checklist, explicit exceptions.

The template supports three branching patterns out of the box:

- **GitHub flow** — integration branch is `main`.
- **Trunk-based development** — integration branch is `main`, worktrees especially short-lived.
- **Two-branch / simplified gitflow** — integration branch is `dev` (or `develop`), `main` (or `master`) is the release branch. The bundled `## Release branch` section in the template covers the integration → release publication PR mechanic; the skill retains it for two-branch projects and removes it (along with its Contents-list entry) for single-branch projects.

`release/*`, hotfix, and environment branch workflows (e.g. `staging` / `production`) remain out of scope — projects that need those must add separate policy. The two-branch publication PR is the *only* release-cut shape the template handles directly.

## What the user sees

A typical invocation looks like:

```
You: set up git strategy in this project

Agent: [runs pre-flight checks silently]

       Detected / inferred:
         Integration branch:   main
         Branching pattern:    GitHub flow
         Forge:                GitHub (origin: git@github.com:org/repo.git)
         gh CLI:               installed
         Output path:          docs/git-strategy.md
         Worktree path:        .claude/worktrees/
         Will update:          CLAUDE.md (found), AGENTS.md (not found)
         .gitignore update:    add '.claude/worktrees/' (not currently ignored)

       Confirm, or tell me what to change.

You: looks good

Agent: [writes files]

       Done.
         Wrote:        docs/git-strategy.md
         .gitignore:   added '.claude/worktrees/'
         CLAUDE.md:    appended reference under '## Development Workflow'
         AGENTS.md:    not found — skipped

       Next: commit the new file and updates. Suggested message:
         docs: adopt worktree-based git strategy
```

## Updating the template

If the canonical template (in the project that originated it) is updated, refresh the bundled copy:

```
cp /path/to/source/git-strategy-template.md references/git-strategy-template.md
```

The skill reads the two bundled references — `references/git-strategy-template.md` and `references/forge-mappings.md` — and no file outside this skill directory, keeping the bundled copies authoritative.

After refreshing, verify two things: the section-heading validation in SKILL.md Step 4 still matches the template's headings, and every anchor in the site index of `references/forge-mappings.md` still resolves. That index (S1–S12) quotes command text from the template; a reworded command silently breaks the mapping for every non-GitHub forge while leaving GitHub — the case you are most likely to test — working perfectly.

## Forge mappings

`references/forge-mappings.md` is the second bundled reference. The template stays GitHub-native so a human can read it before adoption; everything that changes per forge lives in the mapping file, one section per forge, keyed to a stable site index.

Adding a forge means adding a section there, not editing SKILL.md.

The working assumption when this file was written was that most forges are renames and only Azure DevOps needed a **forge note** emitted into the generated document. Checking the CLI docs killed that: every non-GitHub section turned out to have at least one behavior that changes what a *correct* command looks like, so every one of them emits a note.

- **Azure DevOps (hosted)** — `--squash false` must be explicit, because the completion strategy comes from a service-side default rather than the command; `--description` is list-valued and therefore shell-sensitive; `az` silently drops characters the Windows console codec cannot encode.
- **Azure DevOps Server (on-premises)** — a wholly separate section, because Microsoft does not support the `az` CLI against Server. It maps to the REST API, where the same strategy default appears as `"mergeStrategy": "noFastForward"` and completion additionally requires a fresh `lastMergeSourceCommit`.
- **GitLab** — `glab mr merge` has no `--merge` flag (a merge commit is the result of passing neither `--squash` nor `--rebase`), and `--auto-merge` defaults to true whenever a pipeline is running, so the command can return success having only *scheduled* the merge.

The test for whether a note is warranted: would a reader following the doc's commands verbatim still get a wrong result? If yes, the note goes in the generated document, not just in this file.

## Cross-platform

The skill is pure instructions — no scripts, no runtime dependencies, no platform-specific binaries. It invokes only:

- `git` (portable across Windows / macOS / Linux / Git Bash)
- The host agent's native file read/write/search tooling

It does not depend on any Claude Code-specific features. Codex, Cursor, and other agent frameworks that can read markdown skills and execute shell commands can run it equivalently.

## Limits

- The skill initializes, it doesn't maintain. If the template upstream changes later, re-running the skill won't migrate an existing project's doc — that's a merge problem the user handles manually.
- The skill assumes the user is comfortable with the worktree-based model. If they're not, the template itself is quite opinionated — read it first.
- Forge support is full for GitHub (native), GitLab, Azure DevOps, and Azure DevOps Server. Bitbucket and unidentified self-hosted forges get a "verify these commands" note rather than substitutions, because neither has a mapping worth asserting.
- The command mappings are drawn from each forge's published documentation, not from live runs against a repo on that forge. The GitLab and Azure DevOps Server sections in particular have not been executed end-to-end here — treat a first run on either as worth watching.
