import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "../../../../../lib/mongodbClient";
import {
  getAdminContextFromToken,
  parseAdminSessionToken,
} from "../../../../../lib/adminAuth";

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

function parsePlanId(planId: string) {
  try {
    return new ObjectId(planId);
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { planId: string } },
) {
  const auth = await ensureAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const objectId = parsePlanId(params.planId);
  if (!objectId) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const collectionName = process.env.MONGODB_PLANS_COLLECTION || "plans";
  const plan = await auth.db
    .collection(collectionName)
    .findOne({ _id: objectId });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  return NextResponse.json({
    plan: {
      id: String(plan._id),
      name: toSafeString((plan as any).name),
      details: toSafeString((plan as any).details),
      description: toSafeString((plan as any).description),
      durationWeeks: toSafeNumber((plan as any).durationWeeks),
      costInr: toSafeNumber((plan as any).costInr),
      isActive: Boolean((plan as any).isActive),
      sortOrder: toSafeNumber((plan as any).sortOrder),
      createdAt: (plan as any).createdAt,
      updatedAt: (plan as any).updatedAt,
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { planId: string } },
) {
  const auth = await ensureAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const objectId = parsePlanId(params.planId);
  if (!objectId) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
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

  const collectionName = process.env.MONGODB_PLANS_COLLECTION || "plans";

  const result = await auth.db.collection(collectionName).updateOne(
    { _id: objectId },
    {
      $set: {
        ...normalized.value,
        updatedAt: new Date(),
      },
    },
  );

  if (!result.matchedCount) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: { planId: string } },
) {
  const auth = await ensureAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const objectId = parsePlanId(params.planId);
  if (!objectId) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const collectionName = process.env.MONGODB_PLANS_COLLECTION || "plans";
  const result = await auth.db
    .collection(collectionName)
    .deleteOne({ _id: objectId });

  if (!result.deletedCount) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
