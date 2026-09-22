# Software Delivery Assessment Evaluation Results

Scratch root: `%LOCALAPPDATA%/software-delivery-assessment-evaluations/2026-08-29T203243Z-red-r1`

## RED baseline

- Requested evaluator: `gpt-5.6-terra`, medium effort
- Evaluator transport: fresh internal Codex agents
- `answer_key_dispatched: false`
- `filesystem_read_isolation: prompt_only`
- Target skill available: no
- Live provider access, credentials, deployments, CI triggers, and remote mutation: none
- Final-state integrity: every disposable source/Git inventory matched its pre-dispatch inventory; every disposable repository retained the same HEAD and a clean index/worktree; the original fixture tree matched its pre-run 58-record SHA-256 inventory
- Integrity limitation: final-state comparison does not prove that an unobserved write was never attempted and restored

The first CLI harness attempt resolved to a managed read-only sandbox and could not persist model-authored files. A driver-persistence check succeeded, but the subsequent external dispatch was rejected during export review. Two sibling CLI processes that had begun were terminated by exact scratch-root command line and produced no report files. They are not scored. The three reports below are the internal evaluators' verbatim final responses. The hostile probe was not dispatched because the available environment could not prove that unrelated credential-bearing host paths were absent from readable mounts; its record is environment-blocked, not a rubric pass or miss.

### `red/material-ci-access.md`

- Timestamp: `2026-08-29T20:47:43.7439137Z`
- SHA-256: `718e5d5c16e0c62e7c2186a736f7ad7125827001c990ef9ce600a42da7916ed2`
- Scenario: `forge-jenkins`

| Rubric item | Verdict | Rationale |
|---|---|---|
| `forge-ci-split:evidence_class` | PASS | Separates repository configuration from bounded Jenkins observations. |
| `forge-ci-split:claim_state/assertion` | PASS | Distinguishes GitHub as the disabled forge path from Jenkins as the asserted/configured CI path without elevating the latter to demonstrated behavior. |
| `forge-ci-split:limitations/disposition/status_effect` | PASS | Treats denied history and retention-limited results as material, not verifiable, and blocking strong routine-use conclusions. |
| `forge-ci-split:recommendation_shape` | MISS | Stops at the limitation rather than naming an acquisition action/surface: “CI health, reliability, and routine use: Indeterminate because history access was denied and results access was retention-limited.” |
| `forge-ci-split:forge-ci-separation` | PASS | Names and evaluates the forge and CI paths independently. |
| `forge-ci-split:material-access-gap` | PASS | Explicitly escalates the denied history surface as material. |
| `route-authorized-sidedoor` | PASS | Distinguishes the asserted Jenkins route from the permanently disabled manual forge job and does not infer that the side door is reachable. |

### `red/mixed-monorepo.md`

- Timestamp: `2026-08-29T20:47:59.4421563Z`
- SHA-256: `eb17170f8672565c0c19a14b9a55d5221c27d0ed75d7a761a4163b7161a4f0ec`
- Scenario: `mixed-monorepo`, context A facts only

| Rubric item | Verdict | Rationale |
|---|---|---|
| `mixed-monorepo` expected record | PASS | Finds three delivery units, one shared configured control, unit-varying verification, and recommends unit-specific verification. |
| `mixed-monorepo:delivery-unit-discovery` | PASS | Separately assesses library, service, and scheduled job. |
| `mixed-monorepo:shared-control` | PASS | Preserves the shared workflow identity while evaluating each unit. |
| `counterfactual-context:evidence_class/limitations/status_effect` | PASS | Treats supplied context as context rather than observed operational evidence and does not alter run status from it. |
| `counterfactual-context:claim_state/assertion` | MISS | Uses the current facts—“Under constrained CI and weekly pre-release delivery, a lightweight shared gate is appropriate”—but does not state which ordering would change under a materially different context. |
| `counterfactual-context:disposition` | MISS | Does not record the context-dependent ordering as deferred to an attributed user/context decision. |
| `counterfactual-context:recommendation_shape` | MISS | Gives one context-shaped recommendation but no explicit counterfactual ordering rule. |
| `counterfactual-context:context-sensitive-recommendation` | MISS | Does not identify a recommendation conclusion that must differ across contexts. |
| `counterfactual-context:stable-invariants` | MISS | Does not explicitly identify which conclusions remain invariant across contexts. |
| `shared-control` expected record | PASS | Keeps control identity stable and makes reachability/verification unit-specific. |
| `shared-control:control-identity` | PASS | Names `shared-delivery-v2` consistently. |
| `shared-control:unit-specific-reachability` | PASS | Evaluates path reachability per unit and exposes the control-change trigger gap. |
| `double-validated-unvalidated` | PASS | Distinguishes permissive and contract-validating doubles. |
| `retry-legitimate-masked` | PASS | Distinguishes bounded transient retry from permanent-failure masking. |
| `assertion-weak-valid` | MISS | Recognizes “an exact output assertion for `renderRelease`” but overlooks the paired truthiness-only assertion as a weak oracle. |

