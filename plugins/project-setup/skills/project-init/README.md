# project-init

One-command bootstrap for a project's foundational guidance, Git policy, pitfalls documentation, Testing strategy, and Delivery strategy. An AI agent runs the wrapper on the user's behalf; it is not a standalone CLI or evaluator.

**Agents should read [SKILL.md](SKILL.md).** This README is the human-facing overview.

## What the wrapper does

It runs five independently usable initializers in a stable order:

1. `claude-agents-md-init` — aligned root guidance and shared safety policy
2. `git-strategy-init` — Git/worktree/merge policy and guidance links
3. `pitfalls-docs-init` — implementation and testing pitfalls documents
4. `testing-strategy-init` — evidence-bounded Testing strategy
5. `delivery-strategy-init` — evidence-bounded Delivery strategy

Each child performs its own discovery, asks its own questions, previews exact changes, obtains confirmation, applies or restores them, and emits a detailed report. The wrapper validates each final `PROJECT_SETUP_CHILD_RESULT_V1` block and ends with one `PROJECT_SETUP_AGGREGATE_RESULT_V1` block.

Testing is a soft input to Delivery. Delivery still runs when no Testing strategy exists and records the missing context honestly rather than inventing a gate or suppressing the Delivery baseline.

## Why a wrapper

- **One entry point.** A user can request the complete foundational setup without remembering five skill names.
- **Useful ordering.** Root guidance exists before later skills add routes; Git strategy exists before pitfalls installs its orchestration reference; Testing precedes Delivery without becoming a hard prerequisite.
- **Honest mixed outcomes.** The aggregate distinguishes complete, skipped, unresolved-routing, blocked, no-change failure, restored failure, and uncertain partial states.

## Safety and reporting

The wrapper does not write project files or add a second transaction layer. Each child uses the shared proposal, lock, receipt, and restoration contract. The wrapper only:

- invokes selected children in order;
- validates exactly one result from each invoked child;
- validates each result's schema and internal invariants without repeating child discovery or receipt work;
- stops later children when a result is invalid or mutation state is uncertain; and
- reduces invoked results through the closed aggregate table.

A missing, duplicate, malformed, wrong-child, or future-version child result is treated as unknown mutation state, not guessed into success. A block or restored/no-change failure remains visible in the aggregate but does not automatically suppress independent later children. Only `FAILED_PARTIAL` is the schema-version-1 child-outcome global stop. Child receipts are time-bounded transaction records; the wrapper does not recursively recompute them after the child returns.

User omission at wrapper scope is not misrepresented as a child result. Whole-wrapper decline and individual child omissions are wrapper diagnostics; `children` contains invoked results only.

## Independently runnable children

The wrapper adds no domain coupling. Any child can still be invoked directly when only that document family is wanted. Domain discovery, rendering, reconciliation, and write safety remain in the child skill and shared references, not in `project-init`.

## Cross-platform

The wrapper and children are Markdown instructions with no bundled runtime. Frameworks with native skill invocation use it; other agents read each child `SKILL.md` and follow it end to end. Receipt hashes cover exact local bytes, including the host's actual line endings.

## Changelog

- **v2.0** (2026-08) — expanded the wrapper from three to five children; added Testing then Delivery; adopted the structured child and aggregate result contracts; added invoked-only child reporting, wrapper-level omission and unavailable-entry diagnostics, and `FAILED_PARTIAL` global-stop handling without duplicating child discovery or receipt work.
