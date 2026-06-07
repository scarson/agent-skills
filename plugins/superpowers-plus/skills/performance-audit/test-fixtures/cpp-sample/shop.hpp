// A small order-enrichment service (header). Illustrative C++ (not built).
// Eval fixture for the performance-audit skill (illustrative). Answer key in
// expected-findings.md — assessor-only; do not read it when auditing this fixture.
#pragma once

#include <string>
#include <string_view>
#include <vector>

namespace shop {

struct Item {
    std::string id;
    std::string name;
    int price = 0;  // price in minor units (e.g. cents)
};

struct Totals {
    long revenue = 0;
    long tax = 0;
    long shipping = 0;
};

// Thin handle over a database connection. Each call is one round-trip to the DB
// (network + query). Illustrative — bodies live elsewhere; treat each method as a
// per-call DB round-trip.
class Db {
public:
    Item query_item(const std::string& id) const;             // SELECT ... WHERE id = ?
    long aggregate_revenue(const std::string& order_id) const;
    long aggregate_tax(const std::string& order_id) const;
    long aggregate_shipping(const std::string& order_id) const;
};

std::vector<std::string> find_duplicate_skus(const std::vector<std::string>& skus);
std::vector<std::string> build_labels(const std::vector<Item>& items);
long sum_prices(const std::vector<Item>& items);
bool is_supported_region(std::string_view region);

std::vector<Item> handle_order(const Db& db, const std::vector<std::string>& ids);
Totals compute_totals(const Db& db, const std::string& order_id);

}  // namespace shop
