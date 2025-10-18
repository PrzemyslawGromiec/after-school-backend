import { MongoClient, ObjectId } from 'mongodb';

let client, db;

export async function connectDB(uri, dbName) {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  console.log('✅ Mongo connected:', db.databaseName);
  return db;
}

export function col(name) {
  if (!db) throw new Error('DB not connected');
  return db.collection(name);
}

export { ObjectId };