import { Card } from "../../UI";

export default function Policy({ threshold }) {
	return (
		<Card title="Rotation policy">
			<div style={{ fontSize: 13, color: "var(--c-ink-2)", lineHeight: 1.6 }}>
				<p style={{ margin: "0 0 12px" }}>
					Lumin recommends the next assignee by minimizing total NPT load, breaking ties on
					per-category load. Managers are excluded from the rotation pool by default to avoid
					shifting glue work upward.
				</p>
				<div className="stack" style={{ gap: 6 }}>
					<div style={{ display: "flex", justifyContent: "space-between" }}>
						<span className="mono" style={{ color: "var(--c-mute)", fontSize: 11 }}>Threshold for "overloaded"</span>
						<span className="mono">≥ {threshold} tasks</span>
					</div>
					<div style={{ display: "flex", justifyContent: "space-between" }}>
						<span className="mono" style={{ color: "var(--c-mute)", fontSize: 11 }}>Lookback window</span>
						<span className="mono">30 days</span>
					</div>
					<div style={{ display: "flex", justifyContent: "space-between" }}>
						<span className="mono" style={{ color: "var(--c-mute)", fontSize: 11 }}>Manager excluded</span>
						<span className="mono">yes · Chris</span>
					</div>
					<div style={{ display: "flex", justifyContent: "space-between" }}>
						<span className="mono" style={{ color: "var(--c-mute)", fontSize: 11 }}>Cooldown after assignment</span>
						<span className="mono">3 days</span>
					</div>
				</div>
			</div>
		</Card>
	);
}

