import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  adminCookieName,
  buildAdminCookieOptions,
  createAdminSession,
  getAdminContextFromToken,
  hashAdminPassword,
  parseAdminSessionToken,
  revokeAllAdminSessionsForAdmin,
  verifyAdminPassword,
} from "../../../../lib/adminAuth";
import { getMongoDb } from "../../../../lib/mongodbClient";

function toSafeString(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

export async function POST(request: Request) {
  const token = parseAdminSessionToken(request.headers.get("cookie"));
  const { db } = await getMongoDb();
  const context = await getAdminContextFromToken(db, token);

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const currentPassword = toSafeString((body as any).currentPassword);
  const newPassword = toSafeString((body as any).newPassword);

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Both passwords are required." },
      { status: 400 },
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const adminsCollection = process.env.MONGODB_ADMINS_COLLECTION || "admins";
  const adminRecord = await db
    .collection(adminsCollection)
    .findOne({ _id: new ObjectId(context.admin._id) });
  if (
    !adminRecord ||
    !verifyAdminPassword(currentPassword, adminRecord.passwordHash)
  ) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 },
    );
  }

  await db.collection(adminsCollection).updateOne(
    { _id: adminRecord._id },
    {
      $set: {
        passwordHash: hashAdminPassword(newPassword),
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  await revokeAllAdminSessionsForAdmin(db, String(adminRecord._id));
  const { token: nextToken } = await createAdminSession(db, adminRecord as any);
  const response = NextResponse.json({ success: true });
  response.cookies.set(adminCookieName(), nextToken, buildAdminCookieOptions());
  return response;
}
