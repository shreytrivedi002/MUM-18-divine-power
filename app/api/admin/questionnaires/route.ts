import { NextResponse } from "next/server";
import { getMongoDb } from "../../../../lib/mongodbClient";
import {
  getAdminContextFromToken,
  parseAdminSessionToken,
} from "../../../../lib/adminAuth";

type QuestionDoc = {
  key: string;
  label: string;
  type: string;
  category?: string;
  required?: boolean;
  options?: string[];
};

type QuestionnaireDoc = {
  _id?: unknown;
  slug: string;
  title: string;
  description?: string;
  questions: QuestionDoc[];
  sections?: string[];
};

function toSafeString(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

export async function GET(request: Request) {
  const token = parseAdminSessionToken(request.headers.get("cookie"));
  const { db } = await getMongoDb();
  const context = await getAdminContextFromToken(db, token);

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (context.admin.role !== "superadmin") {
    return NextResponse.json(
      { error: "Only superadmin can manage questionnaires." },
      { status: 403 },
    );
  }

  const collectionName =
    process.env.MONGODB_QUESTIONNAIRE_COLLECTION || "questionnaires";
  const questionnaires = (await db
    .collection(collectionName)
    .find(
      {},
      {
        projection: {
          slug: 1,
          title: 1,
          description: 1,
          questions: 1,
          sections: 1,
        },
      },
    )
    .toArray()) as QuestionnaireDoc[];

  const data = questionnaires.map((item) => {
    const categoriesFromQuestions = Array.from(
      new Set(
        (item.questions || [])
          .map((question) => toSafeString(question.category) || "General")
          .filter(Boolean),
      ),
    );

    const sections = Array.from(
      new Set([...(item.sections || []), ...categoriesFromQuestions]),
    );

    return {
      id: item._id ? String(item._id) : item.slug,
      slug: item.slug,
      title: item.title,
      description: item.description || "",
      sections,
      questionCount: Array.isArray(item.questions) ? item.questions.length : 0,
    };
  });

  return NextResponse.json({ questionnaires: data });
}
