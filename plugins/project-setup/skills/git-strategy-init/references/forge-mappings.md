# Forge mappings

Per-forge adaptations for `references/git-strategy-template.md`, applied by `git-strategy-init` **Step 8**.

The template is written against GitHub + the `gh` CLI because that is the most common case, and because a template full of `[PR_CREATE_CMD]`-style tokens is unreadable to the human reviewing it before adoption. Everything that has to change for another forge lives here instead.

## How the skill uses this file

1. Step 2 detected a forge. Read **only** that forge's section below.
2. Apply its **Site replacements** in order. **Anchor on the quoted fragment, not on a substring of it.** `` `gh pr merge` `` alone appears at both S1 and S12, so a bare find-replace for it corrupts whichever site you were not aiming at. Each section below quotes an anchor long enough to be unique; use it as given. Every anchor is quoted from the *post-substitution* template — after Step 4's branch-name and worktree-path substitutions have run — so a project whose integration branch is `dev` will see `dev` where these anchors say `main`. Match on the command text, not the branch name.
3. If the section has a **Forge note**, insert it as a blockquote immediately before the `## Why this exists` heading (the first heading in the post-adoption doc).
4. Sites **S10–S12** exist only in two-branch-gitflow output. If Step 4 removed the `## Release branch` section, skip them.
5. Verify with a **word-boundary** pattern, not a bare `gh ` substring — the doc contains "through", "in-flight", and "drift", all of which match `gh `. Use `grep -nE '\bgh (pr|api|auth|repo)\b'` plus a separate `grep -n 'GitHub UI'`. Expect zero hits for both, except on GitHub (unchanged by design) and on Bitbucket / Unknown (which retain the commands as placeholders).

A forge with no section here is handled as **Unknown / self-hosted**.

## Site index

The twelve forge-dependent sites in the template. IDs are stable across forges, so each section below can be a short keyed list rather than a re-quoted wall of text.

| ID | Section | Anchor |
|---|---|---|
| S1 | §Invariants, invariant 6 | the fragment ``running any of `gh pr merge`, `git push origin main` `` — **anchor on the whole fragment, never the bare `` `gh pr merge` ``, which also occurs at S12** |
| S2 | §Day-one workflow, step 4 | `gh pr create --fill` |
| S3 | §Living documents | the `# Option 3:` block (`gh pr diff` / `gh api …contents?ref=`) |
| S4 | §Living documents | `gh pr list --state open --search 'plan <name>'` |
| S5 | §Mechanics for auto-merge | `` `gh pr checks --watch` `` in the CI-wait paragraph |
| S6 | §Mechanics for auto-merge | the `# ALWAYS --merge. NEVER --squash. NEVER --rebase.` comment |
| S7 | §Mechanics for auto-merge | `gh pr merge <number> --merge --delete-branch` |
| S8 | §Handling merge conflicts | prose "not the GitHub UI" |
| S9 | §Multi-agent race conditions | `gh pr list --state open` |
| S10 | §Release branch | `gh pr create --base … --head …` |
| S11 | §Release branch | `gh pr merge <number> --merge --delete-branch=false` |
| S12 | §Release branch | the whole sentence beginning "The `--delete-branch=false` flag is the one explicit deviation" — it carries FOUR forge-specific things: `--delete-branch=false`, the flag names `--merge` / `--squash` / `--rebase`, `gh pr merge`, and "the GitHub UI". Replace the sentence, not a word inside it. |

---

## GitHub

No changes. The template is already written for this forge. Emit no forge note.

---

## GitLab

CLI: `glab`. Closer to a rename than Azure DevOps is, but **not a pure one** — `glab mr merge` does not share `gh`'s flag names, and it has an auto-merge default that changes what "merge now" means.

### Hazard — `glab mr merge` may schedule instead of merging

`--auto-merge` **defaults to true when a pipeline is running**. So on a repo with CI, the same command that merges immediately on a quiet branch instead sets auto-merge and returns success. An agent that treats exit 0 as "merged" and moves on to `git pull` on the integration branch will find nothing there. Pass `--auto-merge=false` when the workflow needs the merge to have happened by the time the command returns.

