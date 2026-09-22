# Delivery evidence snapshot contract

Load this when either software-delivery skill creates, resumes, validates, or links an assessment artifact. Load it before choosing a run ID, writing a manifest, acquiring connected evidence, or changing an addenda index.

This contract defines artifact schema version `1` and method version `1.0`. Keywords such as MUST and MUST NOT are normative.

## manifest-json-subset

`manifest.yaml` MUST contain JSON text that is valid YAML. Schema version 1 deliberately uses this JSON-compatible subset so `JSON.parse` is the dependency-free reader. A later schema may introduce a YAML parser; version 1 outputs MUST NOT require one.

## four-canonical-artifacts

Every root and addendum directory contains exactly these canonical files:

1. `manifest.yaml`
2. `evidence.jsonl`
3. `claims.jsonl`
4. `report.md`

A root may also contain `addenda/` and `lane-notes/`; an addendum may contain `lane-notes/`. The four files are the canonical snapshot. `addenda/index.jsonl` is derived discovery data, not a fifth canonical artifact.

## run identity and reservation

A run ID is `YYYY-MM-DDTHHMMZ-<scope>-<suffix>`. Scope is a lowercase filesystem-safe slug. A generated suffix MUST contain at least 48 random bits encoded as 12–16 lowercase hexadecimal characters. Creation uses an exclusive directory operation, retries a collision with fresh entropy, and never treats an existing directory as a run to overwrite or resume. The shorter 4-character fixture suffixes are stable schema examples, not a generation recommendation.

## manifest fields

A root manifest records:

- `method_version`, `artifact_schema_version`, `run_id`, `run_kind`, `status`, `closed`, and UTC `anchored_at`
- artifact-host identity, `output_subtree`, `index_path`, bounded scope, and delivery units
- `repository_anchor` with repository identity, assessed-source revision, current revision, and any verified artifact-only ancestry
- initial working-tree state and a typed inventory whenever it is dirty
- fingerprint method, scope, snapshot ID, pre/post fingerprints, and any lane snapshot IDs or truncated surfaces
- source capabilities, closed `material_sources`, lenses, traversal/resource bounds, and dynamic-execution controls
- persistence mode plus both authorization booleans and both exact path lists
- relations, resume anchors when open, and plan/link data when applicable

An addendum also records `root_run_id`, target claim IDs, decisions, evidence windows, and plan paths.

## writer-preflight

Before writing any canonical file, construct the run in memory and check the exact shapes below. These names and enums are closed for schema version 1; do not invent synonyms. The short fragments at the end of this reference illustrate individual bindings only and are not valid complete artifacts.

### Manifest shape

| Area | Required shape |
| --- | --- |
| Identity | `method_version`, `artifact_schema_version`, `run_id`, `run_kind`, `status`, `closed`, `anchored_at` |
| Host and scope | `artifact_host`; relative `output_subtree`; `index_path`; `scope: {slug,paths}`; `delivery_units: [{unit_id,paths}]` |
| Repository anchor | `repository_anchor: {identity,assessed_revision,current_revision,artifact_only_ancestry}` |
| Initial tree | `working_tree_state: "clean"|"dirty"`; `working_tree_inventory: []` when clean and a non-empty typed inventory when dirty |
| Fingerprint | `fingerprint_method: "sha256-path-bytes-v1"`; `fingerprint_scope: {complete,included_paths,handled_paths,exclusions}`; 64-hex `pre_fingerprint` and `post_fingerprint`; `snapshot_id` exactly `snap-sha256-<pre_fingerprint>`; arrays `lane_snapshot_ids` and `truncated_surface` |
| Bounds and execution | `traversal_bounds: {max_files,max_bytes,max_depth}`; booleans `isolation_used` and `not_isolated`; arrays `execution_controls_applied` and `remained_reachable` |
| Coverage | arrays `source_capabilities`, `material_sources`, and `lenses`; every lens is `{lens,disposition,outcome,reason}` using the closed lens enums |
| Persistence | `persistence_mode: "write_only"|"authorized_commit"`; boolean `commit_authorized`; array `authorized_stage_paths`; boolean `plan_persistence_authorized`; array `authorized_plan_paths`; false authorization always has an empty companion array |
| Graph and resume | array `relations`; a blocked root also has the exact `resume_anchors` structure from **resume-anchor-validity** |

Every required field remains present when its value is false or an empty array. An authorized new run also carries its pinned output directory and run ID as defined by the authorization rules. Before closure, recompute the fingerprint from the record stream; never substitute a hash of a manifest, concatenated file digests without path records, or an informal file inventory.

