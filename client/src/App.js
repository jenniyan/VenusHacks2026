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
const DEFAULT_POLICY = {
  overloadThreshold: 6,
  lookbackDays: 30,
  excludeManagers: true,
};
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";
const TIME_WINDOWS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: "all", label: "All time" },
];

function App() {
  const [route, setRoute] = useState("dashboard");
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [loadState, setLoadState] = useState({ loading: true, error: null });
  const [timeWindow, setTimeWindow] = useState(30);

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

  const history = useMemo(
    () => tasks.filter((task) => (task.days ?? 0) <= policy.lookbackDays),
    [tasks, policy.lookbackDays],
  );
  const visibleHistory = useMemo(() => {
    if (timeWindow === "all") return history;
    return history.filter((task) => (task.days ?? 0) <= timeWindow);
  }, [history, timeWindow]);
  const luminState = useMemo(
    () => buildRuntimeLuminState({ teamMembers: runtimeTeam, tasks: visibleHistory }),
    [runtimeTeam, visibleHistory],
  );

  const { TEAM, gini, loadByPerson } = luminState;
  const byPerson = loadByPerson(visibleHistory);
  const ginVal = gini(TEAM.map((person) => byPerson[person.id] || 0));
  const overloaded = TEAM.filter(
    (person) => (byPerson[person.id] || 0) >= policy.overloadThreshold,
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
        <div className="nav signals-nav">
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
        {route === "dashboard" && (
          <div className="window-toolbar">
            <div>
              <div className="window-label">
                {loadState.loading ? "Loading backend" : "Time window"}
              </div>
            </div>
            <select
              className="window-select"
              value={timeWindow}
              onChange={(event) => {
                const value = event.target.value === "all" ? "all" : Number(event.target.value);
                setTimeWindow(value);
              }}
              disabled={loadState.loading || Boolean(loadState.error)}
            >
              {TIME_WINDOWS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="content">
          {route === "dashboard" && (
            <Dashboard
              history={visibleHistory}
              threshold={policy.overloadThreshold}
              onUpdate={loadBackendData}
              timeWindow={timeWindow}
            />
          )}
          {route === "team" && (
            <Team
              history={history}
              threshold={policy.overloadThreshold}
              policy={policy}
              onPolicyChange={setPolicy}
            />
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
