"""Order-related Django ORM view helpers.

Eval fixture for the performance-audit skill (illustrative). Answer key in
expected-findings.md — assessor-only; do not read it when auditing this fixture.

Assume `Order` and `User` are standard Django models with a default manager.
"""


def has_recent_orders(user_id):
    """Does the user have any recent orders?"""
    qs = Order.objects.filter(user_id=user_id, status="recent")
    return len(qs) > 0


def order_net_amounts(user_id):
    """Net amount (amount - discount) per order."""
    return Order.objects.filter(user_id=user_id).extra(select={"net": "amount - discount"})


def mark_all_shipped(order_ids):
    """Mark a batch of orders shipped."""
    orders = Order.objects.filter(id__in=order_ids)
    for o in orders:
        o.status = "shipped"
        o.save()


def active_admin_emails():
    """Normalized admin emails."""
    config_admins = ["Admin@Example.com", "Ops@Example.com"]
    return [e.lower() for e in config_admins]
