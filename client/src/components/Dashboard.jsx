// dashboard.jsx — equity console main view

import { Avatar, Card, Legend, Pill, StackedBar, Stat, TEAM_BY_ID, relTime } from "./UI";

function Dashboard({ history, threshold }) {
  const { TEAM, NPT_CATEGORIES, CATEGORY_COLOR, loadByPerson, loadByPersonCategory, gini } = window.LUMIN;

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

  // recent assignments (last 12)
  const recent = [...history].sort((a, b) => a.days - b.days).slice(0, 12);

  // 30-day spark — count tasks per 3-day bucket
  const buckets = Array(10).fill(0);
  for (const t of history) {
    const b = Math.min(9, Math.floor(t.days / 3));
    buckets[9 - b]++;
  }

  return (
    <div className="stack">
      <div className="page-h">
        <div>
          <h1>Equity Console</h1>
          <div className="sub">
            Distribution of non-promotable tasks across the team in the last 30 days.
            Lumin tracks task history to identify imbalance and suggest fairer assignments.
          </div>
        </div>
        <div className="right-meta">
          <div>Workspace · <b>Eng / Platform</b></div>
          <div>Window · <b>Last 30 days</b></div>
          <div>Updated · <b>2 min ago</b></div>
        </div>
      </div>

      {/* alert strip */}
      {overloaded > 0 && (
        <div className="card" style={{ borderColor: "var(--c-signal)", background: "var(--c-signal-soft)", padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span className="pill signal">⚠ Imbalance detected</span>
            <span style={{ fontSize: 13, color: "var(--c-ink)" }}>
              <b>{overloaded}</b> {overloaded === 1 ? "teammate is" : "teammates are"} carrying ≥ {threshold} NPTs this window.{" "}
              <b>{top.name.split(" ")[0]}</b> alone has handled <b className="mono">{byPerson[top.id]}</b> — the next reassignment should route away from them.
            </span>
          </div>
        </div>
      )}

      {/* top stat row */}
      <div className="grid g-3">
        <Card title="Total NPTs · 30d">
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
        <Card title="Concentration">
          <Stat
            value={`${Math.round((byPerson[top.id] / total) * 100)}`}
            unit="% on top contributor"
            label=""
            delta={<><b>{top.name.split(" ")[0]}</b> · {byPerson[top.id]} of {total} tasks</>}
            deltaKind="up"
          />
        </Card>
      </div>

      {/* main split: distribution + side facts */}
      <div className="grid g-2-1">
        <Card title="NPT distribution by person"
              meta="Sorted · most to least"
              action={<Pill kind="ghost">stacked by category</Pill>}>
          <div className="bars">
            {sorted.map(p => (
              <StackedBar
                key={p.id}
                personId={p.id}
                breakdown={byPC[p.id] || {}}
                max={max}
                threshold={threshold}
              />
            ))}
          </div>
          <div className="axis">
            <div></div>
            <div className="axis-ticks"></div>
            <div></div>
          </div>
          <div className="divider"></div>
          <Legend />
        </Card>

        <div className="stack">
          <Card title="By category">
            <div className="stack" style={{ gap: 10 }}>
              {NPT_CATEGORIES.map(c => {
                const v = byCategory[c.id] || 0;
                const pct = (v / total) * 100;
                return (
                  <div key={c.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 8 }}>
                      <span style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 12.5, whiteSpace: "nowrap", minWidth: 0 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: CATEGORY_COLOR[c.id], flexShrink: 0 }} />
                        {c.label}
                      </span>
                      <span className="mono" style={{ fontSize: 11.5, color: "var(--c-mute)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {v} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="bar-track" style={{ height: 6 }}>
                      <div className="bar-seg" style={{
                        left: 0, width: `${pct}%`,
                        background: CATEGORY_COLOR[c.id],
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Outliers">
            <div className="stack" style={{ gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar id={top.id} size="lg" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{top.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--c-mute)" }}>Most assigned · {top.role}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{byPerson[top.id]}</div>
                  <Pill kind="signal">over</Pill>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar id={bottom.id} size="lg" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{bottom.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--c-mute)" }}>Least assigned · {bottom.role}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{byPerson[bottom.id] || 0}</div>
                  <Pill kind="good">next</Pill>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ledger */}
      <Card title="Recent assignments"
            meta={`${history.length} this window`}
            action={
              <span style={{ display: "flex", gap: 6 }}>
                <Pill kind="ghost">all</Pill>
              </span>
            }>
        <table className="tbl">
          <thead>
            <tr>
              <th>Task</th>
              <th>Category</th>
              <th>Assigned</th>
              <th>When</th>
              <th className="right">Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(t => {
              const cat = NPT_CATEGORIES.find(c => c.id === t.category);
              return (
                <tr key={t.id} className="hover-row">
                  <td>{t.title}</td>
                  <td>
                    <Pill color={CATEGORY_COLOR[t.category]}>{cat?.short}</Pill>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar id={t.person} size="sm" />
                      <span>{TEAM_BY_ID[t.person]?.name.split(" ")[0]}</span>
                    </div>
                  </td>
                  <td className="mono" style={{ color: "var(--c-mute)" }}>{relTime(t.days)}</td>
                  <td className="right">
                    {t.status === "done"
                      ? <Pill kind="good">done</Pill>
                      : <Pill kind="ghost">open</Pill>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

window.Dashboard = Dashboard;
