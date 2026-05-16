# VenusHacks Backend

This folder contains a small Express backend configured for Supabase route handling.

## Setup

1. Copy the root `.env.example` values into `backend/.env` or keep them in the root `.env`.
2. Set `SUPABASE_URL` and either `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
3. Install dependencies:

```bash
cd backend
npm install
```

4. Start the server:

```bash
npm run dev
```

## Available routes

- `GET /api/health`
- `GET /api/items`
- `POST /api/items`
- `GET /api/profile/:id`

Customize `backend/routes/supabaseRoutes.js` to add additional Supabase-powered endpoints.
