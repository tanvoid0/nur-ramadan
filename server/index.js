/**
 * Standalone server entry. For Vercel, the api/ folder is used instead.
 */
import app from './app.js';
import { connect } from './db.js';

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}
if (!GOOGLE_CLIENT_ID) {
  console.warn('Missing GOOGLE_CLIENT_ID: API will not validate tokens (unsafe for production).');
}

connect()
  .then(() => {
    app.listen(PORT, () => console.log(`Nur Ramadan API listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed', err);
    process.exit(1);
  });
