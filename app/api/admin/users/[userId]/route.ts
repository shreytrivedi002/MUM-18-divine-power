import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "../../../../../lib/mongodbClient";
import {
  getAdminContextFromToken,
  parseAdminSessionToken,
} from "../../../../../lib/adminAuth";
import {
  normalizeUserDocument,
  type AdminUserDocument,
} from "../../../../../lib/adminData";

type QuestionnaireDoc = {
  slug?: string;
  title?: string;
  questions?: Array<{
    key?: string;
    category?: string;
  }>;
};

function toSafeString(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

export async function GET(
  request: Request,
  { params }: { params: { userId: string } },
) {
  const token = parseAdminSessionToken(request.headers.get("cookie"));
  const { db } = await getMongoDb();
  const admin = await getAdminContextFromToken(db, token);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(params.userId);
  } catch {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const usersCollection = process.env.MONGODB_USERS_COLLECTION || "users";
  const user = (await db
    .collection(usersCollection)
    .findOne({ _id: objectId })) as AdminUserDocument | null;

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const collectionName =
    process.env.MONGODB_QUESTIONNAIRE_COLLECTION || "questionnaires";
  const questionnaires = (await db
    .collection(collectionName)
    .find({}, { projection: { slug: 1, title: 1, questions: 1 } })
    .toArray()) as QuestionnaireDoc[];

  const sectionLookupBySlug = new Map<string, Map<string, string>>();
  const sectionLookupByTitle = new Map<string, Map<string, string>>();

  for (const questionnaire of questionnaires) {
    const questionSectionMap = new Map<string, string>();
    for (const question of questionnaire.questions || []) {
      const key = toSafeString(question.key);
      if (!key) {
        continue;
      }
      questionSectionMap.set(key, toSafeString(question.category) || "General");
    }

    const slug = toSafeString(questionnaire.slug);
    const title = toSafeString(questionnaire.title);

    if (slug) {
      sectionLookupBySlug.set(slug, questionSectionMap);
    }
    if (title) {
      sectionLookupByTitle.set(title, questionSectionMap);
    }
  }

  const normalized = normalizeUserDocument(user) as any;
  const responses = Array.isArray(normalized.responses)
    ? normalized.responses
    : [];

  normalized.responses = responses.map((response: any) => {
    const slug = toSafeString(response.questionnaireSlug);
    const title = toSafeString(response.questionnaireTitle);
    const sectionMap =
      sectionLookupBySlug.get(slug) ||
      sectionLookupByTitle.get(title) ||
      new Map<string, string>();

    const answers = Array.isArray(response.answers) ? response.answers : [];
    return {
      ...response,
      answers: answers.map((answer: any) => {
        const key = toSafeString(answer.key);
        return {
          ...answer,
          section: sectionMap.get(key) || "General",
        };
      }),
    };
  });

  return NextResponse.json({ user: normalized });
}
