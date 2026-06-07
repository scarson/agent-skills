---
index_schema_version: 1
ecosystem: cicd
covered_through: "GitHub Actions (cache service v2 / actions/cache v4 / artifact actions v4) as of 2026-06; Docker BuildKit (buildx cache backends, gha/registry); Azure DevOps Pipelines (Cache@2, Sprint 209 checkout defaults, parallel-job grant); GitLab CI (cache/needs/rules/workflow, GIT_DEPTH); Jenkins (plugin-driven idioms)"
built_on: 2026-06-05
sources:
  - https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
  - https://github.com/actions/cache
  - https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
  - https://github.blog/changelog/2022-10-10-github-actions-deprecating-save-state-and-set-output-commands/
  - https://github.blog/changelog/2025-11-20-github-actions-cache-size-can-now-exceed-10-gb-per-repository/
  - https://docs.github.com/en/actions/reference/limits
  - https://docs.docker.com/build/cache/backends/
  - https://docs.docker.com/build/ci/github-actions/cache/
---
# CI/CD performance version index
> Build-once lookup for the `cicd.md` companion pack + its modules. The idiom-currency lane consults this
> first. CI/CD action/runner versions move **fast** (faster than most ecosystems), so this index is the
> highest-churn one — re-verify the pins against the live changelog on each pass, and treat anything here as
> "confirm against the currency brief."

## GitHub Actions — action versions (fast-moving; verify against the live changelog)

- **`actions/cache@v4`** — the cache backend was rewritten as **cache service v2** (rolled out from **2025-02-01**, legacy service sunset same day); older `actions/cache` majors (v1/v2, and the deprecated `save`/`restore` sub-action majors) **fail** outright after the sunset, not merely run slow — flag any pre-v3 cache action. The `setup-*` actions' `cache:` input rides the same service.
- **`actions/upload-artifact@v4` / `download-artifact@v4`** — **v3 sunset 2025-01-30** (workflows on v3 fail after that). v4 is a backend rewrite: **uploads up to ~90% faster**, but artifacts are now **immutable** — you can no longer append to one artifact name across jobs, so a **matrix must give each cell a unique artifact name** (then `download-artifact` with `merge-multiple` or pattern). `retention-days` default **90**; `compression-level: 0` for already-compressed payloads.
- **`set-output` / `save-state` workflow commands removed** — deprecated **2022-10**; write to the `$GITHUB_OUTPUT` / `$GITHUB_STATE` environment files instead (`echo "name=value" >> "$GITHUB_OUTPUT"`). Also retired: `set-env`/`add-path` → `$GITHUB_ENV`/`$GITHUB_PATH`. A workflow still using the `::set-output::` syntax is on borrowed time — flag it.
- **`actions/checkout@v4` defaults to `fetch-depth: 1`** (shallow single-commit) — so the perf footgun is an *unnecessary* `fetch-depth: 0` (full history + all branches/tags) left on globally; reserve deep fetch for history/tags/blame/`since-ref` consumers.
- **Runner images move on a schedule** — `ubuntu-latest`/`macos-latest`/`windows-latest` are repointed to new OS majors and old images retired; actions run on a pinned Node major (Node 20-era; Node 16 retired). Pin/track the runner label and the action's Node runtime — a retired image or Node runtime is a hard break, not a slowdown. (Verify current labels against the brief.)

## GitHub Actions — caching limits & billing (verify; provider-set, movable)

- **Cache storage: 10 GB/repo default + 7-day idle eviction + LRU** — caches unused for 7 days are removed; once the repo cap is hit, least-recently-accessed caches are evicted to make room (so a churny/oversized cache evicts entries other workflows rely on). **As of 2025-11** the cap can exceed 10 GB (user-owned repos configurable up to ~10 TB) — but **10 GB remains the effective default**; size to a real hit-rate, don't assume headroom. Cache scope is **branch-bounded**: a run restores from its own branch + the default/base branch, not arbitrary siblings, so a feature branch's first post-change run cold-restores from `main` *by design* (not a bug).
- **Runner OS billing multipliers** — Linux **1×** baseline, Windows **~2×**, macOS **~10×** per consumed minute — a job not building Apple/Windows artifacts on a macOS/Windows runner pays the multiplier for nothing. **Larger runners** cut wall-time on parallel work but bill at a higher per-minute rate (win only when the wall-time saving beats the rate). Per-job limit 6 h, run limit 35 days, up to 256 jobs per matrix. (Exact multipliers/limits are plan- and date-sensitive — verify against the brief.)

