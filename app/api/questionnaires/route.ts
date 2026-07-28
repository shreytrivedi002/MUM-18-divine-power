import { NextResponse } from "next/server";
import { getMongoDb } from "../../../lib/mongodbClient";

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Missing MONGODB_URI environment variable" },
      { status: 500 },
    );
  }

  const { db } = await getMongoDb();
  const collectionName =
    process.env.MONGODB_QUESTIONNAIRE_COLLECTION || "questionnaires";
  const documents = await db.collection(collectionName).find().toArray();
  const safeDocuments = documents.map((doc) => ({
    ...doc,
    _id: String(doc._id),
  }));
  return NextResponse.json(safeDocuments);
}
