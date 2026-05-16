/* eslint-env browser */

import React, { useEffect, useMemo, useState } from "react";

import "./App.css";
import "./pages/data";
import "./pages/UI";
import "./pages/dashboard/Dashboard";
import "./pages/team/Team";

const {
  Dashboard,
  Team,
  useTweaks,
} = window;

const TWEAK_DEFAULTS = window.__TWEAK_DEFAULTS || {
  theme: "light",
  density: "regular",
  tone: "data",
  imbalanceThreshold: 6,
  useClaude: false,
};

window.__TWEAK_DEFAULTS = TWEAK_DEFAULTS;

function App() {
  const [tweaks] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState("dashboard");
  const [extraTasks] = useState([]);

  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks.theme, tweaks.density]);

  const history = useMemo(
    () => [...window.LUMIN.TASK_HISTORY, ...extraTasks],
    [extraTasks],
  );

  const { TEAM, gini, loadByPerson } = window.LUMIN;
  const byPerson = loadByPerson(history);
  const ginVal = gini(TEAM.map((person) => byPerson[person.id] || 0));
  const overloaded = TEAM.filter(
    (person) => (byPerson[person.id] || 0) >= tweaks.imbalanceThreshold,
  ).length;

  const nav = [
    { id: "dashboard", label: "Equity console", count: null },
    { id: "team", label: "Team", count: TEAM.length },
  ];

  return (
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
            <span>30d window</span>
          </div>
        </div>

        <div className="content">
          {route === "dashboard" && (
            <Dashboard history={history} threshold={tweaks.imbalanceThreshold} />
          )}
          {route === "team" && (
            <Team history={history} threshold={tweaks.imbalanceThreshold} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
