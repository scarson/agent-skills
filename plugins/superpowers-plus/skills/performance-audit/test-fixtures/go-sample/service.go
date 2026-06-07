// Package shop implements a small HTTP order service.
//
// Eval fixture for the performance-audit skill (illustrative). Answer key in
// expected-findings.md — assessor-only; do not read it when auditing this fixture.
package shop

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

type Server struct {
	db *sql.DB
}

// HandleOrder enriches an order's line items and returns them.
func (s *Server) HandleOrder(w http.ResponseWriter, r *http.Request) {
	ids := r.URL.Query()["item"]

	var items []Item
	for _, id := range ids {
		row := s.db.QueryRow("SELECT id, name, price FROM items WHERE id = $1", id)
		var it Item
		if err := row.Scan(&it.ID, &it.Name, &it.Price); err == nil {
			items = append(items, it)
		}
	}

	client := &http.Client{}
	resp, _ := client.Get("http://pricing/quote?order=" + r.URL.Query().Get("order"))
	var quote Quote
	json.NewDecoder(resp.Body).Decode(&quote)

	json.NewEncoder(w).Encode(map[string]any{"items": items, "quote": quote})
}

// Totals fetches the revenue, tax, and shipping aggregates for an order.
func (s *Server) Totals(orderID string) (Totals, error) {
	revenue, err := s.fetchRevenue(orderID)
	if err != nil {
		return Totals{}, err
	}
	tax, err := s.fetchTax(orderID)
	if err != nil {
		return Totals{}, err
	}
	ship, err := s.fetchShipping(orderID)
	if err != nil {
		return Totals{}, err
	}
	return Totals{revenue, tax, ship}, nil
}
