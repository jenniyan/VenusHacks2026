import "dotenv/config";
import slackBolt from "@slack/bolt";
import {
  analyzeMessage,
  getTeamLoad,
  getTeamSummary,
  chooseLowestLoadMember,
  findMentionedTeamMember,
  buildWarning,
  insertMessage,
  recordAssignment,
  syncTeamMembers,
} from "./lumin.js";

const { App } = slackBolt;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// Listens to all plain user messages, classifies them, and sends a private suggestion to the sender.
app.message(async ({ message, client }) => {
  try {
    if (!message.text || message.subtype) return;

    const analysis = await analyzeMessage(message.text);
    if (!analysis.isNpt) return;

    const { load, members } = await getTeamLoad();
    if (members.length === 0) return;

    const requestedPerson = findMentionedTeamMember(message.text, members);
    const suggestedPerson = chooseLowestLoadMember(load, analysis.category, members, requestedPerson);
    if (!suggestedPerson) return;

    const warning = buildWarning(requestedPerson, suggestedPerson, analysis.category, load);

    const timestamp = new Date(parseFloat(message.ts) * 1000).toISOString();
    const messageId = await insertMessage({
      sender: message.user,
      channel: message.channel,
      text: message.text,
      timestamp,
    });

    const isExactMatch = requestedPerson?.slack_user_id === suggestedPerson.slack_user_id;
    const taskLabel = `*${analysis.category}* Non-Promotable Task`;
    const responseText = isExactMatch
      ? `This looks like a ${taskLabel} because ${analysis.explanation}`
      : warning
        ? `This looks like a ${taskLabel}.\n\n${warning}Lumin suggests asking *${suggestedPerson.display_name}* next because they currently have the lowest invisible-labor load.`
        : `This looks like a ${taskLabel} because ${analysis.explanation}\n\nLumin suggests asking *${suggestedPerson.display_name}* next because they currently have the lowest invisible-labor load.`;

    await sendLuminMessage({
      client,
      channel: message.channel,
      user: message.user,
      text: responseText,
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: responseText },
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `Only visible to you • Current load: ${getTeamSummary(load, members)}` },
          ],
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: `Assign to ${suggestedPerson.display_name}` },
              style: "primary",
              action_id: "assign_suggested",
              value: JSON.stringify({
                messageId,
                memberSlackId: suggestedPerson.slack_user_id,
                memberName: suggestedPerson.display_name,
                category: analysis.category,
                taskTitle: analysis.taskTitle || analysis.category,
              }),
            },
            ...(requestedPerson && requestedPerson.slack_user_id !== suggestedPerson.slack_user_id
              ? [
                  {
                    type: "button",
                    text: { type: "plain_text", text: `Keep ${requestedPerson.display_name}` },
                    action_id: "keep_original",
                    value: JSON.stringify({
                      messageId,
                      assignedSlackId: requestedPerson.slack_user_id,
                      assignedName: requestedPerson.display_name,
                      suggestedSlackId: suggestedPerson.slack_user_id,
                      category: analysis.category,
                      taskTitle: analysis.taskTitle || analysis.category,
                    }),
                  },
                ]
              : []),
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Lumin failed to send private detection:", error);
  }
});

// Adds a newly joined workspace member to team_members without requiring a restart.
app.event("team_join", async ({ event }) => {
  await syncTeamMembers([event.user]);
});

// Handles the assign button click, writes the task to the DB, and posts a confirmation.
app.action("assign_suggested", async ({ ack, body, client }) => {
  await ack();

  const { messageId, memberSlackId, memberName, category, taskTitle } = JSON.parse(
    body.actions[0].value
  );

  await recordAssignment({
    messageId,
    title: taskTitle,
    category,
    suggestedTo: memberSlackId,
    assignedTo: memberSlackId,
  });

  const { load, members } = await getTeamLoad();

  await postPrivateConfirmation({
    client,
    body,
    text: `Assigned "${taskTitle}" to ${memberName}. Updated load: ${getTeamSummary(load, members)}`,
  });
});

// Handles the keep original button — records the task assigned to the originally named person.
app.action("keep_original", async ({ ack, body, client }) => {
  await ack();

  const { messageId, assignedSlackId, assignedName, suggestedSlackId, category, taskTitle } =
    JSON.parse(body.actions[0].value);

  await recordAssignment({
    messageId,
    title: taskTitle,
    category,
    suggestedTo: suggestedSlackId,
    assignedTo: assignedSlackId,
  });

  const { load, members } = await getTeamLoad();

  await postPrivateConfirmation({
    client,
    body,
    text: `Kept "${taskTitle}" with ${assignedName}. Updated load: ${getTeamSummary(load, members)}`,
  });
});

// Responds to the /lumin-summary slash command with the current team load.
app.command("/lumin-summary", async ({ ack, respond }) => {
  await ack();
  const { load, members } = await getTeamLoad();
  await respond({
    response_type: "ephemeral",
    text: `Current invisible-labor load: ${getTeamSummary(load, members)}`,
  });
});

await app.start();

const { members: slackMembers } = await app.client.users.list();
const humans = slackMembers.filter(
  (m) => !m.is_bot && !m.deleted && m.id !== "USLACKBOT"
);
await syncTeamMembers(humans);
console.log(`Lumin is running with private ephemeral messages. Synced ${humans.length} team members.`);

async function sendLuminMessage({ client, channel, user, text, blocks }) {
  await client.chat.postEphemeral({
    channel,
    user,
    text,
    blocks,
  });
}

async function postPrivateConfirmation({ client, body, text }) {
  const threadTs = body.message?.thread_ts || body.message?.ts;
  const payload = {
    channel: body.channel.id,
    user: body.user.id,
    text,
  };

  if (threadTs) {
    payload.thread_ts = threadTs;
  }

  await client.chat.postEphemeral(payload);
}
