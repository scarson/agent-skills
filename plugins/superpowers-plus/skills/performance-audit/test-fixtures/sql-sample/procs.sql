-- Routine definitions. The application invokes enrich_recent_orders() by name
-- (see queries.sql).
-- Eval fixture for the performance-audit skill (illustrative). Answer key in
-- expected-findings.md — assessor-only; do not read it when auditing this fixture.

-- Recompute total_cents for paid orders from their line items.
CREATE OR REPLACE FUNCTION enrich_recent_orders() RETURNS void AS $$
DECLARE
    o RECORD;
    item_total bigint;
BEGIN
    FOR o IN SELECT id FROM orders WHERE status = 'paid' LOOP
        SELECT sum(qty) INTO item_total FROM order_items WHERE order_id = o.id;
        UPDATE orders SET total_cents = item_total * 100 WHERE id = o.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Touch the parent order whenever an order_item is inserted.
CREATE OR REPLACE FUNCTION bump_order_count() RETURNS trigger AS $$
BEGIN
    UPDATE orders SET total_cents = total_cents WHERE id = NEW.order_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bump_order_count
    AFTER INSERT ON order_items
    FOR EACH ROW EXECUTE FUNCTION bump_order_count();
