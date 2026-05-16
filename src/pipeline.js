import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `
You are Lumin, a workplace equity assistant. Your job is to analyze Slack messages and determine whether they contain a request for a Non-Promotable Task (NPT) — invisible labor that disproportionately falls on certain team members.

Examples of NPTs: taking meeting notes, organizing team socials, scheduling, onboarding new hires, mentoring, DEI committee work, answering support questions.

If the message is casual conversation, a technical question, or anything that is not requesting invisible labor from someone, it is not an NPT.
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