### Evidence shape

Every evidence line has `evidence_id`, `proposition_id`, `unit_id`, `paths`, `observation_kind`, UTC-second `collected_at`, proposition-bound `observed_value`, `persistence_shape`, and `limitations`.

- `persistence_shape: "reference_only"` permits a query-free `opaque_locator` and only limitations from `content_not_persisted`, `source_access_limited`, `window_limited`, and `manual_interpretation`. It has no `persisted_fields`.
- `persistence_shape: "allowlisted_record"` requires a `persisted_fields` object whose keys and scalar values conform to **connected-record-allowlist**.
- `external_system_observed` also has exactly one `external_observation_subtype` and the applicable `source_collection_window` and `result_window`.
- `inference` has a non-empty `derived_from_evidence_ids`; no other observation kind carries that field.
- When any record is `dynamically_verified`, the manifest execution fields above state the controls used and what remained reachable.

There is no `repository_path_reference`, `embedded_record`, or other persistence shape in schema version 1.

### Claim and report shape

Every claim line has `claim_id`, the same `proposition_id` as its evidence, `unit_id`, `capability`, `change_class`, `affected_path` where applicable, `predicate`, proposition-bound `assertion`, `claim_state`, `temporal_state`, arrays `supporting_evidence_ids` and `counterevidence_ids`, `limitations`, `consequence`, `materiality`, one discriminated `disposition`, and an array `recommendations`. A disposition starts with `{"type":<disposition-name>,"evidence_ids":[...],"unit_ids":[...]}`; its discriminator key is exactly `type`, and variant fields follow **material-candidate-reconciliation**.

A claim MUST NOT directly cite merely related evidence with a different proposition ID. When a conclusion combines several propositions or behavior windows, emit one `inference` evidence record bound to the conclusion's proposition, put the source evidence IDs in its non-empty `derived_from_evidence_ids`, apply the weakest input ceiling, and cite that inference from the claim. A demonstrated behavior claim bound directly to one behavior event uses that event's exact `result_window`; it cannot stretch across several event windows without the proposition-bound inference bridge.

Claim state is exactly `claimed`, `configured`, `demonstrated`, `contradicted`, `unknown`, or `not_applicable`. Do not use `unassessed`, `unsupported`, `false`, or a disposition name as a claim state. Every disposition preserves non-empty `evidence_ids` where evidence exists and all affected `unit_ids`. Every recommendation uses the complete fields in **finding and recommendation identity**.

The report cites every emitted claim ID and evidence ID exactly in backticks. Coverage-first sections do not waive that accounting rule. A blocked report adds an exact standalone `# Resume instructions` heading after the six coverage-first headings; persistence text uses a separate later heading. Before closure, scan all four files for dangling IDs, proposition mismatches, unrepresented material sources, incomplete lens records, invalid state ceilings, and absent citations.

Status is one of `complete`, `partial`, `blocked`, or `aborted`. Only `blocked` is open (`closed: false`). Other statuses are closed.

## source-anchor-first

The artifact host and bounded assessed-source anchor MUST be recorded before connected acquisition, dynamic verification, or parallel analysis. The open manifest first records the repository identity, assessed revision, initial working-tree inventory, fingerprint scope, `pre_fingerprint`, and `snapshot_id`. Report-time code adds the post fingerprint and closure; it MUST NOT manufacture both observation boundaries at the end.

An authorized artifact commit may advance `repository_anchor.current_revision` without invalidating the assessed revision only when every intervening changed path is inside the declared artifact subtree and the assessed-source fingerprint is unchanged. The original `assessed_revision` remains the source anchor. Any intervening source change invalidates resume/cycle anchoring.

## output-subtree-exclusion

The output subtree is declared before source collection and excluded from the assessed view, source inventory, and drift fingerprint. If it overlaps a delivery-unit path, collection stops until the user supplies an output directory outside assessed scope.

## sha256-path-bytes-v1

Walk the complete bounded source without following links. Exclude `.git/` and the declared artifact subtree. Normalize relative paths to UTF-8 NFC with `/` separators, reject normalized collisions, and sort ordinally.

- file: `F\0<path>\0<size>\0<sha256-exact-bytes>\n`
- link: `L\0<path>\0<normalized-target>\n`
- handled entry: `H\0<path>\0<handling-code>\0<canonical-parameters-json>\n`

