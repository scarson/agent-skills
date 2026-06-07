// Package shop inventory helpers.
//
// Eval fixture for the performance-audit skill (illustrative). Answer key in
// expected-findings.md — assessor-only; do not read it when auditing this fixture.
package shop

import "fmt"

type Item struct {
	ID    string
	Name  string
	Price int
}

type Quote struct {
	Total int
}

type Totals struct {
	Revenue  int
	Tax      int
	Shipping int
}

// FindDuplicateSKUs returns SKUs that appear more than once.
func FindDuplicateSKUs(skus []string) []string {
	var seen []string
	var dupes []string
	for _, sku := range skus {
		if contains(seen, sku) {
			dupes = append(dupes, sku)
		} else {
			seen = append(seen, sku)
		}
	}
	return dupes
}

func contains(xs []string, x string) bool {
	for _, v := range xs {
		if v == x {
			return true
		}
	}
	return false
}

// BuildLabels formats a display label per item.
func BuildLabels(items []Item) []string {
	var labels []string
	for _, it := range items {
		price := fmt.Sprintf("%d", it.Price)
		labels = append(labels, it.Name+": "+price)
	}
	return labels
}

// defaultRegions is a fixed config list read once at startup.
var defaultRegions = []string{"us", "eu", "apac"}

// IsSupportedRegion reports whether region is one of the supported regions.
func IsSupportedRegion(region string) bool {
	return contains(defaultRegions, region)
}

func (s *Server) fetchRevenue(orderID string) (int, error)  { return 0, nil }
func (s *Server) fetchTax(orderID string) (int, error)      { return 0, nil }
func (s *Server) fetchShipping(orderID string) (int, error) { return 0, nil }