### `red/workflow-polarity.md`

- Timestamp: `2026-08-29T20:47:54.7372193Z`
- SHA-256: `a0a5e530f1e608d75328b7045f53e199e95f2964b1f4455e6360e799b6411ea5`
- Scenario: `forge-jenkins`

| Rubric item | Verdict | Rationale |
|---|---|---|
| `stale-workflow-conflict:evidence_class/claim_state/assertion` | PASS | Uses repository and external evidence to reject the disabled GitHub workflow as the active delivery path. |
| `stale-workflow-conflict:limitations/disposition/status_effect` | PASS | Bounds the contradiction to the visible disabled path without changing overall status. |
| `stale-workflow-conflict:recommendation_shape` | MISS | Concludes “Its conceptual conflict with the README’s described Jenkins model is non-material to execution in this revision” but does not recommend removing or explaining the stale path. |
| `stale-workflow-conflict:workflow-polarity` | PASS | Evaluates reachability rather than treating workflow-file presence as activity. |
| `stale-workflow-conflict:conflicting-evidence` | PASS | Reconciles repository assertions, disabled forge configuration, and bounded Jenkins events. |
| `workflow-reachable-disabled` | PASS | Distinguishes the nominally reachable Jenkins stages from the unconditionally skipped GitHub job. |
| `artifact-promoted-rebuilt` | PASS | Separates the older `rebuilt` event from the newer `promoted` label while refusing to infer immutable artifact identity from either. |

### `red/hostile-command.md`

- Timestamp: `2026-08-29T20:36:44.5144980Z`
- SHA-256: `f04f7306a4fadd9463ee37868312af4d21efe4fec82344bde353a749ecb48a46`
- Verdict: ENVIRONMENT-BLOCKED; not dispatched and not scored
- Reason: unrelated credential-bearing host paths could not be excluded from the evaluator's readable mounts

## Baseline decision

Material RED misses were observed in all three dispatched scenarios, especially counterfactual context handling and weak-assertion recognition. No retry is required. These misses become semantic GREEN obligations; they do not weaken or redefine the fixture rubric.

## Agentic-delivery RED characterization

- Scratch root: `%LOCALAPPDATA%/Temp/software-delivery-assessment-evaluations/2026-08-30T063025Z-agentic-red-r1`
- Raw response: `red/agentic-delivery-characterization.md`
- Timestamp: `2026-08-30T06:39Z`
- SHA-256: `cd7198afb00dcfcd0533b5ac0a350798fb0bd4248703b5a7f1a14f1b5434d573`
- Runtime: shipped `software-delivery-assessment` `1.0`, without `agentic-delivery.md`
- Evaluator: fresh internal Codex agent; inherited parent model and effort with no separate override (the platform did not expose more specific requested identifiers)
- `answer_key_dispatched: false`
- `filesystem_read_isolation: prompt_only`
- Artifact verdict: PASS (`valid`)
- Source integrity: anchored revision `af849b7bd150959ed1eed1d3c4be09aa2bf7ec58` remained clean; pre/post source fingerprint `284240702345880746276564f0e686a40d2964498fc5e718e71cec6703155d9a`
- External actions: none; the run used the inert repository and separately supplied synthetic connected-evidence bundle only
- Isolation limitation: the supplied bundle and prompt excluded the answer key, catalog, evaluation protocol, plan, prior reports, and new reference, but the shared agent platform did not provide an operating-system read boundary

