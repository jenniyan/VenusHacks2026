// team.jsx — team roster view

import { useLuminData } from "../luminConfig";
import Categories from "./components/Categories";
import Policy from "./components/Policy";
import Roster from "./components/Roster";

function Team({ history, threshold, policy, onPolicyChange }) {
  const {
    TEAM = [],
    NPT_CATEGORIES = [],
    CATEGORY_COLOR = {},
    loadByPerson,
    loadByPersonCategory,
  } = useLuminData();
  const byPerson = loadByPerson(history);
  const byPC = loadByPersonCategory(history);
  const max = Math.max(...TEAM.map(p => byPerson[p.id] || 0), 1);

  return (
    <div className="stack">
      <div className="page-h">
        <div>
          <h1>Team <span style={{ color: "var(--c-mute)", fontSize: 28 }}>({TEAM.length} members)</span></h1>
        </div>
      </div>

      

      <div className="grid g-2">
        <Policy policy={policy} onPolicyChange={onPolicyChange} />
        <Categories NPT_CATEGORIES={NPT_CATEGORIES} CATEGORY_COLOR={CATEGORY_COLOR} />
      </div>

      <Roster TEAM={TEAM} byPerson={byPerson} byPC={byPC} NPT_CATEGORIES={NPT_CATEGORIES} CATEGORY_COLOR={CATEGORY_COLOR} threshold={threshold} max={max} />
    </div>
  );
}

window.Team = Team;
