/**
 * Express app for Nur Ramadan API. Used by server/index.js (standalone) and api/ (Vercel serverless).
 */
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { connect, getCollections } from './db.js';

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const app = express();
app.use(express.json({ limit: '1mb' }));

const ALLOW_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

async function verifyToken(token) {
  if (!token || !googleClient) return null;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    return payload ? { sub: payload.sub, email: payload.email } : null;
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  verifyToken(token).then((user) => {
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.auth = user;
    next();
  }).catch(() => res.status(401).json({ error: 'Unauthorized' }));
}

// Routes use getCollections() so they work after connect() has run
app.get('/api/user', authMiddleware, async (req, res) => {
  try {
    const { usersCol } = getCollections();
    const doc = await usersCol.findOne({ email: req.auth.email });
    if (!doc) return res.json(null);
    const { _id, ...rest } = doc;
    res.json({ ...rest, id: rest.id || (_id && _id.toString()) });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.put('/api/user', authMiddleware, async (req, res) => {
  try {
    const { usersCol } = getCollections();
    const body = req.body;
    const doc = { ...body, email: req.auth.email };
    delete doc._id;
    await usersCol.updateOne(
      { email: req.auth.email },
      { $set: doc },
      { upsert: true }
    );
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/habits', authMiddleware, async (req, res) => {
  try {
    const { habitsCol } = getCollections();
    const doc = await habitsCol.findOne({ userEmail: req.auth.email });
    res.json(doc?.data ?? null);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.put('/api/habits', authMiddleware, async (req, res) => {
  try {
    const { habitsCol } = getCollections();
    await habitsCol.updateOne(
      { userEmail: req.auth.email },
      { $set: { userEmail: req.auth.email, data: req.body } },
      { upsert: true }
    );
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/quran', authMiddleware, async (req, res) => {
  try {
    const { quranCol } = getCollections();
    const doc = await quranCol.findOne({ userEmail: req.auth.email });
    res.json(doc?.data ?? null);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.put('/api/quran', authMiddleware, async (req, res) => {
  try {
    const { quranCol } = getCollections();
    await quranCol.updateOne(
      { userEmail: req.auth.email },
      { $set: { userEmail: req.auth.email, data: req.body } },
      { upsert: true }
    );
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/recipes', authMiddleware, async (req, res) => {
  try {
    const { recipesCol } = getCollections();
    const list = await recipesCol.find({ userEmail: req.auth.email }).sort({ createdAt: -1 }).toArray();
    res.json(list.map((r) => ({ ...r, id: r.id || r._id.toString() })));
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/recipes', authMiddleware, async (req, res) => {
  try {
    const { recipesCol } = getCollections();
    const body = req.body;
    const doc = { ...body, userEmail: req.auth.email };
    await recipesCol.insertOne(doc);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.delete('/api/recipes/:id', authMiddleware, async (req, res) => {
  try {
    const { recipesCol, ObjectId } = getCollections();
    const { id } = req.params;
    let result = await recipesCol.deleteOne({ id, userEmail: req.auth.email });
    if (result.deletedCount === 0 && ObjectId.isValid(id)) {
      result = await recipesCol.deleteOne({ _id: new ObjectId(id), userEmail: req.auth.email });
    }
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

export default app;
