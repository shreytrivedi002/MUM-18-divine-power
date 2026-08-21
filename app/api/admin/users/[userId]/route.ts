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

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolEnv(value: string | undefined) {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
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

  const paymentsCollection =
    process.env.MONGODB_PAYMENTS_COLLECTION || "payments";
  const payments = await db
    .collection(paymentsCollection)
    .find({ userId: params.userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  if (!toBoolEnv(process.env.RAZORPAY_MOCK_MODE)) {
    for (const payment of payments) {
      const currentStatus = toSafeString((payment as any).status).toLowerCase();
      const linkId = toSafeString((payment as any).razorpayPaymentLinkId);
      if (!linkId || ["paid", "cancelled", "expired"].includes(currentStatus)) {
        continue;
      }

      const remote = await fetchRazorpayPaymentLinkStatus(linkId).catch(
        () => null,
      );
      if (!remote) {
        continue;
      }

      const nextStatus = mapRazorpayStatusToLocal(remote.status);
      const existingRazorpayStatus = toSafeString(
        (payment as any).razorpayStatus,
      );
      if (
        nextStatus === toSafeString((payment as any).status) &&
        existingRazorpayStatus === remote.status
      ) {
        continue;
      }

      const now = new Date();
      const paidAt = remote.paidAt || (payment as any).paidAt || null;

      await db.collection(paymentsCollection).updateOne(
        { _id: (payment as any)._id },
        {
          $set: {
            status: nextStatus,
            razorpayStatus: remote.status,
            paidAt,
            updatedAt: now,
          },
        },
      );

      (payment as any).status = nextStatus;
      (payment as any).razorpayStatus = remote.status;
      (payment as any).paidAt = paidAt;

      if (nextStatus === "paid") {
        await db.collection(usersCollection).updateOne(
          { _id: objectId },
          {
            $set: {
              planEnrollment: {
                planId: toSafeString((payment as any).planId),
                planName: toSafeString((payment as any).planName),
                status: "active",
                enrolledAt: paidAt || now,
                durationWeeks: toSafeNumber((payment as any).durationWeeks),
                paymentId: String((payment as any)._id),
              },
              updatedAt: now,
            },
          },
        );
      }
    }
  }

  normalized.payments = payments.map((payment: any) => ({
    id: String(payment._id),
    planId: toSafeString(payment.planId),
    planName: toSafeString(payment.planName),
    amountInr: toSafeNumber(payment.amountInr),
    status: toSafeString(payment.status),
    paymentLinkUrl: toSafeString(payment.paymentLinkUrl),
    razorpayPaymentLinkId: toSafeString(payment.razorpayPaymentLinkId),
    createdAt: payment.createdAt || null,
    paidAt: payment.paidAt || null,
    dispatchLog: Array.isArray(payment.dispatchLog) ? payment.dispatchLog : [],
  }));

  return NextResponse.json({ user: normalized });
}
