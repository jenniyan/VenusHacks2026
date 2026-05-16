# Lumin Slack Bot

A tiny no-database Slack bot MVP for Lumin. It listens for likely invisible-labor requests, explains why the message was flagged, and suggests the lowest-load teammate from mock in-memory data.

## Run locally

1. Create a Slack app with Socket Mode enabled.
2. Add these bot scopes:
   - `app_mentions:read`
   - `channels:history`
   - `chat:write`
   - `commands`
3. Subscribe to the `message.channels` bot event.
4. Create a slash command named `/lumin-summary`.
5. Copy `.env.example` to `.env` and fill in:
   - `SLACK_BOT_TOKEN`, which starts with `xoxb-`
   - `SLACK_APP_TOKEN`, which starts with `xapp-`
6. Install and start:

```bash
npm install
npm start
```

Try a message like:

```text
Can Sarah organize the team dinner again?
```

The bot uses mock in-memory task counts only. Restarting the process resets accepted assignments.
