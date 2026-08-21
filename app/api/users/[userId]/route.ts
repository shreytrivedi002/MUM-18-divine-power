import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "../../../../lib/mongodbClient";

function toSafeString(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

/**
 * Public, minimal user lookup used by the /plans/[userId] page.
 * Only exposes non-sensitive display fields, never payment or response data.
 */
export async function GET(
  _request: Request,
  { params }: { params: { userId: string } },
) {
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(params.userId);
  } catch {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const { db } = await getMongoDb();
  const usersCollection = process.env.MONGODB_USERS_COLLECTION || "users";
  const user = await db
    .collection(usersCollection)
    .findOne(
      { _id: objectId },
      { projection: { fullName: 1, email: 1, planEnrollment: 1 } },
    );

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: String((user as any)._id),
      fullName: toSafeString((user as any).fullName) || "DPHT User",
      email: toSafeString((user as any).email),
      planEnrollment: (user as any).planEnrollment
        ? {
            planName: toSafeString((user as any).planEnrollment.planName),
            status: toSafeString((user as any).planEnrollment.status),
          }
        : null,
    },
  });
}
