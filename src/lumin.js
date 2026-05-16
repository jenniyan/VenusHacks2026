const TEAM = [
  { name: "Sarah", tasks: 4, categories: { "social planning": 2, "meeting notes": 1, onboarding: 1 } },
  { name: "Alex", tasks: 0, categories: {} },
  { name: "Daniel", tasks: 0, categories: {} },
  { name: "Maya", tasks: 2, categories: { "meeting notes": 2 } },
  { name: "Chris", tasks: 1, categories: { scheduling: 1 } }
];

const CATEGORY_RULES = [
  {
    category: "meeting notes",
    title: "take meeting notes",
    patterns: [/take\s+notes?/i, /meeting\s+notes?/i, /notes?\s+again/i],
    explanation: "it asks someone to take notes, which is often recurring team support work."
  },
  {
    category: "social planning",
    title: "plan a team social",
    patterns: [/organize/i, /plan/i, /team\s+(lunch|dinner|social)/i, /social/i],
    explanation: "it asks someone to organize a social or team event, which is often invisible coordination work."
  },
  {
    category: "onboarding",
    title: "onboard a teammate",
    patterns: [/onboard/i, /new\s+(intern|hire|member|teammate)/i],
    explanation: "it asks someone to onboard another person, which is valuable but often under-recognized support work."
  },
  {
    category: "scheduling",
    title: "schedule a meeting",
    patterns: [/schedule/i, /calendar/i, /set\s+up\s+(the\s+)?(next\s+)?meeting/i],
    explanation: "it asks someone to handle scheduling, which is team coordination labor."
  },
  {
    category: "mentoring",
    title: "mentor or support someone",
    patterns: [/mentor/i, /coach/i, /help\s+(the\s+)?new/i],
    explanation: "it asks for mentoring or support labor that can become unevenly distributed."
  }
];

export function analyzeMessage(text) {
  const cleanText = text || "";
  const matchedRule = CATEGORY_RULES.find((rule) =>
    rule.patterns.some((pattern) => pattern.test(cleanText))
  );

  if (!matchedRule) {
    return {
      isNpt: false,
      response: "I did not detect an invisible-labor request in that message."
    };
  }

  const requestedPerson = findMentionedTeamMember(cleanText);
  const suggestedPerson = chooseLowestLoadMember(matchedRule.category);
  const warning = buildWarning(requestedPerson, suggestedPerson, matchedRule.category);

  return {
    isNpt: true,
    category: matchedRule.category,
    taskTitle: matchedRule.title,
    requestedPerson,
    suggestedPerson,
    response:
      `This looks like a ${matchedRule.category} task because ${matchedRule.explanation}\n\n` +
      `${warning}` +
      `Lumin suggests asking *${suggestedPerson.name}* next because they currently have the lowest invisible-labor load.`
  };
}

export function recordAssignment(memberName, category) {
  const member = TEAM.find((person) => sameName(person.name, memberName));
  if (!member) {
    return null;
  }

  member.tasks += 1;
  member.categories[category] = (member.categories[category] || 0) + 1;
  return member;
}

export function getTeamSummary() {
  return TEAM.map((person) => `${person.name}: ${person.tasks}`).join(", ");
}

function chooseLowestLoadMember(category) {
  return [...TEAM].sort((a, b) => {
    const categoryDiff = (a.categories[category] || 0) - (b.categories[category] || 0);
    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    return a.tasks - b.tasks;
  })[0];
}

function findMentionedTeamMember(text) {
  return TEAM.find((person) => new RegExp(`\\b${person.name}\\b`, "i").test(text));
}

function buildWarning(requestedPerson, suggestedPerson, category) {
  if (!requestedPerson) {
    return "";
  }

  if (sameName(requestedPerson.name, suggestedPerson.name)) {
    return `${requestedPerson.name} is already the lowest-load person for this category. `;
  }

  const categoryCount = requestedPerson.categories[category] || 0;
  return `${requestedPerson.name} has already handled ${categoryCount} recent ${category} task(s). `;
}

function sameName(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}
