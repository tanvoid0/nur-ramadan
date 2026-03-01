/**
 * Load env before any other server code. Must be imported first so process.env
 * is populated before db.js and app.js read it (ESM runs all imports before body).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config(); // server/.env (cwd is server when run via npm run dev)
dotenv.config({ path: path.join(__dirname, '..', '.env') }); // root .env (VITE_GOOGLE_CLIENT_ID)
