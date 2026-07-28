import { NextResponse } from "next/server";
import {
  adminCookieName,
  buildAdminCookieOptions,
  createAdminSession,
  ensureBootstrapAdmin,
  findAdminByEmail,
  verifyAdminPassword,
} from "../../../../lib/adminAuth";
import { getMongoDb } from "../../../../lib/mongodbClient";

function toSafeString(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const email = toSafeString((body as any).email).toLowerCase();
  const password = toSafeString((body as any).password);

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const { db } = await getMongoDb();
  await ensureBootstrapAdmin(db);

  const admin = await findAdminByEmail(db, email);
  if (!admin || !verifyAdminPassword(password, admin.passwordHash)) {
    return NextResponse.json(
      { error: "Invalid admin credentials." },
      { status: 401 },
    );
  }

  const { token } = await createAdminSession(db, admin as any);
  const response = NextResponse.json({ success: true });
  response.cookies.set(adminCookieName(), token, buildAdminCookieOptions());
  return response;
}
