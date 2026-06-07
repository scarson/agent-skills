import React from "react";

export const Row = React.memo(function Row({ product, category, style, onSelect }) {
  return (
    <div style={style} onClick={onSelect}>
      {product.name} — {category?.name} — ${product.price}
    </div>
  );
});
