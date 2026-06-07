# Expected Findings — CI/CD fixture (companion pack + github-actions + docker-build)

**Purpose:** exercise the **CI/CD companion pack** + the **Pipeline cost model** + the `github-actions`
and `docker-build` modules on a deliberately-inefficient GitHub Actions workflow (`ci.yml`) and
`Dockerfile` for a Python service. This fixture is **config-shaped** (YAML + Dockerfile), not application
code — the "lanes" exercised are the ops-remapped ones (redundant-work / caching / job-parallelization /
image-&-cold-start). The CI/CD pack is a *companion*; here it is the whole scope. Illustrative (the files
live under `test-fixtures/`, not the repo's `.github/`, so they never run).

**Pack slice to provide:** `cicd.md` lane slices + the **Pipeline cost model** section + `cicd/github-actions.md`
+ `cicd/docker-build.md`. Do NOT let the agent read this rubric.

## Planted issues (should be found)

| # | Location | Lane / module | Issue |
|---|----------|---------------|-------|
| 1 | `ci.yml` (workflow top) | concurrency / github-actions | **No `concurrency` group with `cancel-in-progress`** → superseded PR runs keep burning runners |
| 2 | `ci.yml` `lint` (+`test`) | data-access / github-actions | **No dependency cache** (no `setup-python` `cache:`/`actions/cache`) → full network reinstall every run |
| 3 | `ci.yml` `on:` | algorithmic / github-actions | **No path filters** → a docs-only change runs the full build+test+image pipeline |
| 4 | `ci.yml` `needs:` chain | concurrency / github-actions | **`lint → test → build-image` serialized** though they share no data — they should fan out; `build-image` only needs a checkout |
| 5 | `ci.yml` `build-image` | payload-startup / github-actions | **`runs-on: macos-latest`** for a plain Linux container build → ~10× the billed minutes for no Apple reason |
| 6 | `Dockerfile` `COPY . .` | payload-startup / docker-build | **`COPY . .` before `pip install`** busts the dep-install layer on every source change |
| 7 | `Dockerfile` `FROM python:3.12` | payload-startup / docker-build | **Single-stage build** ships `build-essential` + full base in the runtime image (no multi-stage, no slim/distroless); **no `.dockerignore`** bloats the context |

## Beyond-the-pack (floor-not-ceiling — bonus, not a recall requirement)

| Location | Issue | Why it's beyond the pack |
|----------|-------|--------------------------|
| `ci.yml` `on: [push, pull_request]` | triggering on **both** `push` (all branches) and `pull_request` runs the whole workflow **twice** for every commit on a PR branch | No loaded bullet names the push+PR **double-trigger** — the pack names path filters and concurrency-cancel, but not that `push:` (unscoped) + `pull_request:` together duplicate every PR-branch run. The agent must reason about how the two trigger events overlap, not match a bullet. Fix: scope `push` to `branches: [main]` (or rely on `pull_request` alone). Finding it rewards out-reasoning; missing it is not a recall miss, but consistent misses ⇒ checklist-drift. |

## Decoy (should NOT be flagged)

| Location | Why it must be ignored |
|----------|------------------------|
| `ci.yml` `deploy` job `concurrency:` | the deploy job's concurrency group **intentionally omits `cancel-in-progress`** — cancelling a half-finished production deploy is worse than letting it finish (the github-actions module states this explicitly). Flagging "deploy lacks cancel-in-progress" is a precision/checklist failure. |

## Honeypot issues (boundary tests)

| Location | Issue | Perf-related? | Expected handling |
|----------|-------|---------------|-------------------|
| `ci.yml` `test` `actions/cache` key (HONEYPOT A) | `key: pip-${{ runner.os }}-${{ github.sha }}` embeds the commit SHA → the key changes every commit, so the cache **never restores** and pays save+restore for zero reuse | **Yes — the bug IS the slowness** | **Pursue as a performance finding** (defeated cache → cold install every run); fix the key to `hashFiles('**/requirements*.txt')` + `restore-keys` |
| `ci.yml` `test` `continue-on-error: true` (HONEYPOT B) | failing tests do not fail the build — the CI gate is broken | **No** | **Do NOT report as a perf finding** and do NOT chase; record to Suspected Bugs if noticed (a broken gate is a process/correctness issue, not pipeline cost) |

## Valid additional findings (credit — do NOT score as fabrications)

- `Dockerfile` `FROM python:3.12` — the full base (vs `-slim`) on the runtime stage is an *additional*
  size finding beyond #7's toolchain/`.dockerignore` (docker-build names slim/distroless).
- `ci.yml` `build-image` `docker build` — no `--cache-from`/buildx cache backend, so the image build is
  fully cold on the ephemeral runner every run (docker-build names ephemeral-runner-needs-cache-import).
- `ci.yml` `test` cache — no `restore-keys` fallback even once the key is fixed.

## Scoring

- **Recall** = (# of {1..7} found) / 7. #4 must state the jobs are independent (the fan-out guard);
  #5 should name the OS cost multiplier; #6 should name COPY-ordering; #7 should name multi-stage.
- **Precision** = the `deploy` no-cancel decoy not flagged (or explicitly rejected on the
  don't-cancel-a-deploy grounds); zero fabricated findings.
- **Beyond-the-pack** = the push+PR double-trigger flagged → bonus signal the agent reasons about trigger
  overlap rather than walking the bullet list.
- **Honeypots** = A found and pursued (counts toward recall as a perf finding); B not reported as perf and
  not chased.

## How to run

Dispatch lane subagents (algorithmic, data-access, concurrency, payload-startup) with the shared preamble +
that lane body from `../../lane-prompts.md`, the `cicd.md` lane slice + **Pipeline cost model** + the two
modules (`github-actions`, `docker-build`), and this directory as scope. Collect findings; score against
the tables above. Do not let the subagent read this file.

## Last run

**2026-06-05, Sonnet (4 lanes: algorithmic / data-access / concurrency / payload-startup) — GREEN.**
Recall **7/7** (most planted issues caught by 3–4 lanes); the **beyond-the-pack (push+PR double-trigger)
was found by all four lanes — and the prompts carried NO nudge this time**, so it is a *clean, blind*
result (each lane reasoned that a push to a branch with an open PR fires both events). The `deploy`
no-cancel **decoy** was explicitly examined and rejected by the concurrency lane; honeypot A (sha-keyed
cache) pursued as a perf finding by all lanes; honeypot B (`continue-on-error` broken gate) recorded to
Suspected Bugs and explicitly called "not a performance problem" by every lane; **zero fabrications**.
Valid extras surfaced (full-base-vs-`slim`, no `--cache-from`, no `restore-keys` — recorded above). The run
validates the novel companion pattern end-to-end: the ops-remapped lanes + the **Pipeline cost model**
section drove correct findings, the `#4` independence guard was stated, and the correctness honeypot was
routed, not chased.