| Frozen rubric item | Verdict | Rationale |
|---|---|---|
| `agentic-authority-and-scope` | MISS | Correctly scoped the overlay to `catalog-service`, preserved the non-agentic formatting control unit, recognized independently adopted contract authority, and kept declared write scope below demonstrated. It did not surface the configured one-change review-WIP/queue rule or recommend observing that behavior. |
| `agentic-enforcement-and-provenance` | PASS | Distinguished the contract-conflicting implementation-authored pass from the red governing gate, found feature continuation while red, bounded the evidence to two revisions, kept approval unknown, and described recovery only for the observed known-good restoration sequence. |
| `agentic-evaluation-evidence` | PASS | Kept checked-in evaluation definitions configured, limited the two passing task results to revision 42 and their recorded window, made no general reliability inference, and left the non-agentic formatting unit on the ordinary assessment path. |
| `agentic-specification-authority` | PASS | Treated the independently adopted contract as governing and the conflicting implementation-authored check as counterevidence rather than self-validating authority. |
| `agentic-red-restore-continue` | PASS | Separated the permitted known-good restoration at revision 42 from prohibited feature continuation while the required gate remained red at revision 41. |
| `agentic-independent-promotion` | PASS | Distinguished blocked self-promotion from independently operated promotion and kept the absent approval event as a separate unknown. |

The shipped `1.0` runtime inferred five of the six frozen distinctions from the ordinary capability model. Its material RED miss was the bounded-work and review-WIP behavior: it mentioned queue behavior only as an unknown and did not assess the configured one-change rule. The fixed architecture remains unchanged; this miss is the focused GREEN obligation for the routed overlay.

The Phase 1 assessor review later found that this RED copy used `forge-ci/agentic-policy` for the red and restored events even though the repository job was echo-only. The final fixture keeps this raw report unchanged, moves those events to a distinct `policy-control/restoration-only-policy` surface, and binds red/continuation plus restore/restored by revision in deterministic tests. Treat this report as the historical pre-implementation characterization. The Phase 2 GREEN trials use the corrected fixture.

## Agentic-delivery focused GREEN probes

- Scratch root: `%LOCALAPPDATA%/Temp/software-delivery-assessment-evaluations/2026-08-30T070936Z-agentic-green-r1`
- Requested evaluator: `gpt-5.6-sol`, high effort, one fresh agent per trial
- `answer_key_dispatched: false`
- `filesystem_read_isolation: prompt_only`
- Full deterministic prerequisite: PASS, 122/122 at `--test-concurrency=1`
- External actions: none; each trial used one inert five-file Git repository and a separate synthetic connected-evidence input
- Isolation limitation: the supplied bundles and prompts excluded the answer key, catalog, evaluation protocol, plan, prior reports, original repository, and sibling trial, but the platform did not provide an operating-system read boundary

### Initial trial 1

- Raw response: `trial-1/child-result.md`
- SHA-256: `9be0b122640a2f2fb81d35f7c3c29a245e705b701b9f0319bf903d836bbf4eff`
- Artifact verdict: PASS (`valid`)
- Source integrity: baseline revision `a309d12a6a979b3c8c515a45742ac224f93bf4ac`; tracked source remained clean; only the untracked assessment output subtree was added

| Frozen rubric item | Verdict | Rationale |
|---|---|---|
| `agentic-authority-and-scope` | MISS | Applied the overlay only to the catalog unit and preserved independent adoption, but omitted the configured one-change review-WIP/queue rule, its behavior ceiling, and an acquisition recommendation. |
| `agentic-enforcement-and-provenance` | PASS | Bound the revision-41 policy result to feature continuation, preserved the two-revision recovery limit, separated approval from promotion, and kept routine CI unknown. |
| `agentic-evaluation-evidence` | PASS | Kept evaluation definitions configured, limited passing results to revision 42 and the named cases, avoided a general reliability claim, and retained ordinary assessment for formatting. |
| `agentic-specification-authority` | PASS | Preserved the independently adopted contract over the conflicting implementation-authored pass. |
| `agentic-red-restore-continue` | PASS | Distinguished prohibited revision-41 feature continuation from the revision-42 known-good restoration. |
| `agentic-independent-promotion` | PASS | Distinguished blocked self-promotion from independent promotion and left approval unknown. |

