export default function Alert({ overloaded, threshold, top, byPerson }) {
  if (!overloaded || !top) return null;

  return (
    <div className="card" style={{ borderColor: "var(--warning)", background: "var(--warning-soft)", padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span className="pill" style={{ borderColor: "var(--warning)", background: "var(--warning-med)"}}>
          ⚠ Imbalance detected
        </span>
        <span style={{ fontSize: 13 }}>
          <b>{overloaded}</b> {overloaded === 1 ? "teammate is" : "teammates are"} carrying ≥ {threshold} NPTs this window. {" "}
          <b>{top.name.split(" ")[0]}</b> alone has handled <b className="mono">{byPerson[top.id]}</b>; the next reassignment should route away from them.
        </span>
      </div>
    </div>
  );
}
