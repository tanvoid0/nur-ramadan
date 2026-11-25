/**
 * Standalone server entry. For Vercel, the api/ folder is used instead.
 * loadEnv.js must run first so process.env is set before db.js and app.js load.
 */
import './loadEnv.js';
import app from './app.js';
import { connect } from './db.js';

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

if (!MONGODB_URI && !process.env.GEMINI_API_KEY) {
  console.warn('[api] MONGODB_URI and GEMINI_API_KEY not set. Copy server/.env.example to server/.env to run the API. Frontend works without it.');
  process.exit(0);
}
if (!GOOGLE_CLIENT_ID) {
  console.warn('Missing VITE_GOOGLE_CLIENT_ID: API will not validate tokens (unsafe for production). Set it in root .env (shared with frontend).');
}

(MONGODB_URI ? connect() : Promise.resolve())
  .then(() => {
    app.listen(PORT, () => console.log(`Nur Ramadan API listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed', err);
    process.exit(1);
  });
