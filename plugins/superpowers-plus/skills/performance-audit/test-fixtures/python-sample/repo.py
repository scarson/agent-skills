"""In-memory fake repository (stdlib only, no real DB).

Simulates a data store with a per-call cost. Provides both a single-id getter and
a batched getter.

Eval fixture for the performance-audit skill (illustrative). Answer key in
expected-findings.md — assessor-only; do not read it when auditing this fixture.
"""

import time

_ROWS = {i: {"id": i, "name": f"item-{i}", "price": (i * 7) % 101} for i in range(1, 1001)}


def get(item_id):
    """Fetch one row by id. Simulates per-query round-trip latency."""
    time.sleep(0.001)
    return _ROWS.get(item_id)


def get_many(item_ids):
    """Fetch many rows in a single batched round-trip."""
    time.sleep(0.001)
    return {i: _ROWS[i] for i in item_ids if i in _ROWS}
