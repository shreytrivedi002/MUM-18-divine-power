import { NextResponse } from "next/server";
import { getMongoDb } from "../../../../lib/mongodbClient";
import {
  createPaymentLinkForUserPlan,
  PaymentError,
  toSafeString,
} from "../../../../lib/razorpay";

/**
 * Public endpoint used by the user-facing /plans/[userId] page so a user
 * can generate their own Razorpay payment link for a chosen plan.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    planId?: string;
  } | null;

  const userId = toSafeString(body?.userId);
  const planId = toSafeString(body?.planId);

  if (!userId || !planId) {
    return NextResponse.json(
      { error: "userId and planId are required." },
      { status: 400 },
    );
  }

  const { db } = await getMongoDb();

  try {
    const payment = await createPaymentLinkForUserPlan(db, { userId, planId });
    return NextResponse.json({ success: true, payment });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Unable to create payment link.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
