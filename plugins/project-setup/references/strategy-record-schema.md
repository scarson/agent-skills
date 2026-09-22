# Strategy record schema

Schema version 1 defines the semantic records hosted in managed regions of Testing and Delivery strategy documents. The records are Markdown tables or compact YAML-like fields, not a separate registry. Human explanation may live outside managed regions, but each semantic key has one canonical record owner.

## Common state model

Every module and modeled fact records these axes independently:

| Axis | Values | Rule |
|---|---|---|
| Applicability | `APPLICABLE`, `NOT_APPLICABLE`, `UNDETERMINED` | Applicability answers whether the subject belongs to the scoped project/unit, not whether it exists today. |
| Lifecycle | `CURRENT`, `TARGET`, `DEFERRED`, `RETIRED` | Lifecycle answers when the subject is intended to operate. |
| Knowledge | `KNOWN`, `UNKNOWN` | `KNOWN` requires at least one evidence basis. `UNKNOWN` records what was inspected or asked and the unresolved question. |
| Evidence basis | zero or more of `OBSERVED`, `USER_CONFIRMED`, `PROJECT_DOCUMENT`, `INFERRED` | Configuration is evidence of configuration, not automatically of exercised capability. |

Do not create a convenience status that collapses these axes. Examples such as `APPLICABLE + TARGET + UNKNOWN` and `UNDETERMINED + DEFERRED + UNKNOWN` are valid.

Assign each axis from its own evidence. Applicability or Knowledge never selects Lifecycle. Use `DEFERRED` only when the confirmed proposal or another governing decision postpones evaluation/adoption to a named trigger; use `TARGET` only when the project intends a missing mechanism or contract. If Lifecycle intent remains unresolved, surface it in the consolidated confirmation rather than deriving a value from the other axes.

Applicability follows the scoped concern, boundary, or objective rather than the presence of its verification mechanism. A confirmed cross-platform objective makes compatibility/platform testing `APPLICABLE` even when the supported-platform list and current coverage remain `UNKNOWN`; those gaps keep the module body inactive until Lifecycle and Knowledge also support activation.

Every semantic record has:

- `ID`: stable namespace plus a self-descriptive semantic-purpose slug.
- `Schema`: `1`.
- `Label`: mutable human-readable name.
- `Scope`: the delivery unit, verification subject, consequence, or repository portion governed.
- the three state axes and evidence bases above;
- `Authority`: adopted canonical owner or governing decision for the record's semantic keys;
- `Evidence`: narrow observations, confirmations, document anchors, or inferences supporting current values;
- `Unresolved`: unknowns and conflicts that constrain reliance;
- optional `Supersedes` or `Aliases`: unique, acyclic references. Replaced IDs remain tombstones and are never reused.

Supporting context observations that do not own a semantic key are not standalone records and need no new namespace. Put them in the consuming core/module record's Evidence or Unresolved field. A compact table inside the core may give forge, CI configuration, and CI operation separate rows while preserving their independent axes.

## Identifier namespaces

Use these public forms: `TESTING-MODULE-*`, `VERIFICATION-SCOPE-*`, `VERIFICATION-GATE-*`, `DELIVERY-MODULE-*`, `DELIVERY-UNIT-*`, `DELIVERY-ARTIFACT-*`, `DELIVERY-STEP-*`, `DELIVERY-RECOVERY-*`, `DELIVERY-EVIDENCE-NEED-*`, `DELIVERY-CONTROL-*`, `MAINTENANCE-CONTRACT-*`, `TESTING-CONFLICT-*`, and `DELIVERY-CONFLICT-*`.

The slug describes stable purpose, not a provider, mutable implementation mechanism, or ordinal. A stable collision discriminator is allowed. Labels and mechanisms may change without renaming the ID.

## Module indexes

Every known module row appears exactly once in its document. An `APPLICABLE + CURRENT + KNOWN` row has exactly one active body anchor. All other bodies are omitted. A retired row is a tombstone with a reason and no active body. The index supports discovery; it does not activate a control or claim assurance.

