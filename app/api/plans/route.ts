import { NextResponse } from "next/server";
import { getMongoDb } from "../../../lib/mongodbClient";

function toSafeString(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ plans: [] });
  }

  try {
    const { db } = await getMongoDb();
    const collectionName = process.env.MONGODB_PLANS_COLLECTION || "plans";

    const plans = await db
      .collection(collectionName)
      .find({ isActive: true })
      .sort({ sortOrder: 1, durationWeeks: 1, costInr: 1 })
      .toArray();

    return NextResponse.json({
      plans: plans.map((plan) => ({
        id: String(plan._id),
        name: toSafeString(plan.name),
        details: toSafeString(plan.details),
        description: toSafeString(plan.description),
        durationWeeks: toSafeNumber(plan.durationWeeks),
        costInr: toSafeNumber(plan.costInr),
        isActive: Boolean(plan.isActive),
        sortOrder: toSafeNumber(plan.sortOrder),
      })),
    });
  } catch (error) {
    console.error("Failed to load plans:", error);
    return NextResponse.json({ plans: [] });
  }
}
