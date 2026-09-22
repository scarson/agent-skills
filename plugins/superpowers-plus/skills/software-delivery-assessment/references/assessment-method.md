# Assessment method

Use this method to investigate a bounded software-delivery system. The goal is a grounded account of how relevant changes flow, what proves them safe enough to progress, and where material uncertainty remains. Continuous delivery is a possible conclusion, not an entry assumption.

Load the [evidence snapshot contract](delivery-evidence-snapshot.md) before choosing a run ID, acquiring connected evidence, or writing artifacts. Use the [capability model](capability-model.md) and [testing model](testing-model.md) as question sets, not checklists.

## Phase 1: Anchor

Name the artifact host and the assessed source before exploration changes either one. Reserve an output directory, exclude it from assessed scope, and record the pre-observation fingerprint as described by **source-anchor-first**, **output-subtree-exclusion**, and **sha256-path-bytes-v1**.

Discover delivery units before treating a repository as one system. For each unit, record:

- unit ID, path boundary, owners, and intended users
- change classes and production or distribution targets
- build, test, package, release, and recovery entry points
- shared controls and the identity of each shared control
- repository, forge, CI, registry, deployment, and operational surfaces
- dependencies on other units and any independent release boundary

In a monorepo, map shared controls once but do not let them erase unit-specific paths. Reuse evidence only for the proposition established by the same control identity. Record sampling, grouping, exclusions, and unassessed unit surfaces.

## Phase 2: Preflight

Separate repository visibility from forge and CI visibility. A checked-out workflow file shows configuration, not whether the provider requires it, ran it, retained results, or allowed a side door.

Before expensive analysis, probe access to every candidate material source. Record each source as available, denied, absent, retention-limited, pagination-limited, or otherwise unknown. If forge or CI evidence could materially change the assessment and access is missing, ask the user whether to fix access, narrow the question, or accept a named gap. Do not silently fall back to static observation. An unattended run pauses as `blocked` with the decision needed to resume.

Declare traversal and resource bounds: unit paths, maximum files/bytes/depth, generated trees, archives, external record windows, parallel lanes, process count, and time/cost budget. Inventory archives by path, size, type, and hash. Do not extract them by default. Extraction needs a separate assessment-owned location outside source, explicit file/byte/depth limits, and the same containment accounting.

Screen local commands before running them. Ordinary bounded builds, tests, linters, and read-only provider queries are expected assessment work. Pause when a command has credible production, external mutation, configuration, credential, large fan-out, or material cost effects. A worktree isolates files; it does not isolate credentials, networks, providers, services, or billing. Do not plant secret canaries, probe a scanner by attempting a leak, or create remote write traps.

## Phase 3: Acquire

Prefer direct evidence for material propositions. Repository content, connected provider state, behavior events, local dynamic verification, and operational records remain distinct observation kinds with the ceilings defined by **evidence-state-ceiling**.

Connected acquisition uses one of two shapes:

- **reference-only-observed-value** for the default narrow persistence boundary
- an `allowlisted_record` containing only fields in **connected-record-allowlist** when the extra structured fields are needed

These shapes limit persisted content; they do not claim secret-scanning machinery exists. Unknown permissions, pagination, retention, and provider behavior remain limitations. Never turn denied or missing data into affirmative evidence.

For each material source, capture source identity, predicate, delivery unit, relevant path, collection and result windows, persistence shape, evidence IDs, and limits. **real-metrics-only**. Record real event data when computing an operational measure: numerator, denominator, event definitions, source, exclusions, and window. Without that history, report the measure as unavailable or recommend instrumentation. Do not infer zero.

## Phase 4: Analyze

Give each core lens a reasoned disposition (`required`, `supplemental`, or `not_applicable`) and outcome (`succeeded`, `failed`, or `unassessed`):

1. flow and integration
2. CI and artifact handling
3. testing
4. release and operations
5. system structure

Add an overlay only when the discovered context warrants it, such as agentic delivery, regulatory/control objectives, or high-consequence operation.

Parallel lanes return structured candidates, not free-floating conclusions. Each lane returns its unit and change-class scope, proposition, assertion, evidence and counterevidence IDs, evidence ceiling, source/result window, limitations, materiality, candidate disposition, and any proposed recommendation fields. Lane snapshot IDs must echo the anchored snapshot.

**bounded-negative-claim**. A bounded negative names the repositories, paths, provider surfaces, record types, and time windows searched. It also names denied, partial, truncated, or retention-limited surfaces. “Not found in the searched bounds” is not “does not exist.”

**proportional-verification**. Fully bind material findings and claims that drive status, safety, scope, or recommendations. Aggregate routine supporting observations when the shared scope and limits are explicit. Stop low-consequence detail work when it cannot change a material decision. If new verification would materially expand cost or fan-out, ask before spending; unattended execution blocks with the proposed expansion, affected conclusions, and required decision.

## Phase 5: Reconcile

Merge candidates by proposition, unit, capability, change class, predicate, and typed assertion. Apply exactly one disposition from **material-candidate-reconciliation**. Preserve every affected unit and evidence ID when deduplicating or combining findings.

Keep assertion value separate from knowledge state. A predicate observed as false is not automatically `contradicted`; contradiction needs incompatible support and counterevidence for the same proposition. Enforce **affirmative-closure-only** and the status rules in **material source coverage** and **status-gap-invariant**.

**traceable-recommendation**. Recommendations remain traceable to an exact claim and finding fingerprint. Record desired outcome, causal mechanism, trade-offs, dependencies, responsible control boundary, verification method, observable closure evidence, ordering rationale, and whether it addresses a `current_gap` or `future_trigger`.

Order recommendations by:

1. immediate safety or reliability blockers
2. the largest demonstrated system constraint
3. prerequisite order
4. impact and confidence

Use estimated effort only to sequence work within one of those bands.

## Phase 6: Report, close, or pause

Write the four canonical artifacts and begin the report with **coverage-first-report**. State units and bounds before conclusions. Show accepted gaps, material unknowns, unavailable sources, and undemonstrated paths prominently.

Close only when every material source is reconciled consistently with the chosen status. A blocked run records exact **resume-anchor-validity** data and a concrete next decision or access requirement. A later correction to a closed snapshot is a graph-linked addendum under **closed-root-freeze** and **addenda-provenance-graph**, never an invisible rewrite.

The assessment may offer to create a remediation plan or record pre-authorization for one. It does not implement remediation in the assessment session.
