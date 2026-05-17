import { Card, Pill, Avatar, relTime } from "../../UI";
import { useLuminData } from "../../luminConfig";
import { useMemo, useState } from "react";

function getDaysAgo(createdAt) {
  const ts = Date.parse(createdAt);
  if (Number.isNaN(ts)) return 0;
  return Math.max(0, Math.floor((Date.now() - ts) / 86400000));
}

export default function Assignments({ history, byPerson, NPT_CATEGORIES, CATEGORY_COLOR }) {
  const { TEAM_BY_ID = {} } = useLuminData();
  const [sortDir, setSortDir] = useState("desc");

  const recent = useMemo(
    () =>
      [...history]
        .sort((a, b) => {
          const diff = (byPerson[a.person] || 0) - (byPerson[b.person] || 0);
          if (diff !== 0) return sortDir === "asc" ? diff : -diff;
          return getDaysAgo(a.created_at) - getDaysAgo(b.created_at);
        })
        .slice(0, 12),
    [byPerson, history, sortDir],
  );

  return (
    <Card
      title="Recent assignments"
      meta={`${history.length} this window`}
      action={
        <button
          className="pill ghost"
          onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
          style={{ fontSize: 12 }}
        >
          {sortDir === "desc" ? "Sort by least loaded" : "Sort by most loaded"}
        </button>
      }
    >
      <table className="tbl">
        <thead>
          <tr>
            <th>Task</th>
            <th>Category</th>
            <th>Assigned</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((task) => {
            const category = NPT_CATEGORIES.find((c) => c.id === task.category);
            return (
              <tr key={task.id} className="hover-row">
                <td>{task.title}</td>
                <td>
                  <Pill color={CATEGORY_COLOR[task.category]}>{category?.short}</Pill>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar id={task.person} size="sm" />
                    <span>{TEAM_BY_ID[task.person]?.name?.split(" ")[0]}</span>
                  </div>
                </td>
                <td className="mono" style={{ color: "var(--c-mute)" }}>
                  {relTime(getDaysAgo(task.created_at))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