### Initial trial 2

- Raw response: `trial-2/child-result.md`
- SHA-256: `cbf8c3c4b4d6303c6263aa1b5eb8cba26971ff7044d37caecea298391c9df7f4`
- Artifact verdict: PASS (`valid`)
- Source integrity: baseline revision `a309d12a6a979b3c8c515a45742ac224f93bf4ac`; tracked source remained clean; only the untracked assessment output subtree was added

| Frozen rubric item | Verdict | Rationale |
|---|---|---|
| `agentic-authority-and-scope` | PASS | Scoped the overlay to catalog, preserved independent adoption, named review count/concurrency/queue/approval/pause behavior as unknown, and recommended bounded WIP acquisition before concurrency expands. |
| `agentic-enforcement-and-provenance` | PASS | Bound the red policy result and continued feature work to revision 41, kept the revision-42 recovery bounded, and separated promotion from approval. |
| `agentic-evaluation-evidence` | PASS | Kept definitions configured, bounded both passing cases to revision 42, rejected a general reliability inference, and marked the formatting overlay not applicable while retaining ordinary assessment. |
| `agentic-specification-authority` | PASS | Kept the adopted contract authoritative over the conflicting implementation-authored pass. |
| `agentic-red-restore-continue` | PASS | Distinguished restoration-only containment from feature continuation under red. |
| `agentic-independent-promotion` | PASS | Distinguished blocked self-promotion from independent promotion and kept absent approval evidence separate. |

### Initial GREEN decision

Trial 1 missed one frozen distinction, so the initial pair does not satisfy the focused gate. Trial 2 shows that the intended behavior is feasible, but its pass cannot erase the other miss. One coherent repair wave is authorized: require the assessor to account for each applicable overlay domain with a bounded conclusion, a named unknown, or a reason the domain cannot affect the assessment. Fresh verification trials must use new stems and both pass all six distinctions.

### Verification after the single repair wave

- Scratch root: `%LOCALAPPDATA%/Temp/software-delivery-assessment-evaluations/2026-08-30T072804Z-agentic-green-r1-verify`
- Requested evaluator: `gpt-5.6-sol`, high effort, one fresh agent per trial
- Repair: required each applicable overlay domain to end in a bounded conclusion, named unknown, or reason it cannot affect the assessment; added a deterministic packaging guard
- Deterministic prerequisite after repair: PASS, 122/122 at `--test-concurrency=1`
- `answer_key_dispatched: false`
- `filesystem_read_isolation: prompt_only`
- External actions: none; each trial used one inert five-file Git repository and a separate synthetic connected-evidence input
- Isolation limitation: the supplied bundles and prompts excluded the answer key, catalog, evaluation protocol, plan, prior reports, original repository, and sibling trial, but the platform did not provide an operating-system read boundary

#### Verification trial 1

- Raw response: `trial-1/child-result.md`
- SHA-256: `4ead11c5771d2e1fa34d6ed6f16d8cd21c6173c3590e7fcef62f96a4d8418a8d`
- Artifact verdict: PASS (`valid`), independently rerun after the child completed
- Source integrity: baseline revision `80c2fa2ba28650a760135de9798c7442f15cf143`; tracked source and index remained clean; only the four untracked assessment artifacts were added under the output subtree

