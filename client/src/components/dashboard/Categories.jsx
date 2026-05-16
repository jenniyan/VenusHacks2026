import { Card } from "../UI";

export default function Categories({ byCategory, total, NPT_CATEGORIES, CATEGORY_COLOR }) {
	return (
		<Card title="By category">
			<div className="stack" style={{ gap: 10 }}>
				{NPT_CATEGORIES.map((category) => {
					const value = byCategory[category.id] || 0;
					const pct = total > 0 ? (value / total) * 100 : 0;

					return (
						<div key={category.id}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 8 }}>
								<span style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 12.5, whiteSpace: "nowrap", minWidth: 0 }}>
									<span style={{ width: 9, height: 9, borderRadius: 2, background: CATEGORY_COLOR[category.id], flexShrink: 0 }} />
									{category.label}
								</span>
								<span className="mono" style={{ fontSize: 11.5, color: "var(--c-mute)", whiteSpace: "nowrap", flexShrink: 0 }}>
									{value} · {pct.toFixed(0)}%
								</span>
							</div>
							<div className="bar-track" style={{ height: 6 }}>
								<div
									className="bar-seg"
									style={{
										left: 0,
										width: `${pct}%`,
										background: CATEGORY_COLOR[category.id],
									}}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</Card>
	);
}

