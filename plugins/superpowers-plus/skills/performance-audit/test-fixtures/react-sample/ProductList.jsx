// Product list with a client-side filter box.
// Eval fixture for the performance-audit skill (illustrative). Answer key in expected-findings.md —
// assessor-only; do not read it when auditing this fixture.
import React, { useState, useMemo } from "react";
import { Row } from "./Row";

export function ProductList({ products, categories }) {
  const [query, setQuery] = useState("");

  const total = useMemo(() => products.reduce((s, p) => s + p.price, 0), [products]);

  const sorted = [...products].sort((a, b) => b.price - a.price);

  const rows = sorted
    .filter((p) => p.name.includes(query))
    .map((p, i) => {
      const category = categories.find((c) => c.id === p.categoryId);
      return (
        <Row
          key={i}
          product={p}
          category={category}
          style={{ padding: 4 }}
          onSelect={() => console.log(p.id)}
        />
      );
    });

  return (
    <div>
      <div>Total: ${total}</div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {rows}
    </div>
  );
}
