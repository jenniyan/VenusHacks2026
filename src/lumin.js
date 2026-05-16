import { summarizeLoad } from "./dataProvider.js";

const CATEGORY_RULES = [
  {
    category: "meeting notes",
    taskTitle: "Take meeting notes",
    patterns: [
      /take\s+notes?/i,
      /meeting\s+notes?/i,
      /note[-\s]?taker/i,
      /notes?\s+(for|during|again)/i
    ],
    explanation: "it asks someone to take notes, which is recurring team support work that is often not rewarded like technical delivery."
  },
  {
    category: "social planning",
    taskTitle: "Plan a team social",
    patterns: [
      /organize/i,
      /team\s+(lunch|dinner|social|event)/i,
      /(happy\s+hour|offsite|birthday|farewell|cake)/i,
      /plan\s+(the\s+)?(lunch|dinner|social|offsite|event)/i
    ],
    explanation: "it asks someone to coordinate a social or team event, which is useful glue work but can become unevenly distributed."
  },
  {
    category: "onboarding",
    taskTitle: "Onboard a teammate",
    patterns: [
      /onboard/i,
      /new\s+(intern|hire|member|teammate|engineer)/i,
      /help\s+.*\b(get\s+started|ramp\s+up)\b/i
    ],
    explanation: "it asks for onboarding support, which is valuable mentoring and coordination labor."
  },
  {
    category: "scheduling",
    taskTitle: "Schedule a meeting",
    patterns: [
      /schedule/i,
      /calendar/i,
      /book\s+(a\s+)?(room|meeting)/i,
      /find\s+(a\s+)?time/i,
      /set\s+up\s+(the\s+)?(next\s+)?meeting/i
    ],
    explanation: "it asks someone to handle scheduling logistics for the group."
  },
  {
    category: "mentoring",
    taskTitle: "Mentor a teammate",
    patterns: [
      /mentor/i,
      /coach/i,
      /pair\s+with\s+(the\s+)?new/i,
      /help\s+(the\s+)?new\s+(intern|hire|member|teammate|engineer)/i
    ],
    explanation: "it asks for mentoring or support labor that can quietly pile up on the same people."
  },
  {
    category: "team coordination",
    taskTitle: "Coordinate team logistics",
    patterns: [
      /coordinate/i,
      /own\s+(the\s+)?logistics/i,
      /follow\s+ups?/i,
      /retro\s+logistics/i,
      /tracker/i
    ],
    explanation: "it asks for coordination work that keeps the team running but is not usually tracked as core project work."
  }
];

const REQUEST_PATTERNS = [
  /\bcan\b/i,
  /\bcould\b/i,
  /\bwho\s+can\b/i,
  /\bneed\s+someone\b/i,
  /\bplease\b/i,
  /\bassign\b/i
];

const REPEAT_PATTERNS = [/\bagain\b/i, /\balways\b/i, /\busual\b/i, /\bonce\s+more\b/i];

export function createLuminService(dataProvider) {
  return {
    async analyzeMessage(text) {
      const [team, history] = await Promise.all([
        dataProvider.getTeamMembers(),
        dataProvider.getTaskHistory()
      ]);

      return analyzeText(text, team, history);
    },
    async recordAssignment(payload) {
      return dataProvider.recordAssignment(payload);
    },
    async getSummary() {
      const [team, history] = await Promise.all([
        dataProvider.getTeamMembers(),
        dataProvider.getTaskHistory()
      ]);

      return {
        team,
        history,
        summary: summarizeLoad(team, history)
      };
    },
    async resetDemoData() {
      return dataProvider.resetDemoData();
    }
  };
}

