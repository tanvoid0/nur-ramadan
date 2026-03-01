# Nur Ramadan API (optional backend)

Minimal Express + MongoDB API for syncing user data. The frontend uses **IndexedDB as cache** and syncs with this API when `VITE_API_URL` is set. No MongoDB credentials or secrets are ever sent to the browser — only the public API URL; auth is via Google ID token in the `Authorization` header.

## Security

- **MONGODB_URI** stays in server env. **VITE_GOOGLE_CLIENT_ID** is set once in the root `.env` and used by both frontend and server (server loads root .env).
- Every request must send `Authorization: Bearer <google-id-token>`. The server verifies the token with Google and uses the token’s `email` to scope all data.
- Use **HTTPS** in production. Set **CORS_ORIGIN** to your frontend origin in production.

## Setup

1. Copy `.env.example` to `.env` and set **MONGODB_URI** (e.g. [MongoDB Atlas](https://www.mongodb.com/atlas) or local). The server reads **VITE_GOOGLE_CLIENT_ID** from the root `.env` (same variable as the frontend; no need to set it in server/.env).
2. Install and run:
   ```bash
   cd server && npm install && npm run dev
   ```
3. In the frontend `.env`, set `VITE_API_URL=http://localhost:4000` (or your deployed API URL).

## Endpoints

All require `Authorization: Bearer <google-id-token>`.

| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/user   | Current user profile |
| PUT    | /api/user   | Upsert user |
| GET    | /api/habits | User's habits |
| PUT    | /api/habits | Upsert habits |
| GET    | /api/quran  | User's Quran progress |
| PUT    | /api/quran  | Upsert Quran progress |
| GET    | /api/recipes | List recipes |
| POST   | /api/recipes | Add recipe |
| DELETE | /api/recipes/:id | Delete recipe |
