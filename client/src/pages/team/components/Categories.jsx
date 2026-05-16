import { Card } from "../../UI";

export default function Categories({ NPT_CATEGORIES, CATEGORY_COLOR }) {
	return (
		<Card title="Detection categories">
			<div className="grid g-2" style={{ gap: 10 }}>
				{NPT_CATEGORIES.map((category) => (
					<div
						key={category.id}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 10,
							padding: 10,
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

