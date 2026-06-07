"""Request orchestration — wires the modules into two request paths.

  handle_listing_request  (per page view)
    -> pricing.list_prices
    -> inventory.find_duplicate_skus
    -> report.render_csv

  handle_checkout_request (per checkout)
    -> inventory.enrich_line_items
    -> report.total_revenue

  config.load_enabled_flags is called once at startup.

Eval fixture for the performance-audit skill (illustrative). Answer key in
expected-findings.md — assessor-only; do not read it when auditing this fixture.
"""

import config
import inventory
import pricing
import report


def handle_listing_request(raw_products):
    """Render the product-listing page. raw_products is request-sized (tens to a
    few hundred), each a dict with id, name, price, base, shipping, sku."""
    priced = pricing.list_prices(raw_products)
    dupes = inventory.find_duplicate_skus([p["sku"] for p in priced])
    csv = report.render_csv(raw_products)
    return {"priced": priced, "dupes": dupes, "csv": csv}


def handle_checkout_request(order_item_ids):
    """Finalize an order."""
    enriched = inventory.enrich_line_items(order_item_ids)
    rows = [{"qty": 1, "price": e["price"]} for e in enriched]
    return {"items": enriched, "revenue": report.total_revenue(rows)}


ENABLED_FLAGS = config.load_enabled_flags({"fast_export": True})
