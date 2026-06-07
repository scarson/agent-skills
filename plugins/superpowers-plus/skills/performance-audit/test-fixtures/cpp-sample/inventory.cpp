#include "shop.hpp"

#include <algorithm>
#include <array>
#include <sstream>
#include <string_view>

namespace shop {

// Returns the SKUs that appear more than once among an order's line items.
std::vector<std::string> find_duplicate_skus(const std::vector<std::string>& skus) {
    std::vector<std::string> seen;
    std::vector<std::string> dupes;
    for (const auto& sku : skus) {
        if (std::find(seen.begin(), seen.end(), sku) != seen.end()) {
            dupes.push_back(sku);
        } else {
            seen.push_back(sku);
        }
    }
    return dupes;
}

// Builds a "name: price" label for every line item, in order.
std::vector<std::string> build_labels(const std::vector<Item>& items) {
    std::vector<std::string> labels;
    for (const auto& it : items) {
        std::ostringstream oss;
        oss << it.price;
        labels.push_back(it.name + ": " + oss.str());
    }
    return labels;
}

// Small accessor used by sum_prices below.
static int unit_price(const Item& it) {
    return it.price;
}

// Sums the line-item prices for an order.
long sum_prices(const std::vector<Item>& items) {
    long total = 0;
    for (const auto& it : items) {
        total += unit_price(it);
    }
    return total;
}

// The regions this deployment serves.
static constexpr std::array<std::string_view, 3> kDefaultRegions = {"us", "eu", "apac"};

bool is_supported_region(std::string_view region) {
    return std::find(kDefaultRegions.begin(), kDefaultRegions.end(), region)
           != kDefaultRegions.end();
}

}  // namespace shop
