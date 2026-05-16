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

## Backend setup

The backend has been added in `backend/` and uses Supabase for route handling.

1. Create a `backend/.env` or place Supabase keys in the root `.env`.
2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Start the backend:

```bash
npm run dev
```

The backend exposes:
- `GET /api/health`
- `GET /api/items`
- `POST /api/items`
- `GET /api/profile/:id`

Customize `backend/routes/supabaseRoutes.js` for your app-specific Supabase routes.

Try a message like:

```text
Can Sarah organize the team dinner again?
```

The bot uses mock in-memory task counts only. Restarting the process resets accepted assignments.
