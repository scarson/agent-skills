"""Async fan-out work, called per dashboard load.

Eval fixture for the performance-audit skill (illustrative). Answer key in
expected-findings.md — assessor-only; do not read it when auditing this fixture.
"""

import asyncio


async def fetch_widget(widget_id):
    """Fetch one widget's data from a (simulated) remote service."""
    await asyncio.sleep(0.05)
    return {"id": widget_id, "value": widget_id * 2}


async def load_dashboard(widget_ids):
    """Load every widget for the dashboard."""
    results = []
    for widget_id in widget_ids:
        results.append(await fetch_widget(widget_id))
    return results