Module-index rows are compact projections of module records rather than duplicated full bodies. The enclosing managed-region marker supplies `Schema`; the catalog supplies the stable ID and label; and the strategy document supplies the project scope. In each catalog below, the activation question is the module record's mutable `Label`. Each row carries the three state axes plus the common record's `Authority`, `Evidence`, and `Unresolved` values. A validator must use those declared sources and must not invent missing values or require redundant columns. A compact cell may combine evidence detail with its basis, but a bare basis label is insufficient for `UNKNOWN`: name what the initializer inspected or asked, why the question remains unresolved, and the activation trigger.

### Testing module catalog

| Module ID | Activation question |
|---|---|
| `TESTING-MODULE-ORDINARY-CHANGE` | What is the fastest useful, reproducible evidence expected for an ordinary change now? |
| `TESTING-MODULE-BOUNDARY-CONTRACTS` | Are there public, integration, protocol, schema, or ownership boundaries whose contracts need explicit verification? |
| `TESTING-MODULE-TEST-DOUBLES` | Do doubles materially affect confidence, isolation, or fidelity? |
| `TESTING-MODULE-TEST-DATA-PERSISTENT-STATE` | Does verification create, migrate, share, or clean persistent state or representative data? |
| `TESTING-MODULE-TIME-CONCURRENCY` | Are time, ordering, races, retries, idempotency, or parallel writers material? |
| `TESTING-MODULE-COMPATIBILITY-PLATFORM` | Are platform, version, client, offline, or compatibility claims relied upon? |
| `TESTING-MODULE-NONFUNCTIONAL-BEHAVIOR` | Are performance, security, accessibility, resilience, resource, or other nonfunctional properties decision inputs? |
| `TESTING-MODULE-PRODUCTION-VERIFICATION` | Does a current decision consume deployed or operational evidence? |
| `TESTING-MODULE-FLAKE-QUARANTINE-SKIP` | Do flaky, quarantined, skipped, or conditionally unavailable checks affect evidence interpretation? |
| `TESTING-MODULE-EXCEPTIONS` | Are waivers, risk acceptances, or incomplete-evidence paths used? |
| `TESTING-MODULE-RETIREMENT` | Must scopes, gates, aliases, or testing promises be retired without losing history? |
| `TESTING-MODULE-MAINTENANCE-CONTRACTS` | Does a current usage-derived outcome rely on an event-triggered maintenance action? |

### Delivery module catalog

| Module ID | Activation question |
|---|---|
| `DELIVERY-MODULE-ORDINARY-CHANGE` | What is the current delivery expectation for an ordinary change, including an honest no-path state? |
| `DELIVERY-MODULE-DELIVERY-UNITS` | Which independently delivered consumer-facing units have real paths? |
| `DELIVERY-MODULE-ARTIFACTS` | Which concrete artifacts require identity, provenance, transformation, retention, or signing records? |
| `DELIVERY-MODULE-DELIVERY-FLOW` | Which non-linear delivery paths and consequence boundaries currently exist? |
| `DELIVERY-MODULE-EVIDENCE-CONTROLS` | Which delivery consequences consume verification or operational evidence? |
| `DELIVERY-MODULE-REVIEW-APPROVAL` | Which review, disposition, approval, exception, or independence semantics support a current decision? |
| `DELIVERY-MODULE-RECOVERY` | Which persistent, external, irreversible, shared-state, or unsafe-retry consequences need recovery? |
| `DELIVERY-MODULE-MAINTENANCE-CONTRACTS` | Which current delivery outcomes rely on event-triggered maintenance actions? |
| `DELIVERY-MODULE-RETIREMENT` | Which delivery records or promises must be retired while retaining tombstones and lineage? |

## Testing records

### Testing posture

The core records:

- evidence-scoped current posture;
- an actionable ordinary-change expectation;
- each confirmed entry point, or an explicit statement that none is confirmed;
- authority/conflict routing;
- the complete module index;
- references to relevant pitfalls without copying their entries.

A confirmed or discovered entry point is a Verification Scope record. The core posture summarizes and links to zero or more of these records; it does not replace them. Each entry point records:

| Field | Meaning |
|---|---|
| `Status` | `CONFIRMED` only when successfully exercised for the stated purpose; otherwise `DISCOVERED`, `UNAVAILABLE`, or `UNKNOWN`. |
| `Working directory` | Canonical project-relative start directory. |
| `Command or executor` | Exact nonsecret invocation or named external mechanism. |
| `Prerequisites` | Required tools, services, data, credentials by identifier/location only, and platform constraints. |
| `Side effects and cleanup` | Files, state, network, services, or other mutations and their cleanup. |
| `Result semantics` | What exit/result states mean pass, fail, or inconclusive. |
| `Evidence scope` | Behaviors, boundaries, units, and environments covered. |
| `Blind spots` | Important exclusions and unavailable variants. |
| `Provenance` | The observation, confirmation, or governing document and validation date/event. |

### Verification scope

A scope defines evidence production only:

- `Inputs`: code, configuration, fixtures, deployed subject, or other bounded subject.
- `Executor`: command or external mechanism, environment, prerequisites, and side effects.
- `Outputs`: durable or ephemeral evidence objects and their identity.
- `Semantics`: pass, fail, inconclusive, unavailable, and stale meanings.
- `Coverage`: behaviors, boundaries, units, and platforms included.
- `Blind spots`: exclusions, fidelity limits, and uncertainty.
- `Validity`: freshness or subject-identity rules when evidence will be consumed later.

Do not select a fixed test pyramid or raw coverage target as a universal default. Choose evidence from risks, behaviors, boundaries, and feedback cost. Put the fastest useful feedback first.

### Verification gate

A gate evaluates one or more scope results and owns only their interpretation:

- `Depends on`: scope IDs.
- `Consumer`: the decision or Delivery evidence need that asks for the interpretation.
- `Evaluation`: exact combination, threshold, freshness, identity, missing, stale, conflicting, and inconclusive rules.
- `Result`: `SATISFIED`, `UNSATISFIED`, or `UNVERIFIED` for a bound subject/evidence/time.

A desired gate without an operating evaluator is Lifecycle `TARGET`. A command, warning, pull-request convention, or documented aspiration is not itself an active gate. The gate does not own a delivery consequence.

### Testing conflicts

A conflict record names affected semantic keys, candidate owners, incompatible claims, evidence, the blocked reliance, allowed diagnosis/repair activity, and the authority needed to resolve it. Unknown authorship stays unknown.

### Strategy references

Emit a Markdown link only when the canonical destination and anchor exist in the proposed snapshot. For an absent companion, create a prospective reference record with Lifecycle `TARGET`, the expected semantic owner, and `UNRESOLVED_REFERENCE`; render plain text rather than a clickable link. Reconciliation may replace the prospective record with an active link after the companion initializer establishes the target.

## Delivery records

### Delivery unit

Create units only for real delivery paths. A unit records consumers, boundary and owned state, current mode, entry/terminal outcomes, dependencies shared with other units, and applicability evidence. A shared control does not make every unit reachable or applicable; evaluate each unit independently.

### Delivery artifact

Create an artifact record only when identity, provenance, retention, signing, or transformation affects a delivery decision or consequence. Strategy records normally describe stable artifact roles plus their identity and lineage rules, not one row per build or release. Concrete instance receipts stay in the producing, registry, CI, or store system and are linked only when a current decision consumes them. Record type, producer, content/identity rule, provenance, retention, signing/attestation when present, and lineage. Build-once promotion is a current claim only when adopted and when the path preserves the relevant identity. Rebuild, transform, repackage, and re-sign rules create explicit predecessor/successor role lineage rather than claiming unchanged promotion; a consumed instance proves its own lineage through the referenced receipt.

### Delivery flow and step

Delivery is a graph of steps, not presumed linear stages. Delivery Flow is the graph projection owned by a Delivery Unit, not a separate public record namespace. Each unit with an active flow names its entry Step IDs and its terminal dispositions. A terminal disposition is a compact graph label, not a semantic record: declare a self-descriptive key unique within the owning unit, result class (`SUCCESS`, `FAILURE`, `HALTED`, `ISOLATED`, `RECOVERED`, or another defined class), and meaning. An edge target resolves to a Step ID or one terminal key in the owning unit; a shared Step qualifies the unit when terminal targets differ. Create a Step record for a terminal boundary only when an action, control, consequence timing, or recovery occurs there. A Step's common `Scope` names every Delivery Unit whose graph includes it; validate reachability and consequences separately for each named unit. A shared Step declares unit-specific inputs, outputs, edges, or consequences wherever they differ.