Note also that `glab mr merge` has **no `--merge` flag**. A merge commit is what you get by passing neither `--squash` nor `--rebase` — the no-squash invariant is expressed by omission here, the same way it is with `gh`, and unlike Azure DevOps.

**Site replacements:**

- **S1** — in the quoted fragment only: `` `gh pr merge` `` → `` `glab mr merge` ``
- **S2** — `gh pr create --fill` → `glab mr create --fill`
- **S3** — replace from the `# Option 3:` comment line through the `# content -- don't use it for reading.` line inclusive (the trailing `# Note: gh pr view --json files ...` warning is `gh`-specific and goes with it). Everything above `# Option 3:` stays. The replacement:

  ```bash
  # Option 3: if there's an open MR, read the MR's version.
  #   a) The diff of the file as the MR changes it (good for seeing what's changed):
  glab mr diff <mr-number>
  #   b) The full file content at the MR's head ref (good for reading the whole thing):
  #      glab has no file-content command; resolve to the source branch and use git.
  git fetch origin <mr-source-branch>
  git show origin/<mr-source-branch>:docs/plans/audit-plan.md
  ```

- **S4** — `gh pr list --state open --search 'plan <name>'` → `glab mr list --search 'plan <name>'`. `--search` exists and filters title **and** description; open is already the default, so there is no state flag to pass. (`--opened` does not exist — the state flags are `--all`, `--closed`, `--merged`.)
- **S5** — `` `gh pr checks --watch` `` → `` `glab ci status --live` ``
- **S6** — `# ALWAYS --merge. NEVER --squash. NEVER --rebase.` → `# ALWAYS a merge commit -- pass neither --squash nor --rebase. NEVER squash. NEVER rebase.` The rule is unchanged; only `--merge` goes, because `glab` has no such flag and naming it would send a reader looking for one.
- **S7** — `gh pr merge <number> --merge --delete-branch` → `glab mr merge <number> --remove-source-branch --auto-merge=false`
- **S8** — "the GitHub UI" → "the GitLab web UI"
- **S9** — `gh pr list --state open` → `glab mr list`
- **S10** — `gh pr create --base <release> --head <integration>` → `glab mr create --target-branch <release> --source-branch <integration>` (preserve whatever branch names appear in the post-substitution source line)
- **S11** — `gh pr merge <number> --merge --delete-branch=false` → `glab mr merge <number> --auto-merge=false`. There is no opt-out flag to pass: `glab` does not remove the source branch unless `--remove-source-branch` is given, so omitting it *is* the opt-out.
- **S12** — replace the whole sentence with: "Omitting `--remove-source-branch` is the one explicit deviation from §Mechanics for auto-merge — `glab` never deletes the source branch unless asked, so there is no opt-out flag to pass. The rest of the merge discipline (always a merge commit, meaning neither `--squash` nor `--rebase`; preserve full per-commit history; the `glab` CLI rather than the GitLab web UI) applies identically."

**Forge note** — insert this blockquote immediately before `## Why this exists`:

> **Forge note — GitLab.** This project uses GitLab, so PR commands are `glab mr`, not `gh pr`. Two differences matter beyond the rename: `glab mr merge` has **no `--merge` flag** (a merge commit is what you get by passing neither `--squash` nor `--rebase`, so the no-squash rule is still expressed by omission), and `--auto-merge` **defaults to true whenever a pipeline is running** — meaning the merge command can return success having only *scheduled* the merge. Every merge command below passes `--auto-merge=false` so that a zero exit means the merge actually happened.

## Azure DevOps

CLI: `az repos` (the `azure-devops` extension for the `az` CLI). Applies to **Azure DevOps Services only** — `dev.azure.com` and `*.visualstudio.com`.

