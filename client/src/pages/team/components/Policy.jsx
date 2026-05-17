import { Card } from "../../UI";
import { useLuminData } from "../../luminConfig";

function clampNumber(value, min, max) {
	const parsed = Number(value);
	if (Number.isNaN(parsed)) return min;
	return Math.min(max, Math.max(min, parsed));
}

export default function Policy({ policy, onPolicyChange }) {
	const { TEAM = [] } = useLuminData();
	const managers = TEAM.filter((person) => /manager|lead/i.test(person.role || ""));
	const managerNames = managers.map((person) => person.name).join(", ");

	const updatePolicy = (patch) => {
		onPolicyChange((current) => ({ ...current, ...patch }));
	};

	return (
		<Card
			title="Assignment rules"
			meta="editable"
		>
			<div className="policy-card">
				<p>
					Lumin recommends the next assignee by minimizing total NPT load, then breaking ties
					with per-category load. These settings control how the dashboard flags imbalance.
				</p>

				<label className="policy-field">
					<span>
						<span className="policy-label">Overload threshold</span>
						<span className="policy-help">Flag a teammate after this many NPTs.</span>
					</span>
					<span className="policy-control">
						<span className="policy-prefix">≥</span>
						<input
							type="number"
							min="1"
							max="99"
							value={policy.overloadThreshold}
							onChange={(event) => updatePolicy({
								overloadThreshold: clampNumber(event.target.value, 1, 99),
							})}
							aria-label="Overload threshold"
						/>
						<span className="policy-unit">tasks</span>
					</span>
				</label>

				<label className="policy-field">
					<span>
						<span className="policy-label">Lookback window</span>
						<span className="policy-help">Only count tasks from this many recent days.</span>
					</span>
					<span className="policy-control">
						<input
							type="number"
							min="1"
							max="365"
							value={policy.lookbackDays}
							onChange={(event) => updatePolicy({
								lookbackDays: clampNumber(event.target.value, 1, 365),
							})}
							aria-label="Lookback window"
						/>
						<span className="policy-unit">days</span>
					</span>
				</label>

				<label className="policy-field policy-toggle-field">
					<span>
						<span className="policy-label">Exclude managers from suggestions</span>
						<span className="policy-help">
							{policy.excludeManagers
								? managers.length ? `Currently excluding ${managerNames}.` : "No managers detected in this roster."
								: "Managers can be included in the rotation pool."}
						</span>
					</span>
					<input
						className="policy-toggle"
						type="checkbox"
						checked={policy.excludeManagers}
						onChange={(event) => updatePolicy({ excludeManagers: event.target.checked })}
						aria-label="Exclude managers from suggestions"
					/>
				</label>
			</div>
		</Card>
	);
}