Model Steps only at boundaries needed to express actor or artifact identity, a control, a consequence, partial failure, or recovery. Reference underlying CI, deployment, store, or device definitions instead of copying every internal job or command. A step records:

- compatible inputs and outputs;
- action, actor kind (`AUTOMATION`, `AGENT`, `HUMAN`, `HYBRID`, `EXTERNAL`), and a resolvable operating role or mechanism when the step is current;
- side effects and consequence timing;
- idempotency assumptions;
- referenced controls and recovery;
- success, failure, retry, compensation, and recovery edges.

Every active step is reachable from an entry and can reach a success or explicit failure/recovery terminal disposition. Every referenced terminal key is declared in its owning unit and is reachable from at least one entry. Branches are explicit. Cycles are bounded. Fan-out/join and partial failure are defined where present. Edge types and input/output compatibility validate. A store, device, offline-client, or other open-ended rollout instance is bounded by artifact identity and a cohort, phase, or observation window; its terminal does not imply universal client uptake. Record old-client and data-version compatibility behavior when a path changes persistent formats or protocols. Do not silently repair an invalid submitted graph or invent adapters, retry ceilings, or provider mechanisms; show the defects and ask for a decision.

### Evidence dependency direction

The only normative direction is `DELIVERY-CONTROL-*` → `DELIVERY-EVIDENCE-NEED-*` → `VERIFICATION-GATE-*` → `VERIFICATION-SCOPE-*`, where each arrow means “depends on.” Reverse dependencies, duplicate normative owners, and cycles are invalid. Missing cross-document targets remain Lifecycle `TARGET` with `UNRESOLVED_REFERENCE`; they are not active dangling references.

### Delivery evidence need

An evidence need translates a delivery consequence into required assurance without redefining testing evidence production. Record the consequence/consumer, subject identity, required gate result, freshness, missing/stale/conflicting behavior, and why the evidence is proportionate.

### Delivery control

A control records:

- `Kind`: `EVIDENCE_REQUIREMENT`, `JUDGMENT_REVIEW`, `AUTHORIZATION`, or `EXTERNAL_CONTROL`.
- `Actor kind`: `AUTOMATION`, `AGENT`, `HUMAN`, `HYBRID`, or `EXTERNAL`.
- `Effect`: `BLOCKING`, `ADVISORY`, or `OBSERVE_ONLY`.
- affected consequence boundary and consumer;
- trust boundary identity, class (`ENFORCING`, `WORKFLOW`, `ADVISORY`, `EXTERNAL`), coverage, and failure behavior;
- depended-on evidence needs and evidence validity/freshness;
- precommitted missing, stale, conflicting, bypass, and failure behavior;
- bypass authority and evidence when bypass exists.

`BLOCKING` stops the affected consequence while allowing diagnosis, repair, evidence production, and authorized exception activity. Another flow continues only when the model establishes that it does not share the blocked consequence, state, resource, or transaction; otherwise expand the affected scope explicitly.

### Review, approval, and findings

Keep reviewer, finding disposition, approval, and exception roles distinct. Supported policy semantics include `ADVISORY_REVIEW`, `REVIEW_AND_DISPOSITION_REQUIRED`, `INDEPENDENT_APPROVAL_REQUIRED`, and `BLOCKING_FINDING_POLICY`. Independence state is `INDEPENDENCE_REQUIRED`, `ACCEPTED_SELF_REVIEW`, or `NOT_APPLICABLE`.

Independent review requires a distinct actor or independently operated mechanism for the declared scope. The control declares its independence conditions, their evaluation result and basis, and known shared-context limits. A same-session subagent is neither automatically excluded nor automatically sufficient. Bind the reviewed subject identity only to the precision the control requires. An approval or exception names its resolvable authority, exact consequence scope, and bound subject; when it consumes review evidence, it also names the review outcome and dispositions consumed. A blocking-finding policy precommits which finding states or materiality classes produce which control effect. The reviewer outcome must reach the consuming control without being rewritten as concurrence.

