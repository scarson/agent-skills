-- Hand-rolled queries invoked from the application.
-- Eval fixture for the performance-audit skill (illustrative). Answer key in
-- expected-findings.md — assessor-only; do not read it when auditing this fixture.

-- Orders for a given calendar day.
SELECT * FROM orders
WHERE date(created_at) = $1;

-- All orders for a customer, looked up by email.
SELECT *
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE c.email = $1;

-- Page through orders, newest first.
SELECT id, total_cents, created_at
FROM orders
ORDER BY created_at DESC
OFFSET 100000 LIMIT 20;

-- Recalculate order totals via the stored routine.
SELECT enrich_recent_orders();

-- Fetch a single customer by id.
SELECT id, email FROM customers WHERE id = $1;