## Docker / BuildKit — build cache backends

- **External layer cache is required on ephemeral CI runners** — a fresh runner has no local layer cache, so `docker build` is fully cold every run *regardless of Dockerfile ordering* unless cache is imported. Use `docker buildx build --cache-from --cache-to` with a **registry** backend (`type=registry,ref=…`) or, on GitHub-hosted runners, the **gha** backend (`type=gha,mode=max` to also cache intermediate stages). Docker calls external cache "almost essential in CI/CD." The absence of any `--cache-from` on a CI image build is a red flag that the layer-caching effort is wasted.
- **BuildKit cache mounts (`RUN --mount=type=cache`)** persist a package manager's *download* cache across builds without baking it into a layer — so even a cache-busted install layer only re-fetches new/changed packages. These are separate from `--cache-from` layer cache and, on ephemeral runners, the mount contents themselves start empty unless persisted — both are needed for a fully warm CI build.

## Azure DevOps Pipelines (verify; some are grant/version-sensitive)

- **Microsoft-hosted free parallel-job grant is tiny and currently gated** — for private projects the free grant is **1 Microsoft-hosted job, 60-min/job cap, 1,800 min/month**, and for new orgs the free grant is **temporarily behind a request form**. Parallel jobs are **org-wide, shared across all projects** — so declared fan-out (`maxParallel`, matrix legs) beyond the purchased count silently queues. (Verify current grant/limits — Microsoft changes these.)
- **`checkout` shallow default + `fetchTags` version-split** — pipelines created **after Sprint 209 (Sept 2022)** default to **shallow `fetchDepth: 1`** and **`fetchTags: false`**; older pipelines default to `fetchTags: true` (tag sync defeats shallow fetch). So the footgun is an explicit `fetchDepth: 0`, and older tag-heavy pipelines benefit from explicit `fetchTags: false`.
- **`Cache@2` task** — current pipeline-caching task; immutable keys (rotate by bumping a literal key segment), **7-day inactivity expiry, no enforced size cap** (differs from GitHub's 10 GB). **`pr.autoCancel` defaults to `true`** (the defect is setting it `false`); `pr.drafts` defaults `true`. YAML `pr` triggers don't apply to Azure Repos Git (use branch-policy build validation).

## GitLab CI/CD (verify)

- **Caching is OFF by default; `cache:policy` defaults to `pull-push`** — no `cache:` block ⇒ full reinstall every job. Key on `cache:key:files` (lockfile). Caches split by **protected vs non-protected branch** (`-protected`/`-non_protected` suffixes). `GIT_DEPTH` defaults to a **shallow depth (~20)** (configurable; `0` = full clone). `GIT_STRATEGY` `clone`/`fetch`/`none`.
- **Duplicate-pipeline guard via `workflow:rules`** — without it, a push to a branch with an open MR runs **two** pipelines (branch + `merge_request_event`). `workflow:auto_cancel:on_new_commit` values: **`conservative` (default)** / `interruptible` / `none`; once an `interruptible: false` job starts, the pipeline is no longer auto-cancellable. `parallel` integer range **1–200**.

## Jenkins (plugin-driven — few hard version pins)

- **Mostly durable idiom, not version-pinned** — Jenkins behavior is governed by **plugin versions** (Pipeline, Git, Docker Pipeline, workflow-basic-steps), not a single product version, so pin claims to the **plugin** and verify against the instance. Durable specifics: `stash` is a **TAR routed through the controller** ("designed for small files"; 5–100 MB ⇒ consider alternatives); `milestone()` aborts an older build that hasn't passed a checkpoint a newer build already passed; declarative evaluates `input` **before** allocating the stage agent; `reuseNode true` is **declarative-only**. CPS gives durability at an interpreting-speed cost — keep heavy work in `sh`/`bat` on the agent.
