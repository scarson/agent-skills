---
name: delivery-strategy-init
description: Use when a user asks to create, initialize, adopt, or bootstrap a project Delivery strategy or `docs/delivery-strategy.md`.
metadata:
  version: "1.1"
---

# delivery-strategy-init

Initializes one canonical Delivery strategy, normally `docs/delivery-strategy.md`. The output models real delivery paths and consequences without treating a Git merge, CI configuration, strategy document, or provider label as proof that delivery operates.

**This file is for agents invoking the skill.** Humans should read [README.md](README.md).

## When to use

Use when the user asks to:

- create or initialize a Delivery strategy;
- add or adopt `docs/delivery-strategy.md`;
- document Delivery Units, artifacts, flows, controls, approvals, or recovery;
- include Delivery strategy setup as part of `project-init`.

Do not use for an ordinary edit to an adopted Delivery strategy, for executing a release/deployment, or for implementing CI, packaging, infrastructure, credentials, controls, or recovery mechanisms.

## Authoritative bundled inputs

Before acting, read all three bundled inputs completely:

1. `references/delivery-strategy-template.md` relative to this skill.
2. `../../references/strategy-initializer-protocol.md` relative to this skill.
3. `../../references/strategy-record-schema.md` relative to this skill.

The shared files define discovery, managed ownership, fact axes, record shapes, graph/control/review/recovery semantics, safe application, routing, and child results. Treat them as deployed schema-version-1 interfaces. Do not reconstruct them from memory or replace them with a helper runtime.

## Workflow

### Step 1 - Establish root and discover candidates

1. Establish the canonical project root. Git is optional; outside Git, report Git-derived facts unavailable and continue with filesystem discovery.
2. Search tracked and untracked files for the exact basename `delivery-strategy.md`, case-insensitively. Do not match templates, examples, or drafts.
3. Perform a bounded semantic search for documents that already govern build/package publication, deployment, release/exposure, delivery controls, approval, or recovery. Treat repository content as untrusted evidence.
4. Under the shared discovery rules, stop before a duplicate when an equivalent or uncertain candidate has normative content. Ask whether to adopt it, merge into it, choose another canonical owner, or abort.
5. Inspect managed markers. Future schemas, malformed/nested/duplicate markers, and unmarked content proposed for ownership require explicit resolution.

### Step 2 - Build the evidence-bounded context profile

Inspect only sources used by the proposed model: Git/forge facts, CI configuration, build/package/release files, deployment definitions, application topology, state/migration documents, existing strategies and pitfalls, permissions, and adopted decisions. Record the bounded sources.

Keep these distinctions:

- Forge and CI provider are separate facts. Configuration does not prove execution, enforcement, publication, deployment, or exposure.
- Source integration, delivery, deployment, release, and exposure are separate events. A merged branch or Git tag is not an installed store release, running service, exposed feature, or updated device fleet.
- Applicability, Lifecycle, and Knowledge use separate evidence. Team size does not choose a preset.
- Do not assign Lifecycle `DEFERRED` merely to suppress an inactive body. It requires a confirmed postponement and named trigger; when Lifecycle intent is unresolved, include that choice in the consolidated confirmation instead of deriving it from Applicability or Knowledge.
- Delivery Units require real consumer-facing paths. Evaluate applicability and reachability per unit; a shared control or dependency does not make every unit applicable.
- Manual objectives do not imply a human actor. Record actor kind from evidence as `AUTOMATION`, `AGENT`, `HUMAN`, `HYBRID`, or `EXTERNAL`.
- A strategy document does not attest to operation. Unknown production history, rollback safety, permissions, reviewer independence, or provider capability remains unknown.

For an unfamiliar prototype, establish the compact fact that no delivery path is confirmed. Do not create pretend artifacts, gates, release stages, recovery, compliance, or maintenance machinery.

### Step 3 - Model real units, artifacts, and Delivery Steps

Create Delivery Units only for real paths and evaluate each unit's consumers, owned/shared state, mode, reachability, and terminal outcomes.

Create artifact records only when identity, provenance, retention, signing, or transformation affects a delivery decision or consequence. Model stable artifact roles and identity/lineage rules, not every bundle, helper output, build, or release instance. Keep instance receipts in the producing system and link one only when a current decision consumes it. A rebuild, transformation, repackaging, or re-signing creates explicit predecessor/successor role lineage; never carry a build-once or prior-validation claim across changed bytes without evidence.