**Not for on-premises.** Microsoft states plainly that "Azure DevOps CLI commands aren't supported for Azure DevOps Server" ([Complete, abandon, or revert pull requests](https://learn.microsoft.com/azure/devops/repos/git/complete-pull-requests)). Self-hosted Azure DevOps Server and TFS use the REST API instead — see the **Azure DevOps Server (on-premises)** section below. Routing a Server repo here produces a document whose every PR command fails at the CLI, not at the API.

**This one is not a flag rename.** Three behaviors differ in ways that change what a *correct* command looks like, and none is visible in `az repos pr --help`. They are why this forge emits a note into the generated doc while GitLab does not.

### Hazard 1 — `--squash false` must be explicit

Azure DevOps takes the completion strategy from a **per-repo default setting**, not from the command. `gh pr merge --merge` enforces no-squash by what it *omits*; the `az` equivalent enforces nothing unless the flag is present. Any instruction whose no-squash guarantee rests on an omission is silently wrong here.

### Hazard 2 — `--description` is list-valued

Per `az repos pr create --help`: "Each value sent to this arg will be a new line." Whether a multi-paragraph body survives therefore depends on how the shell hands the argument over:

- **Git Bash**, quoted (`--description "$DESC"`) — one argv element, newlines preserved.
- **PowerShell** — native-argument binding can split a multi-line string into several values, dropping or reordering paragraphs. Reported symptom: only the first paragraph arrives.

Separately, Azure DevOps caps PR descriptions at **4,000 characters**. That is a limit on the field itself, so changing delivery mechanism buys no extra room — two different problems, two different remedies.

### Hazard 3 — `az` silently drops unencodable characters

On Windows, `az` renders through the console codec (cp1252) and **discards** characters it cannot encode — em dashes, arrows, emoji — emitting only `WARNING: Unable to encode the output`. It is a drop, not a truncation, so the tail still looks intact and nothing marks the loss. `PYTHONIOENCODING=utf-8` does not prevent it; that governs Python, not `az`'s own output path.

Remedy: write PR bodies in pure ASCII (`--`, `->`, plain words), and read the description back after creating. Compare stored length against sent length **and** probe two or three distinctive substrings — a length match alone can hide a substitution.

**Site replacements:**

- **S1** — in the quoted fragment only: `` `gh pr merge` `` → `` `az repos pr update --status completed` ``
- **S2** — replace the `gh pr create --fill` line with:

  ```bash
  #    az has no --fill: title and description are both required input.
  az repos pr create --source-branch <branch-name> --target-branch main \
      --title '<type>(<scope>): <summary>' \
      --description "$PR_BODY"   # single argument, pure ASCII -- see the Forge note
  ```

- **S3** — **no `az` equivalent.** Azure DevOps has neither a `gh pr diff` nor a `gh api …contents?ref=` counterpart. Resolve the PR to its source branch and fall back to git, which reads better than the `gh` original anyway. **Replace from the `# Option 3:` comment line through the `# content -- don't use it for reading.` line inclusive** — the trailing two-line `# Note: gh pr view --json files ...` warning is part of this site and goes with it, rather than being left stranded above a block that no longer uses `gh`. Everything above `# Option 3:` (Options 1 and 2, which are pure git) stays. The replacement:

  ```bash
  # Option 3: if there's an open PR, read the PR's version. Azure DevOps has no
  #   single-command equivalent of `gh pr diff` / `gh api ...contents?ref=`, so resolve
  #   the PR to its source branch and fall back to git for the content itself:
  az repos pr show --id <pr-number> --query 'sourceRefName' -o tsv   # refs/heads/<branch>
  git fetch origin <pr-head-branch>
  #   a) The diff of the file as the PR changes it (good for seeing what's changed):
  git diff origin/main...origin/<pr-head-branch> -- docs/plans/audit-plan.md
  #   b) The full file content at the PR's head ref (good for reading the whole thing):
  git show origin/<pr-head-branch>:docs/plans/audit-plan.md
  ```

- **S4** — `az repos pr list` has no free-text `--search`; filter the returned list with JMESPath instead. **Keep the `<name>` placeholder** — the original searches for `plan <name>`, and collapsing it to the bare word `plan` returns every plan PR in the repo rather than the campaign you are looking for. Replace with:
  `` az repos pr list --status active --query "[?contains(title, '<name>')].{id:pullRequestId, title:title}" ``
  (JMESPath `contains` takes one substring, so this matches on `<name>` rather than the two-word phrase; that is the closest available parity.)
- **S5** — **no `az` equivalent.** There is no `gh pr checks --watch` counterpart. The surrounding advice (event-based waits, not sleep-and-poll) is unchanged and still correct; only the concrete tool moves. Replace the middle clause with: "Azure DevOps has no `gh pr checks --watch` equivalent, so use your agent framework's event-stream / Monitor tool against `az pipelines runs list --branch <branch> --top 1`, or the pipeline's webhook / push notification."
- **S6** — `# ALWAYS --merge. NEVER --squash. NEVER --rebase.` → `# ALWAYS a merge commit. NEVER squash. NEVER rebase.` Those are `gh` flag names and the `az` equivalents are not spelled that way, so keeping them would make the comment describe flags the command beneath it does not have.
- **S7** — replace with:

  ```bash
  # --squash false is explicit because Azure DevOps would otherwise use the
  # repo's default strategy.
  az repos pr update --id <number> --status completed \
      --squash false --delete-source-branch true
  ```

- **S8** — "the GitHub UI" → "the Azure DevOps web UI"
- **S12** — replace the whole sentence. A word-level edit leaves behind `--delete-branch=false` and the phrase "always `--merge`, never `--squash` or `--rebase`" — `gh` flag names that contradict the `--squash false` this very section requires. Replacement: "The `--delete-source-branch false` flag is the one explicit deviation from §Mechanics for auto-merge. The rest of the merge discipline (always a merge commit, which on Azure DevOps means an explicit `--squash false`; preserve full per-commit history; the `az` CLI rather than the Azure DevOps web UI) applies identically."
- **S9** — `gh pr list --state open` → `az repos pr list --status active`
- **S10** — `gh pr create --base <release> --head <integration> --title … --body …` → `az repos pr create --target-branch <release> --source-branch <integration> --title … --description …` (note the `--body` → `--description` rename in addition to base/head → target/source)
- **S11** — `gh pr merge <number> --merge --delete-branch=false` → `az repos pr update --id <number> --status completed --squash false --delete-source-branch false`. The `--delete-branch=false` semantics carry over cleanly; `--squash false` is still required for the reason in Hazard 1.

**Forge note** — insert this blockquote immediately before `## Why this exists`:

> **Forge note — Azure DevOps.** This project uses Azure DevOps, so PR commands are `az repos`, not `gh`. Three behaviors differ from GitHub in ways that change what a correct command looks like:
>
> 1. **`--squash false` is mandatory on every completion.** Azure DevOps reads the completion strategy from a per-repo default, not from the command, so omitting the flag does not mean "no squash" the way it does with `gh`. The no-squash invariant in §Mechanics for auto-merge depends on the flag being present.
> 2. **`--description` is list-valued** ("each value sent to this arg will be a new line"), so a multi-paragraph body survives only as a single quoted argument. Git Bash preserves it; PowerShell's native-argument binding can split it and drop paragraphs. Azure DevOps also caps descriptions at 4,000 characters — a separate limit that changing shells does not lift.
> 3. **`az` silently drops characters the console codec cannot encode** (em dashes, arrows, emoji), leaving only a `WARNING: Unable to encode the output` line. It is a drop, not a truncation, so the result still looks intact. Write PR bodies in pure ASCII, and read back after creating with `az repos pr show --id <n> --query description -o tsv` — compare length *and* probe a few distinctive substrings.

**If the project uses the Azure DevOps MCP server instead of the `az` CLI:** its PR tools are a valid substitute for the `az repos` calls above. Hazards 2 and 3 are **CLI-specific** and do not apply — an MCP server exchanging structured JSON neither splits a list-valued argument nor passes through the Windows console codec. **Hazard 1 does apply.** It is not a CLI behavior: Microsoft documents that when `mergeStrategy` is unset, *the service* "selects the first merge strategy not prohibited by the target branch's policy" ([GitPullRequestCompletionOptions](https://learn.microsoft.com/javascript/api/azure-devops-extension-api/gitpullrequestcompletionoptions)). Every client that omits the strategy — CLI, REST, or MCP — inherits branch policy. Confirm which knob your MCP server's completion tool exposes for it, but do not assume the default is a merge commit.

---

## Azure DevOps Server (on-premises)

Covers self-hosted **Azure DevOps Server** and its predecessor **TFS** — any host that is not `dev.azure.com` / `*.visualstudio.com` but serves the Azure DevOps URL shape `/<collection>/<project>/_git/<repo>`.

**There is no CLI for this forge.** `az repos` is not an option: Microsoft documents that "Azure DevOps CLI commands aren't supported for Azure DevOps Server." The REST API is the supported programmatic path, so this section maps to `curl` rather than to a CLI. That makes the commands longer than any other section here, which is the honest shape of this forge rather than a defect in the mapping.

### Setup the generated doc should assume

REST URLs follow `https://{server}/{collection}/{project}/_apis/{area}/{resource}?api-version={version}` (default collection `DefaultCollection`; default non-SSL port 8080). Authenticate with a PAT over Basic auth — `curl -u :$ADO_PAT`. Define these once near the top of the generated doc so the commands below stay readable:

```bash
ADO_BASE="https://<server>/<collection>/<project>/_apis/git/repositories/<repo>"
ADO_API="api-version=7.1"   # cap this at what your Server version supports:
                            # Server 2019 -> 5.0, 2020 -> 6.0, 2022 -> 7.0
```

### Hazard — `mergeStrategy` must be explicit

The same trap as the hosted service, and for the same reason, because it lives in the service rather than in any client: when `completionOptions.mergeStrategy` is unset, the service "selects the first merge strategy not prohibited by the target branch's policy." A completion call that omits it therefore inherits branch policy, which may well be squash. Send `"mergeStrategy": "noFastForward"` on every completion. (Do not reach for the older `squashMerge` boolean — Microsoft deprecated it, and it is ignored whenever `mergeStrategy` is set.)

Hazards 2 and 3 of the hosted-service section do **not** apply here: the description is a JSON string rather than a list-valued CLI argument, and nothing passes through the Windows console codec. The **4,000-character description cap** still does, since that is a limit on the field itself. Standard JSON escaping applies to the body, so a description containing quotes or newlines must be encoded rather than pasted — build it with `jq` or a here-doc into a file rather than by hand.

**Site replacements:**

- **S1** — in the quoted fragment only: `` `gh pr merge` `` → `` `PATCH .../pullrequests/<id>` with `status: completed` ``
- **S2** — replace the `gh pr create --fill` line with:

  ```bash
  # No --fill equivalent: title and description are both required input.
  # Build the body in a file so JSON escaping is handled once.
  jq -n --arg src "refs/heads/<branch-name>" --arg tgt "refs/heads/main" --arg title "<type>(<scope>): <summary>" --rawfile desc pr-body.md '{sourceRefName:$src, targetRefName:$tgt, title:$title, description:$desc}' > pr.json
  curl -sS -u :$ADO_PAT -H "Content-Type: application/json" -d @pr.json "$ADO_BASE/pullrequests?$ADO_API"
  ```

- **S3** — no single-command equivalent, same as the hosted service. Replace from the `# Option 3:` comment line through the `# content -- don't use it for reading.` line inclusive; everything above `# Option 3:` stays. The replacement:

  ```bash
  # Option 3: if there's an open PR, read the PR's version. There is no
  #   equivalent of `gh pr diff` / `gh api ...contents?ref=`, so resolve the PR
  #   to its source branch and fall back to git for the content itself:
  curl -sS -u :$ADO_PAT "$ADO_BASE/pullrequests/<pr-number>?$ADO_API" | jq -r .sourceRefName   # refs/heads/<branch>
  git fetch origin <pr-head-branch>
  #   a) The diff of the file as the PR changes it (good for seeing what's changed):
  git diff origin/main...origin/<pr-head-branch> -- docs/plans/audit-plan.md
  #   b) The full file content at the PR's head ref (good for reading the whole thing):
  git show origin/<pr-head-branch>:docs/plans/audit-plan.md
  ```

- **S4** — the API has no free-text search; filter client-side with `jq`, keeping the `<name>` placeholder rather than collapsing it to the bare word `plan`:
  `` curl -sS -u :$ADO_PAT "$ADO_BASE/pullrequests?searchCriteria.status=active&$ADO_API" | jq '.value[] | select(.title | contains("<name>")) | {id: .pullRequestId, title}' ``
- **S5** — no watch equivalent. Replace the middle clause with: "Azure DevOps Server has no `gh pr checks --watch` equivalent, so use your agent framework's event-stream / Monitor tool against the Builds REST endpoint (`GET /_apis/build/builds?branchName=refs/heads/<branch>`), or the pipeline's webhook / push notification."
- **S6** — `# ALWAYS --merge. NEVER --squash. NEVER --rebase.` → `# ALWAYS mergeStrategy noFastForward. NEVER squash. NEVER rebase.`
- **S7** — replace with:

  ```bash
  # mergeStrategy is explicit because an unset strategy makes the service fall
  # back to whatever the target branch policy permits -- which may be squash.
  # lastMergeSourceCommit is required: it is the source head the server last
  # evaluated, and completion is rejected if it does not match.
  SRC_SHA=$(curl -sS -u :$ADO_PAT "$ADO_BASE/pullrequests/<number>?$ADO_API" | jq -r .lastMergeSourceCommit.commitId)
  jq -n --arg sha "$SRC_SHA" '{status:"completed", lastMergeSourceCommit:{commitId:$sha}, completionOptions:{mergeStrategy:"noFastForward", deleteSourceBranch:true}}' > complete.json
  curl -sS -X PATCH -u :$ADO_PAT -H "Content-Type: application/json" -d @complete.json "$ADO_BASE/pullrequests/<number>?$ADO_API"
  ```

- **S8** — "the GitHub UI" → "the Azure DevOps Server web UI"
- **S9** — `gh pr list --state open` → `` curl -sS -u :$ADO_PAT "$ADO_BASE/pullrequests?searchCriteria.status=active&$ADO_API" | jq -r '.value[] | "\(.pullRequestId) \(.title)"' ``
- **S10** — same shape as S2, with `sourceRefName` = `refs/heads/<integration>` and `targetRefName` = `refs/heads/<release>`.
- **S11** — same shape as S7, with `deleteSourceBranch: false`. `mergeStrategy: "noFastForward"` is still required.
- **S12** — replace the whole sentence with: "`deleteSourceBranch: false` is the one explicit deviation from §Mechanics for auto-merge. The rest of the merge discipline (always `mergeStrategy: noFastForward`; preserve full per-commit history; the REST API rather than the Azure DevOps Server web UI) applies identically."

**Forge note** — insert this blockquote immediately before `## Why this exists`:

> **Forge note — Azure DevOps Server (on-premises).** This project is on a self-hosted Azure DevOps Server / TFS instance. **The `az` CLI does not work here** — Azure DevOps CLI commands are unsupported for Azure DevOps Server, so every PR operation below goes through the REST API with a PAT. Two things to keep in mind: completion **must** send `"mergeStrategy": "noFastForward"`, because an unset strategy makes the service fall back to whatever the target branch's policy allows (possibly squash) — the no-squash rule in §Mechanics for auto-merge depends on that field being present; and completion **must** send the current `lastMergeSourceCommit`, which the server rejects if stale, so read it immediately before completing rather than reusing an earlier value. Pin `api-version` to what your Server release supports (2019 → 5.0, 2020 → 6.0, 2022 → 7.0).

---

## Bitbucket

No official CLI equivalent. Apply no site replacements; emit the note and leave the `gh` commands in place as recognizable placeholders.

**Forge note:**

> **Forge note — Bitbucket.** This project uses Bitbucket. The `gh` commands below are placeholders — Bitbucket has no official equivalent CLI, so substitute the web UI or a third-party tool. The *policy* each command expresses (merge commit never squash, delete the source branch, one writer on the integration branch at a time) applies unchanged; only the mechanism differs.

---

## Unknown / self-hosted

Reached when the remote host matches no known forge, or there is no remote at all. Before falling through to here, check whether the host is a self-hosted instance of a forge that has a section: self-hosted **GitLab** uses the GitLab section unchanged, and self-hosted **Azure DevOps Server / TFS** has its own section — note that it does NOT use the hosted Azure DevOps section, because `az repos` does not work against Server. The URL shape identifies it when the host name does not: `/<collection>/<project>/_git/<repo>` is Azure DevOps Server.

Apply no site replacements; emit the note.

**Forge note:**

> **Forge note.** This project's forge was not identified automatically, so the `gh` commands below are unverified for it. Confirm the equivalent for your forge's CLI or web UI before relying on any of them. Pay particular attention to the merge command in §Mechanics for auto-merge: the no-squash rule is expressed there as the *absence* of a `--squash` flag, and some forges — Azure DevOps among them — take the completion strategy from a repo-level default instead, where an omitted flag means "whatever the repo is configured for" rather than "no squash".