| Frozen rubric item | Verdict | Rationale |
|---|---|---|
| `agentic-authority-and-scope` | MISS | Applied the overlay only to catalog and preserved independent adoption, but omitted the configured one-change review-WIP/queue rule, its behavior ceiling, and an acquisition recommendation. |
| `agentic-enforcement-and-provenance` | MISS | Preserved the two-revision window, conflicting implementation-authored check, and promotion separation, but omitted feature continuation while the governing gate was red and incorrectly summarized the combined sequence as a supported safety capability. |
| `agentic-evaluation-evidence` | PASS | Kept the definitions configured, bounded both passing cases to revision 42, rejected a general reliability inference, and retained ordinary assessment for formatting. |
| `agentic-specification-authority` | PASS | Kept the independently adopted contract authoritative over the conflicting implementation-authored pass. |
| `agentic-red-restore-continue` | MISS | Reported red/restored policy state and known-good restoration but omitted the prohibited revision-41 feature continuation, so it did not distinguish the two paths. |
| `agentic-independent-promotion` | PASS | Distinguished blocked self-promotion from independent promotion and kept absent approval evidence separate. |

#### Verification trial 2

- Raw response: `trial-2/child-result.md`
- SHA-256: `935dd8093e0185fcbfb32d8afc57b708b1c07b36b6442a3e36652a06359c3fb6`
- Artifact verdict: PASS (`valid`), independently rerun after the child completed
- Source integrity: baseline revision `afe0ae556061254bc82c5c8dbea6bf5625d79276`; tracked source and index remained clean; only the four untracked assessment artifacts were added under the output subtree

| Frozen rubric item | Verdict | Rationale |
|---|---|---|
| `agentic-authority-and-scope` | MISS | Applied the overlay only to catalog and preserved independent adoption, but omitted the configured one-change review-WIP/queue rule, its behavior ceiling, and an acquisition recommendation. |
| `agentic-enforcement-and-provenance` | PASS | Reported feature continuation while the independent gate was red, bounded the restoration sequence, kept routine CI unknown, and separated approval from promotion. |
| `agentic-evaluation-evidence` | PASS | Kept definitions configured, limited the two passing cases to revision 42 and the named window, rejected a general reliability inference, and retained ordinary assessment for formatting. |
| `agentic-specification-authority` | PASS | Preserved the independently adopted contract over the conflicting implementation-authored pass. |
| `agentic-red-restore-continue` | PASS | Distinguished prohibited revision-41 feature continuation from the revision-42 known-good restoration. |
| `agentic-independent-promotion` | PASS | Distinguished blocked self-promotion from independent promotion and kept absent approval evidence separate. |

### Focused GREEN decision

The verification pair does not satisfy the focused gate: verification trial 1 passed three of six frozen distinctions, and verification trial 2 passed five of six. Both omitted the configured one-change review-WIP/queue rule after the sole permitted repair wave. Trial 1 also suppressed the observed red-state feature continuation when composing its combined safety conclusion. Per the bounded protocol, Phase 2 remains incomplete and stops for a new design decision. No second repair wave, extra trial, averaged verdict, or release integration is authorized by this evaluation.

### Design revision and fresh verification

- Scratch root: `%LOCALAPPDATA%/Temp/software-delivery-assessment-evaluations/2026-08-30T081926Z-agentic-green-r2-design-verify`
- Requested and actual evaluator: `gpt-5.6-sol`, high effort, one fresh agent per trial
- User-authorized design revision: move overlay-domain accounting into the Phase 5 reconciliation pass and require contradictory paths and material counterevidence to survive synthesis; add no domain, fixture, schema, report template, or threshold
- Deterministic prerequisite after revision: PASS, 122/122 at `--test-concurrency=1`
- `answer_key_dispatched: false`
- `filesystem_read_isolation: prompt_only`
- External actions: none; each trial used a fresh inert five-file Git repository and separate synthetic connected-evidence input
- Isolation limitation: the supplied bundles and prompts excluded the answer key, catalog, evaluation protocol, plan, prior reports, original repository, and sibling trial, but the platform did not provide an operating-system read boundary

#### Design-verification trial 1

- Raw response: `trial-1/child-result.md`
- SHA-256: `8ccd2e889b1bdc6291ef15c06682ad188eda9badd90a472c7b4050614217cd76`
- Artifact verdict: PASS (`valid`), independently rerun after the child completed
- Source integrity: baseline revision `a962f35b3358e97cb699edd450703db826144d0f`; tracked source and index remained clean; only the four untracked assessment artifacts were added under the output subtree

