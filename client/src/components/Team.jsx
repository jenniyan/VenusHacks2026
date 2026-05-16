// team.jsx — team roster view

import { Avatar, Card, Legend, Pill } from "./UI";

function Team({ history, threshold }) {
  const { TEAM, NPT_CATEGORIES, CATEGORY_COLOR, loadByPerson, loadByPersonCategory } = window.LUMIN;
  const byPerson = loadByPerson(history);
  const byPC = loadByPersonCategory(history);
  const max = Math.max(...TEAM.map(p => byPerson[p.id] || 0), 1);

  return (
    <div className="stack">
      <div className="page-h">
        <div>
          <h1>Team</h1>
          <div className="sub">
            8 members · roster used for fair-rotation lookups. Each row shows the member's
            running NPT load and per-category breakdown for the active window.
          </div>
        </div>
        <div className="right-meta">
          <div>Members · <b>{TEAM.length}</b></div>
          <div>Rotation pool · <b>{TEAM.length - 1}</b></div>
          <div>Threshold · <b>≥ {threshold} flagged</b></div>
        </div>
      </div>

      <Card title="Roster"
            meta="sorted by current NPT load"
            action={
              <span style={{ display: "flex", gap: 6 }}>
                <Pill kind="ghost">add member</Pill>
                <Pill kind="ghost">export csv</Pill>
              </span>
            }>
        <table className="tbl">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>TZ</th>
              <th>Joined</th>
              <th className="right">NPTs · 30d</th>
              <th style={{ width: 240 }}>Breakdown</th>
              <th className="right">Status</th>
            </tr>
          </thead>
          <tbody>
            {[...TEAM].sort((a, b) => (byPerson[b.id] || 0) - (byPerson[a.id] || 0)).map(p => {
              const total = byPerson[p.id] || 0;
              const over = total >= threshold;
              const under = total <= 1;
              const br = byPC[p.id] || {};
              return (
                <tr key={p.id} className="hover-row">
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <Avatar id={p.id} size="lg" />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap" }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "var(--c-mute)" }} className="mono">{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.role}</td>
                  <td className="mono" style={{ color: "var(--c-mute)" }}>{p.tz}</td>
                  <td className="mono" style={{ color: "var(--c-mute)" }}>{p.joined}</td>
                  <td className="right num">{total}</td>
                  <td>
                    <div style={{ position: "relative", height: 14, background: "var(--c-panel-2)", border: "1px solid var(--c-line)", borderRadius: 2, overflow: "hidden" }}>
                      {(() => {
                        let left = 0;
                        const pctMax = total > 0 ? (total / max) * 100 : 0;
                        return NPT_CATEGORIES.map(c => {
                          const v = br[c.id] || 0;
                          if (v === 0 || total === 0) return null;
                          const segPct = (v / total) * pctMax;
                          const el = (
                            <div key={c.id} style={{
                              position: "absolute", top: 0, bottom: 0,
                              left: `${left}%`, width: `${segPct}%`,
                              background: CATEGORY_COLOR[c.id],
                            }} title={`${c.label}: ${v}`} />
                          );
                          left += segPct;
                          return el;
                        });
                      })()}
                    </div>
                  </td>
                  <td className="right">
                    {over && <Pill kind="signal">overloaded</Pill>}
                    {under && !over && <Pill kind="good">available</Pill>}
                    {!over && !under && <Pill kind="ghost">balanced</Pill>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="divider"></div>
        <Legend />
      </Card>

      <div className="grid g-2">
        <Card title="Rotation policy">
          <div style={{ fontSize: 13, color: "var(--c-ink-2)", lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 12px" }}>
              Lumin recommends the next assignee by minimizing total NPT load, breaking ties on
              per-category load. Managers are excluded from the rotation pool by default to avoid
              shifting glue work upward.
            </p>
            <div className="stack" style={{ gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="mono" style={{ color: "var(--c-mute)", fontSize: 11 }}>Threshold for "overloaded"</span>
                <span className="mono">≥ {threshold} tasks</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="mono" style={{ color: "var(--c-mute)", fontSize: 11 }}>Lookback window</span>
                <span className="mono">30 days</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="mono" style={{ color: "var(--c-mute)", fontSize: 11 }}>Manager excluded</span>
                <span className="mono">yes · Chris</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="mono" style={{ color: "var(--c-mute)", fontSize: 11 }}>Cooldown after assignment</span>
                <span className="mono">3 days</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Detection categories">
          <div className="grid g-2" style={{ gap: 10 }}>
            {NPT_CATEGORIES.map(c => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: 10,
                border: "1px solid var(--c-line)",
                borderRadius: "var(--r-sm)",
              }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLOR[c.id] }}></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{c.label}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

window.Team = Team;
