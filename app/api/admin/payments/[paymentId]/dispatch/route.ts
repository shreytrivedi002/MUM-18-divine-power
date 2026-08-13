import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "../../../../../../lib/mongodbClient";
import {
  getAdminContextFromToken,
  parseAdminSessionToken,
} from "../../../../../../lib/adminAuth";

function toSafeString(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
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

export async function POST(
  request: Request,
  { params }: { params: { paymentId: string } },
) {
  const auth = await ensureAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(params.paymentId);
  } catch {
    return NextResponse.json({ error: "Invalid payment id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    channel?: string;
  } | null;

  const channel = toSafeString(body?.channel).toLowerCase();
  if (channel !== "email" && channel !== "whatsapp") {
    return NextResponse.json({ error: "Invalid channel." }, { status: 400 });
  }

  const paymentsCollection =
    process.env.MONGODB_PAYMENTS_COLLECTION || "payments";
  const now = new Date();

  const result = await auth.db.collection(paymentsCollection).updateOne(
    { _id: objectId },
    {
      $push: {
        dispatchLog: {
          channel,
          dispatchedAt: now,
          dispatchedByAdminId: String(auth.admin._id),
        },
      } as any,
      $set: {
        updatedAt: now,
      },
    },
  );

  if (!result.matchedCount) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
