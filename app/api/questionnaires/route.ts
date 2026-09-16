import { NextResponse } from "next/server";
import { getMongoDb } from "../../../lib/mongodbClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toSafeDocuments(documents: any[]) {
  return documents.map((doc) => ({
    ...doc,
    _id: doc?._id ? String(doc._id) : undefined,
  }));
}

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Questionnaire database is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { db } = await getMongoDb();
    const collectionName =
      process.env.MONGODB_QUESTIONNAIRE_COLLECTION || "questionnaires";
    const documents = await db.collection(collectionName).find().toArray();

    if (!documents.length) {
      return NextResponse.json(
        { error: "No questionnaires found in the configured database." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(toSafeDocuments(documents), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to load questionnaires from MongoDB:", error);
    return NextResponse.json(
      { error: "Unable to load questionnaires from the configured database." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
