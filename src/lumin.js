import { createClient } from "@supabase/supabase-js";
import { classifyMessage } from "./pipeline.js";

const supabase = createClient(
  normalizeSupabaseUrl(process.env.SUPABASE_URL),
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

export const CATEGORIES = [
  { slug: "notes", label: "Meeting notes" },
  { slug: "scheduling", label: "Scheduling" },
  { slug: "onboarding", label: "Onboarding" },
  { slug: "mentoring", label: "Mentoring" },
  { slug: "social", label: "Social planning" },
  { slug: "coordination", label: "Team coordination" },
  { slug: "recognition", label: "Recognition & morale" },
  { slug: "culture_admin", label: "Culture & admin" },
  { slug: "interviewing", label: "Interviewing volume" },
  { slug: "docs_housekeeping", label: "Docs housekeeping" },
  { slug: "support_triage", label: "Support triage" },
  { slug: "other", label: "Other" },
];

const FAST_NPT_RULES = [
  {
    category: "onboarding",
    taskTitle: "Onboard new intern",
    pattern: /\b(onboard|onboarding|new\s+(intern|hire|teammate|member)|ramp)\b/i,
    explanation: "it asks someone to help onboard or ramp up a new teammate.",
  },
  {
    category: "notes",
    taskTitle: "Take meeting notes",
    pattern: /\b(take|write|grab|do|make)\s+(meeting\s+)?notes?\b|\brecap\b|\bsummar(y|ize)\b/i,
    explanation: "it asks someone to capture notes or a recap, which is recurring team support work.",
  },
  {
    category: "scheduling",
    taskTitle: "Schedule team meeting",
    pattern: /\b(schedule|book|calendar|room|poll|availability|reservation|reserve)\b/i,
    explanation: "it asks someone to coordinate timing, booking, or logistics for the team.",
  },
  {
    category: "social",
    taskTitle: "Plan team social event",
    pattern: /\b(organize|plan|coordinate|set\s+up|host)\b.*\b(lunch|dinner|socia[l]?|party|celebration|event|outing|happy\s+hour)\b|\b(team\s+)?(lunch|dinner|socia[l]?|party|celebration|outing|happy\s+hour)\b/i,
    explanation: "it asks someone to plan or organize a team social task.",
  },
  {
    category: "other",
    taskTitle: "Create team support materials",
    pattern: /\b(make|create|design)\b.*\b(poster|flyer|banner|slide|slides|sign|signage)\b/i,
    explanation: "it asks someone to create team support materials.",
  },
];

function fastClassifyMessage(text) {
  const cleaned = text.replace(/<@[A-Z0-9]+>/gi, "").trim();
  const match = FAST_NPT_RULES.find((rule) => rule.pattern.test(cleaned));
  if (!match) return null;

  return {
    isNpt: true,
    category: match.category,
    taskTitle: match.taskTitle,
    explanation: match.explanation,
  };
}

// Sends message text to the LLM pipeline and returns the classification result.
export async function analyzeMessage(text) {
  return fastClassifyMessage(text) || classifyMessage(text, CATEGORIES);
}

// Fetches all team members and their task counts from the DB in a single call.
// Returns { members, load } where load is keyed by slack_user_id.
// Members with zero tasks are included with zeroed counts.
export async function getTeamLoad() {
  const [membersResult, tasksResult] = await Promise.all([
    supabase.from("team_members").select("slack_user_id, display_name"),
    supabase.from("tasks").select("assigned_to, category"),
  ]);

  if (membersResult.error) throw membersResult.error;
  if (tasksResult.error) throw tasksResult.error;

  const members = membersResult.data;
  const load = {};

  for (const member of members) {
    load[member.slack_user_id] = {
      display_name: member.display_name,
      total: 0,
      categories: {},
    };
  }

  for (const task of tasksResult.data) {
    if (!load[task.assigned_to]) continue;
    load[task.assigned_to].total += 1;
    load[task.assigned_to].categories[task.category] =
      (load[task.assigned_to].categories[task.category] || 0) + 1;
  }

  return { members, load };
}

// Returns the team member with the fewest total tasks. If tied, prefers requestedPerson
// so the bot only redirects when there is a genuine imbalance.
export function chooseLowestLoadMember(load, category, members, requestedPerson) {
  if (members.length === 0) return undefined;
  return [...members].sort((a, b) => {
    const totalDiff = (load[a.slack_user_id]?.total || 0) - (load[b.slack_user_id]?.total || 0);
    if (totalDiff !== 0) return totalDiff;
    if (requestedPerson) {
      if (a.slack_user_id === requestedPerson.slack_user_id) return -1;
      if (b.slack_user_id === requestedPerson.slack_user_id) return 1;
    }
    return 0;
  })[0];
}

// Checks if any team member is mentioned in the message, either via Slack @mention
// format (<@UXXXXXXX>) or by plain display name.
export function findMentionedTeamMember(text, members) {
  const slackMentionMatches = [...text.matchAll(/<@([A-Za-z0-9]+)>/g)];
  for (const match of slackMentionMatches) {
    const mentionedId = match[1];
    const member = members.find((m) => m.slack_user_id === mentionedId);
    if (member) return member;
  }
  return members.find((member) =>
    new RegExp(`\\b${escapeRegExp(member.display_name)}\\b`, "i").test(text)
  );
}

// Returns a warning string if the person named in the message has more total tasks
// than the suggested person. Returns empty string if they match or no one was named.
export function buildWarning(requestedPerson, suggestedPerson, category, load) {
  if (!requestedPerson) return "";
  if (requestedPerson.slack_user_id === suggestedPerson.slack_user_id) return "";
  const total = load[requestedPerson.slack_user_id]?.total || 0;
  return `${requestedPerson.display_name} has already handled ${total} total task(s). `;
}

// Formats the team load as a readable string for Slack messages.
export function getTeamSummary(load, members) {
  if (members.length === 0) return "No team members found.";
  return members
    .map((m) => `${m.display_name}: ${load[m.slack_user_id]?.total || 0}`)
    .join(", ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Upserts all human Slack workspace members into the team_members table.
export async function syncTeamMembers(slackMembers) {
  if (slackMembers.length === 0) return;
  const rows = slackMembers.map((m) => ({
    slack_user_id: m.id,
    display_name: m.profile?.display_name_normalized || m.profile?.real_name || m.name,
  }));
  const { error } = await supabase
    .from("team_members")
    .upsert(rows, { onConflict: "slack_user_id" });
  if (error) throw error;
}

// Inserts a flagged Slack message into the messages table and returns its id.
export async function insertMessage({ sender, channel, text, timestamp }) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ sender, channel, message: text, timestamp })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

// Records a completed task assignment in the tasks table.
export async function recordAssignment({ messageId, title, category, suggestedTo, assignedTo }) {
  const { error } = await supabase.from("tasks").insert({
    message_id: messageId,
    title,
    category,
    suggested_to: suggestedTo,
    assigned_to: assignedTo,
    created_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// Returns stats for a single team member keyed by their slack_user_id.
export async function getPersonStats(slackUserId) {
  const [tasksResult, allTasksResult, membersResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, category, completed, created_at, suggested_to")
      .eq("assigned_to", slackUserId)
      .order("created_at", { ascending: false }),
    supabase.from("tasks").select("assigned_to, suggested_to").neq("assigned_to", "LUMIN"),
    supabase.from("team_members").select("slack_user_id").neq("slack_user_id", "LUMIN"),
  ]);

  if (tasksResult.error) throw tasksResult.error;
  if (allTasksResult.error) throw allTasksResult.error;
  if (membersResult.error) throw membersResult.error;

  const myTasks = tasksResult.data;
  const total = myTasks.length;
  const completed = myTasks.filter((t) => t.completed).length;
  const pending = total - completed;

  const redirectedToMe = myTasks.filter(
    (t) => t.suggested_to === slackUserId && t.suggested_to === slackUserId
  ).length;
  const reassignedAway = allTasksResult.data.filter(
    (t) => t.suggested_to === slackUserId && t.assigned_to !== slackUserId
  ).length;

  const categoryCount = {};
  for (const t of myTasks) {
    categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
  }
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0] ?? null;

  const teamTotal = allTasksResult.data.length;
  const memberCount = membersResult.data.length || 1;
  const teamAvg = teamTotal / memberCount;

  const countsByPerson = {};
  for (const t of allTasksResult.data) {
    countsByPerson[t.assigned_to] = (countsByPerson[t.assigned_to] || 0) + 1;
  }
  const sorted = Object.values(countsByPerson).sort((a, b) => b - a);
  const rank = sorted.findIndex((n) => n <= total) + 1;

  const recentTask = myTasks[0] ?? null;

  return {
    total,
    completed,
    pending,
    teamAvg,
    rank,
    teamSize: memberCount,
    topCategory,
    categoryCount,
    recentTask,
  };
}

function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl) {
    throw new Error("SUPABASE_URL is missing from .env");
  }

  const url = new URL(rawUrl);
  url.search = "";
  url.hash = "";

  if (url.pathname.startsWith("/rest/v1")) {
    url.pathname = "/";
  }

  return url.toString().replace(/\/$/, "");
}
