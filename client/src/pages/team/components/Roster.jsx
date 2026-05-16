import { Avatar, Card, Legend, Pill } from "../../UI";

export default function Roster({ TEAM, byPerson, byPC, NPT_CATEGORIES, CATEGORY_COLOR, threshold, max }) {
	return (
		<Card
			title="Roster"
			meta="sorted by current NPT load"
			action={
				<span style={{ display: "flex", gap: 6 }}>
					<Pill kind="ghost">add member</Pill>
					<Pill kind="ghost">export csv</Pill>
				</span>
			}
		>
			<table className="tbl">
				<thead>
					<tr>
						<th>Member</th>
						<th>Role</th>
						<th>TZ</th>
						<th>Joined</th>
						<th className="right">NPTs · 30d</th>
						<th style={{ width: 240 }}>Breakdown</th>
						<th className="right">Status</th>
					</tr>
				</thead>
				<tbody>
					{[...TEAM].sort((a, b) => (byPerson[b.id] || 0) - (byPerson[a.id] || 0)).map((person) => {
						const total = byPerson[person.id] || 0;
						const over = total >= threshold;
						const under = total <= 1;
						const breakdown = byPC[person.id] || {};

						return (
							<tr key={person.id} className="hover-row">
								<td>
									<div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
										<Avatar id={person.id} size="lg" />
										<div style={{ minWidth: 0 }}>
											<div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap" }}>{person.name}</div>
											<div style={{ fontSize: 11, color: "var(--c-mute)" }} className="mono">{person.id}</div>
										</div>
									</div>
								</td>
								<td>{person.role}</td>
								<td className="mono" style={{ color: "var(--c-mute)" }}>{person.tz}</td>
								<td className="mono" style={{ color: "var(--c-mute)" }}>{person.joined}</td>
								<td className="right num">{total}</td>
								<td>
									<div style={{ position: "relative", height: 14, background: "var(--c-panel-2)", border: "1px solid var(--c-line)", borderRadius: 2, overflow: "hidden" }}>
										{(() => {
											let left = 0;
											const pctMax = total > 0 ? (total / max) * 100 : 0;
											return NPT_CATEGORIES.map((category) => {
												const value = breakdown[category.id] || 0;
												if (value === 0 || total === 0) return null;
												const segPct = (value / total) * pctMax;
												const segment = (
													<div
														key={category.id}
														style={{
															position: "absolute",
															top: 0,
															bottom: 0,
															left: `${left}%`,
															width: `${segPct}%`,
															background: CATEGORY_COLOR[category.id],
														}}
														title={`${category.label}: ${value}`}
													/>
												);
												left += segPct;
												return segment;
											});
										})()}
									</div>
								</td>
								<td className="right">
									{over && <Pill kind="signal">overloaded</Pill>}
									{under && !over && <Pill kind="good">available</Pill>}
									{!over && !under && <Pill kind="ghost">balanced</Pill>}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			<div className="divider"></div>
			<Legend />
		</Card>
	);
}

