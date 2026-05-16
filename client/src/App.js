/* eslint-env browser */

import React, { useEffect, useMemo, useState } from "react";

import "./App.css";
import "./components/data";
import "./components/UI";
import "./components/Tweaks";
import "./components/Dashboard";
import "./components/Team";

const {
  Dashboard,
  Team,
  TweaksPanel,
  TweakSection,
  TweakRadio,
  TweakSelect,
  TweakSlider,
  TweakToggle,
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
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState("dashboard");
  const [extraTasks, setExtraTasks] = useState([]);

  useEffect(() => {
    document.documentElement.dataset.theme = t.theme;
    document.documentElement.dataset.density = t.density;
  }, [t.theme, t.density]);

  const history = useMemo(
    () => [...window.LUMIN.TASK_HISTORY, ...extraTasks],
    [extraTasks],
  );

  const { TEAM, gini, loadByPerson } = window.LUMIN;
  const byPerson = loadByPerson(history);
  const ginVal = gini(TEAM.map((person) => byPerson[person.id] || 0));
  const openCount = history.filter((task) => task.status === "open").length;
  const overloaded = TEAM.filter(
    (person) => (byPerson[person.id] || 0) >= t.imbalanceThreshold,
  ).length;

  function handleAssign(task) {
    setExtraTasks((prev) => [
      ...prev,
      { ...task, id: `x${prev.length + 1}` },
    ]);
  }

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

        <div className="sidebar-foot">
          <div style={{ marginBottom: 6 }}>v0.4.2 · hackathon build</div>
          <div>Eng / Platform</div>
          <div>{window.LUMIN.TEAM.length} members · 30d window</div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="crumbs">
            lumin / <b>eng-platform</b> / {nav.find((item) => item.id === route)?.label}
          </div>
          <div className="topbar-right">
            <span className="live-dot" />
            Live · {t.useClaude ? "Claude classifier" : "Keyword fallback"}
            <span style={{ opacity: 0.5 }}>·</span>
            <span>30d window</span>
          </div>
        </div>

        <div className="content">
          {route === "dashboard" && (
            <Dashboard history={history} threshold={t.imbalanceThreshold} />
          )}
          {route === "team" && (
            <Team history={history} threshold={t.imbalanceThreshold} />
          )}
        </div>
      </main>

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakRadio
          label="Surface"
          value={t.theme}
          options={["light", "dark", "terminal"]}
          onChange={(value) => setTweak("theme", value)}
        />
        <TweakRadio
          label="Density"
          value={t.density}
          options={["compact", "regular"]}
          onChange={(value) => setTweak("density", value)}
        />

        <TweakSection label="Lumin voice" />
        <TweakSelect
          label="Tone of detection"
          value={t.tone}
          options={[
            { value: "data", label: "Data-driven" },
            { value: "direct", label: "Direct" },
            { value: "coach", label: "Coaching" },
          ]}
          onChange={(value) => setTweak("tone", value)}
        />

        <TweakSection label="Policy" />
        <TweakSlider
          label="Imbalance threshold"
          value={t.imbalanceThreshold}
          min={3}
          max={10}
          step={1}
          unit=" tasks"
          onChange={(value) => setTweak("imbalanceThreshold", value)}
        />

        <TweakSection label="Classifier" />
        <TweakToggle
          label="Use Claude for classification"
          value={t.useClaude}
          onChange={(value) => setTweak("useClaude", value)}
        />
      </TweaksPanel>
    </div>
  );
}

export default App;
