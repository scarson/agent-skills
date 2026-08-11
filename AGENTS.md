# AGENTS.md

Guidance for Codex, Cursor, Cline, and other AGENTS.md-aware frameworks working in this repository. This is a marketplace of agent-skill plugins: each directory under `plugins/` is an installable plugin, and each `plugins/<plugin>/skills/<skill>/SKILL.md` is a skill.

> **Sibling file.** `CLAUDE.md` carries the same pointers for Claude Code. Both are intentionally thin — they route to authoritative docs rather than restating them. When adding a pointer to one, add it to the other.

## Where documents go

- `docs/specs/` — design docs and implementation plans, named `YYYY-MM-DD-<topic>-<design|plan>.md`. This overrides any skill's default spec location; write new specs here, not to `docs/superpowers/specs/`.
- `docs/plans/` — older working documents, trackers, and `START-` handoff notes, kept where they are rather than moved.
- `docs/releasing.md` — the release convention (see below).

## Before committing changes under `plugins/`

**Read `docs/releasing.md` — the plugin version bump rule and release process.**

The short version: any change under `plugins/<name>/` must bump that plugin's version via `node scripts/bump-plugin-version.mjs <name> <minor|patch>`, because plugins install to a version-keyed path and an unbumped change never reaches an installed user. This applies to `plugins/<name>/.codex-plugin/plugin.json` as much as to its `.claude-plugin` twin — the two must always agree, which is why the bump script writes both. A pre-commit hook enforces this and prints the command you need. The document covers which digit to choose, which is the part the hook cannot decide.
