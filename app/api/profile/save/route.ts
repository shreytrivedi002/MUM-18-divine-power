import { NextResponse } from "next/server";
import { getMongoDb } from "../../../../lib/mongodbClient";
import {
  QuestionnaireQuestion,
  isValidIndianPhone,
  normalizeIndianPhone,
  pickContactValue,
  toSafeString,
} from "../../../../lib/surveyContact";

/**
 * Upserts core contact fields as soon as the profile section is completed,
 * so the user appears in the admin panel even before the full survey is submitted.
 */
export async function POST(request: Request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Missing MONGODB_URI environment variable" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const questionnaireSlug = toSafeString((body as any).questionnaireSlug);
  const submittedValues =
    (body as any).values && typeof (body as any).values === "object"
      ? ((body as any).values as Record<string, unknown>)
      : null;

  if (!submittedValues) {
    return NextResponse.json(
      { error: "Invalid values payload" },
      { status: 400 },
    );
  }

  const { db } = await getMongoDb();
  const questionnairesCollection =
    process.env.MONGODB_QUESTIONNAIRE_COLLECTION || "questionnaires";

  const questionnaire = await db
    .collection(questionnairesCollection)
    .findOne({ slug: questionnaireSlug });

  const questions: QuestionnaireQuestion[] = Array.isArray(
    (questionnaire as any)?.questions,
  )
    ? ((questionnaire as any).questions as QuestionnaireQuestion[])
    : [];

  const emailRaw = pickContactValue(
    submittedValues,
    questions,
    ["email"],
    ["email", "e-mail", "mail"],
  );
  const fullNameRaw = pickContactValue(
    submittedValues,
    questions,
    ["text"],
    ["name", "full name", "fullname"],
  );
  const phoneRaw = pickContactValue(
    submittedValues,
    questions,
    ["phone", "tel"],
    ["phone", "mobile", "contact"],
  );
  const email = emailRaw.toLowerCase();

  if (!email) {
    return NextResponse.json(
      { error: "Email is required to save profile." },
      { status: 400 },
    );
  }

  if (phoneRaw && !isValidIndianPhone(phoneRaw)) {
    return NextResponse.json(
      { error: "Please provide a valid Indian mobile number." },
      { status: 400 },
    );
  }

  const normalizedPhone = phoneRaw
    ? `+91${normalizeIndianPhone(phoneRaw)}`
    : "";
  const now = new Date();
  const usersCollection = process.env.MONGODB_USERS_COLLECTION || "users";
  await db
    .collection(usersCollection)
    .createIndex({ email: 1 }, { unique: true });

  const updateResult = await db.collection(usersCollection).updateOne(
    { email },
    {
      $setOnInsert: {
        email,
        createdAt: now,
      },
      $set: {
        ...(fullNameRaw ? { fullName: fullNameRaw } : {}),
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  const userId = updateResult.upsertedId
    ? String(updateResult.upsertedId)
    : String(
        (
          await db
            .collection(usersCollection)
            .findOne({ email }, { projection: { _id: 1 } })
        )?._id ?? "",
      );

  return NextResponse.json({ success: true, userId });
}
