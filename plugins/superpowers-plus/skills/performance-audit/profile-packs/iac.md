# Profile Pack: Infrastructure-as-Code (companion)

A **companion** pack for **Infrastructure-as-Code (IaC) tooling** — the operational cost of the IaC tool
*itself*: how long a `plan`/`apply`/`synth`/`preview` takes, what state and provider I/O each operation
pays, and how fast the edit→plan→apply iteration loop turns. It loads **alongside** the language pack
(programmatic IaC is real code — see the CDK/Pulumi module) and the CI/CD pack (most IaC runs *in* a
pipeline) whenever IaC config is material to the scope. It reframes the standard lanes around **IaC ops
wall-time**: re-planning cost, state/refresh I/O, dependency-graph parallelism, init/synth/asset cost,
and provider/tool currency.

**Content-detected** (`*.tf`/`*.tofu` + `.terraform.lock.hcl`; `*.bicep`; `cdk.json`; `Pulumi.yaml` /
`Pulumi.*.yaml`; CloudFormation `*.template.yaml`/`*.template.json` or an `AWSTemplateFormatVersion` key;
ARM `azuredeploy.json`). The "performance" audited here is **plan/apply/synth wall-time + state &
refresh cost + iteration latency** — NOT the runtime performance of the cloud resources the tool
provisions. Whether an instance type is too small, a Lambda is under-memoried, or a query plan is bad is
**explicitly out of scope** for this pack; that is a future *cloud-runtime* pack's job. The boundary is
sharp: this pack asks "why does `terraform plan` take nine minutes," never "is this the right instance
type." Concrete flags/defaults are tagged "(verify against the currency brief for your version)" because
CLI surface and defaults move; tool specifics (Terraform/OpenTofu, CDK/Pulumi, CloudFormation/Bicep) load
as modules — see the map at the bottom.

---

## Redundant & repeated work (lane `algorithmic`)
- **One monolithic root module/state re-planned in full for a one-resource change** — a plan's cost scales
  with the *count of managed resources it must refresh and diff*, not with the size of the diff. A change to
  one security group in a 2,000-resource root pays to refresh all 2,000. Splitting the estate into smaller
  independently-applied roots/stacks (state per bounded-context) is the single biggest IaC-iteration win and
  the analog of the CI/CD path-filter. For a power-utility data platform — telemetry ingestion, lakehouse,
  analytics, networking all in one Terraform monorepo — this monolithic-state penalty is usually *the*
  dominant complaint; weight it first.
- **Data sources re-read from the provider API on every plan** because they're evaluated each run during
  refresh — a `data` block that lists all AMIs, all subnets, or queries an external HTTP/DNS source pays a
  provider round-trip *every plan*, even when nothing about it changed. Pin/narrow the query, hoist a stable
  lookup into a variable or `locals`, or move a rarely-changing value out of a hot root (verify against the
  currency brief for your version).
- **`-target` used as a routine speed crutch** to dodge a slow full plan — it *works* (plans only the
  targeted address and its dependencies) but the docs warn it causes **undetected drift**: the un-targeted
  resources are never reconciled, so the speedup is borrowed against state correctness. Flag habitual
  `-target` in scripts/runbooks as a symptom of a too-large root, not a fix (verify against the currency
  brief for your version).
- **Refresh of a large set of resources that demonstrably never drift** — refresh is the dominant plan cost
  (one provider read per managed resource), so re-reading hundreds of resources that are only ever changed
  through Terraform is repeated work. `-refresh=false` skips it but trades away drift detection; the durable
  fix is to keep slow-moving, never-drifting infrastructure in its own root so a fast-iterating root doesn't
  refresh it (verify against the currency brief for your version).
- **A no-op `synth`/`preview` that re-runs the whole program every invocation** (CDK/Pulumi) — programmatic
  IaC executes the user program to produce the plan, so an expensive top-level computation, a synchronous
  API call at construct time, or asset hashing of unchanged files runs on *every* `synth`. The language pack
  owns the program's algorithmics; flag here when the synth itself is the iteration bottleneck.
- **Cross-stack/remote-state lookups re-resolved every plan** — each `terraform_remote_state` or
  cross-stack reference is read on every plan of the consuming root, so a deep chain of dependent roots pays
  a fan-out of remote reads per iteration (see the data-access lane for the I/O cost; the *redundancy* is
  that an unchanged upstream is re-read regardless).

