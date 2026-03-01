# Nur Ramadan — Daily Companion

A Ramadan companion app: prayer times, habits, Quran tracking, and AI-powered Sehri/Iftar recipes. Data is stored locally; no mock auth or mock data in production.

## Prerequisites

- **Node.js** (v18+)
- **pnpm** (`corepack enable` then `corepack prepare pnpm@latest --activate`, or `npm install -g pnpm`)
- **Gemini API key** (optional; for user-triggered AI: recipe generation in Kitchen and optional “Generate with AI” for Daily Wisdom)
- **Google OAuth Client ID** (for real sign-in)

## Run locally

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure environment**
   - Copy [.env.example](.env.example) to `.env` or `.env.local`.
   - Set:
     - `GEMINI_API_KEY` — (optional) from [Google AI Studio](https://aistudio.google.com/app/apikey).
     - `VITE_GOOGLE_CLIENT_ID` — from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth 2.0 Client ID, Web application). Add authorized JavaScript origins (e.g. `http://localhost:3000`).
     - `VITE_API_URL` — (optional) your backend API base URL if you use the [server](server/README.md) (e.g. `http://localhost:4000`) so user data is synced to MongoDB.

3. **Start dev server**
   - Frontend only: `pnpm dev` → open `http://localhost:3000`.
   - Frontend and API together: `pnpm dev:all` (runs Vite and the Node API; ensure `server/.env` has `MONGODB_URI` and `GOOGLE_CLIENT_ID`, and root `.env` has `VITE_API_URL=http://localhost:4000`).

## Production build

```bash
pnpm build
pnpm preview   # optional: test production build locally
```

Deploy the `dist` folder to any static host (Vercel, Netlify, etc.). Ensure:

- **SPA fallback**: The app is a single-page app with client-side routing. The server must serve `index.html` for all routes (e.g. `/`, `/habits`, `/quran`, `/kitchen`, `/settings`, `/login`) so deep links and refresh work. On Netlify add a `_redirects` file with `/* /index.html 200`; on Vercel use a `rewrites` entry to `/index.html`.
- **Env in build**: `GEMINI_API_KEY` (optional) and `VITE_GOOGLE_CLIENT_ID` are set in the build environment (e.g. in the host’s env / build settings). `VITE_*` is embedded at build time.
- **Authorized origins**: In Google Cloud, add your production origin (e.g. `https://yourdomain.com`) to the OAuth client’s authorized JavaScript origins.

## What’s real (no mocks)

- **Auth**: Google Sign-In via OAuth. If `VITE_GOOGLE_CLIENT_ID` is missing, the login screen shows configuration instructions.
- **Prayer times**: [Aladhan API](https://aladhan.com/prayer-times-api) by coordinates.
- **Location**: Browser geolocation or city search (Nominatim). Fallback to Mecca if location fails.
- **Data**: IndexedDB in the browser for fast reads and offline use. When `VITE_API_URL` is set, user-specific data (profile, habits, Quran, recipes) is also synced to your backend (e.g. MongoDB via the included [server](server/README.md)). The app always reads from the cache first; writes go to the cache and then to the API in the background. **Security**: no database credentials or secrets are ever in the frontend; the backend validates the Google ID token on every request.
- **AI**: We avoid using Gemini more than needed. AI is only called when you explicitly ask: recipe generation in Kitchen (e.g. “Surprise Me”) and the optional “Generate with AI” button for Daily Wisdom. By default, greeting and Daily Wisdom use local or public (Quotable) data so we don’t hit the API on every load. If `GEMINI_API_KEY` is not set, those AI actions are hidden or use local fallbacks.

## Optional: MongoDB backend

To store user data in MongoDB (or any API that implements the same contract), add the API URL to env and run the included server:

1. In the repo root, set `VITE_API_URL` (e.g. `http://localhost:4000`) in `.env`.
2. In `server/`, copy `server/.env.example` to `server/.env`, set `MONGODB_URI` and `GOOGLE_CLIENT_ID`, then run `npm install && npm run dev`.

See [server/README.md](server/README.md) for security notes and endpoints. The frontend sends the Google ID token in the `Authorization` header; the server verifies it and never exposes MongoDB credentials.

## Deploy on Vercel (frontend + API in one project)

The repo is set up so **one Vercel deployment** serves both the SPA and the API (serverless). The API runs as a serverless function under `/api/*` and uses the same Express app as the standalone server.

1. **Push to GitHub** and import the project in [Vercel](https://vercel.com). Use the root as the project directory; Vercel will use `vercel.json` for build and rewrites.

2. **Environment variables** (Vercel → Project → Settings → Environment Variables). Add for **Production** (and Preview if you want):
   - `MONGODB_URI` — your MongoDB connection string (e.g. [MongoDB Atlas](https://www.mongodb.com/atlas)).
   - `GOOGLE_CLIENT_ID` — same value as your Google OAuth Client ID (used to verify ID tokens).
   - `VITE_GOOGLE_CLIENT_ID` — same value (used by the frontend for sign-in).
   - `VITE_API_URL` — **must be your Vercel deployment URL** so the frontend calls your own API (e.g. `https://your-project.vercel.app`). After the first deploy, copy the deployment URL and set `VITE_API_URL` to it, then redeploy so the build picks it up.
   - `GEMINI_API_KEY` — (optional) for user-triggered AI.

3. **Google Cloud**: Add your Vercel URL to the OAuth client’s **Authorized JavaScript origins** (e.g. `https://your-project.vercel.app`).

4. Deploy. The frontend is served from `dist/`; `/api/*` is handled by the serverless function that connects to MongoDB and runs the same API as the standalone server.

## Scripts

| Command            | Description                              |
|--------------------|------------------------------------------|
| `pnpm dev`         | Frontend only (Vite)                     |
| `pnpm dev:all`     | Frontend + API (Vite + Node server)      |
| `pnpm build`       | Production build to `dist`               |
| `pnpm preview`     | Serve `dist` locally                     |
