# Software delivery assessment

This skill assesses how a bounded set of software changes reaches its intended users and how convincingly the delivery path detects failure. It does not assume delivery is continuous and does not assign a maturity score.

The runtime method is split across the [assessment method](references/assessment-method.md), [capability model](references/capability-model.md), [agentic delivery overlay](references/agentic-delivery.md), [testing model](references/testing-model.md), and [evidence snapshot contract](references/delivery-evidence-snapshot.md). The [evaluation protocol](references/evaluation-protocol.md) is for maintainers and assessment evaluators; runtime skills do not load it.

## Provenance

- Source: [bdfinst/cd-migration](https://github.com/bdfinst/cd-migration)
- Pinned source revision: `8ea936b6160656ccf8ce54834adb643494eb1ef9`
- Observed local HEAD on 2026-08-29: `8ea936b6160656ccf8ce54834adb643494eb1ef9`
- Read-only `origin/HEAD` observed on 2026-08-29: `8ea936b6160656ccf8ce54834adb643494eb1ef9`
- Normalized pinned upstream notice SHA-256: `ac59425cad3606f03f0943d98819b6af35200561ba1e0fd779ea3d5ace5d33c9`

The adapted material is attributed to the CD Migration Authors, MinimumCD.org, and the Dojo Consortium under CC BY 4.0. See [SOURCE-MAP.md](SOURCE-MAP.md) for file-level sources and [LICENSE-CC-BY-4.0](LICENSE-CC-BY-4.0) for the preserved notice and canonical legal-code link.

## Adapted files

- `references/agentic-delivery.md`
- `references/capability-model.md`
- `references/testing-model.md`

## Changes

The adapted expression generalizes a continuous-delivery migration corpus into a software-delivery assessment. It adds delivery-unit scoping, evidence ceilings, explicit unknowns, and risk-framed testing analysis. The agentic overlay adds conditional questions for units and change classes where agents materially author, approve, operate, or release changes. It treats continuous delivery as one possible capability set, preserves contextual alternatives, and removes maturity levels, grades, and benchmark targets.

The assessment method, artifact contract, and evaluation protocol are original project material informed by the design work for this skill. They are not listed as CC BY adaptations.

## Refreshing the source

1. Choose and review a new upstream commit; do not follow the moving default branch silently.
2. Read every mapped source page from that commit and update [SOURCE-MAP.md](SOURCE-MAP.md).
3. Re-copy the committed upstream `LICENSE` blob, retain the canonical legal-code pointer, and update the guarded hash and tests if the notice changed.
4. Review the adapted files for semantic drift, then update the pinned, local, and remote observations separately.
5. Run the packaging and semantic evaluation suites before release.

## Changelog

### 1.1

- Add a conditionally routed agentic-delivery overlay, exact upstream provenance, and a two-unit behavioral fixture.

### 1.0

- Initial generalized software-delivery assessment method, evidence contract, models, fixtures, and evaluation protocol.
