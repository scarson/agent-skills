# Agent Skills Specification (cached)

**Cached**: 2026-04-11
**Source**: https://agentskills.io/specification
**Cached by**: Claude Opus 4.6 (agent-skills thinking-log designer session)

> This is a local cache of the Agent Skills specification as of the fetch date. The authoritative source is https://agentskills.io/specification. Re-fetch before making significant format changes to `SKILL.md` files, since specs can evolve. This copy exists so future agents working in this repo can reference the spec without network access.

---

## Directory structure

A skill is a directory containing, at minimum, a `SKILL.md` file:

```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```

## `SKILL.md` format

The `SKILL.md` file must contain YAML frontmatter followed by Markdown content.

### Frontmatter

| Field           | Required | Constraints                                                                                                       |
| --------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `name`          | Yes      | Max 64 characters. Lowercase letters, numbers, and hyphens only. Must not start or end with a hyphen.             |
| `description`   | Yes      | Max 1024 characters. Non-empty. Describes what the skill does and when to use it.                                 |
| `license`       | No       | License name or reference to a bundled license file.                                                              |
| `compatibility` | No       | Max 500 characters. Indicates environment requirements (intended product, system packages, network access, etc.). |
| `metadata`      | No       | Arbitrary key-value mapping for additional metadata.                                                              |
| `allowed-tools` | No       | Space-separated string of pre-approved tools the skill may use. (Experimental)                                    |

**Minimal example**:

```markdown
---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

**Example with optional fields**:

```markdown
---
name: pdf-processing
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
license: Apache-2.0
metadata:
  author: example-org
  version: "1.0"
---
```

#### `name` field

- Must be 1-64 characters
- May only contain unicode lowercase alphanumeric characters (`a-z`) and hyphens (`-`)
- Must not start or end with a hyphen (`-`)
- Must not contain consecutive hyphens (`--`)
- **Must match the parent directory name**

Valid: `pdf-processing`, `data-analysis`, `code-review`
Invalid: `PDF-Processing` (uppercase), `-pdf` (leading hyphen), `pdf--processing` (consecutive hyphens)

#### `description` field

- Must be 1-1024 characters
- Should describe both what the skill does and when to use it
- Should include specific keywords that help agents identify relevant tasks

Good: "Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction."

Poor: "Helps with PDFs."

#### `license` field (optional)

Specifies the license applied to the skill. Keep it short (either the name of a license or the name of a bundled license file).

```yaml
license: Proprietary. LICENSE.txt has complete terms
```

#### `compatibility` field (optional)

- Must be 1-500 characters if provided
- Should only be included if your skill has specific environment requirements
- Can indicate intended product, required system packages, network access needs, etc.

```yaml
compatibility: Designed for Claude Code (or similar products)
compatibility: Requires git, docker, jq, and access to the internet
compatibility: Requires Python 3.14+ and uv
```

**Note**: most skills do not need the `compatibility` field.

#### `metadata` field (optional)

- A map from string keys to string values
- Clients can use this to store additional properties not defined by the spec
- Key names should be reasonably unique to avoid accidental conflicts

```yaml
metadata:
  author: example-org
  version: "1.0"
