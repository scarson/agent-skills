"""Landed-cost pricing, called on the product-listing hot path.

Eval fixture for the performance-audit skill (illustrative). Answer key in
expected-findings.md — assessor-only; do not read it when auditing this fixture.
"""

_LANDED_COST_CACHE = {}


def _compute_landed_cost(product):
    """Simulates a heavy per-product calculation."""
    total = 0.0
    for _ in range(50000):
        total += product["base"] * 1.05
    return product["base"] * 1.2 + product["shipping"]


def get_landed_cost(product):
    """Memoized landed-cost lookup."""
    key = id(product)
    if key in _LANDED_COST_CACHE:
        return _LANDED_COST_CACHE[key]
    cost = _compute_landed_cost(product)
    _LANDED_COST_CACHE[key] = cost
    return cost


def list_prices(raw_products):
    """Price every product in a listing."""
    out = []
    for r in raw_products:
        product = {"base": r["base"], "shipping": r["shipping"], "sku": r["sku"]}
        out.append({"sku": r["sku"], "landed": get_landed_cost(product)})
    return out


def average_order_value(orders):
    """Average order amount."""
    total = sum(o["amount"] for o in orders)
    return total / (len(orders) + 1)