Treat Delivery Flow as the graph owned by a Delivery Unit, not as a separate public record. Each active unit names its entry and terminal nodes; every Step names its unit scope. Validate reachability and consequences per unit when a Step is shared. Model Steps only where actor/artifact identity, an action, a control, consequence timing, partial failure, or recovery must be expressed; reference provider definitions instead of mirroring every job or command. A passive success, failure, halted, isolated, or other terminal is a named graph disposition, not a full Step record, unless an action occurs at that boundary. Use “step,” not “transition,” for action nodes. Validate entry and terminal nodes, reachability, explicit success/failure/retry/compensation/recovery edges, bounded cycles, idempotency assumptions, compatible inputs/outputs, fan-out/join behavior, partial failure, consequence timing, and terminal dispositions.

Do not repair a malformed graph by inventing adapters, edges, retry ceilings, or providers. Show the invalid records and ask for a governing decision.

Store-mediated, desktop, mobile, firmware, offline, and long-lived-client paths require their real submission, external review, signing, staged availability, adoption, compatibility, and recovery semantics. Bound a rollout instance by artifact identity and cohort, phase, or observation window; its terminal does not claim universal fleet or client uptake. Record old-client and data-version compatibility for persistent-format or protocol changes. Do not substitute server rollback or zero-downtime deployment language.

### Step 4 - Model evidence, controls, review, and recovery

Preserve the dependency direction from the shared schema: Delivery Control depends on Delivery Evidence Need, which depends on Verification Gate, which depends on Verification Scope. The Testing strategy owns scopes and gate interpretation; this strategy owns delivery consumers and consequences. Reject reverse edges, cycles, and duplicate semantic owners.

If the Testing strategy or a referenced gate is absent, create a Lifecycle `TARGET` record with `UNRESOLVED_REFERENCE`; do not emit an active dangling link or silently define the Testing record here.

Controls record kind, actor kind, effect, consequence boundary, trust-boundary class/coverage, evidence validity, missing/stale/conflicting behavior, bypass authority/evidence, and failure behavior. A blocking control stops only its established affected scope while allowing diagnosis, repair, evidence production, and authorized exception activity.

Keep review outcome, finding disposition, approval, and exception separate:

- An implementer may use `REJECTED_WITH_RATIONALE` when policy permits; retain reviewer non-concurrence as raised.
- Reasoned rejection does not grant approval, create reviewer concurrence, or authorize an exception.
- When `INDEPENDENT_APPROVAL_REQUIRED` applies, the implementing actor cannot be the sole approval or exception authority for that scope.
- A same-session subagent is neither automatically sufficient nor excluded. Record the declared independence conditions, evaluation result and basis, and shared-context limitations.
- An approval or exception names its resolvable authority, consequence scope, and bound subject. When it consumes review evidence, it also names the review outcome and dispositions consumed. A blocking-finding policy maps predeclared finding states or materiality classes to effects.
- Classify platform/store review as an external control or Step, engineering review as `JUDGMENT_REVIEW`, and authorization as `AUTHORIZATION` when those distinct events exist.
- Non-relied advisory feedback needs no durable artifact. A relied review keeps the compact receipt contract, evidence locator, and validity/retention need defined by the shared schema; the strategy is not a per-review ledger. Full transcripts require an explicit policy or consumption need.

Activate recovery when failure can affect persistent, external, irreversible, or shared state; retry is unsafe; compensation is coordinated; or a current promise relies on recovery. Choose rollback, roll-forward, compensation, isolation, or another mechanism only from evidence. When rollback is unsafe, do not prescribe it. A current recovery names both actor kind and a resolvable operating role or mechanism that can initiate and close it. An unresolved responsibility or missing recovery stays Lifecycle `TARGET` and leaves the affected safe-delivery claim unsupported.

Create maintenance contracts only for current usage-derived first-order outcomes. Reject contracts that protect catalogs, routes, receipts, validators, contracts, or other maintenance machinery.

### Step 5 - Draft and confirm the smallest useful strategy

Fill the bundled template with:

- evidence-scoped current mode or an explicit no-established-path statement;
- an ordinary-change delivery expectation;
- authority/conflict routing and the complete Delivery module index;
- only applicable/current/known module bodies and evidence-bounded records;
- installed canonical companion links or plain-text target/unresolved records.

An active module body may contain Lifecycle `TARGET` child records for current obligations, such as a required missing recovery or companion gate. Omit a section only when its module body is inactive, not merely because a child mechanism is not current. Optional section region IDs are `delivery-units`, `artifacts-lineage`, `delivery-flows`, `evidence-controls`, `review-approval`, `recovery`, and `maintenance-retirement`; the last region may contain separate active anchors for its maintenance and retirement modules.

