import { Card, Legend, Pill, StackedBar } from "../UI";

export default function Distribution({ sorted, byPC, max, threshold }) {
	return (
		<Card
			title="NPT distribution by person"
			meta="Sorted · most to least"
			action={<Pill kind="ghost">stacked by category</Pill>}
		>
			<div className="bars">
				{sorted.map((person) => (
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
			<div className="divider" />
			<Legend />
		</Card>
	);
}

