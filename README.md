# agent-skills

Sam Carson's personal agent skills library — a marketplace of installable plugins, each bundling one or more skills. Portable across [Claude Code](https://claude.com/claude-code) and [Codex](https://developers.openai.com/codex) via the shared `skills/<name>/SKILL.md` convention.

## Architecture

The repo is organized in three nesting levels:

- **marketplace** (the repo itself) — a catalog that lists every plugin it publishes
- **plugin** (`plugins/<plugin-name>/`) — the unit of distribution; you install or uninstall a whole plugin
- **skill** (`plugins/<plugin-name>/skills/<skill-name>/`) — the unit of agent invocation; each skill is a directory with a `SKILL.md`

A plugin is a cohesive bundle of skills that install together — one standalone utility, or several tightly-coupled skills that co-evolve.

### Current plugins

| Plugin | Skills |
|---|---|
| `project-setup` | `claude-agents-md-init`, `git-strategy-init`, `pitfalls-docs-init`, `project-init` |
| `superpowers-plus` | `build-robust-features`, `bug-hunt-cycle`, `bug-hunter-differential`, `bug-hunter-exploratory`, `bug-hunter-holistic`, `bug-hunter-multipass`, `handoff`, `health-review-cycle`, `performance-audit`, `performance-audit-cycle`, `plan-review-cycle`, `project-health-review`, `writing-plans-enhanced` |
| `utility` | `url-to-markdown` |

## Install

There are two ways to install. **Use the marketplace method unless you have a specific reason not to** — it works the same on Claude Code and Codex and needs nothing but the repo URL. Install only the plugins you want; you don't have to take everything.

### Method 1 — Marketplace (recommended)

**Claude Code** — add the marketplace, then install plugins:

```
/plugin marketplace add https://github.com/scarson/agent-skills
/plugin install project-setup@scarson-agent-skills
/plugin install superpowers-plus@scarson-agent-skills
/plugin install utility@scarson-agent-skills
```

**Codex** — add the marketplace, then install from the `/plugins` menu:

```bash
codex plugin marketplace add scarson/agent-skills
codex
# /plugins → Sam's Agent Skills → install project-setup, superpowers-plus, utility
```

Codex can pin a branch or tag with `scarson/agent-skills@<ref>`. Restart the agent after installing so it discovers the new skills.

### Method 2 — Clone and run the installer

Choose this if you want to **edit skills locally and have changes take effect immediately**, with no cache layer in between. The installer creates directory junctions (Windows) or symlinks (macOS/Linux/WSL) from each agent's discovery path into your clone. It's idempotent — safe to re-run after adding skills or plugins.

**Windows (PowerShell):**

```powershell
git clone https://github.com/scarson/agent-skills.git
cd agent-skills
pwsh scripts/install.ps1
```

**macOS / Linux / WSL (bash):**

```bash
git clone https://github.com/scarson/agent-skills.git
cd agent-skills
bash scripts/install.sh
```

Both scripts accept `-DryRun` / `--dry-run` (preview without changes) and `-Refresh` / `--refresh` (recreate entries that point at a stale source — handy after a skill moves between plugins). Restart the agent afterward.

#### Windows: use `install.ps1`, not `install.sh`

`install.sh` refuses to run on native Windows (MSYS / Cygwin / MINGW / git-bash). There, `ln -s` silently falls back to *copying* directories whenever the user lacks the `SeCreateSymbolicLink` privilege — the typical case without admin or Developer Mode. The script appears to succeed but creates real copies that drift from the repo on every edit. `install.ps1` uses native junctions via `cmd /c mklink /J`, which work without elevation. WSL bash is a real Linux kernel and is unaffected.

#### What the installer creates

For every skill in every plugin, a junction/symlink in both agents' discovery paths:

```
~/.claude/skills/<skill-name>   →  <repo>/plugins/<plugin>/skills/<skill-name>    (Claude Code)
~/.agents/skills/<skill-name>   →  <repo>/plugins/<plugin>/skills/<skill-name>    (Codex)
```

Entries are named by **skill**, not plugin — agents discover skills, not plugins, via these paths.

#### Removing a skill safely

On Windows, junctions are reparse points that look like directories but point elsewhere. **Never** `rm -rf` a junction from bash/git-bash — it traverses into the target and deletes the real files in the repo. Instead:

- `rmdir "$HOME\.claude\skills\<skill-name>"` (cmd), or
- `Remove-Item "$HOME\.claude\skills\<skill-name>"` (PowerShell, no `-Recurse`)

On macOS/Linux, `rm ~/.claude/skills/<skill-name>` (no `-r`) removes just the symlink.

## Adding a new skill

