import { Avatar, Card, Pill } from "../UI";

export default function Outliers({ top, bottom, byPerson }) {
	if (!top || !bottom) return null;

	return (
		<Card title="Outliers">
			<div className="stack" style={{ gap: 12 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<Avatar id={top.id} size="lg" />
					<div style={{ flex: 1 }}>
						<div style={{ fontSize: 13.5, fontWeight: 500 }}>{top.name}</div>
						<div style={{ fontSize: 11.5, color: "var(--c-mute)" }}>Most assigned · {top.role}</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{byPerson[top.id]}</div>
						<Pill kind="signal">over</Pill>
					</div>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<Avatar id={bottom.id} size="lg" />
					<div style={{ flex: 1 }}>
						<div style={{ fontSize: 13.5, fontWeight: 500 }}>{bottom.name}</div>
						<div style={{ fontSize: 11.5, color: "var(--c-mute)" }}>Least assigned · {bottom.role}</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{byPerson[bottom.id] || 0}</div>
						<Pill kind="good">next</Pill>
					</div>
				</div>
			</div>
		</Card>
	);
}

