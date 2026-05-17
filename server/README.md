## Server

Quick instructions for running the local API server used by the client.

Prereqs
- Node.js (16+ recommended)

Install

```bash
npm install
```

Run

```bash
npm run server
```

Notes
- Default server port: `3001` (change with `PORT` env var).
- The server uses `dotenv` and will load `.env` if present.
- CORS is configured to allow `http://localhost:3000` by default.
- Client expects the API base at `http://localhost:3001` unless `REACT_APP_API_BASE_URL` is set in the client environment.

API prefix: all routes are mounted under `/api` (e.g. `/api/team-members`).

If you need help with environment variables or deployment, ask and I can add more detail.