export function analyzeText(text, team, history) {
  const cleanText = text?.trim() || "";
  const matchedRules = CATEGORY_RULES.map((rule) => ({
    rule,
    matches: rule.patterns.filter((pattern) => pattern.test(cleanText)).length
  })).filter((entry) => entry.matches > 0);

  if (matchedRules.length === 0) {
    return {
      isNpt: false,
      confidence: 0,
      confidenceLabel: "none",
      sourceMessage: cleanText,
      response: "I did not detect an invisible-labor request in that message."
    };
  }

  const best = matchedRules.sort((a, b) => b.matches - a.matches)[0];
  const requestedPerson = findRequestedPerson(cleanText, team);
  const summary = summarizeLoad(team, history);
  const suggestedPerson = chooseSuggestedPerson(team, summary, best.rule.category);
  const confidence = calculateConfidence(cleanText, best.matches, requestedPerson);
  const warning = buildWarning({
    requestedPerson,
    suggestedPerson,
    summary,
    category: best.rule.category
  });

  return {
    isNpt: true,
    category: best.rule.category,
    taskTitle: best.rule.taskTitle,
    explanation: best.rule.explanation,
    requestedPerson,
    suggestedPerson,
    confidence,
    confidenceLabel: labelConfidence(confidence),
    warning,
    sourceMessage: cleanText,
    summary,
    response:
      `This looks like a ${best.rule.category} task because ${best.rule.explanation} ` +
      `${suggestedPerson.name} has the lowest relevant load, so Lumin suggests asking them next.`
  };
}

export function formatSummaryLine(summary) {
  return summary.ranked
    .map((person) => `${person.name.split(" ")[0]}: ${person.totalTasks}`)
    .join(", ");
}

export function formatRosterLine(team) {
  return team.map((person) => `${person.name} (${person.role})`).join("\n");
}

function chooseSuggestedPerson(team, summary, category) {
  return [...team].sort((a, b) => {
    const aCategoryLoad = summary.byPersonCategory[a.id]?.[category] || 0;
    const bCategoryLoad = summary.byPersonCategory[b.id]?.[category] || 0;
    const aTotalLoad = summary.byPerson[a.id] || 0;
    const bTotalLoad = summary.byPerson[b.id] || 0;

    return (
      aCategoryLoad - bCategoryLoad ||
      aTotalLoad - bTotalLoad ||
      a.name.localeCompare(b.name)
    );
  })[0];
}

function findRequestedPerson(text, team) {
  const mentionedSlackIds = [...text.matchAll(/<@([A-Z0-9]+)>/g)].map((match) => match[1]);

  if (mentionedSlackIds.length > 0) {
    const slackMatch = team.find((person) => mentionedSlackIds.includes(person.slackUserId));
    if (slackMatch) {
      return slackMatch;
    }

    return {
      id: mentionedSlackIds[0],
      name: `<@${mentionedSlackIds[0]}>`,
      role: "Slack user",
      isUnmappedSlackUser: true
    };
  }

  return team.find((person) =>
    person.aliases.some((alias) => new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(text))
  ) || null;
}

function buildWarning({ requestedPerson, suggestedPerson, summary, category }) {
  if (!requestedPerson) {
    return "No specific teammate was requested, so Lumin checked the whole roster.";
  }

  if (requestedPerson.isUnmappedSlackUser) {
    return "The message mentions a Slack user who is not mapped to the mock roster yet.";
  }

  const requestedTotal = summary.byPerson[requestedPerson.id] || 0;
  const suggestedTotal = summary.byPerson[suggestedPerson.id] || 0;
  const requestedCategory = summary.byPersonCategory[requestedPerson.id]?.[category] || 0;

  if (requestedPerson.id === suggestedPerson.id) {
    return `${requestedPerson.name} is already the lowest-load person for ${category}.`;
  }

  return (
    `${requestedPerson.name} has handled ${requestedTotal} recent invisible-labor task(s), ` +
    `including ${requestedCategory} ${category} task(s). ` +
    `${suggestedPerson.name} currently has ${suggestedTotal}.`
  );
}

function calculateConfidence(text, matchCount, requestedPerson) {
  let score = 0.62;

  score += Math.min(matchCount - 1, 3) * 0.07;

  if (REQUEST_PATTERNS.some((pattern) => pattern.test(text))) {
    score += 0.08;
  }

  if (REPEAT_PATTERNS.some((pattern) => pattern.test(text))) {
    score += 0.08;
  }

  if (requestedPerson) {
    score += 0.04;
  }

  return Math.min(Number(score.toFixed(2)), 0.96);
}

function labelConfidence(score) {
  if (score >= 0.82) {
    return "high";
  }

  if (score >= 0.68) {
    return "medium";
  }

  return "low";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
