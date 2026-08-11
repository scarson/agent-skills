# stop-slop

Removes predictable AI writing patterns from prose — filler phrases, formulaic
structures, passive voice, vague declaratives.

**Agents should read [`SKILL.md`](SKILL.md).** This file is human-facing: it records
where the skill came from and how to update it.

## Attribution

This skill is **vendored third-party work**, not written for this repository.

| | |
|---|---|
| Upstream | <https://github.com/hardikpandya/stop-slop> |
| Author | Hardik Pandya — <https://hvpandya.com> |
| Licence | MIT — see [`LICENSE`](LICENSE) |
| Vendored at commit | `8da1f030185bdfe8471220585162991eaeb970e9` |
| Upstream commit date | 2026-03-18 |
| Vendored on | 2026-07-27 |

The MIT licence permits copying and redistribution on the condition that the
copyright notice and licence text travel with the copy. That is why [`LICENSE`](LICENSE)
sits in this directory rather than being summarised here — it is a condition of use,
not a courtesy.

## What was and was not changed

Nothing in the skill was modified. `SKILL.md`, `references/examples.md`,
`references/phrases.md`, `references/structures.md`, and `LICENSE` are
**byte-identical** to the upstream blobs at the commit above, verified with `cmp`
against `git show`.

Two organisational changes were made around it, neither touching content:

- Upstream's `CHANGELOG.md` is vendored as [`UPSTREAM-CHANGELOG.md`](UPSTREAM-CHANGELOG.md).
  The rename keeps it from being mistaken for a changelog of *this* repository's
  changes, since it documents the upstream author's releases.
- Upstream's own `README.md` was not vendored. It describes installing the skill as a
  standalone repository, which does not apply here — this file replaces it.

`SKILL.md` retains the author's own `metadata.author` line. It was left in place
deliberately: removing an author's attribution from their own file to relocate it
here would be worse, not tidier.

## Updating it

```bash
git clone --depth 1 https://github.com/hardikpandya/stop-slop /tmp/stop-slop
```

Copy `SKILL.md`, `references/*.md`, and `LICENSE` from the **stored blobs**
(`git show HEAD:<path>`), not from the working tree. On Windows, `core.autocrlf`
rewrites line endings during checkout, so a working-tree copy can differ from
upstream byte-for-byte while being semantically identical — reading the blob avoids
that entirely.

Then update the commit SHA, its date, and the vendored-on date in the table above,
and bump the `utility` plugin version per `docs/releasing.md`.

## Note on duplicate installs

If you also have this skill installed standalone at `~/.claude/skills/stop-slop`,
two skills named `stop-slop` will be discoverable at once — the personal copy and
this plugin's. Remove the standalone copy after installing the `utility` plugin so
the name resolves unambiguously.
