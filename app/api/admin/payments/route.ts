import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "../../../../lib/mongodbClient";
import {
  getAdminContextFromToken,
  parseAdminSessionToken,
} from "../../../../lib/adminAuth";

let paymentsIndexesPromise: Promise<void> | null = null;

function toSafeString(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isTruthyEnv(value: string | undefined) {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function normalizePhoneForRazorpay(value: string) {
  const compact = value.replace(/\D+/g, "");
  if (compact.length === 10) {
    return `+91${compact}`;
  }
  if (compact.length === 12 && compact.startsWith("91")) {
    return `+${compact}`;
  }
  if (compact.startsWith("0") && compact.length === 11) {
    return `+91${compact.slice(1)}`;
  }
  return "";
}

function buildReferenceId(userId: string) {
  const userPart = userId.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "user";
  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `dpht_${userPart}_${timePart}_${randomPart}`.slice(0, 40);
}

function mapRazorpayStatusToLocal(status: string) {
  const value = toSafeString(status).toLowerCase();
  if (value === "paid") {
    return "paid";
  }
  if (value === "cancelled") {
    return "cancelled";
  }
  if (value === "expired") {
    return "expired";
  }
  return "link_created";
}

async function fetchRazorpayPaymentLinkStatus(paymentLinkId: string) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return null;
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(
    `https://api.razorpay.com/v1/payment_links/${encodeURIComponent(paymentLinkId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  const body = await response.json().catch(() => null);
  if (!body) {
    return null;
  }

  return {
    status: toSafeString(body.status),
    paidAt:
      typeof body.paid_at === "number" && body.paid_at > 0
        ? new Date(body.paid_at * 1000)
        : null,
  };
}

async function reconcilePaymentStatuses(
  db: any,
  paymentsCollection: string,
  docs: any[],
) {
  const mockMode = isTruthyEnv(process.env.RAZORPAY_MOCK_MODE);
  if (mockMode || !Array.isArray(docs) || docs.length === 0) {
    return;
  }

  const usersCollection = process.env.MONGODB_USERS_COLLECTION || "users";
  const candidates = docs.filter((item) => {
    const status = toSafeString(item?.status).toLowerCase();
    return (
      toSafeString(item?.razorpayPaymentLinkId) &&
      status !== "paid" &&
      status !== "cancelled" &&
      status !== "expired"
    );
  });

  for (const item of candidates) {
    const linkId = toSafeString(item.razorpayPaymentLinkId);
    const remote = await fetchRazorpayPaymentLinkStatus(linkId).catch(
      () => null,
    );
    if (!remote) {
      continue;
    }

    const nextStatus = mapRazorpayStatusToLocal(remote.status);
    const currentStatus = toSafeString(item.status);
    const paidAt = remote.paidAt || item.paidAt || null;

    if (
      nextStatus === currentStatus &&
      toSafeString(item.razorpayStatus) === toSafeString(remote.status)
    ) {
      continue;
    }

    const now = new Date();
    await db.collection(paymentsCollection).updateOne(
      { _id: item._id },
      {
        $set: {
          status: nextStatus,
          razorpayStatus: remote.status,
          paidAt,
          updatedAt: now,
        },
      },
    );

    item.status = nextStatus;
    item.razorpayStatus = remote.status;
    item.paidAt = paidAt;

    if (nextStatus === "paid") {
      const userId = toSafeString(item.userId);
      if (userId) {
        try {
          await db.collection(usersCollection).updateOne(
            { _id: new ObjectId(userId) },
            {
              $set: {
                planEnrollment: {
                  planId: toSafeString(item.planId),
                  planName: toSafeString(item.planName),
                  status: "active",
                  enrolledAt: paidAt || now,
                  paymentId: String(item._id),
                },
                updatedAt: now,
              },
            },
          );
        } catch {
          // Ignore malformed user id.
        }
      }
    }
  }
}

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

async function ensurePaymentsIndexes(db: any, collectionName: string) {
  if (!paymentsIndexesPromise) {
    paymentsIndexesPromise = (async () => {
      const collection = db.collection(collectionName);
      await collection.createIndex(
        { razorpayPaymentLinkId: 1 },
        { unique: true, sparse: true },
      );
      await collection.createIndex({ userId: 1, createdAt: -1 });
      await collection.createIndex({ status: 1, createdAt: -1 });
      await collection.createIndex(
        { referenceId: 1 },
        { unique: true, sparse: true },
      );
      await collection.createIndex(
        { processedWebhookEventIds: 1 },
        { sparse: true },
      );
    })().catch((error) => {
      paymentsIndexesPromise = null;
      throw error;
    });
  }

  await paymentsIndexesPromise;
}

async function createRazorpayPaymentLink(input: {
  amountInr: number;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  referenceId: string;
  notes: Record<string, string>;
}) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Missing Razorpay credentials. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const payload = {
    amount: Math.round(input.amountInr * 100),
    currency: "INR",
    accept_partial: false,
    description: input.description,
    customer: {
      name: input.customerName,
      email: input.customerEmail,
      contact: input.customerPhone || undefined,
    },
    notify: {
      sms: false,
      email: false,
    },
    reminder_enable: true,
    reference_id: input.referenceId,
    notes: input.notes,
  };

  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || !body) {
    throw new Error(
      body?.error?.description || "Unable to create Razorpay payment link.",
    );
  }

  return {
    paymentLinkId: toSafeString(body.id),
    shortUrl: toSafeString(body.short_url),
    status: toSafeString(body.status) || "created",
    raw: body,
  };
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

  let userObjectId: ObjectId;
  let planObjectId: ObjectId;

  try {
    userObjectId = new ObjectId(userId);
    planObjectId = new ObjectId(planId);
  } catch {
    return NextResponse.json(
      { error: "Invalid userId or planId." },
      { status: 400 },
    );
  }

  const usersCollection = process.env.MONGODB_USERS_COLLECTION || "users";
  const plansCollection = process.env.MONGODB_PLANS_COLLECTION || "plans";

  const user = await auth.db
    .collection(usersCollection)
    .findOne({ _id: userObjectId });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const plan = await auth.db
    .collection(plansCollection)
    .findOne({ _id: planObjectId });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  const userName =
    toSafeString((user as any).fullName) ||
    toSafeString((user as any).email) ||
    "DPHT User";
  const userEmail = toSafeString((user as any).email);
  const userPhone = normalizePhoneForRazorpay(
    toSafeString((user as any).phone),
  );
  const planName = toSafeString((plan as any).name);
  const planDetails = toSafeString((plan as any).details);
  const amountInr = toSafeNumber((plan as any).costInr);

  if (!userEmail) {
    return NextResponse.json(
      { error: "User email is required for payment link." },
      { status: 400 },
    );
  }

  if (amountInr <= 0) {
    return NextResponse.json(
      { error: "Selected plan has invalid price." },
      { status: 400 },
    );
  }

  const mockMode = isTruthyEnv(process.env.RAZORPAY_MOCK_MODE);
  if (!mockMode) {
    const keyId = toSafeString(process.env.RAZORPAY_KEY_ID);
    const keySecret = toSafeString(process.env.RAZORPAY_KEY_SECRET);
    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          error:
            "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or enable RAZORPAY_MOCK_MODE=true for local testing.",
        },
        { status: 400 },
      );
    }
  }

  const referenceId = buildReferenceId(userId);

  let razorpay: {
    paymentLinkId: string;
    shortUrl: string;
    status: string;
    raw: unknown;
  };

  try {
    razorpay = await createRazorpayPaymentLink({
      amountInr,
      description: `DPHT Plan Payment - ${planName}${planDetails ? ` (${planDetails})` : ""}`,
      customerName: userName,
      customerEmail: userEmail,
      customerPhone: userPhone,
      referenceId,
      notes: {
        userId,
        planId,
        planName,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create payment link.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const now = new Date();
  const paymentsCollection =
    process.env.MONGODB_PAYMENTS_COLLECTION || "payments";
  await ensurePaymentsIndexes(auth.db, paymentsCollection);

  const insert = await auth.db.collection(paymentsCollection).insertOne({
    userId,
    userName,
    userEmail,
    userPhone: userPhone || toSafeString((user as any).phone),
    planId,
    planName,
    planDetails,
    amountInr,
    status: "link_created",
    razorpayPaymentLinkId: razorpay.paymentLinkId,
    paymentLinkUrl: razorpay.shortUrl,
    razorpayStatus: razorpay.status,
    referenceId,
    createdByAdminId: String(auth.admin._id),
    dispatchLog: [],
    webhookEvents: [],
    processedWebhookEventIds: [],
    createdAt: now,
    updatedAt: now,
  });

  await auth.db.collection(usersCollection).updateOne(
    { _id: userObjectId },
    {
      $set: {
        updatedAt: now,
      },
    },
  );

  return NextResponse.json({
    success: true,
    payment: {
      id: String(insert.insertedId),
      paymentLinkUrl: razorpay.shortUrl,
      razorpayPaymentLinkId: razorpay.paymentLinkId,
      amountInr,
      userEmail,
      userPhone: userPhone || toSafeString((user as any).phone),
      userName,
      planName,
    },
  });
}
