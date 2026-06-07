# agent-skills

Sam Carson's personal agent skills library. A marketplace of installable plugins, each bundling one or more skills. Portable across [Claude Code](https://claude.com/claude-code) and [Codex](https://developers.openai.com/codex) via the shared `skills/<name>/SKILL.md` convention.

## Architecture

The repo is organized in three nesting levels:

- **marketplace** (the repo itself) — a catalog that lists every plugin it publishes
- **plugin** (`plugins/<plugin-name>/`) — the unit of distribution; consumers install or uninstall a whole plugin
- **skill** (`plugins/<plugin-name>/skills/<skill-name>/`) — the unit of agent invocation; each skill is a directory with a `SKILL.md`

A plugin is a cohesive bundle of skills that install together. It might be one standalone utility skill, or several tightly-coupled skills that co-evolve. Grouping is the skill author's call.

### Current plugins

| Plugin | Skills |
|---|---|
| `utility` | `url-to-markdown` |
| `project-setup` | `claude-agents-md-init`, `git-strategy-init`, `pitfalls-docs-init`, `project-init` |
| `superpowers-plus` | `build-robust-features`, `bug-hunt-cycle`, `bug-hunter-differential`, `bug-hunter-exploratory`, `bug-hunter-holistic`, `bug-hunter-multipass`, `handoff`, `health-review-cycle`, `performance-audit`, `performance-audit-cycle`, `plan-review-cycle`, `project-health-review`, `writing-plans-enhanced` |

## What's here

- **`plugins/`** — the portable core. Each subdirectory is one plugin containing its own manifests and `skills/`. Both Claude Code and Codex discover skills from the `skills/<name>/SKILL.md` layout inside each plugin.
- **`scripts/install.ps1`, `scripts/install.sh`** — repo-level installers that create junctions (Windows) or symlinks (macOS/Linux/WSL) for every skill in every plugin into the discovery paths for both agents.
- **`.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`** — marketplace catalogs listing every plugin in this repo.

## Install (personal use)

Clone the repo, then run the installer for your platform. It's idempotent — safe to re-run after adding new skills or plugins.

**Windows (PowerShell):**

```powershell
git clone https://github.com/scarson/agent-skills.git C:\Users\<you>\Code\agent-skills
cd C:\Users\<you>\Code\agent-skills
pwsh scripts/install.ps1
```

**macOS / Linux / WSL (bash):**

```bash
git clone https://github.com/scarson/agent-skills.git ~/Code/agent-skills
cd ~/Code/agent-skills
bash scripts/install.sh
```

Both scripts support `-DryRun` / `--dry-run` to preview without making changes, and `-Refresh` / `--refresh` to remove and recreate entries that point to a stale source (useful when a skill has moved between plugins, or when cleaning up after the Windows-bash failure mode below).

```powershell
pwsh scripts/install.ps1 -Refresh   # Windows
```

```bash
bash scripts/install.sh --refresh   # macOS/Linux/WSL
```

After install, restart Claude Code and/or Codex so they rediscover skills.

#### Why install.sh refuses to run on native Windows

`install.sh` exits with an error on Windows MSYS / Cygwin / MINGW (git-bash) because `ln -s` there silently falls back to copying directories whenever the user lacks the `SeCreateSymbolicLink` privilege (the typical case without admin or Developer Mode). The script *appears* to succeed but actually creates real directory copies that drift from the source repo on every edit. Use `install.ps1` on Windows — it uses native directory junctions via `cmd /c mklink /J`, which work without elevated privileges. WSL bash is unaffected and works fine; that's a real Linux kernel.

### What the installer creates

For every skill in every plugin, the installer creates a junction/symlink in both discovery paths:

```
~/.claude/skills/<skill-name>   →  <repo>/plugins/<plugin>/skills/<skill-name>    (Claude Code)
~/.agents/skills/<skill-name>   →  <repo>/plugins/<plugin>/skills/<skill-name>    (Codex)
```

The junction is named by **skill name**, not plugin name — agents discover skills, not plugins, via these paths. Plugin boundaries matter at marketplace-install time, not at junction-install time.

### Removing a skill (Windows safety)

On Windows, junctions are reparse points — they look like directories but point elsewhere. **Never** use `rm -rf` from bash or git-bash on a junction: it will traverse into the target and delete the real files in this repo.