Links are read using the platform's link primitive without following them. Decode as strict UTF-8; reject NUL, CR, LF, and Windows NT namespace targets. Normalize NFC. Windows link targets convert `\` to `/` and lowercase an initial drive letter. Lexically collapse repeated separators and `.` segments without resolving the target against the filesystem. Junctions are Windows-only.

Ordinary non-empty directories add no record. Closed handling codes are:

- `empty_directory`: `{}`
- `binary_opaque_hashed` and `archive_not_extracted`: `{"byte_size":<safe integer>,"sha256":"<64 lowercase hex>"}`
- `generated_subtree_bounded`: `{"enumerated_entries":<integer>,"max_entries":<integer>,"remainder":"present_unknown_count"}`
- `declared_exclusion`: `{"reason_code":"dependency_cache"|"generated_output"|"user_declared"}`
- `resource_bound_truncation`: `{"bound_code":"max_files"|"max_bytes"|"max_depth","limit":<integer>,"observed":<integer>,"remainder":"present_unknown_count"}`

Parameter keys are ordinal, values are canonical JSON, and extra keys are invalid. The digest of the concatenated record stream is both the lowercase fingerprint and the suffix of `snap-sha256-<digest>`.

## evidence records

Evidence IDs match `ev-[a-z0-9][a-z0-9._-]{0,127}`. Every record has a stable proposition ID, unit/path links, observation kind, `collected_at`, typed `observed_value`, persistence shape, limitations, and source/result windows where applicable. `collected_at` is this run's acquisition/read time and is not earlier than `anchored_at`; provider `source_collection_window` may predate it.

Observation kinds are `documentation_declared`, `human_confirmed`, `repository_observed`, `external_system_observed`, `dynamically_verified`, `operational_record`, and `inference`. An external record has exactly one subtype: `configuration_snapshot` or `behavior_event`. Only inference carries a non-empty `derived_from_evidence_ids`.

Every connected record has proposition-bound `observed_value`:

```json
{"type":"predicate_result","proposition_id":"pr-ci-required","value":true}
```

The only values are `true`, `false`, and `"unknown"`.

## connected-record-allowlist

- `provider`
- `object_type`
- `opaque_object_id`
- `collected_at`
- `window_start`
- `window_end`
- `status`
- `ref`
- `check_id`
- `check_name`
- `ci_run_id`
- `environment_name`
- `deployment_id`
- `incident_id`
- `review_count`

In an `allowlisted_record`, token fields are lowercase bounded non-content tokens; time fields are UTC seconds; `review_count` is a non-negative safe integer. Nested values, excerpts, bodies, payloads, URLs, and arbitrary strings are invalid even under an allowlisted key. Every field outside **connected-record-allowlist** is reference-only.

## reference-only-observed-value

`reference_only` persists only the predicate-result object above, a provider identity plus opaque query-free object IDs, and limitations drawn from `content_not_persisted`, `source_access_limited`, `window_limited`, and `manual_interpretation`. It MUST NOT persist source text, excerpts, log/body/payload content, headers, cookies, signed/query URLs, or arbitrary strings. This is a structural boundary, not a claim that a secret scanner exists.

## evidence-state-ceiling

- documentation and human confirmation stop at `claimed`
- repository observation and external configuration snapshots stop at `configured`
- behavior events reach `demonstrated` only for the recorded behavior/result window
- dynamic verification and operational records reach `demonstrated` only for exercised/recorded conditions
- inference never exceeds the weakest cited input

## assertion-state-separation

Claims carry a typed assertion value independently from state. A false predicate is not encoded as `contradicted`. `contradicted` requires support and counterevidence with incompatible values for the same proposition.

Claim IDs start `cl-`; proposition IDs start `pr-`. Reports cite exact backticked IDs.

## material-candidate-reconciliation

Every material candidate has one discriminated disposition object. All variants preserve `evidence_ids` and `unit_ids`.

- `supported_capability`: preserved evidence and units
- `confirmed_gap`, `false_positive`, `contradicted`, `not_verifiable`, `out_of_scope`, `not_applicable`: add a rationale
- `duplicate`: add `target_finding_fingerprint`
- `user_deferred`: add an attributed `{decision_id, actor, decided_at, rationale}`

A bare enum is invalid. Merging or disposition never drops affected units or evidence.

## finding and recommendation identity

