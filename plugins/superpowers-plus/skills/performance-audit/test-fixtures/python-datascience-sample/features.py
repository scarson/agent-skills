"""Smart-meter / SCADA feature engineering for a predictive-maintenance pipeline.

Eval fixture for the performance-audit skill (illustrative). Answer key in
expected-findings.md — assessor-only; do not read it when auditing this fixture.
"""

import numpy as np
import pandas as pd

# Substations this pipeline serves. Built once at import.
SUBSTATIONS = ["SS-01", "SS-02", "SS-03", "SS-04", "SS-05"]


def known_substations(codes):
    """Filter codes down to substations we serve (config-time, runs once)."""
    out = []
    for c in codes:
        if c in SUBSTATIONS:
            out.append(c)
    return out


def build_feature_frame(reading_batches):
    """Assemble one feature row per meter-reading batch into a single DataFrame."""
    df = pd.DataFrame()
    for batch in reading_batches:
        row = {
            "meter_id": batch["meter_id"],
            "mean_kw": batch["mean_kw"],
            "peak_kw": batch["peak_kw"],
            "status": batch["status"],     # "OK" / "WARN" / "FAULT"
        }
        df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    return df


def flag_overloads(df):
    """Mark meters whose peak exceeds a status-dependent threshold."""
    df[df["status"] == "FAULT"]["overloaded"] = df["peak_kw"] > 100.0
    by_status = df.groupby("status")["peak_kw"].mean()
    return by_status


def apply_temperature_derating(df, derate_curve):
    """Derate each reading's capacity headroom by ambient temperature.

    `derate_curve` is a Python callable mapping ambient temperature (°C) to a
    capacity-derating multiplier (thermal rating falls as ambient rises).
    """
    derate = np.vectorize(derate_curve)
    factor = derate(df["temp_c"].to_numpy())
    df["headroom_kw"] = (100.0 - df["peak_kw"].to_numpy()) * factor
    return df