```

#### `allowed-tools` field (optional, experimental)

- A space-separated string of tools that are pre-approved to run
- Experimental. Support may vary between agent implementations

```yaml
allowed-tools: Bash(git:*) Bash(jq:*) Read
```

### Body content

The Markdown body after the frontmatter contains the skill instructions. No format restrictions.

Recommended sections:
- Step-by-step instructions
- Examples of inputs and outputs
- Common edge cases

**The agent will load this entire file once it's decided to activate a skill. Consider splitting longer `SKILL.md` content into referenced files.**

## Optional directories

### `scripts/`

Contains executable code that agents can run. Scripts should:
- Be self-contained or clearly document dependencies
- Include helpful error messages
- Handle edge cases gracefully

Supported languages depend on the agent implementation. Common options include Python, Bash, and JavaScript.

### `references/`

Contains additional documentation that agents can read when needed:
- `REFERENCE.md` — Detailed technical reference
- `FORMS.md` — Form templates or structured data formats
- Domain-specific files (`finance.md`, `legal.md`, etc.)

Keep individual reference files focused. Agents load these on demand, so smaller files mean less use of context.

### `assets/`

Contains static resources:
- Templates (document templates, configuration templates)
- Images (diagrams, examples)
- Data files (lookup tables, schemas)

## Progressive disclosure

Skills should be structured for efficient use of context:

1. **Metadata** (~100 tokens): The `name` and `description` fields are loaded at startup for all skills
2. **Instructions** (< 5000 tokens recommended): The full `SKILL.md` body is loaded when the skill is activated
3. **Resources** (as needed): Files (e.g. those in `scripts/`, `references/`, or `assets/`) are loaded only when required

**Keep your main `SKILL.md` under 500 lines.** Move detailed reference material to separate files.

## File references

When referencing other files in your skill, use relative paths from the skill root:

```markdown
See [the reference guide](references/REFERENCE.md) for details.

Run the extraction script:
scripts/extract.py
```

Keep file references one level deep from `SKILL.md`. Avoid deeply nested reference chains.

## Validation

Use the `skills-ref` reference library (https://github.com/agentskills/agentskills/tree/main/skills-ref) to validate your skills:

```bash
skills-ref validate ./my-skill
```

This checks that your `SKILL.md` frontmatter is valid and follows all naming conventions.

---

## Notes for the agent-skills repo (not part of the spec)

The agentskills.io specification is silent on **discovery paths** — where tools look for installed skills. That's the consumer tool's problem, not part of the spec. The following notes reflect Claude Code and Codex CLI discovery conventions as of the cache date.

### Known tool discovery paths (as of 2026-04-10)

**Claude Code**:
- `~/.claude/skills/<skill-name>/SKILL.md` — user-scoped (primary)
- `.claude/skills/<skill-name>/SKILL.md` — project-scoped

**Codex CLI** (source: `openai/codex` `codex-rs/core-skills/src/loader.rs`):
- `~/.agents/skills/<skill-name>/SKILL.md` — user-scoped (primary, idiomatic, **not deprecated**)
- `~/.codex/skills/<skill-name>/SKILL.md` — user-scoped (deprecated in loader comments, kept for backward compatibility)
- `<project>/.agents/skills/<skill-name>/SKILL.md` — project-scoped (primary)
- `<project>/.codex/skills/<skill-name>/SKILL.md` — project-scoped (config-layer convention, how openai/codex itself dogfoods skills)
- `/etc/codex/skills/` — admin-scoped (Unix)
- `$CODEX_HOME/skills/.system/` — bundled system skills (don't touch)

The `.agents/skills/` directory is intended as a **tool-agnostic convention** — the `.agents/` prefix (as opposed to `.codex/` or `.claude/`) signals that any future agent tool adopting this convention can discover skills there without each tool claiming its own subdirectory. Codex's loader explicitly follows symlinks and directory junctions for user-scope discovery.

### Optional Codex-specific metadata

Codex CLI supports an optional sibling file at `<skill-name>/agents/openai.yaml` with Codex-specific hints:

- `display_name` — friendlier name shown in Codex UI
- `icon` — icon path or emoji
- `allow_implicit_invocation` — policy flag for whether Codex can invoke the skill without explicit user permission
- `product_restrictions` — any Codex-specific product constraints

Purely additive. Spec-compliant skills without this file still load fine in Codex CLI. If you want a skill to have nicer Codex UX specifically, add this file.

### Install strategy for the agent-skills repo

The `scripts/install.sh` and `scripts/install.ps1` in this repo create symlinks (Unix) or directory junctions (Windows) from the canonical source tree (`agent-skills/skills/<name>/`) into both harness directories simultaneously:

- `~/.claude/skills/<name>/` → `agent-skills/skills/<name>/`
- `~/.agents/skills/<name>/` → `agent-skills/skills/<name>/`

This way a single canonical source serves both tools with zero per-tool transformation. The SKILL.md format is identical across Claude Code and Codex CLI.