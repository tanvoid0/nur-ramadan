/**
 * MongoDB connection and collections. Used by both the standalone server and Vercel serverless.
 */
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
let client;
let usersCol;
let habitsCol;
let quranCol;
let recipesCol;

export async function connect() {
  if (client) return;
  if (!MONGODB_URI) throw new Error('Missing MONGODB_URI');
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('nur_ramadan');
  usersCol = db.collection('users');
  habitsCol = db.collection('habits');
  quranCol = db.collection('quran');
  recipesCol = db.collection('recipes');
  await usersCol.createIndex({ email: 1 }, { unique: true });
  await habitsCol.createIndex({ userEmail: 1 });
  await quranCol.createIndex({ userEmail: 1 });
  await recipesCol.createIndex({ userEmail: 1 });
}

export function getCollections() {
  return { usersCol, habitsCol, quranCol, recipesCol, ObjectId };
}
