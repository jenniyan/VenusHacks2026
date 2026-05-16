import { Card, Pill, Avatar, TEAM_BY_ID, relTime } from "../../UI";

export default function Assignments({ history, NPT_CATEGORIES, CATEGORY_COLOR }) {
	const recent = [...history].sort((a, b) => a.days - b.days).slice(0, 12);

	return (
		<Card
			title="Recent assignments"
			meta={`${history.length} this window`}
			action={
				<span style={{ display: "flex", gap: 6 }}>
					<Pill kind="ghost">all</Pill>
				</span>
			}
		>
			<table className="tbl">
				<thead>
					<tr>
						<th>Task</th>
						<th>Category</th>
						<th>Assigned</th>
						<th>When</th>
					</tr>
				</thead>
				<tbody>
					{recent.map((task) => {
						const category = NPT_CATEGORIES.find((c) => c.id === task.category);
						return (
							<tr key={task.id} className="hover-row">
								<td>{task.title}</td>
								<td>
									<Pill color={CATEGORY_COLOR[task.category]}>{category?.short}</Pill>
								</td>
								<td>
									<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
										<Avatar id={task.person} size="sm" />
										<span>{TEAM_BY_ID[task.person]?.name.split(" ")[0]}</span>
									</div>
								</td>
								<td className="mono" style={{ color: "var(--c-mute)" }}>{relTime(task.days)}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</Card>
	);
}

