/* eslint-env browser */

import React, { useCallback, useEffect, useMemo, useState } from "react";

import "./App.css";
import {
  buildRuntimeLuminState,
  normalizeTask,
  normalizeTeamMember,
  LuminDataProvider,
} from "./pages/luminConfig";
import "./pages/UI";
import "./pages/dashboard/Dashboard";
import "./pages/team/Team";

const { Dashboard, Team } = window;
const THEME = "light";
const DENSITY = "regular";
const IMBALANCE_THRESHOLD = 6;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

function App() {
  const [route, setRoute] = useState("dashboard");
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loadState, setLoadState] = useState({ loading: true, error: null });

  useEffect(() => {
    document.documentElement.dataset.theme = THEME;
    document.documentElement.dataset.density = DENSITY;
  }, []);

  const loadBackendData = useCallback(async () => {
    try {
      setLoadState({ loading: true, error: null });

      const [teamResponse, tasksResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/team-members`),
        fetch(`${API_BASE_URL}/api/tasks/with-details`),
      ]);

      if (!teamResponse.ok) throw new Error(`Team members request failed with ${teamResponse.status}`);
      if (!tasksResponse.ok) throw new Error(`Tasks request failed with ${tasksResponse.status}`);

      const [teamData, taskData] = await Promise.all([
        teamResponse.json(),
        tasksResponse.json(),
      ]);

      setTeamMembers(Array.isArray(teamData) ? teamData.map(normalizeTeamMember) : []);
      setTasks(Array.isArray(taskData) ? taskData.map(normalizeTask) : []);
      setLoadState({ loading: false, error: null });
    } catch (error) {
      setTeamMembers([]);
      setTasks([]);
      setLoadState({ loading: false, error: error.message });
    }
  }, []);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  const runtimeTeam = useMemo(() => teamMembers.map((member, index) => ({
    ...member,
    tone: ((index % 8) + 1),
  })), [teamMembers]);

  const history = useMemo(() => tasks, [tasks]);
  const luminState = useMemo(
    () => buildRuntimeLuminState({ teamMembers: runtimeTeam, tasks: history }),
    [runtimeTeam, history],
  );

  const { TEAM, gini, loadByPerson } = luminState;
  const byPerson = loadByPerson(history);
  const ginVal = gini(TEAM.map((person) => byPerson[person.id] || 0));
  const overloaded = TEAM.filter(
    (person) => (byPerson[person.id] || 0) >= IMBALANCE_THRESHOLD,
  ).length;

  const nav = [
    { id: "dashboard", label: "Equity console", count: null },
    { id: "team", label: "Team", count: TEAM.length },
  ];

  return (
    <LuminDataProvider value={luminState}>
      <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <div className="brand-mark">lumin</div>
            <div className="brand-tag">equity console</div>
          </div>
        </div>

        <div className="nav-section">Workspace</div>
        <div className="nav">
          {nav.map((item) => (
            <div
              key={item.id}
              className="nav-item"
              data-active={route === item.id}
              onClick={() => setRoute(item.id)}
            >
              <span className="nav-dot" />
              {item.label}
              {item.count != null && <span className="nav-count">{item.count}</span>}
            </div>
          ))}
        </div>

        <div className="nav-section">Signals</div>
        <div className="nav">
          <div className="nav-item">
            <span className="nav-dot" style={{ background: "var(--c-signal)" }} />
            Imbalance
            <span className="nav-count">{overloaded}</span>
          </div>
          <div className="nav-item">
            <span className="nav-dot" style={{ background: "var(--c-good)" }} />
            Available
            <span className="nav-count">
              {TEAM.filter((person) => (byPerson[person.id] || 0) <= 1).length}
            </span>
          </div>
          <div className="nav-item">
            <span className="nav-dot" />
            Gini index
            <span className="nav-count mono">{ginVal.toFixed(2)}</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="crumbs">
            lumin / {nav.find((item) => item.id === route)?.label}
          </div>
          <div className="topbar-right">
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{loadState.loading ? "loading backend" : loadState.error ? "backend error" : "30d window"}</span>
          </div>
        </div>

        <div className="content">
          {route === "dashboard" && (
            <Dashboard history={history} threshold={IMBALANCE_THRESHOLD} onUpdate={loadBackendData} />
          )}
          {route === "team" && (
            <Team history={history} threshold={IMBALANCE_THRESHOLD} />
          )}
          {loadState.error && (
            <div className="card" style={{ borderColor: "var(--c-signal)", marginTop: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 6 }}>Backend data unavailable</div>
              <div style={{ color: "var(--c-mute)", fontSize: 13 }}>{loadState.error}</div>
            </div>
          )}
        </div>
      </main>
      </div>
    </LuminDataProvider>
  );
}

export default App;
