# Capability model

Use these questions after delivery units and change classes are known. They help locate constraints and dependencies; they are not a scorecard. Keep applicability, lifecycle position (`current`, `transitional`, `intended`, or `retired`), and knowledge/evidence state separate.

## Flow and integration

- How small can a change remain from integration through delivery?
- How often do relevant branches diverge, queue, batch, or require manual reconciliation?
- What is the slowest or least reliable constraint in the actual path?
- Do shared controls preserve independent feedback for each delivery unit?

Small, frequent integration can reduce merge and diagnosis risk, but the useful boundary depends on unit coupling, consequence, and control obligations.

## Reproducible CI and deterministic proof

- Which change classes are built and tested by reproducible automation?
- Does the same input and declared environment produce the same artifact and verdict?
- Are failures attributable, repeatable, and fast enough to guide the person or agent making the change?
- Which evidence shows provider enforcement rather than configuration alone?

Deterministic proof depends on controlled inputs, state, dependencies, ordering, and time. A checked-in pipeline is not proof that the provider required or ran it.

## Artifacts and authorized routes

- Is the deployable object defined and identifiable before release?
- Is it built once, then promoted with verifiable lineage, or rebuilt between environments?
- Can any production or distribution route bypass the intended controls?
- Can an observer connect source revision, proof, artifact, approval, and destination?

An immutable artifact reduces environmental drift only when the authorized route actually uses it.

## Environment, configuration, and dependency independence

- Which environment differences are declared configuration, and which are hidden build or runtime variation?
- Are production-like boundaries available where they materially improve detection?
- Can a delivery unit change without forcing unrelated units to rebuild, retest, or release?
- Are external dependency contracts and substitutes validated against the real boundary?

Independence is contextual. Shared release or compliance controls may be deliberate; the assessment should expose their cost and rationale rather than label all coupling a defect.

## Safe release and recovery

- How is exposure controlled, observed, stopped, or advanced?
- Which failures permit rollback, and when would rollback be unsafe because data, schemas, or external effects moved forward?
- What forward-recovery or compatibility path exists in those cases?
- Has the relevant recovery behavior been exercised under representative conditions?

Rollback is one option, not a universal answer. Build compatibility and recovery decisions around the failure modes and state transitions that actually exist.

## Operational feedback

- Can operators tell which version and configuration is serving which users?
- Do delivery and runtime events expose success, degradation, and failure within a useful window?
- Are alerts, logs, metrics, traces, and runbooks tested where automation can verify them?
- Can incident and delivery records support real measures without guessed denominators or windows?

## Ownership and structure

- Who can change each unit, shared control, route, and recovery mechanism?
- Where does organizational ownership disagree with architectural coupling?
- Which bottleneck belongs to a local team and which requires a platform or policy owner?
- Would changing a boundary reduce constraint cost, or merely move it?

## Brownfield replacement

- Can a legacy path be observed and constrained before replacement?
- What compatibility seam allows incremental migration?
- Which old route must remain available, and what evidence would permit its retirement?
- Does the proposed sequence preserve delivery and recovery throughout the transition?

Treat replacement as a flow and risk problem, not a mandate to start over.

## Conditional agentic delivery

Apply the [agentic delivery overlay](agentic-delivery.md) per delivery unit and change class when agents materially author, approve, operate, or release changes. Record it as `not_applicable` where agents have no material role. Weak continuous-delivery foundations do not suppress the overlay; assess those foundations here and use the overlay for the risks that agent speed and authority add.

## Migration aids, not levels

The source corpus groups change into migration phases. Those groupings can help sequence a remediation plan when prerequisites are clear. They are not assessment levels, maturity tiers, badges, or a ladder every system must climb. A system may need different ordering because of regulation, hardware, distributed state, release topology, or consequence.

## Reference notes

Preserve tensions instead of flattening them:

- fast feedback and realistic boundaries often pull in different directions; place the earliest trustworthy test at each boundary
- build-once promotion helps lineage, while environment-specific packaging may be required; identify the actual invariant and trade-off
- rollback can reduce recovery time, while irreversible state changes demand compatibility and forward recovery
- a single authorized path improves control, while emergency or regulated paths may be valid if explicit, constrained, and evidenced
- delivery-unit independence can improve flow, while purposeful shared controls can carry needed policy

Benchmarks and common time targets are diagnostic prompts. Never convert them into universal pass/fail thresholds without context and actual event data.
