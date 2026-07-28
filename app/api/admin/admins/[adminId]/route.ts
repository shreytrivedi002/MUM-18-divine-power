import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "../../../../../lib/mongodbClient";
import {
  getAdminCollections,
  getAdminContextFromToken,
  parseAdminSessionToken,
  revokeAllAdminSessionsForAdmin,
  type AdminRecord,
} from "../../../../../lib/adminAuth";

export async function DELETE(
  request: Request,
  { params }: { params: { adminId: string } },
) {
  const token = parseAdminSessionToken(request.headers.get("cookie"));
  const { db } = await getMongoDb();
  const context = await getAdminContextFromToken(db, token);

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (context.admin.role !== "superadmin") {
    return NextResponse.json(
      { error: "Only superadmin can delete admins." },
      { status: 403 },
    );
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(params.adminId);
  } catch {
    return NextResponse.json({ error: "Invalid admin id." }, { status: 400 });
  }

  const { admins } = getAdminCollections(db);
  const target = (await db
    .collection(admins)
    .findOne({ _id: objectId })) as AdminRecord | null;
  if (!target) {
    return NextResponse.json({ error: "Admin not found." }, { status: 404 });
  }

  if ((target.role || "admin") === "superadmin") {
    return NextResponse.json(
      { error: "Superadmin cannot be deleted." },
      { status: 400 },
    );
  }

  await db.collection(admins).deleteOne({ _id: objectId });
  await revokeAllAdminSessionsForAdmin(db, String(target._id));

  return NextResponse.json({ success: true });
}
