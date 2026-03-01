/**
 * Vercel serverless catch-all: handles all /api/* requests with the Express app.
 * Set MONGODB_URI and VITE_GOOGLE_CLIENT_ID in Vercel project Environment Variables (same as frontend).
 */
import app from '../server/app.js';
import { connect } from '../server/db.js';

export default async function handler(req, res) {
  await connect();
  app(req, res);
}
