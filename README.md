
# Fair&

Fair& is a small prototype project for detecting and rebalancing "invisible labor" requests. This repository contains:

- `client/` — React UI (Equity console) used to visualize task distribution and team policies.
- `server/` — Local API used by the client for demo data.
- `src/` — Slack bot / tooling code (minimal, no-database Slack bot MVP).

This README covers local development and how to run the pieces.

## Prerequisites

- Node.js 18+ and npm
- (Optional) A Slack workspace and app if you intend to run the Slack bot

## Install

Install dependencies for each part of the project:

```bash
# root (Slack bot / shared libs)
npm install

# client (React app)
cd client && npm install

# server (local API)
cd ../server && npm install
```

## Run (development)

Open three terminals or use a process manager.

- Start the demo API server (default port 3001):

```bash
cd server
npm run server
```

- Start the React client (default port 3000):

```bash
cd client
npm start
```

- Start the Slack bot (if configured):

```bash
# from repository root
npm run bot:always
```

### Environment

- Copy any example env files (for the bot or server) to `.env` and fill values. The client reads `REACT_APP_API_BASE_URL` to override the default `http://localhost:3001` API base.

## Notes

- The client exposes a time-window selector (7/14/30/90/All time). `All time` now shows the full task history. Other windows (7/30/90) filter the complete task dataset so they reflect true last-N-days results, independent of `policy.lookbackDays` which continues to control policy-driven team views.
- The server mounts demo APIs under `/api` (e.g. `/api/team-members`, `/api/tasks/with-details`).
- The Slack bot is a minimal, in-memory demo — restarting the process resets state.

## Troubleshooting

- If the client can't reach the API, set `REACT_APP_API_BASE_URL` and restart the client.
- If ports conflict, change `PORT` in the server environment or run the client on a different port.

If you'd like this README to include CI steps, deployment guidance, or a short architecture diagram, tell me what to add and I will update it.
