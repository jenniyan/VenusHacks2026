import React, { createContext, useContext } from "react";

const NPT_CATEGORIES = [
  { id: "notes", label: "Meeting notes", short: "Notes" },
  { id: "scheduling", label: "Scheduling", short: "Sched" },
  { id: "onboarding", label: "Onboarding", short: "Onboard" },
  { id: "mentoring", label: "Mentoring", short: "Mentor" },
  { id: "social", label: "Social planning", short: "Social" },
  { id: "coordination", label: "Team coordination", short: "Coord" },
  { id: "recognition", label: "Recognition & morale", short: "Kudos" },
  { id: "culture_admin", label: "Culture & admin", short: "Culture" },
  { id: "interviewing", label: "Interviewing volume", short: "Interviews" },
  { id: "docs_housekeeping", label: "Docs housekeeping", short: "Docs" },
  { id: "support_triage", label: "Support triage", short: "Support" },
  { id: "other", label: "Other", short: "Other" },
];

const CATEGORY_COLOR = {
  notes: "var(--c-cat-1)",
  scheduling: "var(--c-cat-2)",
  onboarding: "var(--c-cat-3)",
  mentoring: "var(--c-cat-4)",
  social: "var(--c-cat-5)",
  coordination: "var(--c-cat-6)",
  recognition: "var(--c-cat-7)",
  culture_admin: "var(--c-cat-8)",
  interviewing: "var(--c-cat-9)",
  docs_housekeeping: "var(--c-cat-10)",
  support_triage: "var(--c-cat-11)",
  other: "var(--c-cat-12)",
};

const CATEGORY_ALIASES = {
  admin: "culture_admin",
};

function loadByPerson(history) {
  const source = Array.isArray(history) ? history : [];
  const counts = {};

  for (const task of source) {
    counts[task.person] = (counts[task.person] || 0) + 1;
  }

  return counts;
}

function loadByCategory(history) {
  const source = Array.isArray(history) ? history : [];
  const counts = {};

  for (const task of source) {
    counts[task.category] = (counts[task.category] || 0) + 1;
  }

  return counts;
}

function loadByPersonCategory(history) {
  const source = Array.isArray(history) ? history : [];
  const counts = {};

  for (const task of source) {
    counts[task.person] = counts[task.person] || {};
    counts[task.person][task.category] = (counts[task.person][task.category] || 0) + 1;
  }

  return counts;
}

function gini(counts) {
  const sorted = [...counts].sort((a, b) => a - b);
  const n = sorted.length;

  if (n === 0) return 0;

  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;

  let weightedSum = 0;
  for (let index = 0; index < n; index += 1) {
    weightedSum += (index + 1) * sorted[index];
  }

  return (2 * weightedSum) / (n * sum) - (n + 1) / n;
}

function daysAgoFrom(value) {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 0;

  return Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
}

function normalizeTeamMember(member, index) {
  const id = member?.slack_user_id || member?.id || `member-${index}`;

  return {
    ...member,
    id,
    name: member?.display_name || member?.name || "Unknown teammate",
    role: member?.role || member?.title || "Team member",
    tz: member?.tz || member?.timezone || "Local",
    joined: member?.joined || member?.created_at || "",
  };
}

function normalizeTask(task, index) {
  const assignedTo = task?.assigned_to_user?.slack_user_id || task?.assigned_to || task?.person || `member-${index}`;
  const rawCategory = task?.category || "other";
  const category = CATEGORY_ALIASES[rawCategory] || rawCategory || "other";
  const createdAt = task?.created_at || task?.message?.timestamp || task?.message?.created_at;

  return {
    ...task,
    id: String(task?.id ?? `task-${index}`),
    person: assignedTo,
    category,
    title: task?.title || task?.message?.message || "Untitled task",
    days: daysAgoFrom(createdAt),
    created_at: createdAt,
    message: task?.message,
    assigned_to_user: task?.assigned_to_user,
    suggested_to_user: task?.suggested_to_user,
  };
}

function buildTeamById(team) {
  return Object.fromEntries(
    team.map((member, index) => [member.id, { ...member, tone: ((index % 8) + 1) }]),
  );
}

function buildRuntimeLuminState({ teamMembers = [], tasks = [] } = {}) {
  const TEAM = teamMembers.map(normalizeTeamMember);
  const TASK_HISTORY = tasks.map(normalizeTask);

  return {
    NPT_CATEGORIES,
    CATEGORY_COLOR,
    TEAM,
    TEAM_BY_ID: buildTeamById(TEAM),
    TASK_HISTORY,
    CHAT_PRESETS: [],
    loadByPerson,
    loadByCategory,
    loadByPersonCategory,
    gini,
  };
}

const LuminDataContext = createContext({
  NPT_CATEGORIES,
  CATEGORY_COLOR,
  TEAM: [],
  TEAM_BY_ID: {},
  TASK_HISTORY: [],
  CHAT_PRESETS: [],
  loadByPerson,
  loadByCategory,
  loadByPersonCategory,
  gini,
});

function LuminDataProvider({ value, children }) {
  return <LuminDataContext.Provider value={value}>{children}</LuminDataContext.Provider>;
}

function useLuminData() {
  return useContext(LuminDataContext);
}

export {
  NPT_CATEGORIES,
  CATEGORY_COLOR,
  daysAgoFrom,
  loadByPerson,
  loadByCategory,
  loadByPersonCategory,
  gini,
  normalizeTeamMember,
  normalizeTask,
  buildTeamById,
  buildRuntimeLuminState,
  LuminDataContext,
  LuminDataProvider,
  useLuminData,
};