Safe removal:
- `rmdir "$HOME\.claude\skills\<skill-name>"` (cmd)
- `Remove-Item "$HOME\.claude\skills\<skill-name>"` (PowerShell, no `-Recurse`)

On macOS/Linux, `rm ~/.claude/skills/<skill-name>` (no `-r`) removes just the symlink.

## Adding a new skill

First decide which plugin it belongs to:

- **Adding to an existing plugin** — put the skill under `plugins/<existing-plugin>/skills/<skill-name>/`.
- **Creating a new plugin** — see [Adding a new plugin](#adding-a-new-plugin) below first, then add the skill inside it.

Then:

1. Create `plugins/<plugin>/skills/<skill-name>/SKILL.md` with YAML frontmatter:

   ```markdown
   ---
   name: <skill-name>
   description: One-line description that explains exactly when this skill should trigger.
   ---

   Instructions for the agent. Keep them imperative and specific.
   ```

2. Add any helper scripts to `plugins/<plugin>/skills/<skill-name>/scripts/` and references to `plugins/<plugin>/skills/<skill-name>/references/`.

3. Re-run `scripts/install.ps1` (or `install.sh`) to junction/symlink the new skill.

4. Restart the agent(s) to pick up the new skill.

### Skill layout conventions

Both Claude Code and Codex honor the [Agent Skills specification](https://github.com/openai/skills). Common optional subdirectories inside a skill:

- `scripts/` — executable helpers the skill invokes
- `references/` — documentation the skill reads on demand
- `assets/` — templates, images, other static resources
- `tests/` — test fixtures for the skill's own scripts

### Platform-specific metadata

A skill can add optional Codex-specific metadata at `agents/openai.yaml` inside the skill directory for display name, brand color, and implicit-invocation policy. Claude Code ignores this file, so it's safe to include.

## Adding a new plugin

1. Create the plugin directory with both manifests:

   ```
   plugins/<plugin-name>/
   ├── .claude-plugin/plugin.json
   ├── .codex-plugin/plugin.json
   └── skills/
   ```

2. Copy and adapt the manifests from an existing plugin (e.g., `plugins/utility/`). Use kebab-case for the plugin name — both Codex and Claude Code require it.

3. Register the plugin in both marketplace catalogs:
   - `.claude-plugin/marketplace.json` — add an entry to `plugins[]` with `"source": "./plugins/<plugin-name>"`.
   - `.agents/plugins/marketplace.json` — add an entry with `"source": { "source": "local", "path": "./plugins/<plugin-name>" }`.

4. Add skills to `plugins/<plugin-name>/skills/` per [Adding a new skill](#adding-a-new-skill).

5. Re-run `scripts/install.ps1` / `install.sh` to junction/symlink the new skills.

## Distributing as a plugin

For personal use, the install script is enough. The plugin manifests exist so this repo can also be installed as a first-class plugin via marketplace mechanics — useful when sharing with others, or when you want per-plugin enable/disable toggles.

Consumers install plugins individually. You don't have to take everything in the marketplace — just the plugins you want.

### Which form should I use?

| Scenario | Recommended form |
|---|---|
| Your own machine, personal use | `scripts/install.ps1` / `install.sh` (junctions) — simplest, live edits reflect immediately |
| Iterating on plugin manifests | Local-path marketplace install — exercises the manifest wiring |
| Sharing with a collaborator (private repo) | GitHub URL (Claude Code) or clone + local path (Codex) |
| Public distribution | GitHub URL (Claude Code); clone + local path (Codex, until URL install ships) |

### Local path vs GitHub URL

Claude Code's `/plugin marketplace add` accepts both a local directory path and a GitHub URL:

- **Local path** — agent reads from the source tree. Edits are live; no cache layer. Required for Codex today (it has no URL-install equivalent).
- **GitHub URL** — Claude Code clones into `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`. Updates require an explicit refresh. Enables sharing without giving collaborators filesystem paths.

### Claude Code

**Add the marketplace, then install whichever plugins you want:**

```
/plugin marketplace add C:\Users\Sam\Code\agent-skills
/plugin install utility@scarson-skills
/plugin install project-setup@scarson-skills
/plugin install superpowers-plus@scarson-skills
```

Or from GitHub (public or private):

```
/plugin marketplace add https://github.com/scarson/agent-skills
/plugin install superpowers-plus@scarson-skills
```

#### Credentials for private repos

`/plugin marketplace add <url>` shells out to `git clone`, which uses your system git credentials:

- **Windows** — Git Credential Manager stores your GitHub token in Windows Credential Manager. Any successful `git push` / `git fetch` caches it. Claude Code inherits it transparently.
- **macOS** — Keychain via `git config --global credential.helper osxkeychain`, or Git Credential Manager.
- **Linux / WSL** — `libsecret` helper, or Git Credential Manager installed manually.

If `/plugin marketplace add <private-url>` hangs or fails against a private repo, the usual cause is an empty credential cache and no terminal to prompt. Warm the cache by running this in any shell, then retry:

```bash
git ls-remote https://github.com/scarson/agent-skills.git
```

After that succeeds, the Claude Code install succeeds too.

**Collaborators on a private repo**: add them on GitHub. Their GCM/gh handles the token, and the URL form works identically to yours — no additional plugin-side configuration needed.

### Codex

Codex's plugin system (as of 2026-04-20) supports **local marketplace files only** — no native GitHub-URL install equivalent yet. Both installation modes start with cloning the repo.

**Repo-scoped install** — register the repo as a local marketplace, then install plugins from the TUI:

```bash
git clone https://github.com/scarson/agent-skills.git ~/Code/agent-skills
codex plugin marketplace add ~/Code/agent-skills
codex
# /plugins  →  Sam's Agent Skills  →  install utility, project-setup, etc.
```

Alternatively, Codex auto-discovers `.agents/plugins/marketplace.json` when launched from inside the repo — launching `codex` from the clone directory has the same effect as the explicit `add`.

**Private Codex install**: because Codex clones via plain `git`, the same credential-manager rules as Claude Code apply. If you can `git clone <private-url>` from a terminal, you can install the plugin.

## Repo layout

```
agent-skills/
├── plugins/                              # every plugin this repo publishes
│   ├── utility/
│   │   ├── .claude-plugin/plugin.json    # Claude Code plugin manifest
│   │   ├── .codex-plugin/plugin.json     # Codex plugin manifest
│   │   └── skills/
│   │       └── url-to-markdown/
│   │           ├── SKILL.md              # required; name + description frontmatter
│   │           ├── scripts/              # optional; helper code
│   │           ├── references/           # optional; read-on-demand docs
│   │           └── agents/openai.yaml    # optional; Codex UI metadata
│   ├── project-setup/                    # CLAUDE.md/AGENTS.md, git strategy, pitfalls bootstrap
│   │   ├── .claude-plugin/plugin.json
│   │   ├── .codex-plugin/plugin.json
│   │   └── skills/
│   │       ├── claude-agents-md-init/
│   │       ├── git-strategy-init/
│   │       ├── pitfalls-docs-init/
│   │       └── project-init/             # one-command wrapper around the three above
│   └── superpowers-plus/                 # workflow orchestration (10 skills)
│       ├── .claude-plugin/plugin.json
│       ├── .codex-plugin/plugin.json
│       ├── README.md                     # plugin-level overview
│       └── skills/
│           ├── build-robust-features/    # design → plan → execute chain
│           ├── bug-hunt-cycle/           # full bug-hunt workflow (composes the 4 hunters)
│           ├── bug-hunter-differential/  # hunter methodology — paired-function invariants
│           ├── bug-hunter-exploratory/   # hunter methodology — depth-first
│           ├── bug-hunter-holistic/      # hunter methodology — read-everything-then-reason
│           ├── bug-hunter-multipass/     # hunter methodology — five focused passes
│           ├── handoff/                  # structured session handoff
│           ├── health-review-cycle/      # full health-review workflow (wraps project-health-review)
│           ├── plan-review-cycle/        # adversarial multi-round plan review
│           ├── project-health-review/    # five-axis adversarial dispatch
│           └── writing-plans-enhanced/   # subagent-proofed plans + Living Document Contract
├── .claude-plugin/
│   └── marketplace.json                  # Claude Code marketplace catalog
├── .agents/plugins/
│   └── marketplace.json                  # Codex marketplace catalog
├── docs/                                 # design docs and plans
└── scripts/
    ├── install.ps1                       # Windows installer (junctions)
    └── install.sh                        # macOS/Linux/WSL installer (symlinks)
```

## Status

Pre-1.0. Plugin structure is stable; skill contents are evolving. Directory conventions inside individual skills may continue to shift as the shared-foundation proposal for related skills lands.

## License

MIT — see [LICENSE](LICENSE).