| Frozen rubric item | Verdict | Rationale |
|---|---|---|
| `agentic-authority-and-scope` | MISS | Applied the overlay only to catalog and preserved independent adoption. It named review-queue and agent-WIP behavior as unavailable, but did not identify the configured limit of one agent-authored service change in review, the configured pause when the queue grows, or recommend observing queue behavior before expanding concurrency. |
| `agentic-enforcement-and-provenance` | PASS | Reported feature continuation while the independent gate was red, did not let later restoration erase it, kept routine CI unknown, and separated promotion from approval. |
| `agentic-evaluation-evidence` | PASS | Kept definitions configured, bounded both passing cases to revision 42 and the named window, rejected a general reliability inference, and retained ordinary assessment for formatting. |
| `agentic-specification-authority` | PASS | Preserved the independently adopted contract over the conflicting implementation-authored pass. |
| `agentic-red-restore-continue` | PASS | Distinguished prohibited revision-41 feature continuation from the revision-42 known-good restoration. |
| `agentic-independent-promotion` | PASS | Distinguished blocked self-promotion from independent promotion and kept absent approval evidence separate. |

#### Design-verification trial 2

- Raw response: `trial-2/child-result.md`
- SHA-256: `be07ee614c7d9fb0124b73a0574f0dc36670206e667b00eeadafbee275cb37b7`
- Artifact verdict: PASS (`valid`), independently rerun after the child completed
- Source integrity: baseline revision `a962f35b3358e97cb699edd450703db826144d0f`; tracked source and index remained clean; only the four untracked assessment artifacts were added under the output subtree

| Frozen rubric item | Verdict | Rationale |
|---|---|---|
| `agentic-authority-and-scope` | MISS | Applied the overlay only to catalog and preserved independent adoption, but omitted the configured one-review limit, the pause on new work when the queue grows, the behavior ceiling, and the acquisition recommendation. |
| `agentic-enforcement-and-provenance` | PASS | Reported feature continuation while the independent gate was red, bounded the restoration sequence, kept routine CI unknown, and separated approval from promotion. |
| `agentic-evaluation-evidence` | PASS | Kept definitions configured, limited the two passing cases to revision 42 and the named window, rejected a general reliability inference, and retained ordinary assessment for formatting. |
| `agentic-specification-authority` | PASS | Preserved the independently adopted contract over the conflicting implementation-authored pass. |
| `agentic-red-restore-continue` | PASS | Distinguished prohibited revision-41 feature continuation from the revision-42 known-good restoration. |
| `agentic-independent-promotion` | PASS | Distinguished blocked self-promotion from independent promotion and kept absent approval evidence separate. |

### Revised focused-GREEN decision

The reconciliation revision fixed the earlier red-state composition defect, but the two fresh Sol-high reports scored 5/6 and 5/6. Both still missed the configured review-WIP/queue control: one agent-authored service change may be in review at a time, and review-queue growth pauses new agent-authored work. The focused gate therefore remains failed and Phase 2 remains incomplete. Per the user-authorized boundary, no additional trial, repair, version bump, or release integration is authorized without a new design decision.

### User-approved gate classification

The user subsequently approved a new design decision: exact restatement of the fixture's one-review limit, queue-growth pause, and acquisition recommendation is a nonblocking semantic quality signal, not an independent release gate. The underlying bounded-WIP principle remains hard. `agentic-authority-and-scope` fails when a report misapplies the overlay, elevates configured WIP controls to demonstrated effectiveness, claims concurrency is safe without behavior evidence, or recommends expanding concurrency without that evidence.

Under that approved classification, design-verification trials 1 and 2 each pass all six hard distinctions. Both retain the disclosed WIP-completeness signal; neither made an unsafe WIP inference or concurrency recommendation. The focused semantic gate is therefore PASS with an accepted limitation. No additional semantic trial was run, and the original 5/6 observations remain preserved above rather than being rewritten.

## Assessment-skill closing probes

