import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "../../../../lib/mongodbClient";
import {
  getAdminCollections,
  getAdminContextFromToken,
  hashAdminPassword,
  parseAdminSessionToken,
  type AdminRecord,
} from "../../../../lib/adminAuth";

function toSafeString(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parsePage(value: string | null) {
  const parsed = Number.parseInt(value || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function toAdminListItem(admin: AdminRecord) {
  return {
    id: String(admin._id),
    email: admin.email,
    displayName: admin.displayName || "-",
    role: admin.role || "admin",
    createdAt: admin.createdAt ? new Date(admin.createdAt).toISOString() : null,
  };
}

export async function GET(request: Request) {
  const token = parseAdminSessionToken(request.headers.get("cookie"));
  const { db } = await getMongoDb();
  const context = await getAdminContextFromToken(db, token);

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (context.admin.role !== "superadmin") {
    return NextResponse.json(
      { error: "Only superadmin can manage admins." },
      { status: 403 },
    );
  }

  const { admins } = getAdminCollections(db);
  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page"));
  const pageSize = 10;

  const documents = (await db
    .collection(admins)
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray()) as AdminRecord[];

  const allAdmins = documents.map(toAdminListItem);
  const total = allAdmins.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const adminsPage = allAdmins.slice(start, start + pageSize);

  return NextResponse.json({
    admins: adminsPage,
    pagination: {
      page: currentPage,
      pageSize,
      total,
      totalPages,
      hasPrevious: currentPage > 1,
      hasNext: currentPage < totalPages,
    },
  });
}

export async function POST(request: Request) {
  const token = parseAdminSessionToken(request.headers.get("cookie"));
  const { db } = await getMongoDb();
  const context = await getAdminContextFromToken(db, token);

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (context.admin.role !== "superadmin") {
    return NextResponse.json(
      { error: "Only superadmin can create admins." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const email = toSafeString((body as any).email).toLowerCase();
  const password = toSafeString((body as any).password);
  const displayName = toSafeString((body as any).displayName);
  const requestedRole = toSafeString((body as any).role).toLowerCase();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  if (requestedRole && requestedRole !== "admin") {
    return NextResponse.json(
      { error: "Only normal admins can be created from this panel." },
      { status: 400 },
    );
  }

  const { admins } = getAdminCollections(db);
  const existingAdmin = await db.collection(admins).findOne({ email });
  if (existingAdmin) {
    return NextResponse.json(
      { error: "An admin with this email already exists." },
      { status: 409 },
    );
  }

  const now = new Date();
  const newAdmin = {
    email,
    displayName: displayName || undefined,
    role: "admin",
    passwordHash: hashAdminPassword(password),
    createdAt: now,
    updatedAt: now,
  };

  const insertResult = await db.collection(admins).insertOne(newAdmin as any);

  return NextResponse.json(
    {
      admin: toAdminListItem({
        ...(newAdmin as Omit<AdminRecord, "_id">),
        _id: insertResult.insertedId as ObjectId,
      }),
      success: true,
    },
    { status: 201 },
  );
}
