"""Reporting helpers, called per report-export request.

Eval fixture for the performance-audit skill (illustrative). Answer key in
expected-findings.md — assessor-only; do not read it when auditing this fixture.
"""

import re


def total_revenue(rows):
    """Sum revenue across rows."""
    line_revenues = [row["qty"] * row["price"] for row in rows]
    return sum(line_revenues)


def render_csv(rows):
    """Render rows to a CSV string."""
    out = ""
    for row in rows:
        out += f"{row['id']},{row['name']},{row['price']}\n"
    return out


def extract_codes(lines):
    """Pull product codes out of free-text lines."""
    codes = []
    for line in lines:
        pattern = re.compile(r"[A-Z]{3}-\d{4}")
        m = pattern.search(line)
        if m:
            codes.append(m.group(0))
    return codes
