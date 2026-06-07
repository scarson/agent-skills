# Profile Pack: CI/CD pipelines (companion)

A **companion** pack for **CI/CD pipeline configuration** — the cost of the automation that builds, tests,
and ships the project, *not* the application's own runtime. It loads **alongside** the application's
language pack whenever pipeline config is material to the scope, and reframes the standard lanes around
**pipeline cost**: wall-clock time per run, redundant work, caching, parallelism, image/artifact size, and
runner/cold-start cost. The application logic the pipeline *runs* is the language pack's job; this pack is
about the **orchestration** — how often it runs, how much it repeats, and how wide it parallelizes.

**Content-detected** (`.github/workflows/*.yml`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/config.yml`,
`azure-pipelines.yml`, `Dockerfile`). The "performance" being audited is **cost per run × runs per
trigger**, measured in money and in time-to-feedback. Signals below are durable and provider-agnostic —
the durable physics of a job DAG on an ephemeral runner — and concrete keywords are tagged "(verify
against the currency brief for your version)" because action/runner names and defaults move. Provider
specifics (GitHub Actions, Docker BuildKit) load as modules — see the map at the bottom.

---

## Redundant & repeated work (lane `algorithmic`)
- **The whole pipeline runs on every push/PR with no change detection** — a one-line docs edit triggers
  the full build+test+image matrix. Path/change filters (`paths:`/`paths-ignore:` on the trigger, GitLab
  `rules:changes`) skip jobs whose inputs didn't change; this is one of the two universal big wins and the
  cheapest to land (verify against the currency brief for your version).
- **Rebuilding unchanged targets from scratch** because no incremental/remote build cache is wired in —
  Bazel, Gradle, Nx, or Turborepo can skip targets whose inputs are unchanged (and share results across
  runners via a remote cache), turning an O(repo) build into O(changed). Without it every run pays for the
  whole graph regardless of the diff.
- **A monorepo running every package's jobs for a one-package change** — affected-package detection (Nx
  `affected`, Turbo filters, or path-scoped jobs) runs only the slice the diff touches. The cost scales
  with the number of packages, so this grows silently as the repo does.
- **Reinstalling dependencies from scratch every run** (`npm ci`, `pip install`, `bundle install`,
  `go mod download`) with no cache — pure repeated work that the caching lane removes; flagged here because
  the *redundancy* is the defect, the *cache* is the fix.
- **Running the full test suite when only a slice could have regressed** — test-impact analysis or
  path-scoped test selection runs the affected tests on PRs and reserves the full suite for merge/main.
  Weigh the safety trade-off: under-selecting can miss a regression, so reserve aggressive selection for
  fast pre-merge feedback, not the gate.
- **Each job re-doing checkout + dependency install that a previous job already did** — jobs are isolated,
  so work doesn't carry over for free, but blindly repeating an expensive setup in five jobs is five times
  the cost. Either pass the result as an artifact/cache or collapse the steps into fewer jobs (weigh
  against the parallelism the split was buying — see the concurrency lane).
- **Re-running the entire pipeline to retry one flaky job** where a targeted re-run of the failed job
  would do — full-pipeline retry multiplies the cost of one bad test by the whole DAG.

## Caching & artifact I/O (lane `data-access`)
- **No dependency cache, or a cache key that never hits** — the key must include a **hash of the lockfile**
  (`hashFiles('**/package-lock.json')` and equivalents) so it invalidates exactly when deps change; a key
  with no lockfile hash goes stale silently, and a key that's *too* volatile (hashes the whole tree) misses
  every run. A miss every run is the same cost as having no cache at all (verify against the currency brief
  for your version).
- **No `restore-keys` / prefix fallback** — an exact-key miss with a prefix fallback still restores a
  *recent* cache and installs only the delta, instead of a cold full install. The fallback is the
  difference between "lockfile changed, update a few packages" and "lockfile changed, download everything"
  (verify against the currency brief for your version).
- **Build-output / compiler caches not persisted** — compiled objects, incremental-build state, and
  toolchain caches (`ccache`, Gradle/Bazel caches, `.next`/webpack cache) rebuilt every run because they
  aren't in the cache path. The dependency cache is the famous one; the *build* cache is often the larger
  win on a slow compile.
- **Passing large artifacts between jobs vs rebuilding** is a real trade-off, not a default — uploading and
  re-downloading a multi-GB artifact across jobs can cost more wall-time than recomputing it on the runner
  that needs it; conversely, rebuilding a slow artifact in three downstream jobs is worse than uploading
  once. Weigh artifact size and transfer time against rebuild time, and upload only what downstream jobs
  actually consume.
- **A full-history clone where a shallow one suffices** — most CI providers' checkout is already **shallow
  by default** (e.g. `fetch-depth: 1`), so the footgun is an *unnecessary* `fetch-depth: 0` (full history,
  all branches/tags) added for one job that needed tags/blame and left on globally. Reserve deep fetch for
  the jobs that compute version-from-history or run blame (verify against the currency brief for your
  version).
- **Pulling base images / registry layers every run** with no layer cache or registry mirror — see the
  Docker module for image-layer caching; at the pipeline level the signal is a `docker pull` or toolchain
  download on the critical path of every run that a cache or pre-baked runner image would remove.
- **Cache eviction working against you** — caches are typically branch-scoped with a size cap and an
  inactivity TTL (e.g. ~10 GB/repo, evicted after ~7 days unused), and a too-large or per-branch-unique
  cache can thrash itself out before it's reused. Confirm the cache is actually *served* (a hit-rate
  signal), not just *written* (verify against the currency brief for your version).

## Job parallelization (lane `concurrency`)
- **Serial stages with no real data dependency** — model the job DAG (`needs:` / GitLab `needs` / explicit
  dependency edges) and let a job start the moment *its* inputs are ready instead of waiting for an entire
  stage to drain. The pipeline's wall-time is the **critical path through the DAG**, so removing a false
  edge can collapse it. *Verify independence first: a job that consumes another's artifact is not free to
  reorder* (verify against the currency brief for your version).
- **No matrix where one fits** — a matrix runs the same job across variable combinations (OS, version,
  shard) in parallel from one definition; testing N versions serially is N× the wall-time of a matrix
  (verify against the currency brief for your version).
- **A long test suite not sharded across runners** — splitting tests into balanced shards on parallel
  runners cuts the longest single job, which is what the critical path actually sees. Weigh the per-shard
  fixed cost (checkout + install + cold start) against the time saved: past a point, more shards add more
  setup overhead than they remove from the suite.
- **Superseded in-progress runs not cancelled** — a concurrency group with cancel-on-supersede (GitHub
  `concurrency:` + `cancel-in-progress: true`) kills the now-pointless run when a new commit lands on the
  same PR/branch, freeing runners and feedback latency. This is the parallelism-side companion to path
  filters: don't *finish* work the next push already invalidated (verify against the currency brief for
  your version).
- **`fail-fast` left at its default without a deliberate choice** — fast-failing a matrix (the common
  default) cancels sibling jobs on the first failure, saving spend on a doomed run; *disabling* it surfaces
  every platform's failure in one go. Neither is universally right — flag a default that fights the team's
  intent (a flaky-platform matrix wants fail-fast *off*; a cost-sensitive gate wants it *on*) (verify
  against the currency brief for your version).
- **Self-hosted/runner throughput is the real cap, not the YAML** — declaring 20 parallel jobs against a
  pool that runs 4 at a time just queues; concurrency only helps up to available runner capacity. Right-size
  fan-out (and `max-parallel`) to the pool, and weigh hosted (elastic, per-minute) vs self-hosted (fixed
  capacity, queueing) for the workload (verify against the currency brief for your version).

## Image, artifact & cold-start cost (lane `payload-startup`)
- **A fat single-stage build image** where a multi-stage build would ship only the runtime artifact —
  compilers, dev headers, and build tooling baked into the final image inflate every pull, on every run and
  every deploy. The build stage's bulk should not reach the final stage (see the Docker module).
- **A heavyweight base image where a slim/distroless one fits** — a full OS base (hundreds of MB) vs a
  slim/Alpine/distroless base shifts pull time and cold-start on every job that uses it. Weigh against the
  debugging/toolchain loss of a minimal base (no shell in distroless) (verify against the currency brief
  for your version).
- **Cache-hostile layer ordering** — copying the whole source tree *before* installing dependencies
  invalidates the (expensive) dependency layer on every source change; copy the lockfile and install deps
  first, then copy source, so the dep layer is cached across code-only commits. This is the single
  highest-leverage Dockerfile ordering rule (see the Docker module).
- **Toolchain/SDK installed from the network on every run** instead of a cached setup action or a pre-baked
  runner image — the runner is ephemeral, so a `setup-*` step that re-downloads a language toolchain every
  run is pure cold-start tax that a cached setup action or a custom runner image removes (verify against the
  currency brief for your version).
- **Oversized artifacts uploaded that nothing downstream needs** — uploading the full `node_modules`, build
  intermediates, or logs as artifacts costs storage and transfer on every run; upload only the deployable
  output and scope retention. (Artifact-as-cache mis-design is the data-access lane's concern; raw *size* is
  here.)
- **No `.dockerignore`, so the whole build context is shipped to the daemon** — sending `.git`,
  `node_modules`, and local junk into the build context slows every build and can bust layer caches; exclude
  what the build doesn't read (see the Docker module).

## Action/orchestrator currency (lane `idiom-currency`)
- **Outdated action/runner/orchestrator versions** running superseded patterns — an old cache or setup
  action that lacks today's keying/restore behavior, a deprecated runner image, or a hand-rolled step a
  first-party action now does faster. Consult the currency brief for the provider; offline, flag at **LOW**
  confidence for manual currency check (verify against the currency brief for your version).
- **A hand-rolled script reinventing a now-native orchestrator feature** — manual cache save/restore,
  hand-coded matrix expansion, or a custom change-detection script where the platform now has a maintained
  primitive. Flag where the native feature covers the use case; offline, LOW confidence.

---

## Pipeline cost model (use for every CI/CD audit)

CI/CD performance is judged against the **job DAG on an ephemeral runner** and against **trigger
frequency**, not against any single job's code — this is the pipeline analog of a runtime-notes section:
how to reason and measure before concluding.

- **Wall-time is the critical path through the DAG, not the sum of jobs.** Ten 2-minute jobs that run in
  parallel finish in ~2 minutes; the same ten in a serial chain take ~20. Optimize the *longest path* —
  shortening a job that isn't on the critical path changes nothing the developer waits for (though it may
  still cut spend on a metered runner).
- **Total cost = trigger frequency × per-run work**, so the highest-value lever is often *don't run this at
  all on this trigger*. Path filters, concurrency-cancel of superseded runs, and trigger scoping (full
  matrix on merge, fast subset on PR) attack the frequency term — usually a bigger win than shaving seconds
  off a job that shouldn't have run. This and **caching the dependency/build layer** are the two universal
  wins; reach for them first.
- **The runner is ephemeral** — nothing persists between runs unless explicitly cached or passed as an
  artifact. Every "why is this re-downloaded/recompiled every time" is this fact; caching and artifact
  passing are how state crosses the run boundary, and a cache that's written but never *served* buys
  nothing.
- **Caching and parallelism are the two dominant levers**, and they trade off: more shards mean more
  parallel cache restores and more fixed per-job setup, so blindly maxing either can cost more than it
  saves. Tune against measured per-job timing, not intuition.
- **Measure before optimizing.** Use the provider's per-job timing / DAG visualization and build profiling
  (Gradle build scans, Bazel profile, `--timing` outputs) to find the actual long pole and the actual cache
  hit-rate. A job that is inherently slow — a genuine full integration suite on merge — is not automatically
  a defect; flag the *avoidable* repetition, the cold cache, and the false serial edge, not every minute.

## Framework / sub-stack modules (load on detection)

Load the lanes + Pipeline-cost-model notes above for *every* CI/CD audit. Additionally load the module
matching the orchestrator/build surface in scope.

| Detected (signals) | Load module |
|---|---|
| **GitHub Actions** — `.github/workflows/*.yml`, `uses:`/`runs-on:`/`jobs:` syntax, `actions/*` steps | [`cicd/github-actions.md`](cicd/github-actions.md) |
| **Azure DevOps Pipelines** — `azure-pipelines.yml`/`.yaml`, `stages:`/`jobs:`/`steps:` with `pool:`/`trigger:`, `Cache@2`/`task:` syntax | [`cicd/azure-pipelines.md`](cicd/azure-pipelines.md) |
| **GitLab CI/CD** — `.gitlab-ci.yml`, `stages:`/`needs:`/`rules:`/`cache:` syntax, `.pre`/`.post` | [`cicd/gitlab.md`](cicd/gitlab.md) |
| **Jenkins** — `Jenkinsfile` (declarative `pipeline {}` or scripted), `stage`/`agent`/`steps` | [`cicd/jenkins.md`](cicd/jenkins.md) |
| **Container image builds** — `Dockerfile`, `*.dockerfile`, BuildKit/buildx, multi-stage `FROM ... AS` | [`cicd/docker-build.md`](cicd/docker-build.md) |

*Future modules:* CircleCI (`.circleci/config.yml`) and AWS CodeBuild/CodePipeline (`buildspec.yml`) warrant their
own modules when their config is material; the core lanes and cost model above already apply provider-agnostically.

## Sources

Durable signals here are grounded in provider and build-tool documentation; provider-specific keywords and
per-entry citations belong in the modules and the currency brief.

- **GitHub Actions** — "Dependency caching reference" (cache `key`, `restore-keys` prefix matching, exact
  vs partial restore, `hashFiles`, ~10 GB/repo cap and ~7-day eviction, branch-scoped fallback); "Run job
  variations" / matrix (`fail-fast` default, `max-parallel`, parallel matrix expansion); concurrency
  (`concurrency` group + `cancel-in-progress`, FIFO); `actions/checkout` (`fetch-depth: 1` shallow default,
  `fetch-depth: 0` full history).
- **GitLab CI** — "Use needs to run jobs out of stage order" (`needs`, the DAG / critical-path framing,
  `needs: []`); "Job rules" (`rules:changes`, `rules:changes:compare_to`, rules-decide-pipeline-inclusion).
- **Docker** — "Building best practices" (multi-stage builds, slim/Alpine base, layer ordering — lockfile +
  install before source copy, combining `RUN` to avoid stale caches, `.dockerignore` build-context
  trimming).
