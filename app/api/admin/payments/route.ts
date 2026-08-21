import { NextResponse } from "next/server";
import { getMongoDb } from "../../../../lib/mongodbClient";
import {
  getAdminContextFromToken,
  parseAdminSessionToken,
} from "../../../../lib/adminAuth";
import {
  ensurePaymentsIndexes,
  reconcilePaymentStatuses,
  createPaymentLinkForUserPlan,
  PaymentError,
  toSafeString,
  toSafeNumber,
} from "../../../../lib/razorpay";

async function ensureAdmin(request: Request) {
  const token = parseAdminSessionToken(request.headers.get("cookie"));
  const { db } = await getMongoDb();
  const context = await getAdminContextFromToken(db, token);

  if (!context) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
      db: null as any,
      admin: null as any,
    };
  }

  return { error: null, db, admin: context.admin };
}

export async function GET(request: Request) {
  const auth = await ensureAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const url = new URL(request.url);
  const statusFilter = toSafeString(url.searchParams.get("status"));
  const userIdFilter = toSafeString(url.searchParams.get("userId"));

  const query: Record<string, unknown> = {};
  if (statusFilter) {
    query.status = statusFilter;
  }
  if (userIdFilter) {
    query.userId = userIdFilter;
  }

  const collectionName = process.env.MONGODB_PAYMENTS_COLLECTION || "payments";
  await ensurePaymentsIndexes(auth.db, collectionName);
  const docs = await auth.db
    .collection(collectionName)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();

  await reconcilePaymentStatuses(auth.db, collectionName, docs);

  return NextResponse.json({
    payments: docs.map((item: any) => ({
      id: String(item._id),
      userId: toSafeString(item.userId),
      userName: toSafeString(item.userName),
      userEmail: toSafeString(item.userEmail),
      userPhone: toSafeString(item.userPhone),
      planId: toSafeString(item.planId),
      planName: toSafeString(item.planName),
      amountInr: toSafeNumber(item.amountInr),
      status: toSafeString(item.status),
      razorpayPaymentLinkId: toSafeString(item.razorpayPaymentLinkId),
      paymentLinkUrl: toSafeString(item.paymentLinkUrl),
      paidAt: item.paidAt || null,
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null,
      createdByAdminId: toSafeString(item.createdByAdminId),
      dispatchLog: Array.isArray(item.dispatchLog) ? item.dispatchLog : [],
    })),
  });
}

export async function POST(request: Request) {
  const auth = await ensureAdmin(request);
  if (auth.error) {
    return auth.error;
  }

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

  try {
    const payment = await createPaymentLinkForUserPlan(auth.db, {
      userId,
      planId,
      createdByAdminId: String(auth.admin._id),
    });

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
