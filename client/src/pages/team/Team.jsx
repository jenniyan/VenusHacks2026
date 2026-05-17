// team.jsx — team roster view

import { useLuminData } from "../luminConfig";
import Categories from "./components/Categories";
import Policy from "./components/Policy";
import Roster from "./components/Roster";

function Team({ history, threshold, selectedWindow = "30d" }) {
  const {
    TEAM = [],
    NPT_CATEGORIES = [],
    CATEGORY_COLOR = {},
    loadByPerson,
    loadByPersonCategory,
  } = useLuminData();
  const windowMap = { "1d": 1, "7d": 7, "14d": 14, "30d": 30, "90d": 90 };
  const filteredHistory = selectedWindow === "all"
    ? history
    : history.filter((t) => (typeof t.days === "number" ? t.days <= (windowMap[selectedWindow] || 30) : true));

  const byPerson = loadByPerson(filteredHistory);
  const byPC = loadByPersonCategory(filteredHistory);
  const max = Math.max(...TEAM.map(p => byPerson[p.id] || 0), 1);

  return (
    <div className="stack">
      <div className="page-h">
        <div>
          <h1>Team</h1>
          <div className="sub">
            {TEAM.length} members · roster used for fair-rotation lookups. Each row shows the member's
            running NPT load and per-category breakdown for the active window ({selectedWindow === "all" ? "all time" : selectedWindow}).
          </div>
        </div>
      </div>

      

      <div className="grid g-2">
        <Policy threshold={threshold} />
        <Categories NPT_CATEGORIES={NPT_CATEGORIES} CATEGORY_COLOR={CATEGORY_COLOR} />
      </div>

      <Roster TEAM={TEAM} byPerson={byPerson} byPC={byPC} NPT_CATEGORIES={NPT_CATEGORIES} CATEGORY_COLOR={CATEGORY_COLOR} threshold={threshold} max={max} />
    </div>
  );
}

window.Team = Team;