A finding fingerprint is `ff-sha256-<digest>` over canonical JSON containing proposition, unit, capability, change class, predicate, and typed assertion. Observation windows are excluded so the same material gap is stable across time; a material meaning change produces a different fingerprint. Occurrences use unique `oc-...` IDs. Recommendations use unique `rc-...` IDs and target an exact claim and, when present, finding fingerprint.

Every recommendation records desired outcome, causal mechanism, trade-offs, dependencies, responsible control boundary, verification method, observable closure evidence, ordering rationale, and `current_gap` or `future_trigger` horizon.

## material source coverage

Each material source record is closed and contains `source_id`, `material: true`, outcome, affected conclusion IDs, and evidence IDs. Outcomes are:

- `covered`: non-empty evidence IDs
- `blocked`: unresolved and forces `blocked`
- `accepted_gap`: an attributed decision and forces `partial`

`complete` requires every material source covered. Omitted, denied, truncated, or unknown material sources cannot disappear and cannot be converted to accepted gaps without an attributed decision.

## status-gap-invariant

`partial` requires at least one accepted material gap. `blocked` requires at least one unresolved material source and no decision-bearing conclusion beyond the blocked/unknown proposition. `aborted` preserves collected evidence and the reason work stopped without implying a delivery conclusion.

## resume-anchor-validity

An open blocked run records repository identity/revision, working-tree inventory, pinned scope/units, and material source-window anchors. Each source-window anchor carries predicate, source identity, collection/result window, and `historical` or `current` freshness.

Historical anchors support only historical claims. Current anchors require a later observation of the same predicate/source, including access, permission, retention, and pagination state. Elapsed time or a rewritten `collected_at` is not re-observation. Any unequal or unverified repository, scope, inventory, or current-source condition leaves the run byte-identical and requires separate authorization for a linked assessment.

## closed-root-freeze

The four canonical files of a closed root or closed addendum never change. Later work creates a new addendum and regenerates only the derived index. An open blocked artifact may continue in place only after every resume anchor validates.

## addenda-provenance-graph

Relations are `{relation_id,type,from_run_id,to_run_id}`. IDs and edge tuples are unique; the containing manifest owns `from_run_id`; targets exist; self-edges and cycles are invalid; and the source is later than the target.

Closed types are:

- `validates_root`: addendum to its root
- `validates_addendum`: addendum to an earlier addendum under the same root
- `supersedes_blocked_run`: newly authorized root to an earlier blocked root/addendum in the same artifact-host lineage
- `scope_expansion_of`: newly authorized root to the root/addendum that requested expanded scope

## addenda index

The root predeclares `addenda/index.jsonl`. Each line is canonical single-line JSON with keys in this order: `run_id`, `root_run_id`, `anchored_at`, `status`, `closed`, `relation_types`, `locator`. `relation_types` is unique and sorted. `locator` is exactly `addenda/<run_id>/manifest.yaml`. Lines sort by `anchored_at`, then `run_id`, and the file ends with LF. Discovery order cannot affect bytes.

## affirmative-closure-only

Only affirmative evidence closes a gap. Missing evidence, denied access, elapsed time, or absence of a detected failure does not become evidence that a control is effective.

## coverage-first-report

Reports begin with these headings in order:

```markdown
# Scope and units
# Status
# Accepted gaps
# Material unknowns
# Unavailable sources
# Undemonstrated paths
```

A blocked report then includes `# Resume instructions`. Decision-bearing sections cite exact backticked claim and evidence IDs.

## identity fragment (not a complete manifest)

This fragment demonstrates version and run identity only. It MUST NOT be copied as a complete `manifest.yaml`; follow **writer-preflight** for the required shape.

```json
{"method_version":"1.0","artifact_schema_version":1,"run_id":"2026-08-29T0900Z-solo-cli-a1b2","run_kind":"root","status":"complete","closed":true,"anchored_at":"2026-08-29T09:00:00Z","index_path":"addenda/index.jsonl"}
```

An addendum uses `"run_kind":"addendum"` and adds `root_run_id`, target claims, decisions, and evidence windows.

## assertion fragments (not complete claims)

These fragments demonstrate assertion/state separation only. They MUST NOT be copied as complete claim records; follow **writer-preflight**.

Positive assertion:

```json
{"claim_id":"cl-ci-required","proposition_id":"pr-ci-required","assertion":{"type":"predicate_result","proposition_id":"pr-ci-required","value":true},"claim_state":"configured"}
```

Contradiction uses two evidence records for `pr-ci-required` with incompatible `true` and `false` values, cited separately as support and counterevidence. State alone never substitutes for those observations.
