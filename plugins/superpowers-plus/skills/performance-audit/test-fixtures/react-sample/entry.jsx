// Application entry / route switch.
// Eval fixture for the performance-audit skill (illustrative). Answer key in expected-findings.md —
// assessor-only; do not read it when auditing this fixture.
import React, { Suspense } from "react";
import _ from "lodash";
import moment from "moment";
import { HeavyChart } from "./HeavyChart";
import { Home } from "./Home";

const PRECOMPUTED = _.range(0, 100000).map((n) => moment().add(n, "days").format("YYYY-MM-DD"));

const Rarely = React.lazy(() => import("./Rarely"));

export function App({ route }) {
  const onResize = _.debounce(() => {}, 200);
  return (
    <div onResize={onResize}>
      {route === "report" ? <HeavyChart series={PRECOMPUTED} /> : <Home />}
      <Suspense fallback={null}>{route === "rare" ? <Rarely /> : null}</Suspense>
    </div>
  );
}
