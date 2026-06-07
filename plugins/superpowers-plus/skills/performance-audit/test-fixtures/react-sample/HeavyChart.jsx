import React from "react";

export function HeavyChart({ series }) {
  return <div className="chart">{series.length} points</div>;
}
