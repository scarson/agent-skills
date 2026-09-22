# testing-strategy-init

Creates or adopts one project-specific Testing strategy, normally at `docs/testing-strategy.md`. The skill is invoked by an agent on the user's behalf; it is not a standalone command.

## What it produces

The initialized document contains:

- an evidence-scoped current testing posture;
- the fastest useful ordinary-change expectation the project can honestly support;
- confirmed or discovered verification entry points with working directory, prerequisites, side effects, result meaning, coverage, blind spots, and provenance;
- a complete activation index whose Applicability, Lifecycle, and Knowledge axes remain independent;
- only the module bodies supported by current known evidence;
- verification scopes that produce evidence and gates that interpret it;
- explicit authority, conflicts, unknowns, and unresolved companion references.

For a small prototype, that can be a short document saying no entry point is yet confirmed and naming the next useful activation trigger. It does not manufacture CI, production history, compliance machinery, or delivery controls.

## Safety and composition

The initializer searches for existing or equivalent strategies before creating anything, requires confirmation for adoption or conflicts, preserves bytes outside its managed regions, and applies a confirmed exact-byte proposal through the shared recoverable project-setup protocol. It can update compact routes in `CLAUDE.md` and `AGENTS.md` only symmetrically; route conflicts do not prevent a safe strategy document from being created.

The skill changes documentation only. It does not install dependencies, create CI workflows or hooks, handle credentials, release, deploy, or mutate remote services. It works with or without Git and does not require a particular shell or provider.

## Relationship to other skills

- `delivery-strategy-init` consumes Testing gate results for delivery evidence needs but owns delivery consequences itself.
- `pitfalls-docs-init` records learned traps; this strategy links to testing pitfalls rather than duplicating them.
- `project-init` invokes this initializer after pitfalls and before Delivery strategy setup.

## Version history

- **1.0**: Initial release with progressive Testing strategy, a shared managed-record/application protocol, an exact result contract, symmetric root routing, and a documentation-only boundary.
- **1.1**: Aligned shared application safety with child-owned discovery and lock-time revalidation, practical ordinary-file receipts, and fail-closed linked/junction/reparse targets. The Testing strategy template is unchanged; existing project documents need no content migration.
