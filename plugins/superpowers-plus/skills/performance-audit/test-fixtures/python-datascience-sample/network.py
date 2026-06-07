"""Linear state-estimation / DC power-flow solve over the grid admittance matrix.

Eval fixture for the performance-audit skill (illustrative). Answer key in
expected-findings.md — assessor-only; do not read it when auditing this fixture.
"""

import numpy as np
import scipy.sparse as sp
from scipy.sparse.linalg import spsolve


def estimate_states(Y, injection_series):
    """Solve Y @ v = i for each time step's injection vector.

    `Y` is the (constant) sparse network matrix; `injection_series` is a list of
    right-hand-side vectors, one per SCADA scan.
    """
    states = []
    for i in injection_series:
        v = spsolve(Y, i)
        states.append(v)
    return states


def build_admittance(edges, n):
    """Assemble the sparse admittance matrix from a branch list.

    Builds in COO triplet form then converts once to CSC.
    """
    rows, cols, vals = [], [], []
    for (a, b, y) in edges:
        rows += [a, b, a, b]
        cols += [a, b, b, a]
        vals += [y, y, -y, -y]
    return sp.coo_matrix((vals, (rows, cols)), shape=(n, n)).tocsc()
