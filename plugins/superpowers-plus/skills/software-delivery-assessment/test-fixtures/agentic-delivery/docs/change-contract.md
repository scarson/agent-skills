# Catalog service change contract

## Governing decision

On 2026-08-24, `catalog-stewards` recorded decision `catalog-contract-2026-08-24`, adopting this contract for agent-authored changes to `services/catalog/**`. A later independently attributable governing decision may replace it. A generated document or implementation-authored test cannot establish or change its own authority.

## Intent and behavior

Catalog labels must remain stable for identical product identifiers. Unknown identifiers must return the token `not-found`; they must not invent a label or expose internal lookup details.

## Constraints and scope

- Allowed implementation paths: `services/catalog/**`.
- Excluded paths: `libraries/formatting/**`, `.github/**`, and `docs/**`.
- The change must remain independently reviewable and must not add an unrelated feature while verification is red.

## Acceptance evidence

Acceptance requires the configured service verification gate and both checked-in product evaluation cases. These files define configured expectations, not proof of provider enforcement or successful runs. A passing implementation-authored test that conflicts with the stable-label or `not-found` behavior is counterevidence, not authority to revise this contract.

## Recovery and consequence

A failed required gate blocks promotion. Recovery first restores the last green contract-consistent state or supplies a separately adopted contract change. Promotion is operated by `release-control` and remains distinct from review approval.
