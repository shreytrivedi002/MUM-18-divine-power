import { NextResponse } from "next/server";
import { getMongoDb } from "../../../../../lib/mongodbClient";
import {
  getAdminContextFromToken,
  parseAdminSessionToken,
} from "../../../../../lib/adminAuth";

type QuestionDoc = {
  key: string;
  label: string;
  type: string;
  category?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  minValue?: number;
  maxValue?: number;
  step?: number;
};

type QuestionnaireDoc = {
  slug: string;
  title: string;
  description?: string;
  questions: QuestionDoc[];
  sections?: string[];
};

const allowedTypes = new Set([
  "text",
  "email",
  "phone",
  "number",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "likert",
  "rating",
]);

function toSafeString(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeQuestion(input: any) {
  const key = toSafeString(input?.key);
  const label = toSafeString(input?.label);
  const type = toSafeString(input?.type);
  const category = toSafeString(input?.category) || "General";

  if (!key || !label || !type) {
    return null;
  }

  if (!allowedTypes.has(type)) {
    return null;
  }

  const options = Array.isArray(input?.options)
    ? input.options
        .map((option: unknown) => toSafeString(option))
        .filter(Boolean)
    : undefined;

  const safe: QuestionDoc = {
    key,
    label,
    type,
    category,
    required: Boolean(input?.required),
  };

  if (options && options.length > 0) {
    safe.options = options;
  }

  const placeholder = toSafeString(input?.placeholder);
  const helpText = toSafeString(input?.helpText);

  if (placeholder) {
    safe.placeholder = placeholder;
  }
  if (helpText) {
    safe.helpText = helpText;
  }

  if (Number.isFinite(Number(input?.minValue))) {
    safe.minValue = Number(input.minValue);
  }
  if (Number.isFinite(Number(input?.maxValue))) {
    safe.maxValue = Number(input.maxValue);
  }
  if (Number.isFinite(Number(input?.step))) {
    safe.step = Number(input.step);
  }

  return safe;
}

async function ensureSuperAdmin(request: Request) {
  const token = parseAdminSessionToken(request.headers.get("cookie"));
  const { db } = await getMongoDb();
  const context = await getAdminContextFromToken(db, token);

  if (!context) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
      db: null as any,
    };
  }

  if (context.admin.role !== "superadmin") {
    return {
      error: NextResponse.json(
        { error: "Only superadmin can manage questionnaires." },
        { status: 403 },
      ),
      db: null as any,
    };
  }

  return { error: null, db };
}

export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const auth = await ensureSuperAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const collectionName =
    process.env.MONGODB_QUESTIONNAIRE_COLLECTION || "questionnaires";
  const document = (await auth.db
    .collection(collectionName)
    .findOne({ slug: params.slug })) as QuestionnaireDoc | null;

  if (!document) {
    return NextResponse.json(
      { error: "Questionnaire not found." },
      { status: 404 },
    );
  }

  const sectionsFromQuestions = Array.from(
    new Set(
      (document.questions || [])
        .map((question) => toSafeString(question.category) || "General")
        .filter(Boolean),
    ),
  );

  return NextResponse.json({
    questionnaire: {
      slug: document.slug,
      title: document.title,
      description: document.description || "",
      sections: Array.from(
        new Set([...(document.sections || []), ...sectionsFromQuestions]),
      ),
      questions: (document.questions || []).map((question) => ({
        ...question,
        category: toSafeString(question.category) || "General",
      })),
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const auth = await ensureSuperAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const title = toSafeString((body as any).title);
  const description = toSafeString((body as any).description);
  const sectionsInput = Array.isArray((body as any).sections)
    ? (body as any).sections
    : [];
  const questionsInput = Array.isArray((body as any).questions)
    ? (body as any).questions
    : [];

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const questions = questionsInput
    .map((question: unknown) => normalizeQuestion(question))
    .filter(Boolean) as QuestionDoc[];

  if (questions.length === 0) {
    return NextResponse.json(
      { error: "At least one valid question is required." },
      { status: 400 },
    );
  }

  const keySet = new Set<string>();
  for (const question of questions) {
    if (keySet.has(question.key)) {
      return NextResponse.json(
        { error: `Duplicate question key detected: ${question.key}` },
        { status: 400 },
      );
    }
    keySet.add(question.key);
  }

  const sections = Array.from(
    new Set(
      [
        ...sectionsInput.map((section: unknown) => toSafeString(section)),
        ...questions.map((question) => question.category || "General"),
      ].filter(Boolean),
    ),
  );

  const collectionName =
    process.env.MONGODB_QUESTIONNAIRE_COLLECTION || "questionnaires";

  const update: QuestionnaireDoc = {
    slug: params.slug,
    title,
    description,
    sections,
    questions,
  };

  const result = await auth.db
    .collection(collectionName)
    .updateOne({ slug: params.slug }, { $set: update }, { upsert: false });

  if (!result.matchedCount) {
    return NextResponse.json(
      { error: "Questionnaire not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, questionnaire: update });
}
