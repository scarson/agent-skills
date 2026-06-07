---
index_schema_version: 1
ecosystem: iac
covered_through: "Terraform 1.x / OpenTofu 1.x (parallelism, plugin cache, state encryption); AWS CDK v2 (cdk deploy flags); Pulumi 3.x (--parallel); CloudFormation quotas (500 resources/stack) as of 2026-06; Azure ARM/Bicep (deployment modes, what-if, deployment stacks)"
built_on: 2026-06-05
sources:
  - https://developer.hashicorp.com/terraform/cli/commands/plan
  - https://developer.hashicorp.com/terraform/cli/commands/apply
  - https://developer.hashicorp.com/terraform/cli/config/config-file
  - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html
  - https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-deploy.html
  - https://www.pulumi.com/docs/iac/cli/commands/pulumi_up/
  - https://learn.microsoft.com/azure/azure-resource-manager/templates/deployment-modes
  - https://learn.microsoft.com/azure/azure-resource-manager/templates/deploy-what-if
---
# IaC performance version index
> Build-once lookup for the `iac.md` companion pack + its modules. The idiom-currency lane consults this
> first. Most IaC perf facts are durable idioms (in the packs); this index carries the **defaults and
> provider quotas that move** — re-verify the quotas against the live page each pass.

## Terraform / OpenTofu

- **`-parallelism` default = 10** — `plan`/`apply`/`destroy` walk the dependency graph with bounded
  concurrency of **10** by default (confirmed on both the Terraform and OpenTofu CLI pages). Raising it can
  speed a *wide* graph but raises concurrent provider-API pressure (can induce throttling); lowering it
  relieves throttling. A measured trade-off, not "higher = faster."
- **`-refresh=false` / `-target` are escape hatches, not workflow** — `-refresh=false` skips the state↔reality
  reconciliation (faster plan, "could result in an incomplete or incorrect plan"); `-target` plans an address
  + its dependencies and is documented as "not recommended for routine operations" (leaves the rest
  unreconciled → undetected drift). Flag habitual use in CI/runbooks as a symptom of a too-large root.
- **`TF_PLUGIN_CACHE_DIR` / `plugin_cache_dir`** — without it, `terraform init` re-downloads provider plugins
  (hundreds of MB) **per working directory**, so ephemeral CI re-downloads every run; the shared cache reuses
  them. Or cache `.terraform/` in CI keyed on `.terraform.lock.hcl`.
- **OpenTofu divergences (drop-in fork, same core perf model)** — **state/plan encryption** (KMS/PBKDF2/…)
  adds an encrypt-on-write/decrypt-on-read cost per state op that scales with state size; **`for_each` on
  provider configurations** (a feature Terraform historically lacked) can replace hand-fanned aliased
  providers. Both version-sensitive — verify status against the in-use version.

## AWS CDK (v2)

- **`cdk deploy --concurrency` defaults to 1** — stacks deploy one at a time; `--all --concurrency N` deploys
  independent stacks in parallel (honoring inter-stack deps), bounded by CFN/account rate limits.
- **`cdk deploy --method` defaults to `change-set`** — creates then executes a change set (two round-trips);
  `--method=direct` skips the change-set preview for faster dev iteration. `--asset-prebuild` defaults `true`.
- **`--hotswap` is development-only** — updates supported resources (Lambda code, Step Functions, ECS images,
  …) directly via service APIs instead of a CloudFormation deployment; the docs warn it **deliberately
  introduces drift** and implies `--no-rollback`. `cdk watch` uses hotswap by default. Never production;
  reconcile with a normal deploy / `--revert-drift` after.
- **Context lookups cache in `cdk.context.json` — commit it** — `Vpc.fromLookup`/AMI/AZ/SSM lookups query the
  AWS account *at synth* and cache to `cdk.context.json`; an uncommitted/cleared file re-queries every synth
  (slow + non-deterministic). `--no-lookups` / `lookups: false` makes synth *fail* on an uncached lookup
  (CI guard). `NodejsFunction` uses local esbuild if installed, else a Docker bundle (slower).

## Pulumi (3.x)

- **`pulumi up --parallel` defaults to 16** — bounds concurrent resource operations (`1` = fully serial); the
  analog of Terraform's `-parallelism`. The engine **diffs against stored state** and does *not* re-query live
  cloud state every op; **`pulumi refresh`** is the explicit opt-in that re-reads every resource from its
  provider (the refresh-cost analog) — keep it deliberate, not in a hot loop.

## CloudFormation (verify quotas against the live page — they move)

- **Resources per stack/template = 500** — **raised from the older 200** (confirmed on the quotas page,
  2026-06); a stack near the cap is slow to compile/validate/deploy and forces nested-stack splits. The
  **nested-stack hierarchy** allows **2500** resources created/updated per operation (distinct from the 500
  per-template cap). Treat both numbers as version-sensitive.
- **`DependsOn` overrides default parallelism** — CFN creates/updates/deletes in parallel from implicit
  `!Ref`/`!GetAtt`/`!Sub` ordering; an explicit `DependsOn` adds a hard serialization edge — over-applied, it
  needlessly serializes independent resources. Drift detection does **not** recurse into nested stacks.
- **StackSets Region concurrency defaults to Sequential** — *Maximum concurrent accounts*, *Failure
  tolerance*, and *Region concurrency* (Sequential by default; Parallel is opt-in) govern fan-out wall-time —
  leaving Region concurrency Sequential serializes a multi-Region rollout. Verify current limits/preference
  names against the brief.

## Azure ARM / Bicep

- **Deployment mode defaults to Incremental; Complete deletes** — Incremental only touches declared resources;
  **Complete** deletes everything in the scope not in the template (more work + risk). **Complete is being
  deprecated in favor of deployment stacks**; linked/nested templates are **Incremental-only**; subscription
  scope doesn't support Complete.
- **`what-if` expansion limits** — `az deployment ... what-if` previews against current state (the
  provider-managed-state refresh analog); it expands up to **500 nested templates / 5-minute** cap (remainder
  reported as `Ignore`), and can't resolve `reference()` (those always show as changing — known noise).
- **Bicep compiles to one ARM template with nested deployments** — a large module graph adds local
  `bicep build` compile + server-side validation time before any resource is touched; `@batchSize(n)`
  deliberately serializes a `for`-loop's instances (right for rate-limited resources, a needless throttle
  elsewhere).
