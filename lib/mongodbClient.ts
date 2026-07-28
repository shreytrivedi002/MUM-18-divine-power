import { MongoClient, Db } from "mongodb";

const dbName = process.env.MONGODB_DB_NAME || "healthifi";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getMongoDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing the MONGODB_URI environment variable.");
  }

  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri as string);
  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
