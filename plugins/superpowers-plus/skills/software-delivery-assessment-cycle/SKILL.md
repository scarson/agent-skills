---
name: software-delivery-assessment-cycle
description: Validate a closed software delivery assessment, gather bounded supplementary evidence, record decisions, and persist one graph-linked addendum without implementing remediation.
metadata:
  version: "1.0"
---

# Software Delivery Assessment Cycle

## Terminology

<!-- approved-block: rfc2119-terminology v1 — authoritative copy: ../../approved-blocks.md -->
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.
<!-- /approved-block: rfc2119-terminology -->

## Purpose

Revisit decision-bearing claims in one explicitly selected closed assessment root or addendum. Add later evidence and decisions without rewriting history. A cycle writes or resumes one addendum beneath the selected root; it does not create a new root, silently broaden scope, or assign a maturity score.

Use [the assessment README](../software-delivery-assessment/README.md) for provenance and product maintenance notes.

## Runtime references

- [Delivery evidence snapshot contract](../software-delivery-assessment/references/delivery-evidence-snapshot.md): load before selecting, creating, resuming, linking, or indexing an addendum. Apply **closed-root-freeze**, **resume-anchor-validity**, **addenda-provenance-graph**, **addenda index**, and **affirmative-closure-only** exactly.
- [Artifact validator](../software-delivery-assessment/scripts/validate-artifacts.mjs): run against the addendum after every canonical write and before reporting persistence success.
- [Assessment method](../software-delivery-assessment/references/assessment-method.md): load only for evidence acquisition, command screening, reconciliation, and proportional verification.

Do not copy field tables into this skill. The shared snapshot contract owns artifact grammar and lifecycle.

## Inputs and authority

Require the literal target root path and target claim IDs. Never choose “latest.” Confirm the artifact host, bounded validation question, supplementary sources, evidence window, resource bounds, and invocation-time persistence settings.

Defaults:

```yaml
artifact_persistence: write_only
commit_authorized: false
authorized_stage_paths: []
plan_persistence_authorized: false
authorized_plan_paths: []
```

Plan authorization does not imply commit authorization. Commit authorization does not imply plan authorization. A plan may be written only when `plan_persistence_authorized: true` names its exact path in `authorized_plan_paths`. A local commit may include only literal paths named in `authorized_stage_paths`; a committed plan must appear in both arrays. The cycle MUST NOT push.

Read-only exploration, read-only connected queries, and screened bounded local verification are in scope. Deployment, publication, remote-CI triggers, external writes, source/configuration changes, and shared-environment mutation are not. The cycle MUST NOT implement remediation.

## Phase 1: Pin the target

1. Load all four canonical root files and the derived index from the literal path.
2. Require a closed root. A blocked root belongs to assessment resumption, not a cycle.
3. Pin root ID, artifact host, repository/snapshot anchors, delivery units, target claim IDs, and the four root-file digests.
4. Load manifests for any target addenda. Reconstruct relations from manifests, not from the derived index, and reject missing targets, cycles, wrong ownership, invalid temporal direction, or cross-host lineage.
5. Reserve exactly one new addendum directory under `<root>/addenda/`, unless the user explicitly selected that same open blocked addendum for valid resumption.

## Phase 2: Revalidate anchors

Revalidate repository identity/revision, working-tree inventory, pinned scope, and current material-source predicates. Historical anchors support only historical claims. Current access, permission, retention, and pagination state require a later observation of the same predicate and source.

If an open blocked addendum fails **resume-anchor-validity**, leave it byte-identical and stop. Creating a sibling to hide an anchor mismatch is invalid. If any closed root or addendum canonical digest changed, stop under **closed-root-freeze**.

## Phase 3: Preflight and acquire

1. Classify each supplementary source as confirmed, denied, partial, unknown, or unsupported.
2. Ask before consequential cost or fan-out expansion. Unattended unresolved expansion leaves the addendum `blocked`.
3. Apply the assessment method's connected-evidence persistence, untrusted-content, and command-screening rules.
4. Gather only evidence relevant to the pinned claim set and validation question.
5. Record collection and result windows. Missing, denied, or old evidence cannot become affirmative closure.

## Phase 4: Reconcile and decide

Reconcile new evidence with the target claims and every related addendum. Preserve proposition identity, assertion/state separation, affected units, supporting evidence, counterevidence, limitations, dispositions, and recommendation identities.

Only affirmative evidence may close a gap under **affirmative-closure-only**. Record human decisions with actor, time, rationale, and affected claims. A decision may accept a named gap, but it does not turn unknown evidence into a demonstrated control.

If validation discovers scope expansion, record the required units, paths, sources, and affected claims, then stop that branch. Scope expansion requires a new linked assessment with separate authorization; this cycle does not create it.

## Phase 5: Persist the addendum

Write exactly `manifest.yaml`, `evidence.jsonl`, `claims.jsonl`, and `report.md` in the reserved addendum directory. The manifest binds the root, target claims, evidence windows, decisions, plan paths, and owned graph relations. Begin the report with the shared coverage-first headings.

Choose one status:

| Status | Meaning |
| --- | --- |
| `complete` | Every declared target claim and required validation source has affirmative closure. |
| `partial` | The user explicitly accepted at least one named validation gap. |
| `blocked` | A material anchor, source, scope, or decision remains unresolved; the addendum stays open. |
| `aborted` | Work stopped and the closed addendum preserves what was learned. |

Run the artifact validator in `addendum` mode. Correct validation errors in the same open addendum. Do not report persistence success until it prints `valid`.

After validation, rebuild `addenda/index.jsonl` from all addendum manifests in canonical order. The index is derived discovery data; rebuilding it MUST NOT alter any root or addendum canonical file. Re-hash the pinned root and every previously closed addendum before completion.

## Phase 6: Plan, commit, and report

If plan persistence was authorized, write only the exact authorized remediation-plan path using the artifact host's documented plan convention, falling back to `docs/plans/`. The plan is an output of the cycle, not permission to execute it.

If commit authorization was independently supplied, stage only the exact authorized addendum, index, and optional plan paths. Preserve unrelated dirty and staged state. Confirm no push occurred.

Return the root and addendum IDs, target claims, status, new evidence and windows, decisions, remaining unknowns, scope-expansion requests, plan path if any, validator result, frozen-artifact hash result, files written, commit result, and confirmation that no remediation implementation or push occurred.

## Stop conditions

Stop and correct the cycle if it would:

- mutate a closed root or addendum canonical file
- resume a blocked addendum without valid anchors
- close a gap using missing, denied, elapsed, or merely unchanged evidence
- create a new root or expand scope without separate assessment authorization
- infer plan, commit, push, or remediation authority from another permission
- implement remediation, change assessed source/configuration, or trigger remote work