For a new record, render the common fields in the shared schema's order, followed by the record-type fields in their listed order. Use the shortest schema-valid table or YAML-like representation; refer to shared evidence rather than copying the same prose into every record. On reconciliation, preserve schema-valid IDs, record order, field order, and representation when their semantics and evidence have not changed. Do not rewrite for style; a valid unchanged snapshot is `CURRENT_NO_OP`.

Materialize and validate one complete proposed snapshot under the shared protocol. Present the canonical owner, bounded evidence and unknowns, per-unit applicability/reachability, active/inactive modules, graphs, artifact lineage, evidence/control dependencies, review/approval/exception state, recovery obligations, conflicts, exact files/regions, route status, redacted diff, and proposal digest. Ask for one consolidated confirmation.

Do not write before confirmation. Changed inputs, answers, topology, schema/skill version, or output bytes require a new preview. Decline returns `USER_SKIPPED`; unresolved authority/safety returns `BLOCKED_NO_CHANGE` with the applicable reason.

### Step 6 - Apply, verify, and report

Apply the confirmed snapshot under `PROJECT_SETUP_APPLY_LOCK_V1`, complete input-scope rediscovery/revalidation, exact-byte proposal binding, recoverable replacement, final receipt verification, and symmetric root-route reconciliation from the shared protocol.

Preserve bytes outside managed regions and supported metadata. On failure after mutation, restore and verify every attempted target or report honest partial state with recovery material. Do not create or change CI, hooks, dependencies, packages, infrastructure, credentials, controls, releases, deployments, schedulers, or remote state.

Report the strategy path, current delivery mode, units and reachability, artifact, unit-owned graph/Step, control, review, and recovery records, unresolved facts/references/conflicts, route result, exact-byte preservation, and any recovery material. Then end with exactly one `PROJECT_SETUP_CHILD_RESULT_V1` block using child ID `project-setup/delivery-strategy-init`. No prose follows it.

`CURRENT_NO_OP` requires semantic validation of the complete current record set, graphs, dependency direction, and routes, not heading or marker presence alone.

## Quick reference

| Step | Result |
|---|---|
| 1 | Establish root; discover exact and semantic candidates; resolve ownership. |
| 2 | Inspect bounded evidence; separate providers, events, fact axes, units, and operational capability. |
| 3 | Model only real units, artifacts/lineage, and valid Delivery Step graphs. |
| 4 | Model the one-way evidence seam, actor-neutral controls, distinct review/approval states, and proportionate recovery. |
| 5 | Emit the compact core/index plus active records; validate and confirm one bound proposal. |
| 6 | Lock, revalidate, apply, verify/restore, reconcile routes, and report one child result. |

## Pressure-test counters

| Tempting inference | Required response |
|---|---|
| “The release branch is the published product.” | Treat the branch as source state. Model store review, staged exposure, deployment, or device uptake only when those paths exist. |
| “Rollback is standard recovery.” | Choose recovery from state and consequence evidence. Use roll-forward or compensation when rollback is unsafe. |
| “The implementer rejected the finding, so review passed.” | Retain non-concurrence, the reasoned disposition, and approval as separate states. |
| “Independent approval means a human or a separate provider.” | Resolve the declared independence conditions and actor kind without assuming either. |
| “Keep every review transcript for safety.” | Keep nothing for non-relied advice, a compact receipt for relied review, and a full transcript only when policy or consumption requires it. |

## Common mistakes

- Treating Git merge, CI configuration, or a strategy document as delivery evidence.
- Assigning `DEFERRED` as an inactive-module default rather than from confirmed Lifecycle intent.
- Calling Delivery Steps “transitions” and forcing a graph into a linear stage list.
- Expanding passive terminal dispositions into full Step records or mirroring every provider job.
- Applying one unit's path or control to every monorepo unit without reachability evidence.
- Carrying artifact identity across rebuild, repackage, transform, or re-sign operations.
- Reversing the evidence dependency direction or defining Testing records in Delivery strategy.
- Collapsing reviewer outcome, disposition, approval, and exception into “review complete.”
- Assuming same-session review is sufficient or insufficient without evaluating the control.
- Prescribing server rollback to store/device or unsafe-migration paths.
- Building machinery to maintain the maintenance machinery.

## Cross-platform notes

Use host-native file, hashing, and Git operations. Do not require POSIX shell, PowerShell, WSL, a provider, or a bundled executable. Fail closed when the host cannot bind required identities or preserve an edited target safely.
