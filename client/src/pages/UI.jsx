// ui.jsx — shared primitives

import React from "react";
import { useLuminData } from "./luminConfig";

function initials(name) {
  return name.split(/\s+/).map(s => s[0]).slice(0, 2).join("");
}

export function Avatar({ id, size }) {
  const { TEAM_BY_ID = {} } = useLuminData();
  const p = TEAM_BY_ID[id];
  if (!p) return <span className={`av ${size || ""}`}>?</span>;
  return (
    <span className={`av ${size || ""}`} data-tone={p.tone} title={p.name}>
      {initials(p.name)}
    </span>
  );
}

export function PersonChip({ id }) {
  const { TEAM_BY_ID = {} } = useLuminData();
  const p = TEAM_BY_ID[id];
  if (!p) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Avatar id={id} size="sm" />
      <span style={{ fontSize: 12.5 }}>{p.name.split(" ")[0]}</span>
    </span>
  );
}

export function Card({ title, meta, children, style, action }) {
  return (
    <div className="card" style={style}>
      {(title || meta || action) && (
        <div className="card-h">
          <div className="card-title">{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {meta && <div className="card-meta">{meta}</div>}
            {action}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

export function Pill({ kind, children, color }) {
  const cls = "pill" + (kind ? ` ${kind}` : "");
  return (
    <span className={cls}>
      {color && <span className="swatch" style={{ background: color }} />}
      {children}
    </span>
  );
}

export function Stat({ value, unit, label, delta, deltaKind, sparkData }) {
  const cls = "delta" + (deltaKind ? ` ${deltaKind}` : "");
  return (
    <div className="stat">
      <div className="card-title" style={{ marginBottom: 14 }}>{label}</div>
      <div>
        <span className="val">{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {sparkData && <Sparkline values={sparkData} />}
      {delta && <div className={cls}>{delta}</div>}
    </div>
  );
}

// Sparkline — simple SVG line
export function Sparkline({ values, height = 26 }) {
  const w = 200, h = height;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = (max - min) || 1;
  const step = w / (values.length - 1 || 1);
  const pts = values.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2]);
  const d = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const area = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
         style={{ marginTop: 10 }}>
      <path d={area} fill="var(--c-signal-soft)" />
      <path d={d} fill="none" stroke="var(--c-signal)" strokeWidth="1.4" />
    </svg>
  );
}

// Horizontal stacked bar — segments by category
export function StackedBar({ personId, breakdown, max, showLabel = true, threshold }) {
  const { NPT_CATEGORIES = [], CATEGORY_COLOR = {}, TEAM_BY_ID = {} } = useLuminData();
  const teamMember = TEAM_BY_ID[personId];
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const pctMax = (total / max) * 100;
  const over = threshold != null && total >= threshold;
  const under = threshold != null && total <= 1;

  return (
    <div className="bar-row" data-over={over} data-under={under}>
      <div className="who" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Avatar id={personId} size="sm" />
        <span>{teamMember?.name?.split(" ")[0]}</span>
      </div>
      <div className="bar-track">
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 0,
          width: `${pctMax}%`, display: "flex",
        }}>
          {NPT_CATEGORIES.map(cat => {
            const v = breakdown[cat.id] || 0;
            if (v === 0 || total === 0) return null;
            const segPct = (v / total) * 100;
            return (
              <div
                key={cat.id}
                className="bar-seg"
                data-tooltip={`${cat.label}: ${v}`}
                tabIndex={0}
                style={{
                  width: `${segPct}%`,
                  height: "100%",
                  backgroundColor: CATEGORY_COLOR[cat.id],
                  cursor: "pointer",
                  position: "relative",
                }}
                aria-label={`${cat.label}: ${v} NPT${v === 1 ? "" : "s"}`}
              />
            );
          })}
        </div>
        {total === 0 && (
          <span style={{
            position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
            fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--c-good)",
            letterSpacing: ".08em", textTransform: "uppercase",
          }}>available</span>
        )}
      </div>
      
      <div className="num">{total}</div>
    </div>
  );
}

export function Legend() {
  const { NPT_CATEGORIES = [], CATEGORY_COLOR = {} } = useLuminData();

  return (
    <div className="legend">
      {NPT_CATEGORIES.map(c => (
        <span key={c.id} className="legend-i">
          <span className="sw" style={{ background: CATEGORY_COLOR[c.id] }} />
          {c.label}
        </span>
      ))}
    </div>
  );
}

export function Btn({ kind, onClick, children, kbd }) {
  return (
    <button className={`btn ${kind || ""}`} onClick={onClick}>
      {children}
      {kbd && <span className="kbd">{kbd}</span>}
    </button>
  );
}

// timestamp helpers
export function relTime(daysAgo) {
  if (daysAgo === 0) return "today";
  if (daysAgo === 1) return "yesterday";
  if (daysAgo < 7) return `${daysAgo}d ago`;
  if (daysAgo < 30) return `${Math.round(daysAgo / 7)}w ago`;
  return `${Math.round(daysAgo / 30)}mo ago`;
}

export function fmtTime(daysAgo) {
  // mock chat timestamps like "10:42"
  const m = Math.abs((daysAgo * 13 + 7) % 50) + 10;
  const h = Math.abs((daysAgo * 5 + 9) % 8) + 9;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

Object.assign(window, {
  initials,
  Avatar, PersonChip, Card, Pill, Stat, Sparkline, StackedBar, Legend, Btn,
  relTime, fmtTime,
});
