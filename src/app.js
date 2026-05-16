import "dotenv/config";
import slackBolt from "@slack/bolt";
import { createDataProvider } from "./dataProvider.js";
import { createLuminService } from "./lumin.js";
import {
  buildAssignmentMessage,
  buildDetectionMessage,
  buildNoDetectionMessage,
  buildResetMessage,
  buildRosterMessage,
  buildSummaryMessage,
  removeActionBlocks
} from "./slackViews.js";

const { App } = slackBolt;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

const dataProvider = createDataProvider({
  slackClient: app.client
});
const lumin = createLuminService(dataProvider);

app.message(async ({ message, say, logger }) => {
  try {
    if (!message.text || message.subtype === "bot_message") {
      return;
    }

    const analysis = await lumin.analyzeMessage(message.text);

    if (!analysis.isNpt) {
      return;
    }

    await say({
      ...buildDetectionMessage(analysis, dataProvider.mode),
      thread_ts: message.ts
    });
  } catch (error) {
    logger.error(error);
  }
});

app.action("assign_suggested", async ({ ack, body, client, logger }) => {
  await ack();

  try {
    const payload = parseActionValue(body);
    const result = await lumin.recordAssignment(payload);

    if (!result) {
      await postThreadMessage(client, body, {
        text: "I could not find that teammate in the Lumin roster."
      });
      return;
    }

    await updateOriginalMessage(client, body, "Suggestion accepted and recorded.");
    await postThreadMessage(client, body, buildAssignmentMessage(result));
  } catch (error) {
    logger.error(error);
    await postThreadMessage(client, body, {
      text: "Lumin could not record that assignment. Check the bot logs."
    });
  }
});

app.action("show_team_load", async ({ ack, body, client, logger }) => {
  await ack();

  try {
    const summary = await lumin.getSummary();
    await postThreadMessage(client, body, buildSummaryMessage({
      ...summary,
      mode: dataProvider.mode
    }));
  } catch (error) {
    logger.error(error);
  }
});

app.action("dismiss_suggestion", async ({ ack, body, client, logger }) => {
  await ack();

  try {
    await updateOriginalMessage(client, body, "Suggestion dismissed.");
  } catch (error) {
    logger.error(error);
  }
});

app.command("/lumin-summary", async ({ ack, respond }) => {
  await ack();
  const summary = await lumin.getSummary();

  await respond({
    response_type: "ephemeral",
    ...buildSummaryMessage({
      ...summary,
      mode: dataProvider.mode
    })
  });
});

app.command("/lumin-roster", async ({ ack, respond }) => {
  await ack();
  const { team } = await lumin.getSummary();

  await respond({
    response_type: "ephemeral",
    ...buildRosterMessage(team, dataProvider.mode)
  });
});

app.command("/lumin-demo-reset", async ({ ack, respond }) => {
  await ack();
  const result = await lumin.resetDemoData();

  await respond({
    response_type: "ephemeral",
    ...buildResetMessage(result, dataProvider.mode)
  });
});

app.command("/lumin-analyze", async ({ ack, command, respond }) => {
  await ack();

  const text = command.text?.trim();
  if (!text) {
    await respond({
      response_type: "ephemeral",
      text: "Usage: /lumin-analyze Can Sarah organize the team dinner again?"
    });
    return;
  }

  const analysis = await lumin.analyzeMessage(text);
  const message = analysis.isNpt
    ? buildDetectionMessage(analysis, dataProvider.mode)
    : buildNoDetectionMessage(text);

  await respond({
    response_type: "in_channel",
    ...message
  });
});

app.error(async (error) => {
  console.error("Lumin Slack bot error:", error);
});

await app.start();
console.log(`Lumin Slack bot is running in Socket Mode with ${dataProvider.mode} data.`);

function parseActionValue(body) {
  return JSON.parse(body.actions[0].value);
}

async function updateOriginalMessage(client, body, note) {
  const message = body.message;

  if (!message?.ts || !body.channel?.id) {
    return;
  }

  await client.chat.update({
    channel: body.channel.id,
    ts: message.ts,
    text: `${message.text || "Lumin suggestion"} ${note}`,
    blocks: removeActionBlocks(message.blocks || [], note)
  });
}

async function postThreadMessage(client, body, message) {
  await client.chat.postMessage({
    channel: body.channel.id,
    thread_ts: body.message?.thread_ts || body.message?.ts,
    ...message
  });
}