First decide which plugin it belongs to — an existing one (`plugins/<existing-plugin>/skills/`) or a new plugin (see [Adding a new plugin](#adding-a-new-plugin) first). Then:

1. Create `plugins/<plugin>/skills/<skill-name>/SKILL.md` with YAML frontmatter:

   ```markdown
   ---
   name: <skill-name>
   description: One line that explains exactly when this skill should trigger.
   ---

   Instructions for the agent. Keep them imperative and specific.
   ```

   Keep `description` under **1024 characters** — Codex rejects longer ones (Claude Code is lenient, so it won't catch the overflow for you). Pack it with trigger phrases; put detail in the body.

2. Add helper code to `scripts/` and read-on-demand docs to `references/` inside the skill directory.
3. If you installed via Method 2, re-run `scripts/install.ps1` / `install.sh` to junction the new skill. (Marketplace installs pick it up on the next update.)
4. Restart the agent(s) to load it.

### Skill layout conventions

Both agents honor the [Agent Skills specification](https://github.com/openai/skills). Common optional subdirectories inside a skill:

- `scripts/` — executable helpers the skill invokes
- `references/` — documentation the skill reads on demand
- `assets/` — templates, images, other static resources
- `tests/` — fixtures for the skill's own scripts

### Platform-specific metadata

A skill may add optional Codex metadata at `agents/openai.yaml` (display name, brand color, implicit-invocation policy). Claude Code ignores this file, so it's safe to include.

## Adding a new plugin

1. Create the plugin directory with both manifests:

   ```
   plugins/<plugin-name>/
   ├── .claude-plugin/plugin.json
   ├── .codex-plugin/plugin.json
   └── skills/
   ```

2. Copy and adapt the manifests from an existing plugin (e.g. `plugins/utility/`). Use kebab-case for the plugin name — both agents require it.
3. Register the plugin in both marketplace catalogs:
   - `.claude-plugin/marketplace.json` — add to `plugins[]` with `"source": "./plugins/<plugin-name>"`.
   - `.agents/plugins/marketplace.json` — add an entry with `"source": { "source": "local", "path": "./plugins/<plugin-name>" }`.
4. Add skills per [Adding a new skill](#adding-a-new-skill).
5. If installed via Method 2, re-run the installer to junction the new skills.

## Repo layout

```
agent-skills/
├── plugins/                              # every plugin this repo publishes
│   ├── project-setup/                    # CLAUDE.md/AGENTS.md, git strategy, pitfalls bootstrap
│   │   ├── .claude-plugin/plugin.json    # Claude Code plugin manifest
│   │   ├── .codex-plugin/plugin.json     # Codex plugin manifest
│   │   └── skills/
│   │       ├── claude-agents-md-init/
│   │       ├── git-strategy-init/
│   │       ├── pitfalls-docs-init/
│   │       └── project-init/             # one-command wrapper around the three above
│   ├── superpowers-plus/                 # workflow orchestration (13 skills)
│   │   ├── .claude-plugin/plugin.json
│   │   ├── .codex-plugin/plugin.json
│   │   ├── README.md                     # plugin-level overview
│   │   └── skills/
│   │       ├── build-robust-features/    # design → plan → execute chain
│   │       ├── bug-hunt-cycle/           # full bug-hunt workflow (composes the 4 hunters)
│   │       ├── bug-hunter-differential/  # hunter methodology — paired-function invariants
│   │       ├── bug-hunter-exploratory/   # hunter methodology — depth-first
│   │       ├── bug-hunter-holistic/      # hunter methodology — read-everything-then-reason
│   │       ├── bug-hunter-multipass/     # hunter methodology — five focused passes
│   │       ├── handoff/                  # structured session handoff
│   │       ├── health-review-cycle/      # full health-review workflow (wraps project-health-review)
│   │       ├── performance-audit/        # multi-lane performance review + execution-cost map
│   │       ├── performance-audit-cycle/  # full performance-audit workflow (wraps performance-audit)
│   │       ├── plan-review-cycle/        # adversarial multi-round plan review
│   │       ├── project-health-review/    # five-axis adversarial dispatch
│   │       └── writing-plans-enhanced/   # subagent-proofed plans + Living Document Contract
│   └── utility/
│       ├── .claude-plugin/plugin.json
│       ├── .codex-plugin/plugin.json
│       └── skills/
│           └── url-to-markdown/
│               ├── SKILL.md              # required; name + description frontmatter
│               ├── scripts/              # optional; helper code
│               ├── references/           # optional; read-on-demand docs
│               └── agents/openai.yaml    # optional; Codex UI metadata
├── .claude-plugin/
│   └── marketplace.json                  # Claude Code marketplace catalog
├── .agents/plugins/
│   └── marketplace.json                  # Codex marketplace catalog
└── scripts/
    ├── install.ps1                       # Windows installer (junctions)
    └── install.sh                        # macOS/Linux/WSL installer (symlinks)
```

## Status

Pre-1.0. Plugin structure is stable; skill contents are evolving. Directory conventions inside individual skills may continue to shift as the shared-foundation proposal for related skills lands.

## License

MIT — see [LICENSE](LICENSE).
