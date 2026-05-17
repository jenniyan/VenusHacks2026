// dashboard.jsx — equity console main view

import { useLuminData } from "../luminConfig";
import { Card, Stat } from "../UI";
import Alert from "./components/Alert";
import Assignments from "./components/Assignments";
import Categories from "./components/Categories";
import Distribution from "./components/Distribution";

function Dashboard({ history, threshold, selectedWindow = "30d" }) {
  const {
    TEAM = [],
    NPT_CATEGORIES = [],
    CATEGORY_COLOR = {},
    loadByPerson,
    loadByPersonCategory,
    gini,
  } = useLuminData();

  // apply active time window filter to history
  const windowMap = { "1d": 1, "7d": 7, "14d": 14, "30d": 30, "90d": 90 };
  const filteredHistory = selectedWindow === "all"
    ? history
    : history.filter((t) => (typeof t.days === "number" ? t.days <= (windowMap[selectedWindow] || 30) : true));

  const byPerson = loadByPerson(filteredHistory);
  const byPC = loadByPersonCategory(filteredHistory);
  const counts = TEAM.map(p => byPerson[p.id] || 0);
  const sorted = [...TEAM].sort((a, b) => (byPerson[b.id] || 0) - (byPerson[a.id] || 0));
  const max = Math.max(...counts, 1);
  const total = counts.reduce((a, b) => a + b, 0);
  const top = sorted[0];
  const giniVal = gini(counts);
  const overloaded = counts.filter(c => c >= threshold).length;

  // categories aggregate
  const byCategory = {};
  for (const t of filteredHistory) byCategory[t.category] = (byCategory[t.category] || 0) + 1;

  // spark — count tasks per 3-day bucket for visualization (uses 30-day buckets)
  const buckets = Array(10).fill(0);
  for (const t of filteredHistory) {
    const b = Math.min(9, Math.floor(t.days / 3));
    buckets[9 - b]++;
  }

  return (
    <div className="stack">
      <div className="page-h">
        <div>
          <h1>Equity Console</h1>
          <div className="sub">
            {`Distribution of non-promotable tasks across the team in the last ${selectedWindow === "all" ? "all time" : (selectedWindow === "1d" ? "1 day" : (selectedWindow === "7d" ? "7 days" : "30 days"))}.`}
            {' '}Lumin tracks task history to identify imbalance and suggest fairer assignments.
          </div>
        </div>
      </div>

      <Alert overloaded={overloaded} threshold={threshold} top={top} byPerson={byPerson} />

      {/* top stat row */}
      <div className="grid g-3">
        <Card title={`Total NPTs · ${selectedWindow === "all" ? "all" : selectedWindow}`}>
          <Stat
            value={total}
            label=""
            sparkData={buckets}
            delta={<>vs prev. 30d <b>+18%</b></>}
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
        history={filteredHistory}
        byPerson={byPerson}
        NPT_CATEGORIES={NPT_CATEGORIES}
        CATEGORY_COLOR={CATEGORY_COLOR}
      />
    </div>
  );
}

window.Dashboard = Dashboard;
