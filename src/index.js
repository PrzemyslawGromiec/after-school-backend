import { buildApp } from './app.js';
import { connectDB } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'after_school';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI'); process.exit(1);
}

await connectDB(MONGODB_URI, DB_NAME);
const app = buildApp({ corsOrigin: CORS_ORIGIN });
app.listen(PORT, () => console.log(`API listening on :${PORT}`));