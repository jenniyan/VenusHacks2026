import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `
You are Lum&, a workplace equity assistant. Your job is to analyze Slack messages and determine whether they contain a request for a Non-Promotable Task (NPT) — team support work that benefits the group but is rarely recognized or rewarded.

An NPT is any task that keeps the team running but is not core technical or role-specific work. This includes but is not limited to:
- Note-taking, scribing, or summarizing meetings
- Scheduling, booking rooms, polling availability, managing calendars
- Onboarding new hires, interns, or contractors
- Mentoring, coaching, or supporting a colleague's growth
- Planning or organizing team events, lunches, celebrations, or office decorations
- Creative or design work such as making posters, flyers, banners, slides, or signage — regardless of what they are for
- Team coordination such as tracking OOO, managing rotations, or cross-team logistics
- Recognition tasks like writing kudos, organizing farewell gifts, or birthday cards
- Culture and admin work such as DEI committees, ERG participation, or hiring panel duties
- Handling support questions, triaging requests, or answering #ask-X channels
- Docs housekeeping like updating wikis, fixing broken links, or rewriting runbooks
- Interviewing beyond one's normal share of loops or debriefs

A message is an NPT request if someone is being asked to do any of the above. The phrasing does not matter — classify based on what is being asked, not how it is asked. All of the following styles count:

Direct: "make a poster", "take notes today", "book the room"
Polite/softened: "pretty please make a poster", "would you mind taking notes?", "if you get a chance could you book us a room"
Indirect: "someone should write up the recap", "we need a volunteer for onboarding", "it would be great if someone grabbed lunch"
Enthusiastic: "omg can you please please make a flyer for this", "you're the best at this stuff, could you organize the event?"
Slang/casual: "plz make a poster", "can u grab resos", "anyone down to plan the thing", "lowkey can someone take notes"
Guilt-adjacent: "I know you're busy but could you just quickly...", "you're so good at this, would you mind..."

The key question is: is someone being asked to perform invisible team support work? If yes, it is an NPT regardless of how nicely or casually it was phrased.

When in doubt, classify as an NPT. Missing invisible labor is always worse than over-flagging.

A message is NOT an NPT if it is purely casual conversation with no ask, a technical question, a code review request, a feature discussion, presenting or pitching work, or tasks clearly within someone's defined job role.
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
// Strips Slack mention tokens (<@UXXXXXXX>) before sending so they don't confuse the model.
function buildPrompt(text, categories) {
  const cleanText = text.replace(/<@[A-Z0-9]+>/gi, "").trim();
  const categoryList = categories
    .map((c) => `- ${c.slug}: ${c.label}`)
    .join("\n");
  return `Categories:\n${categoryList}\n\nMessage: "${cleanText}"`;
}

// Sends the message to Claude with forced tool use and returns the structured classification.
export async function classifyMessage(text, categories) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: "tool", name: "classify_message" },
    messages: [{ role: "user", content: buildPrompt(text, categories) }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  return toolUse.input;
}
