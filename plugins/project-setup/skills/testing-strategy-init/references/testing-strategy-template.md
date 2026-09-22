# Testing strategy

This document describes how `[PROJECT_NAME]` produces and interprets testing evidence. It records current, evidence-bounded practice and explicit gaps; it does not claim that a command, provider, or control exists merely because it would be useful.

## Current posture

<!-- project-setup:testing-strategy-init:core schema=1 begin -->
**Evidence-scoped posture:** [CURRENT_POSTURE]

**Ordinary-change expectation:** [ORDINARY_CHANGE_EXPECTATION]

**Confirmed entry point or gap:** [CONFIRMED_ENTRY_POINT_OR_EXPLICIT_GAP]

**Authority and conflicts:** [AUTHORITY_AND_CONFLICT_ROUTE]

[RELEVANT_SUPPORTING_CONTEXT_FACT_ROWS_OR_OMIT_TABLE]
<!-- project-setup:testing-strategy-init:core schema=1 end -->

## Activation index

The index is complete for schema version 1. Applicability, Lifecycle, and Knowledge are independent. Only `APPLICABLE + CURRENT + KNOWN` rows have active body anchors.

<!-- project-setup:testing-strategy-init:module-index schema=1 begin -->
| Module ID | Applicability | Lifecycle | Knowledge | Authority | Evidence / unresolved | Active body / reason |
|---|---|---|---|---|---|---|
| TESTING-MODULE-ORDINARY-CHANGE | [STATE] | [STATE] | [STATE] | [OWNER_OR_UNRESOLVED] | [BASIS_DETAIL_OR_INSPECTION_GAP_TRIGGER] | [ANCHOR_OR_REASON] |
| TESTING-MODULE-BOUNDARY-CONTRACTS | [STATE] | [STATE] | [STATE] | [OWNER_OR_UNRESOLVED] | [BASIS_DETAIL_OR_INSPECTION_GAP_TRIGGER] | [ANCHOR_OR_REASON] |
| TESTING-MODULE-TEST-DOUBLES | [STATE] | [STATE] | [STATE] | [OWNER_OR_UNRESOLVED] | [BASIS_DETAIL_OR_INSPECTION_GAP_TRIGGER] | [ANCHOR_OR_REASON] |
| TESTING-MODULE-TEST-DATA-PERSISTENT-STATE | [STATE] | [STATE] | [STATE] | [OWNER_OR_UNRESOLVED] | [BASIS_DETAIL_OR_INSPECTION_GAP_TRIGGER] | [ANCHOR_OR_REASON] |
| TESTING-MODULE-TIME-CONCURRENCY | [STATE] | [STATE] | [STATE] | [OWNER_OR_UNRESOLVED] | [BASIS_DETAIL_OR_INSPECTION_GAP_TRIGGER] | [ANCHOR_OR_REASON] |
| TESTING-MODULE-COMPATIBILITY-PLATFORM | [STATE] | [STATE] | [STATE] | [OWNER_OR_UNRESOLVED] | [BASIS_DETAIL_OR_INSPECTION_GAP_TRIGGER] | [ANCHOR_OR_REASON] |
| TESTING-MODULE-NONFUNCTIONAL-BEHAVIOR | [STATE] | [STATE] | [STATE] | [OWNER_OR_UNRESOLVED] | [BASIS_DETAIL_OR_INSPECTION_GAP_TRIGGER] | [ANCHOR_OR_REASON] |
| TESTING-MODULE-PRODUCTION-VERIFICATION | [STATE] | [STATE] | [STATE] | [OWNER_OR_UNRESOLVED] | [BASIS_DETAIL_OR_INSPECTION_GAP_TRIGGER] | [ANCHOR_OR_REASON] |
| TESTING-MODULE-FLAKE-QUARANTINE-SKIP | [STATE] | [STATE] | [STATE] | [OWNER_OR_UNRESOLVED] | [BASIS_DETAIL_OR_INSPECTION_GAP_TRIGGER] | [ANCHOR_OR_REASON] |
| TESTING-MODULE-EXCEPTIONS | [STATE] | [STATE] | [STATE] | [OWNER_OR_UNRESOLVED] | [BASIS_DETAIL_OR_INSPECTION_GAP_TRIGGER] | [ANCHOR_OR_REASON] |
| TESTING-MODULE-RETIREMENT | [STATE] | [STATE] | [STATE] | [OWNER_OR_UNRESOLVED] | [BASIS_DETAIL_OR_INSPECTION_GAP_TRIGGER] | [ANCHOR_OR_REASON] |
| TESTING-MODULE-MAINTENANCE-CONTRACTS | [STATE] | [STATE] | [STATE] | [OWNER_OR_UNRESOLVED] | [BASIS_DETAIL_OR_INSPECTION_GAP_TRIGGER] | [ANCHOR_OR_REASON] |
<!-- project-setup:testing-strategy-init:module-index schema=1 end -->

[OPTIONAL_ACTIVE_MODULES_SECTION_WITH_MANAGED_REGION_OR_OMIT_ENTIRELY]

[OPTIONAL_VERIFICATION_RECORDS_SECTION_WITH_MANAGED_REGION_OR_OMIT_ENTIRELY]

## References

<!-- project-setup:testing-strategy-init:references schema=1 begin -->
[LINKS_TO_INSTALLED_CANONICAL_COMPANIONS_OR_PLAIN_TEXT_TARGET_UNRESOLVED_REFERENCE_RECORDS]
<!-- project-setup:testing-strategy-init:references schema=1 end -->
