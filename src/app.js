import "dotenv/config";
import slackBolt from "@slack/bolt";
import { analyzeMessage, getTeamSummary, recordAssignment } from "./lumin.js";

const { App } = slackBolt;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

app.message(async ({ message, say }) => {
  if (!message.text || message.subtype === "bot_message") {
    return;
  }

  const analysis = analyzeMessage(message.text);

  if (!analysis.isNpt) {
    return;
  }

  await say({
    text: analysis.response,
    thread_ts: message.ts,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: analysis.response
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Current mock load: ${getTeamSummary()}`
          }
        ]
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: `Assign to ${analysis.suggestedPerson.name}`
            },
            style: "primary",
            action_id: "assign_suggested",
            value: JSON.stringify({
              memberName: analysis.suggestedPerson.name,
              category: analysis.category,
              taskTitle: analysis.taskTitle
            })
          }
        ]
      }
    ]
  });
});

app.action("assign_suggested", async ({ ack, body, client }) => {
  await ack();

  const payload = JSON.parse(body.actions[0].value);
  const member = recordAssignment(payload.memberName, payload.category);

  await client.chat.postMessage({
    channel: body.channel.id,
    thread_ts: body.message.thread_ts || body.message.ts,
    text: member
      ? `Assigned "${payload.taskTitle}" to ${member.name}. Updated mock load: ${getTeamSummary()}`
      : `I could not find ${payload.memberName} in the mock roster.`
  });
});

app.command("/lumin-summary", async ({ ack, respond }) => {
  await ack();
  await respond(`Current mock invisible-labor load: ${getTeamSummary()}`);
});

await app.start();
console.log("Lumin Slack bot is running in Socket Mode.");
