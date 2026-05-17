// dashboard.jsx — equity console main view

import { useLuminData } from "../luminConfig";
import { Card, Stat } from "../UI";
import Alert from "./components/Alert";
import Assignments from "./components/Assignments";
import Categories from "./components/Categories";
import Distribution from "./components/Distribution";
import Outliers from "./components/Outliers";

function Dashboard({ history, threshold, onUpdate, timeWindow = 30 }) {
  const {
    TEAM = [],
    NPT_CATEGORIES = [],
    CATEGORY_COLOR = {},
    loadByPerson,
    loadByPersonCategory,
    gini,
  } = useLuminData();

  const byPerson = loadByPerson(history);
  const byPC = loadByPersonCategory(history);
  const counts = TEAM.map(p => byPerson[p.id] || 0);
  const sorted = [...TEAM].sort((a, b) => (byPerson[b.id] || 0) - (byPerson[a.id] || 0));
  const max = Math.max(...counts, 1);
  const total = counts.reduce((a, b) => a + b, 0);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const giniVal = gini(counts);
  const overloaded = counts.filter(c => c >= threshold).length;

  // categories aggregate
  const byCategory = {};
  for (const t of history) byCategory[t.category] = (byCategory[t.category] || 0) + 1;

  // spark — 10 buckets scaled to the active time window
  const windowDays = timeWindow === "all"
    ? Math.max(...history.map(t => t.days ?? 0), 30)
    : timeWindow;
  const bucketSize = Math.max(1, Math.ceil(windowDays / 10));
  const buckets = Array(10).fill(0);
  for (const t of history) {
    const b = Math.min(9, Math.floor((t.days ?? 0) / bucketSize));
    buckets[9 - b]++;
  }

  const windowLabel = timeWindow === "all" ? "All time" : `${timeWindow}d`;

  const teamStatus = giniVal <= 0.25 ? "great!" : giniVal <= 0.5 ? "just okay." : "poorly...";

  return (
    <div className="stack">
      <div className="page-h">
        <div>
          <h1>Equity Console</h1>
          <div className="sub">
            Distribution of non-promotable tasks across the team · {windowLabel}.
            Lumin tracks task history to identify imbalance and suggest fairer assignments.
          </div>
        </div>
      </div>

      <Alert overloaded={overloaded} threshold={threshold} top={top} byPerson={byPerson} />

      {/* top stat row */}
      <div className="grid g-3">
        <Card title={`Total NPTs · ${windowLabel}`}>
          <Stat
            value={total}
            label=""
            sparkData={buckets}
            deltaKind="up"
          />
        </Card>
        <Card title="Gini coefficient">
          <Stat
            value={giniVal.toFixed(2)}
            label=""
            delta={<>0 = equal · 1 = max imbalance · target <b>≤ 0.25</b></>}
          />
        </Card>
        <Card title={`Your team is doing ${teamStatus}`}>
          
        </Card>
      </div>

      {/* main split: distribution + side facts */}
      <div className="grid g-2-1">
        <Distribution
          sorted={sorted}
          byPerson={byPerson}
          byPC={byPC}
          max={max}
          threshold={threshold}
        />

        <div className="stack">
          <Categories
            byCategory={byCategory}
            total={total}
            NPT_CATEGORIES={NPT_CATEGORIES}
            CATEGORY_COLOR={CATEGORY_COLOR}
          />

          {/* <Outliers top={top} bottom={bottom} byPerson={byPerson} /> */}
        </div>
      </div>

      <Assignments
        history={history}
        NPT_CATEGORIES={NPT_CATEGORIES}
        CATEGORY_COLOR={CATEGORY_COLOR}
        onUpdate={onUpdate}
      />
    </div>
  );
}

window.Dashboard = Dashboard;
