import { NextResponse } from "next/server";
import {
  adminCookieName,
  clearAdminCookieOptions,
  decodeAdminSessionToken,
  revokeAdminSessionBySid,
} from "../../../../lib/adminAuth";
import { getMongoDb } from "../../../../lib/mongodbClient";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const tokenMatch = cookieHeader?.match(
    new RegExp(`(?:^|; )${adminCookieName()}=([^;]+)`),
  );
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

  if (token) {
    const session = decodeAdminSessionToken(token);
    if (session) {
      const { db } = await getMongoDb();
      await revokeAdminSessionBySid(db, session.sid);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(adminCookieName(), "", clearAdminCookieOptions());
  return response;
}