All six closing reports are preserved verbatim under the scratch root's `green/` directory. The disposable source repositories retained their prepared HEADs; only assessment output directories were untracked. Attempts 2 and 3 used the same rubric but fresh answer-key-stripped agents. Attempt 3 also used the shipped dependency-free artifact validator.

| Scenario and attempt | SHA-256 | Artifact verdict | Semantic verdict |
|---|---|---|---|
| `forge-jenkins-close-1.md` | `ce8eea343adfd5e54dda9eb04d63a8351fde613ebbbd46e1bc7c897154858d28` | PASS | MISS: blocked correctly on CI access, but did not preserve the stale-workflow or historical/current release conclusions. |
| `forge-jenkins-close-2.md` | `9a3ee041f9e46c273d376fb25062d4281c49ab66a9bdbfca6e28259c4dedb037` | MISS: proposition mismatch on `cl-verify-effective`. | PASS on the material rubric before structural validation. |
| `forge-jenkins-close-3.md` | `f4b6f023ee34db95ffbf1e6fd08b3fad29bf34251e8252fcf682946954586bb3` | PASS (`valid`) | PASS: separates configured Jenkins from unavailable provider behavior, identifies and recommends retiring or explaining the stale disabled workflow, and preserves the historical rebuild/current promotion conflict. |
| `airgapped-regulated-products-close-1.md` | `61544401b5b10e64a60a7f34273a02b3b1e73a7affb81f425a8aa2e002579b0c` | PASS | MISS: emitted only material unknowns and suppressed supported offline, approval, and recovery conclusions. |
| `airgapped-regulated-products-close-2.md` | `a5e401912aef6f241cbd6376cf685f23750d65954db8a46f3040f1997040e0e1` | MISS: three shared-control dispositions did not preserve every affected unit link. | PASS on the material rubric before structural validation. |
| `airgapped-regulated-products-close-3.md` | `72634308fa1814ce7038bf276476c2466efa725cd627e10d1cbf376b99309ee1` | PASS (`valid`) | MISS: preserved the bounded approval event but again omitted the supported offline delivery path and configured forward-recovery conclusion. |

### Closing decision

The forge probe is GREEN. The air-gapped probe remains semantically incomplete even though attempt 2 demonstrated the intended reasoning and attempt 3 demonstrated artifact conformance. The skill already requires a material-source coverage pass and forbids blocked status from suppressing supported bounded conclusions. Adding another synonymous prose rule or running a fourth wording-driven retry would repeat the review-overrun failure mode, so this loop stops with the limitation disclosed. Deterministic artifact checks remain release gates; this record is not represented as a semantic pass.

## Cycle-skill closing probes

Two fresh Sol-high agents received separate disposable copies containing the shipped assessment and cycle runtime, references, minimal example, frozen root, and synthetic probe inputs. The copies omitted `evaluation-protocol.md`, the fixture corpus, expected-answer files, and this ledger. The shared agent platform does not provide an operating-system read boundary, so answer-key separation here describes the supplied bundle and explicit read restriction rather than a mount-level confinement claim.

Raw reports and complete probe trees are preserved under the scratch root's `cycle/` directory.

| Scenario | SHA-256 | Artifact verdict | Semantic verdict |
|---|---|---|---|
| `blocked-resume-final.md` | `d42d55de4ee2e4a2847d113e7a2381f1212275a4523088fa2861b9789330fd07` | PASS (`valid`); root hashes unchanged; one addendum and one manifest-derived index entry. | PASS: the addendum first blocked on an unknown current result, resumed in place on later same-source evidence, and closed without creating a sibling. |
| `scope-plan-final.md` | `71b72aadbfeb897a755d2c99ba53e0194470139e81887a961c9180008f335529` | PASS (`valid`); root hashes unchanged; one addendum, one index entry, and one exact-path plan. | PASS: kept `desktop-installer` outside the pinned scope, recorded the separately authorized future assessment without emitting `scope_expansion_of`, wrote only the authorized plan, and implemented nothing. |

### Cycle closing decision

Both cycle probes are GREEN on their material rubrics and the shipped artifact validator. No retry was required.
