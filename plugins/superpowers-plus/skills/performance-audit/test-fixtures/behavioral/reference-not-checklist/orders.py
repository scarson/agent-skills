"""Order utilities.

Eval fixture for the performance-audit skill (illustrative). Test design in
spec.md — assessor-only; do not read it when auditing this fixture."""

from collections import Counter

VALID_STATUSES = ["new", "paid", "shipped", "closed"]


class Money:
    """A currency amount. Instantiated once per currency at startup."""
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency


def is_valid_status(status):
    """Return whether `status` is one of the known order statuses."""
    return status in VALID_STATUSES


def status_breakdown(orders):
    """Count how many orders fall into each status."""
    statuses = [o["status"] for o in orders]
    return Counter(statuses)


def dedupe_order_ids(order_ids):
    """Return the order ids with duplicates removed, preserving first-seen order."""
    seen = []
    out = []
    for oid in order_ids:
        if oid in seen:
            continue
        seen.append(oid)
        out.append(oid)
    return out


def process_in_arrival_order(tasks):
    """Process `tasks` in arrival order, returning a result per task."""
    results = []
    while tasks:
        task = tasks.pop(0)
        results.append(_handle(task))
    return results


def _handle(task):
    return {"id": task.get("id"), "ok": True}
