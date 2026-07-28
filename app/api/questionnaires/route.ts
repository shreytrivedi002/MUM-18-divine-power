import { NextResponse } from "next/server";
import { getMongoDb } from "../../../lib/mongodbClient";
import fallbackQuestionnaires from "../../../scripts/questionnaires.json";

function toSafeDocuments(documents: any[]) {
  return documents.map((doc) => ({
    ...doc,
    _id: doc?._id ? String(doc._id) : undefined,
  }));
}

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(toSafeDocuments(fallbackQuestionnaires as any[]));
  }

  try {
    const { db } = await getMongoDb();
    const collectionName =
      process.env.MONGODB_QUESTIONNAIRE_COLLECTION || "questionnaires";
    const documents = await db.collection(collectionName).find().toArray();

    if (!documents.length) {
      return NextResponse.json(
        toSafeDocuments(fallbackQuestionnaires as any[]),
      );
    }

    return NextResponse.json(toSafeDocuments(documents));
  } catch (error) {
    console.error("Failed to load questionnaires from MongoDB:", error);
    return NextResponse.json(toSafeDocuments(fallbackQuestionnaires as any[]));
  }
}
