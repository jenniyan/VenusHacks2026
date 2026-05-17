import { Avatar, Card, Pill } from "../../UI";
import { useLuminData } from "../../luminConfig";

export default function Outliers({ top, bottom, byPerson }) {
	const { TEAM_BY_ID = {} } = useLuminData();

	if (!top || !bottom) return null;

	const topMember = TEAM_BY_ID[top.id] || top;
	const bottomMember = TEAM_BY_ID[bottom.id] || bottom;

	return (
		<Card title="Outliers">
			<div className="stack" style={{ gap: 12 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<Avatar id={top.id} size="lg" />
					<div style={{ flex: 1 }}>
						<div style={{ fontSize: 13.5, fontWeight: 500 }}>{topMember.name}</div>
						<div style={{ fontSize: 11.5, color: "var(--c-mute)" }}>Most assigned · {topMember.role}</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{byPerson[top.id]}</div>
						<Pill kind="signal">over</Pill>
					</div>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<Avatar id={bottom.id} size="lg" />
					<div style={{ flex: 1 }}>
						<div style={{ fontSize: 13.5, fontWeight: 500 }}>{bottomMember.name}</div>
						<div style={{ fontSize: 11.5, color: "var(--c-mute)" }}>Least assigned · {bottomMember.role}</div>
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

