import { NextResponse } from "next/server";
import { getMongoDb } from "../../../../lib/mongodbClient";
import {
  getAdminContextFromToken,
  parseAdminSessionToken,
} from "../../../../lib/adminAuth";

function toSafeString(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePlanInput(body: Record<string, unknown>) {
  const name = toSafeString(body.name);
  const details = toSafeString(body.details);
  const description = toSafeString(body.description);
  const durationWeeks = toSafeNumber(body.durationWeeks, 0);
  const costInr = toSafeNumber(body.costInr, 0);
  const isActive = Boolean(body.isActive);
  const sortOrder = toSafeNumber(body.sortOrder, 0);

  if (!name) {
    return { error: "Plan name is required." };
  }

  if (!details) {
    return { error: "Plan details are required." };
  }

  if (!description) {
    return { error: "Plan description is required." };
  }

  if (durationWeeks <= 0) {
    return { error: "Plan duration (weeks) must be greater than 0." };
  }

  if (costInr <= 0) {
    return { error: "Plan cost must be greater than 0." };
  }

  return {
    value: {
      name,
      details,
      description,
      durationWeeks,
      costInr,
      isActive,
      sortOrder,
    },
  };
}

async function ensureAdmin(request: Request) {
  const token = parseAdminSessionToken(request.headers.get("cookie"));
  const { db } = await getMongoDb();
  const context = await getAdminContextFromToken(db, token);

  if (!context) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
      db: null as any,
    };
  }

  return { error: null, db };
}

export async function GET(request: Request) {
  const auth = await ensureAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const collectionName = process.env.MONGODB_PLANS_COLLECTION || "plans";
  const plans = await auth.db
    .collection(collectionName)
    .find({})
    .sort({ sortOrder: 1, durationWeeks: 1, costInr: 1 })
    .toArray();

  return NextResponse.json({
    plans: plans.map((plan: any) => ({
      id: String(plan._id),
      name: toSafeString(plan.name),
      details: toSafeString(plan.details),
      description: toSafeString(plan.description),
      durationWeeks: toSafeNumber(plan.durationWeeks),
      costInr: toSafeNumber(plan.costInr),
      isActive: Boolean(plan.isActive),
      sortOrder: toSafeNumber(plan.sortOrder),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await ensureAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const normalized = normalizePlanInput(body);
  if (normalized.error) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const now = new Date();
  const collectionName = process.env.MONGODB_PLANS_COLLECTION || "plans";

  const result = await auth.db.collection(collectionName).insertOne({
    ...normalized.value,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ success: true, id: String(result.insertedId) });
}