## State & provider I/O (lane `data-access`)
- **A single monolithic state file makes every operation slow** — plan must read and refresh the *entire*
  state (the plan = refresh-every-managed-resource model), so state size sets a floor on every plan/apply
  regardless of diff size. This is the data-access face of the algorithmic point: large state → slow refresh
  → slow everything. State-splitting is the structural fix; for a utility's big shared Terraform monorepo
  it's typically the highest-leverage change available.
- **Remote-state backend latency and lock contention across a team** — a remote backend (S3+DynamoDB, GCS,
  azurerm, TFC/TFE) takes a **state lock** for the duration of an operation; with one giant state and a
  busy team, plans/applies serialize behind the lock and engineers queue. Lock-wait is invisible in
  per-resource timing but real in wall-clock; smaller states reduce both lock hold-time and contention
  surface (verify against the currency brief for your version).
- **`terraform_remote_state` / cross-stack-reference chains read on every plan** — these are provider/backend
  reads issued each plan of the consumer; a layered architecture (network → platform → app, each reading the
  layer below) multiplies backend round-trips per iteration. Prefer published outputs / data sources with
  narrow scope over deep remote-state chains, and weigh coupling against the per-plan read cost.
- **Provider API rate-limits throttling refresh** — refresh fan-out can hit cloud-provider API quotas
  (e.g. AWS Describe* throttling), and once throttled the provider backs off, so a large root's plan slows
  *non-linearly* as the estate grows. The symptom is a plan whose wall-time is dominated by retries/backoff,
  not compute; the fix is fewer resources per plan (state-split) or scoping refresh, not raw parallelism
  (verify against the currency brief for your version).
- **Over-broad `data` queries pulling far more than the config uses** — a data source that enumerates every
  object in a region/account to select one is over-fetching against the provider API on every plan; constrain
  with filters/tags so the read is bounded (verify against the currency brief for your version).
- **State stored or transferred in a way that adds per-op latency** — a state file fetched over a slow/remote
  link, an un-cached backend, or state kept far from where plans run adds fixed latency to every operation;
  the round-trip is paid each plan/apply, so it compounds with iteration frequency.

## Graph parallelism (lane `concurrency`)
- **The dependency graph — not file order — determines what runs in parallel** — Terraform/OpenTofu build a
  graph from explicit (`depends_on`) and implicit (attribute-reference) edges, then walk it: a node runs as
  soon as all its dependencies have. So apply wall-time is the **critical path through the graph**, and HCL
  file/block order is irrelevant to parallelism. Reason about the graph, not the source layout (verify
  against the currency brief for your version).
- **`-parallelism` defaults to 10 concurrent graph operations** — apply/plan/destroy walk the graph with a
  bounded concurrency of 10 by default. On a wide graph (many independent resources) raising it can shorten
  apply; but it also raises concurrent provider API pressure and can *induce* rate-limiting, so it is a
  trade, not a free dial — measure throttling before and after (verify against the currency brief for your
  version).
- **Module-level or blanket `depends_on` that serializes independent resources** — an explicit `depends_on`
  on a whole module forces *every* resource in it to wait on *every* resource of the dependency, collapsing
  graph width that implicit attribute references would have kept parallel. Over-broad `depends_on` is the
  most common self-inflicted serialization; prefer fine-grained implicit dependencies and reserve
  `depends_on` for genuinely hidden orderings (verify against the currency brief for your version).
