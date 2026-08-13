import { NextResponse } from "next/server";
import { createHash, createHmac } from "crypto";
import { ObjectId } from "mongodb";
import { getMongoDb } from "../../../../lib/mongodbClient";

let paymentsIndexesPromise: Promise<void> | null = null;

function toSafeString(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function verifySignature(payload: string, signature: string, secret: string) {
  const digest = createHmac("sha256", secret).update(payload).digest("hex");
  return digest === signature;
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

export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing webhook secret." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("x-razorpay-signature") || "";
  const headerEventId = toSafeString(
    request.headers.get("x-razorpay-event-id"),
  );
  const rawBody = await request.text();

  if (!verifySignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as any;
  const eventType = toSafeString(event?.event);
  const computedEventId = createHash("sha256").update(rawBody).digest("hex");
  const eventId = headerEventId || computedEventId;

  const paymentLinkEntity = event?.payload?.payment_link?.entity || null;
  const paymentEntity = event?.payload?.payment?.entity || null;

  const paymentLinkId =
    toSafeString(paymentLinkEntity?.id) ||
    toSafeString(paymentEntity?.payment_link_id) ||
    toSafeString(paymentEntity?.notes?.payment_link_id) ||
    "";

  if (!paymentLinkId) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const { db } = await getMongoDb();
  const paymentsCollection =
    process.env.MONGODB_PAYMENTS_COLLECTION || "payments";
  const usersCollection = process.env.MONGODB_USERS_COLLECTION || "users";
  await ensurePaymentsIndexes(db, paymentsCollection);

  const now = new Date();

  const paymentDoc = await db.collection(paymentsCollection).findOne({
    razorpayPaymentLinkId: paymentLinkId,
  });

  if (!paymentDoc) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const nextStatus =
    eventType === "payment_link.paid" || eventType === "payment.captured"
      ? "paid"
      : eventType === "payment_link.cancelled"
        ? "cancelled"
        : eventType === "payment_link.expired"
          ? "expired"
          : "updated";

  const updateResult = await db.collection(paymentsCollection).updateOne(
    {
      _id: paymentDoc._id,
      processedWebhookEventIds: { $ne: eventId },
    },
    {
      $set: {
        status: nextStatus,
        razorpayStatus: toSafeString(paymentLinkEntity?.status) || nextStatus,
        paidAt: nextStatus === "paid" ? now : paymentDoc.paidAt || null,
        updatedAt: now,
      },
      $push: {
        processedWebhookEventIds: eventId,
        webhookEvents: {
          id: eventId,
          event: eventType,
          receivedAt: now,
          payload: event,
        },
      } as any,
    },
  );

  if (!updateResult.matchedCount) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (nextStatus === "paid") {
    const userId = toSafeString((paymentDoc as any).userId);
    const planId = toSafeString((paymentDoc as any).planId);
    const planName = toSafeString((paymentDoc as any).planName);

    if (userId) {
      try {
        await db.collection(usersCollection).updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              planEnrollment: {
                planId,
                planName,
                status: "active",
                enrolledAt: now,
                paymentId: String(paymentDoc._id),
              },
              updatedAt: now,
            },
          },
        );
      } catch {
        // Ignore malformed user ids.
      }
    }
  }

  return NextResponse.json({ received: true });
}
