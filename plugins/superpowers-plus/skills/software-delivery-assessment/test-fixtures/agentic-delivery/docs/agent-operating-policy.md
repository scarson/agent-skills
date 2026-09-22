# Agent operating policy

On 2026-08-22, the attributed repository owner group `catalog-stewards` recorded decision `delivery-policy-2026-08-22`, adopting this policy for the `services/catalog/` delivery unit and the `agent-authored-service-change` change class. The document records that claim; its own claim of authority is not proof that the decision was made or independently enforced.

The authoring agent receives repository-read access and write access only to `services/catalog/**`, its task branch, and task-scoped artifacts. `libraries/formatting/**`, CI configuration, approval records, release controls, secrets, and environments are outside its write authority.

One agent-authored service change may be in review at a time. Each change must name its intent, affected behavior, constraints, accepted paths, and acceptance evidence before implementation. Review queue growth pauses new agent-authored work rather than expanding batch size or fan-out.

The authoring agent cannot approve or promote its own change. Approval and promotion are separate decisions. The `release-control` identity independently operates the promotion gate for this change class; no rule here requires a human actor for every change.

When a material required gate is red, the agent may work only on restoring that gate. It may not continue unrelated feature work, weaken the gate, or rewrite the governing change contract to make the current output pass.
