import { Card } from "../../UI";

export default function Categories({ NPT_CATEGORIES, CATEGORY_COLOR }) {
	return (
		<Card title="Detection categories" style={{ padding: 18 }}>
				<div className="grid g-2" style={{ gap: 8 }}>
				{NPT_CATEGORIES.map((category) => (
					<div
						key={category.id}
						style={{
								display: "flex",
								alignItems: "center",
								gap: 8,
								padding: 8,
								border: "1px solid var(--c-line)",
								borderRadius: "var(--r-sm)",
						}}
					>
						<span style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLOR[category.id] }} />
						<div style={{ minWidth: 0 }}>
							<div style={{ fontSize: 12.5, fontWeight: 500 }}>{category.label}</div>
						</div>
					</div>
				))}
			</div>
		</Card>
	);
}

