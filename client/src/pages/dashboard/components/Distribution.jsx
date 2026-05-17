import { Card, Pill, StackedBar } from "../../UI";
import { useMemo, useState } from "react";

export default function Distribution({ sorted, byPerson, byPC, max, threshold }) {
	const [sortDir, setSortDir] = useState("desc");
	const sortedPeople = useMemo(
		() =>
			[...sorted].sort((a, b) => {
				const diff = (byPerson[a.id] || 0) - (byPerson[b.id] || 0);
				if (diff !== 0) return sortDir === "asc" ? diff : -diff;
				return a.name.localeCompare(b.name);
			}),
		[byPerson, sortDir, sorted],
	);
	const sortLabel = sortDir === "desc" ? "most to least" : "least to most";

	return (
		<Card
			title="NPT distribution by person"
			meta={""}
			action={
				<span style={{ display: "flex", gap: 6, alignItems: "center" }}>
					<SortToggle sortDir={sortDir} onChange={setSortDir} />
				</span>
			}
		>
			<div className="bars">
				{sortedPeople.map((person) => (
					<StackedBar
						key={person.id}
						personId={person.id}
						breakdown={byPC[person.id] || {}}
						max={max}
						threshold={threshold}
					/>
				))}
			</div>
			<div className="axis">
				<div />
				<div className="axis-ticks" />
				<div />
			</div>
		</Card>
	);
}

function SortToggle({ sortDir, onChange }) {
	return (
		<div className="sort-toggle" aria-label="Sort NPT load">
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