Finding dispositions are `ACCEPTED`, `REJECTED_WITH_RATIONALE`, `DEFERRED_OPEN`, `SUPERSEDED_BY <evidence-or-review>`, and `EXCEPTED_BY <authority>`. Deferral remains open. The implementer may reject findings with rationale when policy permits; that does not turn reviewer non-concurrence into concurrence, independent approval, or self-granted exception.

Non-relied advisory feedback needs no durable artifact. A control that relies on review retains a compact receipt with policy/control version, reviewed scope or subject identity, reviewer role/mechanism and independence basis, time, coverage/limitations, outcome, material findings as raised, dispositions/rationales, unresolved findings, approval/exception outcome, and final control result. The strategy defines this receipt contract, its evidence locator, and its validity/retention need; it is not an append-only review ledger. Instance receipts remain available only for their declared consumption and validity window. Full output/transcript is retained only under an explicit policy or consumption requirement. An external required transcript uses an immutable locator or provider object identity, digest where feasible, and expected access/retention window. If required evidence is unavailable at consumption, the result is `UNVERIFIED`.

### Recovery

Recovery activates when failure can affect persistent, external, irreversible, or shared state; retry is unsafe; coordinated compensation is required; or a current operational promise depends on recovery. Exercise status is evidence, not an activation prerequisite. Record trigger, affected state, safe direction (rollback, roll-forward, compensation, isolation, or another confirmed mechanism), responsible actor kind, resolvable operating role or mechanism, prerequisites, bounded steps, verification, terminal disposition, and known limitations. If the operating responsibility is unresolved, the recovery remains Lifecycle `TARGET`. If a consequential step needs recovery and none exists, create a Lifecycle `TARGET` recovery record and state that the affected safe-delivery claim is unsupported.

## Maintenance contracts without recursion

Create a maintenance contract only for a current, usage-derived first-order project outcome: an actual current claim, required workflow, delivery decision, consumer promise, persistence guarantee, approval rule, or recovery promise. Do not create one merely because a module or field exists.

The record contains:

- protected outcome and scope;
- event and named detection mechanism, including blind spots;
- response action and resolvable authority responsible for closure;
- affected consequence boundary, failure behavior, bypass behavior;
- closure evidence and a validation entry point;
- `OnUnverified`: `BLOCK`, `ESCALATE_TO <actor>`, `WARN_AND_REQUIRE_DISPOSITION`, or `ALLOW_WITH_RECORDED_RISK <authority>`;
- trust-boundary identity, class, coverage, and failure behavior;
- immutable evidence reference or live lookup plus freshness threshold.

At consumption, validation returns `SATISFIED`, `UNSATISFIED`, or `UNVERIFIED` for the contract version, subject, trust boundary, evidence, and time. Evidence comes from the named action, verifier, or boundary. A contract or validation result is never evidence for itself or another contract.

Never protect catalogs, module states, strategy sections, routes, contracts, validation results, receipts, controllers, validators, initializers, or the continued existence/correctness of maintenance machinery. Generate no recursive verifier, receipt, trigger, or assurance machinery. If the proposed protected subject is machinery rather than the first-order outcome that consumes it, reject the contract and model the consumer's behavior when evidence is unavailable instead.

## Snapshot validation

Before preview and again before apply, validate the complete proposed snapshot:

- one canonical owner per semantic key and unique IDs within each namespace;
- complete module indexes, state-axis validity, evidence-basis requirements, active-body cardinality, and retained tombstones;
- managed-region schema and marker integrity;
- active references resolve; absent companion references are target/unresolved rather than active;
- delivery flow reachability, terminal reachability, explicit branches, bounded cycles, joins, edge types, and compatible inputs/outputs;
- the one-way evidence dependency graph has no reverse edge, duplicate owner, or cycle;
- controls, review/approval semantics, recovery obligations, and maintenance boundaries are internally consistent;
- no provider capability, operational history, deployment, recovery, approval, or enforcement claim exceeds its evidence;
- no inactive/unknown body or placeholder compliance machinery is emitted;
- exact bytes outside owned regions and supported metadata are preserved.
