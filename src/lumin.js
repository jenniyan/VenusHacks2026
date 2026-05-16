import { createClient } from "@supabase/supabase-js";
import { classifyMessage } from "./pipeline.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const CATEGORIES = [
  { slug: "notes", label: "Meeting notes" },
  { slug: "scheduling", label: "Scheduling" },
  { slug: "onboarding", label: "Onboarding" },
  { slug: "mentoring", label: "Mentoring" },
  { slug: "social", label: "Social planning" },
  { slug: "coordination", label: "Team coordination" },
  { slug: "recognition", label: "Recognition & morale" },
  { slug: "culture_admin", label: "Culture / admin" },
  { slug: "interviewing", label: "Interviewing volume" },
  { slug: "docs_housekeeping", label: "Docs housekeeping" },
  { slug: "support_triage", label: "Support triage" },
  { slug: "other", label: "Other" },
];

// Sends message text to the LLM pipeline and returns the classification result.
export async function analyzeMessage(text) {
  return classifyMessage(text, CATEGORIES);
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

// Returns the team member with the fewest tasks in the given category.
// Breaks ties using total task count. If still tied, prefers requestedPerson
// so the bot only redirects when there is a genuine imbalance.
export function chooseLowestLoadMember(load, category, members, requestedPerson) {
  if (members.length === 0) return undefined;
  return [...members].sort((a, b) => {
    const catDiff =
      (load[a.slack_user_id]?.categories[category] || 0) -
      (load[b.slack_user_id]?.categories[category] || 0);
    if (catDiff !== 0) return catDiff;
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
  const slackMentionMatch = text.match(/<@([A-Z0-9]+)>/);
  if (slackMentionMatch) {
    const mentionedId = slackMentionMatch[1];
    return members.find((m) => m.slack_user_id === mentionedId);
  }
  return members.find((member) =>
    new RegExp(`\\b${member.display_name}\\b`, "i").test(text)
  );
}

// Returns a warning string if the person named in the message has a higher load
// than the suggested person. Uses category count if that was the deciding factor,
// otherwise falls back to total count to match how the suggestion was made.
export function buildWarning(requestedPerson, suggestedPerson, category, load) {
  if (!requestedPerson) return "";
  if (requestedPerson.slack_user_id === suggestedPerson.slack_user_id) return "";
  const requestedCat = load[requestedPerson.slack_user_id]?.categories[category] || 0;
  const suggestedCat = load[suggestedPerson.slack_user_id]?.categories[category] || 0;
  if (requestedCat !== suggestedCat) {
    return `${requestedPerson.display_name} has already handled ${requestedCat} recent ${category} task(s). `;
  }
  const requestedTotal = load[requestedPerson.slack_user_id]?.total || 0;
  return `${requestedPerson.display_name} has already handled ${requestedTotal} total task(s) across all categories. `;
}

// Formats the team load as a readable string for Slack messages.
export function getTeamSummary(load, members) {
  if (members.length === 0) return "No team members found.";
  return members
    .map((m) => `${m.display_name}: ${load[m.slack_user_id]?.total || 0}`)
    .join(", ");
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
