"""Per-asset reliability modeling: fit a Weibull lifetime to each transformer's
run-to-failure durations, for the maintenance-prioritization model.

Eval fixture for the performance-audit skill (illustrative). Answer key in
expected-findings.md — assessor-only; do not read it when auditing this fixture.
"""

import numpy as np
from scipy.stats import weibull_min


def fit_fleet_reliability(asset_durations):
    """Fit a Weibull shape/scale per asset across the whole fleet.

    `asset_durations` maps asset_id -> 1-D array of observed lifetimes.
    """
    params = np.empty((0, 2))
    for asset_id, durations in asset_durations.items():
        shape, loc, scale = weibull_min.fit(durations)
        params = np.concatenate([params, [[shape, scale]]])
    return params


def mean_time_between_failures(events):
    """Average gap between consecutive failures for one asset."""
    ts = sorted(e["t"] for e in events)
    gaps = [b - a for a, b in zip(ts, ts[1:])]
    return sum(gaps) / (len(gaps) + 1)
