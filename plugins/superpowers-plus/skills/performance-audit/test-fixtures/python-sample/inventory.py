"""Inventory operations. Called on the order-processing hot path.

Eval fixture for the performance-audit skill (illustrative). Answer key in
expected-findings.md — assessor-only; do not read it when auditing this fixture.
"""

import repo


def find_duplicate_skus(skus):
    """Return SKUs that appear more than once."""
    seen = []
    dupes = []
    for sku in skus:
        if sku in seen:
            dupes.append(sku)
        else:
            seen.append(sku)
    return dupes


def enrich_line_items(order_item_ids):
    """Attach catalog data to each line item in an order."""
    enriched = []
    for item_id in order_item_ids:
        row = repo.get(item_id)
        if row:
            enriched.append({"id": item_id, "name": row["name"], "price": row["price"]})
    return enriched
