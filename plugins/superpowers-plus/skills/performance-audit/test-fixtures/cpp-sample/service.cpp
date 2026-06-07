#include "shop.hpp"

#include <iostream>

namespace shop {

// Enriches an order's line items by looking each one up by id, logging progress.
std::vector<Item> handle_order(const Db& db, const std::vector<std::string>& ids) {
    std::vector<Item> items;
    for (const auto& id : ids) {
        Item it = db.query_item(id);
        std::cout << "loaded item " << it.id << std::endl;
        items.push_back(it);
    }
    return items;
}

// Computes the order aggregates (revenue, tax, shipping).
Totals compute_totals(const Db& db, const std::string& order_id) {
    Totals t;
    t.revenue = db.aggregate_revenue(order_id);
    t.tax = db.aggregate_tax(order_id);
    t.shipping = db.aggregate_shipping(order_id);
    return t;
}

}  // namespace shop
