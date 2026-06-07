"""Application config, loaded once at startup.

Eval fixture for the performance-audit skill (illustrative). Answer key in
expected-findings.md — assessor-only; do not read it when auditing this fixture.
"""

_FLAGS = ["beta_ui", "fast_export", "new_pricing", "audit_log"]


def load_enabled_flags(env):
    """Build the enabled-flag lookup at process startup."""
    enabled = []
    for flag in sorted(_FLAGS):
        if flag not in enabled and env.get(flag):
            enabled.append(flag)
    return enabled
