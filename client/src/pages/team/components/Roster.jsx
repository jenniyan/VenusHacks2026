import { Avatar, Card, Legend, Pill } from "../../UI";
import { useMemo, useState } from "react";

export default function Roster({ TEAM, byPerson, byPC, NPT_CATEGORIES, CATEGORY_COLOR, threshold, max }) {
	const [sortDir, setSortDir] = useState("desc");
	const sortedTeam = useMemo(
		() =>
			[...TEAM].sort((a, b) => {
				const diff = (byPerson[a.id] || 0) - (byPerson[b.id] || 0);
				if (diff !== 0) return sortDir === "asc" ? diff : -diff;
				return a.name.localeCompare(b.name);
			}),
		[TEAM, byPerson, sortDir],
	);
	const sortLabel = sortDir === "desc" ? "most to least NPTs" : "least to most NPTs";
	const reportRows = useMemo(
		() =>
			sortedTeam.map((person) => {
				const total = byPerson[person.id] || 0;
				const breakdown = byPC[person.id] || {};
				return {
					person,
					total,
					breakdown,
					status: getStatus(total, threshold),
				};
			}),
		[byPC, byPerson, sortedTeam, threshold],
	);

	function handleExportCsv() {
		const csv = buildRosterCsv(reportRows, NPT_CATEGORIES);
		const date = new Date().toISOString().slice(0, 10);
		downloadCsv(csv, `lumin-npt-roster-report-${date}.csv`);
	}

	return (
		<Card
			title="Roster"
			meta={""}
			action={
				<span className="roster-actions">
					<SortToggle sortDir={sortDir} onChange={setSortDir} />
					<button type="button" className="export-csv-btn" onClick={handleExportCsv}>
						<span className="export-csv-icon" aria-hidden="true">↓</span>
						<span>Export CSV</span>
					</button>
				</span>
			}
		>
			<table className="tbl">
				<thead>
					<tr>
						<th>Member</th>
						<th>Role</th>
						<th className="right">NPTs</th>
						<th style={{ width: 240 }}>Breakdown</th>
						<th className="right">Status</th>
					</tr>
				</thead>
				<tbody>
					{sortedTeam.map((person) => {
						const total = byPerson[person.id] || 0;
						const status = getStatus(total, threshold);
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
														className="bar-seg"
														data-tooltip={`${category.label}: ${value}`}
														tabIndex={0}
														style={{
															position: "absolute",
															top: 0,
															bottom: 0,
															left: `${left}%`,
															width: `${segPct}%`,
															background: CATEGORY_COLOR[category.id],
														}}
														aria-label={`${category.label}: ${value} NPT${value === 1 ? "" : "s"}`}
													/>
												);
												left += segPct;
												return segment;
											});
										})()}
									</div>
								</td>
								<td className="right">
									{status === "overloaded" && <span className="pill" style={{ borderColor: "var(--warning)", background: "var(--warning-soft)", padding: "4px 8px" }}>overloaded</span>}
									{status === "available" && <Pill kind="good">available</Pill>}
									{status === "balanced" && <Pill kind="ghost">balanced</Pill>}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			{/* <div className="divider"></div>
			<Legend /> */}
		</Card>
	);
}

function getStatus(total, threshold) {
	if (total >= threshold) return "overloaded";
	if (total <= 1) return "available";
	return "balanced";
}

function buildRosterCsv(rows, categories) {
	const headers = [
		"Member",
		"Member ID",
		"Role",
		"Total NPTs",
		"Status",
		...categories.map((category) => category.label),
		"Top NPT Category",
		"Top NPT Category Count",
	];

	const body = rows.map(({ person, total, breakdown, status }) => {
		const [topCategoryId, topCategoryCount = 0] =
			Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0] || [];
		const topCategory = categories.find((category) => category.id === topCategoryId);

		return [
			person.name,
			person.id,
			person.role || "",
			total,
			status,
			...categories.map((category) => breakdown[category.id] || 0),
			topCategory?.label || "",
			topCategoryCount || 0,
		];
	});

	return [headers, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value) {
	const text = String(value ?? "");
	if (/[",\n]/.test(text)) {
		return `"${text.replace(/"/g, '""')}"`;
	}
	return text;
}

function downloadCsv(csv, filename) {
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");

	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function SortToggle({ sortDir, onChange }) {
	return (
		<div className="sort-toggle" aria-label="Sort roster by NPT load">
			<button
				type="button"
				data-active={sortDir === "desc"}
				onClick={() => onChange("desc")}
			>
				Most
			</button>
			<button
				type="button"
				data-active={sortDir === "asc"}
				onClick={() => onChange("asc")}
			>
				Least
			</button>
		</div>
	);
}
