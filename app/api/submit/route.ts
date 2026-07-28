import { NextResponse } from "next/server";
import { getMongoDb } from "../../../lib/mongodbClient";

type QuestionnaireQuestion = {
  key?: string;
  label?: string;
  type?: string;
};

type AnswerEntry = {
  key: string;
  question: string;
  answer: unknown;
};

function toSafeString(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function pickContactValue(
  values: Record<string, unknown>,
  questions: QuestionnaireQuestion[],
  typeHints: string[],
  keyHints: string[],
) {
  for (const question of questions) {
    const key = toSafeString(question.key);
    const label = toSafeString(question.label).toLowerCase();
    const type = toSafeString(question.type).toLowerCase();
    if (!key) {
      continue;
    }

    const matchesType = typeHints.includes(type);
    const matchesKeyOrLabel = keyHints.some(
      (hint) => key.toLowerCase().includes(hint) || label.includes(hint),
    );

    if (matchesType || matchesKeyOrLabel) {
      const raw = values[key];
      const picked = toSafeString(raw);
      if (picked) {
        return picked;
      }
    }
  }

  for (const key of Object.keys(values)) {
    const lowered = key.toLowerCase();
    const matches = keyHints.some((hint) => lowered.includes(hint));
    if (matches) {
      const picked = toSafeString(values[key]);
      if (picked) {
        return picked;
      }
    }
  }

  return "";
}

export async function POST(request: Request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Missing MONGODB_URI environment variable" },
      { status: 500 },
    );
  }

  const body = await request.json();

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const questionnaireSlug = toSafeString((body as any).questionnaireSlug);
  const questionnaireTitle = toSafeString((body as any).questionnaireTitle);
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
  const phoneRaw = pickContactValue(
    submittedValues,
    questions,
    ["phone", "tel"],
    ["phone", "mobile", "contact"],
  );
  const email = emailRaw.toLowerCase();
  const phone = phoneRaw;

  if (!email) {
    return NextResponse.json(
      { error: "Email is required for submission." },
      { status: 400 },
    );
  }

  const answers: AnswerEntry[] =
    questions.length > 0
      ? questions.map((question) => {
          const key = toSafeString(question.key);
          return {
            key,
            question: toSafeString(question.label) || key,
            answer: submittedValues[key],
          };
        })
      : Object.entries(submittedValues).map(([key, answer]) => ({
          key,
          question: key,
          answer,
        }));

  const submittedAt = new Date();
  const submission = {
    questionnaireSlug,
    questionnaireTitle,
    submittedAt,
    timestamp: submittedAt.toISOString(),
    answers,
  };

  const usersCollection = process.env.MONGODB_USERS_COLLECTION || "users";
  await db
    .collection(usersCollection)
    .createIndex({ email: 1 }, { unique: true });

  await db.collection(usersCollection).updateOne(
    { email },
    {
      $setOnInsert: {
        email,
        createdAt: submittedAt,
      },
      $set: {
        ...(phone ? { phone } : {}),
        updatedAt: submittedAt,
      },
      $push: {
        responses: submission,
      },
    } as any,
    { upsert: true },
  );

  return NextResponse.json({ success: true });
}
