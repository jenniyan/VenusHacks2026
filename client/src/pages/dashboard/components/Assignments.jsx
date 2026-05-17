import { Card, Pill, Avatar, relTime } from "../../UI"; // Pill still used for status column
import { useLuminData } from "../../luminConfig";
import { useEffect, useRef, useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";
const PAGE_SIZE = 10;

export default function Assignments({ history, NPT_CATEGORIES, CATEGORY_COLOR, onUpdate }) {
	const { TEAM_BY_ID = {} } = useLuminData();
	const [filter, setFilter] = useState("all");
	const [page, setPage] = useState(0);
	const [openMenuId, setOpenMenuId] = useState(null);

	const filtered = [...history]
		.sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity))
		.filter((task) => {
			if (filter === "completed") return task.completed === true;
			if (filter === "pending") return task.completed !== true;
			return true;
		});

	const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
	const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

	function handleFilterChange(val) {
		setFilter(val);
		setPage(0);
		setOpenMenuId(null);
	}

	async function handleComplete(taskId) {
		await fetch(`${API_BASE_URL}/api/tasks/${taskId}/complete`, { method: "PATCH" });
		setOpenMenuId(null);
		onUpdate?.();
	}

	async function handleDelete(taskId) {
		await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, { method: "DELETE" });
		setOpenMenuId(null);
		onUpdate?.();
	}

	return (
		<Card
			title="Recent assignments"
			meta={`${history.length} this window`}
			action={
				<span style={{ display: "flex", gap: 6 }}>
					{["all", "pending", "completed"].map((f) => (
						<button
							key={f}
							onClick={() => handleFilterChange(f)}
							style={{
								padding: "3px 10px",
								borderRadius: 4,
								border: "1px solid var(--c-line)",
								cursor: "pointer",
								fontSize: 12,
								fontWeight: filter === f ? 600 : 400,
								background: filter === f ? "var(--c-accent, #6366f1)" : "transparent",
								color: filter === f ? "#fff" : "var(--c-mute)",
							}}
						>
							{f.charAt(0).toUpperCase() + f.slice(1)}
						</button>
					))}
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
						<th>Status</th>
						<th style={{ width: 32 }} />
					</tr>
				</thead>
				<tbody>
					{paginated.map((task) => {
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
										<span>{TEAM_BY_ID[task.person]?.name?.split(" ")[0]}</span>
									</div>
								</td>
								<td className="mono" style={{ color: "var(--c-mute)" }}>{relTime(task.days)}</td>
								<td>
									{task.completed
										? <Pill kind="good">Completed</Pill>
										: <Pill kind="ghost">Pending</Pill>}
								</td>
								<td style={{ position: "relative", textAlign: "right" }}>
									<ThreeDotMenu
										open={openMenuId === task.id}
										onOpen={() => setOpenMenuId(task.id)}
										onClose={() => setOpenMenuId(null)}
										onComplete={() => handleComplete(task.id)}
										onDelete={() => handleDelete(task.id)}
										completed={task.completed}
									/>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>

			{totalPages > 1 && (
				<div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 12 }}>
					<button
						className="pill ghost"
						onClick={() => setPage((p) => Math.max(0, p - 1))}
						disabled={page === 0}
					>
						← Prev
					</button>
					<span style={{ fontSize: 12, color: "var(--c-mute)" }}>
						{page + 1} / {totalPages}
					</span>
					<button
						className="pill ghost"
						onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
						disabled={page >= totalPages - 1}
					>
						Next →
					</button>
				</div>
			)}
		</Card>
	);
}

function ThreeDotMenu({ open, onOpen, onClose, onComplete, onDelete, completed }) {
	const ref = useRef(null);

	useEffect(() => {
		if (!open) return;
		function handleClickOutside(e) {
			if (ref.current && !ref.current.contains(e.target)) {
				onClose();
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [open, onClose]);

	return (
		<div ref={ref} style={{ display: "inline-block", position: "relative" }}>
			<button
				onClick={(e) => { e.stopPropagation(); open ? onClose() : onOpen(); }}
				style={{
					background: "none",
					border: "none",
					cursor: "pointer",
					color: "var(--c-mute)",
					fontSize: 18,
					lineHeight: 1,
					padding: "2px 6px",
					borderRadius: 4,
				}}
			>
				⋯
			</button>
			{open && (
				<div style={{
					position: "absolute",
					right: 0,
					top: "100%",
					zIndex: 100,
					background: "#ffffff",
					border: "1px solid var(--c-line)",
					borderRadius: 6,
					minWidth: 130,
					boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
					overflow: "hidden",
				}}>
					{!completed && (
						<button
							onClick={() => onComplete()}
							style={menuItemStyle}
						>
							✓ Mark complete
						</button>
					)}
					<button
						onClick={() => onDelete()}
						style={{ ...menuItemStyle, color: "var(--warning, #e05)" }}
					>
						✕ Delete
					</button>
				</div>
			)}
		</div>
	);
}

const menuItemStyle = {
	display: "block",
	width: "100%",
	padding: "8px 14px",
	background: "none",
	border: "none",
	cursor: "pointer",
	textAlign: "left",
	fontSize: 13,
	color: "inherit",
};