- **A graph that's narrow when it could be wide** — a chain where each resource references the previous
  (often an artifact of passing one resource's output through a long `locals`/module chain) has a long
  critical path even though the real dependencies are shallow. Look for accidental serialization: resources
  with no true ordering relationship that nonetheless can't start until a predecessor finishes.
- **Raising parallelism against a provider that's already the bottleneck** — if refresh/apply is throttled,
  more concurrency makes it *worse* (more requests → more backoff). Concurrency only helps when the long pole
  is independent-resource wait, not provider throttling; diagnose which before turning the knob (see the
  data-access lane).
- **CDK/Pulumi internal concurrency is its own engine** — programmatic IaC tools have their own
  parallelism model and flags (Pulumi `--parallel`); they are not Terraform's `-parallelism`. Audit the
  tool's own concurrency surface, and don't assume the Terraform defaults transfer (see the CDK/Pulumi
  module; verify against the currency brief for your version).

## Init, synth & asset cost (lane `payload-startup`)
- **Provider plugin download/init repeated when a shared plugin cache would skip it** — `terraform init`
  downloads provider plugins into the working directory by default, so CI (ephemeral, fresh dir each run)
  re-downloads them every run. A configured plugin cache (`plugin_cache_dir` / `TF_PLUGIN_CACHE_DIR`)
  reuses already-downloaded plugins across working dirs/runs; without it, init is pure cold-start tax on
  every pipeline run (verify against the currency brief for your version).
- **`synth`/`preview` program-run time on the iteration path** (CDK/Pulumi) — these run the user program
  before any plan exists, so a slow program (heavy imports, eager construct trees, synchronous network at
  synth time) is felt on *every* edit→preview loop. This is the programmatic-IaC analog of cold start; the
  language pack profiles the program, this lane flags that synth is the long pole.
- **Asset bundling / Docker-image build on the synth/deploy path** — CDK/Pulumi bundle Lambda code,
  container images, and other assets during synth/up; an un-cached or unconditional bundle (re-zipping or
  re-building an unchanged asset) re-pays bundling every iteration. Confirm asset hashing/caching actually
  short-circuits unchanged assets (see the CDK/Pulumi module).
- **Template compile / large generated artifact** — CDK and Bicep *compile* to CloudFormation/ARM JSON;
  a huge synthesized template both takes longer to produce and pushes against **per-template resource
  limits**, which then forces nested-stack/module splits that add their own deploy round-trips. Flag a
  template approaching the limit as a future serialization/latency cost (see the CloudFormation/Bicep
  module; verify against the currency brief for your version).
- **Stack/resource limits driving nested-stack fan-out** — splitting one stack into many nested stacks to
  stay under limits trades a single large operation for many sequenced sub-deploys; necessary, but each
  nested stack adds a create/update round-trip to the critical path. Audit whether the split is limit-driven
  (justified) or accidental (re-mergeable) (verify against the currency brief for your version).
- **Re-initializing modules/backends needlessly** — `init` also installs child modules and configures the
  backend; a workflow that re-inits from scratch when `init -backend=false` or a warm `.terraform/` dir
  would do pays setup tax it didn't need to (verify against the currency brief for your version).

## Provider/tool currency (lane `idiom-currency`)
- **Unpinned or stale provider/tool versions** — `.terraform.lock.hcl` pins providers; a missing lock or a
  far-behind provider can mean slower refresh paths, missing server-side or bulk operations, and known
  performance regressions the current version fixes. Consult the currency brief for the provider/CLI version;
  offline, flag at LOW confidence for manual currency check (verify against the currency brief for your
  version).
- **`count` where `for_each` would prevent churn** — `count` keys instances by *list index*, so inserting or
  removing an element renumbers everything after it and forces destroy/recreate of unrelated resources;
  `for_each` keys by a stable map/set key, so a single add/remove touches only that instance. The
  index-churn version inflates every plan/apply touching that resource set — a durable correctness-shaped
  performance footgun (verify against the currency brief for your version).
- **Deprecated patterns the tool now does natively/faster** — a hand-rolled loop where `for_each` fits, a
  superseded provider resource/attribute, or a workflow the CLI now has a first-party faster path for.
  Consult the brief/version index for what's current; offline, LOW confidence.

---

## State & dependency-graph model (read for every IaC audit)

IaC tooling performance is judged against a specific operational model, not against the cloud architecture
it produces. This is the IaC analog of a runtime-notes section: how to reason and measure before
concluding. (Terraform/OpenTofu terms below; the *shape* generalizes to CDK/Pulumi/CloudFormation — every
declarative tool refreshes state, diffs against desired, and orders changes by dependency.)

- **`plan` = refresh + diff + graph-build.** Plan **reads the current state of every already-existing
  managed resource from its provider** (refresh) to bring state up to date, **compares** the current config
  to that prior state, and proposes change actions; building the dependency graph from explicit and implicit
  edges is part of the same pass. **`apply` then walks that graph** with bounded parallelism. The consequence
  that drives every other point: **state size and resource/provider count set the cost of *every*
  operation**, because refresh touches them all.
- **The graph, not the file, sets what parallelizes.** A node is walked as soon as all its dependencies are
  walked; the default `-parallelism` is **10**. So apply wall-time is the *critical path through the
  dependency graph*, and the levers are graph *shape* (don't add false `depends_on` edges) and graph *width*
  vs. the parallelism ceiling — not reordering HCL.
- **Refresh/drift detection is usually the dominant plan cost.** For a large estate the per-resource provider
  reads (and any rate-limit backoff they trigger) dwarf the diff compute. That's why state-splitting and
  scoping refresh are the big levers, and why a plan can be slow even with an empty diff.
- **Targeting and skipping refresh trade safety for speed — deliberately, not by default.** `-refresh=false`
  skips the up-to-date sync (faster plan, but ignores external changes → possibly incomplete/incorrect plan);
  `-target` plans only an address and its dependencies (faster, but leaves the rest unreconciled → undetected
  drift). Both are legitimate *escape hatches*, never a standing workflow; flag them in routine
  scripts/runbooks.
- **Measure before optimizing.** Time the operation end to end; isolate refresh cost by comparing a normal
  plan against `plan -refresh=false`; use `TF_LOG`/trace logging and the machine-readable `-json` plan
  output (supported by both Terraform and OpenTofu) to attribute time. A plan that is *inherently* expensive
  — a genuinely large estate refreshed for correctness — is not automatically a defect; flag the *avoidable*
  cost: the monolithic state that should be split, the data source re-read every plan, the false `depends_on`
  serializing the graph, the cold provider cache in CI (verify against the currency brief for your version).

## Framework / sub-stack modules (load on detection)

Load the lanes + State-and-dependency-graph model above for *every* IaC audit. Additionally load the module
matching the IaC tool in scope. (Programmatic IaC is real code — also load the relevant **language** pack;
IaC that runs in a pipeline — also load the **CI/CD** pack.)

| Detected (signals) | Load module |
|---|---|
| **Terraform / OpenTofu** — `*.tf`/`*.tofu`, `.terraform.lock.hcl`, `terraform {}`/`provider`/`resource` blocks, `terraform`/`tofu` CLI | [`iac/terraform.md`](iac/terraform.md) |
| **Programmatic IaC** — AWS CDK (`cdk.json`, `aws-cdk-lib`), Pulumi (`Pulumi.yaml`/`Pulumi.*.yaml`) — synth/preview, asset bundling, `--parallel` | [`iac/cdk-pulumi.md`](iac/cdk-pulumi.md) |
| **Declarative cloud-native** — CloudFormation (`*.template.yaml`/`.json`, `AWSTemplateFormatVersion`), Azure Bicep (`*.bicep`) / ARM (`azuredeploy.json`) — template compile, nested-stack/resource limits | [`iac/cloudformation-bicep.md`](iac/cloudformation-bicep.md) |

*Note:* GCP IaC is predominantly Terraform (covered by the Terraform/OpenTofu module); Config Connector and
Deployment Manager are niche and don't yet warrant their own module — the core lanes and state/graph model
above apply to them provider-agnostically.

## Sources

Load-bearing specifics are grounded in HashiCorp/OpenTofu documentation; per-tool keywords and
version-pinned defaults belong in the modules and the currency brief.

- **Terraform — `plan` command** (developer.hashicorp.com/terraform/cli/commands/plan): plan reads the
  current state of existing remote objects (refresh), compares config to prior state, proposes changes;
  `-refresh=false` disables the sync and "could result in an incomplete or incorrect plan"; `-target` focuses
  on an address and its dependencies and is "not recommended for routine operations" (causes undetected
  drift); `-parallelism=n` limits concurrent graph operations, **default 10**.
- **Terraform — `apply` command** (developer.hashicorp.com/terraform/cli/commands/apply): `-parallelism=n`
  limits concurrent operations as Terraform "walks the graph," **default 10**, respecting dependency order.
- **Terraform — internals: resource graph** (developer.hashicorp.com/terraform/internals/graph): graph built
  from config, `depends_on` explicit edges, and implicit attribute-reference dependencies; "a node is walked
  as soon as all of its dependencies are walked"; depth-first concurrent walk with a default concurrency of
  10 — confirms the graph (not file order) drives parallelism.
- **Terraform — data sources** (developer.hashicorp.com/terraform/language/data-sources): data sources are
  read during the refresh phase when their arguments are known, and reading is deferred to apply when they
  depend on not-yet-computed values — confirms data blocks incur provider reads each plan.
- **Terraform — CLI config file** (developer.hashicorp.com/terraform/cli/config/config-file): by default
  `terraform init` downloads plugins into a per-working-directory subdir; `plugin_cache_dir` /
  `TF_PLUGIN_CACHE_DIR` enables a shared cache so an already-downloaded plugin is reused instead of
  re-downloaded.
- **OpenTofu — `plan` command** (opentofu.org/docs/cli/commands/plan): same refresh+diff model;
  `-parallelism` "Defaults to 10"; `-refresh=false` and `-target` carry the same semantics/warnings as
  Terraform; `-json` machine-readable output supported (also `-json-into`).
