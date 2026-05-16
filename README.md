# Lumin Slack Bot

A no-database Slack bot MVP for Lumin. It listens for likely invisible-labor requests, explains why the message was flagged, suggests the lowest-load teammate from mock in-memory data, and gives you demo-friendly Slack buttons and slash commands.

## Run locally

1. Create a Slack app with Socket Mode enabled.
2. Add these bot scopes:
   - `app_mentions:read`
   - `channels:history`
   - `chat:write`
   - `commands`
   - `users:read`
3. Subscribe to the `message.channels` bot event.
4. Turn on **Interactivity & Shortcuts**.
5. Create these slash commands:
   - `/lumin-summary`
   - `/lumin-roster`
   - `/lumin-demo-reset`
   - `/lumin-analyze`
6. Reinstall the app to your Slack workspace after changing scopes, events, or slash commands.
7. Copy `.env.example` to `.env` and fill in:
   - `SLACK_BOT_TOKEN`, which starts with `xoxb-`
   - `SLACK_APP_TOKEN`, which starts with `xapp-`
8. Install and start:

```bash
npm install
npm start
```

Try a message like:

```text
Can Sarah organize the team dinner again?
```

The bot will reply in-thread with:

- detected task category
- confidence score
- reason it was flagged
- requested teammate
- suggested fairer teammate
- buttons for **Assign**, **Show team load**, and **Dismiss**

## Demo commands

```text
/lumin-summary
/lumin-roster
/lumin-demo-reset
/lumin-analyze Can Sarah organize the team dinner again?
```

`/lumin-analyze` posts a visible demo response in the channel. The other commands respond privately to the user.

## Mock data and backend handoff

By default, the bot uses mock in-memory data:

```bash
USE_MOCK_DATA=true
```

Restarting the process resets accepted assignments. You can also reset while the bot is running:

```text
/lumin-demo-reset
```

When the backend is ready, set:

```bash
USE_MOCK_DATA=false
BACKEND_URL=http://localhost:5000
```

The bot will call these endpoints:

```text
GET  /api/lumin/team
GET  /api/lumin/tasks
POST /api/lumin/tasks
POST /api/lumin/demo-reset
```

## Optional Slack mention mapping

Slack mentions look like `<@U123ABC>`. To map real Slack users to mock roster members, add this to `.env`:

```bash
LUMIN_SLACK_USER_MAP=sarah:U123ABC,alex:U456DEF
```

The mock roster IDs are:

```text
sarah, alex, daniel, maya, chris
```

## Use real Slack users as the mock roster

If you want the mock data to attach to real Slack accounts, add the `users:read` bot scope, reinstall the Slack app, then set:

```bash
LUMIN_USE_SLACK_ROSTER=true
```

Restart the bot:

```bash
npm start
```

Now `/lumin-roster` will show actual workspace users. The task history is still fake demo data, but it gets assigned across real Slack accounts so suggestions and mentions look real in Slack.
