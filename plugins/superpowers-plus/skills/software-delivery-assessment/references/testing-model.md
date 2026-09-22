# Testing model

Start with a material failure risk for a delivery unit and change class. Do not start with a preferred test type, pyramid, count, label, or coverage target.

For each risk, ask:

1. What failure matters, to whom, and at what consequence?
2. What is the earliest gating point that can detect it trustworthily?
3. Which real boundary does the check exercise, and which boundary does it replace or bypass?
4. What observable oracle would distinguish correct behavior from a plausible wrong result?
5. How are time, ordering, state, concurrency, and representative data controlled?
6. Which dependencies are real, substituted, or absent, and how are substitutes validated?
7. Does the check run on the actual build, package, configuration, entry point, and route that progress?
8. When failure occurs, do response, visibility, retry, cleanup, and recovery behave as required?
9. What material gap remains after the check passes?

The best placement is the earliest point that supplies a trustworthy oracle for the relevant boundary. Faster is useful only while the test still detects the failure in question. Slower deployed or out-of-band checks remain valuable when production wiring, schedulers, operating systems, consensus, long-running state, or human judgment cannot be represented honestly in the gating path.

## Boundary and substitute discipline

Every substitute creates a claim about the boundary it represents. Validate filesystem and subprocess doubles against the real operating-system behavior they stand in for. Validate protocol doubles against contract and adapter checks. Validate clocks, schedulers, persistence, and consensus mechanisms at the production wiring boundary appropriate to their risk.

A component test can prove orchestration while missing process startup. A repository workflow can prove intent while missing provider enforcement. A post-deploy check can prove one deployed observation while leaving deterministic gating weak. Name both the proof and the gap.

## Determinism, state, and data

Look for shared mutable fixtures, order dependence, wall-clock coupling, retry masking, network variance, environment drift, unbounded data, and recovery state. Prefer injected time and isolated state for deterministic cases, then validate production wiring separately. For stateful or scheduled work, include restart, partial write, idempotency, overlap, checkpoint, backpressure, and long-run resource behavior when the risks apply.

Fixtures and data should expose the decision under test. A large “realistic” fixture is not automatically representative, and generated schema-valid data is not automatically semantically meaningful.

## Actual path enforcement

Trace what really gates progression:

- Is the check required for the relevant branch, change class, and delivery unit?
- Does it run against the artifact or entry point that will ship?
- Can a merge, package, scheduler, deployment, or manual route bypass it?
- Is a stale or optional workflow being mistaken for an enforced control?
- Does the result survive reruns, retries, and provider retention well enough to support the claim?

## Paired failure patterns

Use pairs to prevent one-sided conclusions:

| Pattern | Weak or misleading case | Trustworthy comparison |
| --- | --- | --- |
| Test double | A double is used everywhere and never compared with the real boundary. | Focused adapter/contract/deployed checks validate what the double represents. |
| Retry | A failing test is rerun until green, masking shared state or timing failure. | Retry is part of specified transient behavior, bounded, asserted, and observable. |
| Assertion | A test executes code, checks truthiness or status alone, and reports broad coverage. | The oracle distinguishes the material wrong result, including negative and boundary cases. |
| Route | A workflow file names a check but provider rules do not require it. | Provider configuration and behavior show the relevant path cannot bypass the check. |
| Recovery | A happy-path release test passes while partial failure leaves corrupt state. | Failure injection demonstrates cleanup, idempotency, rollback compatibility, or forward recovery. |

## Evidence clues, not proof

Test counts, line coverage, suite labels, dashboard color, stage names, and conventional time targets help choose where to investigate. They do not establish risk coverage or correctness. Coverage shows execution, not whether an assertion would catch a meaningful defect. Sample assertions and failure cases, connect them to material risks, and inspect which path consumes the verdict.

Operational outcomes can reveal blind spots, but an absence of recorded incidents is not proof that testing is effective. Retention, reporting, exposure, and denominator quality bound that inference.

## Reporting a testing conclusion

State the delivery unit and change class, material risk, observed tests and paths, exercised boundaries, oracle quality, dependency/substitute evidence, enforcement evidence, result window, counterevidence, and remaining gap. Apply proportional verification: spend deeply where these details could change a material decision, and aggregate routine observations that share the same scope and limitations.
