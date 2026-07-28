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

  return NextResponse.json({ user: normalizeUserDocument(user) });
}
