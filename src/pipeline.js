import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `
You are Lumin, a workplace equity assistant. Your job is to analyze Slack messages and determine whether they contain a request for a Non-Promotable Task (NPT) — team support work that benefits the group but is rarely recognized or rewarded.

An NPT is any task that keeps the team running but is not core technical or role-specific work. This includes but is not limited to:
- Note-taking, scribing, or summarizing meetings
- Scheduling, booking rooms, polling availability, managing calendars
- Onboarding new hires, interns, or contractors
- Mentoring, coaching, or supporting a colleague's growth
- Planning or organizing team events, lunches, celebrations, office decorations, or posters for events
- Team coordination such as tracking OOO, managing rotations, or cross-team logistics
- Recognition tasks like writing kudos, organizing farewell gifts, or birthday cards
- Culture and admin work such as DEI committees, ERG participation, or hiring panel duties
- Handling support questions, triaging requests, or answering #ask-X channels
- Docs housekeeping like updating wikis, fixing broken links, or rewriting runbooks
- Interviewing beyond one's normal share of loops or debriefs

A message is an NPT request if someone is being asked to do any of the above — even if phrased casually or creatively (e.g. "can you make a poster", "who wants to grab lunch reservations", "could someone write up the recap").

A message is NOT an NPT if it is casual conversation, a technical question, a code review request, a feature discussion, or work that is clearly part of someone's defined job responsibilities.
`;

const CLASSIFY_TOOL = {
  name: "classify_message",
  description: "Classify whether a Slack message contains an NPT request.",
  input_schema: {
    type: "object",
    properties: {
      isNpt: {
        type: "boolean",
        description: "True if the message is requesting invisible labor from someone.",
      },
      category: {
        type: "string",
        description: "The matching category slug, or null if isNpt is false.",
      },
      taskTitle: {
        type: "string",
        description: "Short human-readable label for the task, or null if isNpt is false.",
      },
      explanation: {
        type: "string",
        description: "One plain-language sentence explaining the classification decision.",
      },
    },
    required: ["isNpt", "explanation"],
  },
};

// Formats the message and category list into a prompt for Claude.
function buildPrompt(text, categories) {
  const categoryList = categories
    .map((c) => `- ${c.slug}: ${c.label}`)
    .join("\n");
  return `Categories:\n${categoryList}\n\nMessage: "${text}"`;
}

// Sends the message to Claude with forced tool use and returns the structured classification.
export async function classifyMessage(text, categories) {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: "tool", name: "classify_message" },
    messages: [{ role: "user", content: buildPrompt(text, categories) }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  return toolUse.input;
}
