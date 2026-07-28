import {
  createHmac,
  pbkdf2Sync,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "crypto";
import { cookies } from "next/headers";
import { ObjectId, type Db } from "mongodb";
import { getMongoDb } from "./mongodbClient";

const ADMIN_COOKIE_NAME = "dpht_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const PBKDF2_ITERATIONS = 210000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = "sha512";

export type AdminRecord = {
  _id: ObjectId | string;
  email: string;
  role: string;
  passwordHash: string;
  displayName?: string;
  createdAt?: Date;
  updatedAt?: Date;
  passwordChangedAt?: Date;
};

export type AdminSession = {
  sid: string;
  adminId: string;
  role: string;
  exp: number;
};

export type AuthenticatedAdmin = {
  _id: string;
  email: string;
  role: string;
  displayName?: string;
};

export type AdminContext = {
  admin: AuthenticatedAdmin;
  session: AdminSession;
};

export function getAdminCollections(db: Db) {
  return {
    admins: process.env.MONGODB_ADMINS_COLLECTION || "admins",
    sessions: process.env.MONGODB_ADMIN_SESSIONS_COLLECTION || "admin_sessions",
    db,
  };
}

function getAuthSecret() {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error("ADMIN_AUTH_SECRET must be set to a long random secret.");
  }
  return secret.trim();
}

export function hashAdminPassword(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  const derived = pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${derived.toString("hex")}`;
}

export function verifyAdminPassword(password: string, storedHash: string) {
  const [scheme, iterationValue, salt, hash] = storedHash.split("$");
  if (scheme !== "pbkdf2" || !iterationValue || !salt || !hash) {
    return false;
  }

  const iterations = Number(iterationValue);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const derived = pbkdf2Sync(
    password,
    salt,
    iterations,
    Buffer.from(hash, "hex").length,
    PBKDF2_DIGEST,
  );
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}

function encodeSession(session: AdminSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function decodeAdminSessionToken(token: string): AdminSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as AdminSession;
  } catch {
    return null;
  }
}

function toStringId(value: unknown) {
  return value ? String(value) : "";
}

export async function ensureBootstrapAdmin(db: Db) {
  const { admins } = getAdminCollections(db);
  const adminCount = await db.collection(admins).countDocuments();
  if (adminCount > 0) {
    return null;
  }

  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || "Administrator";

  if (!email || !password) {
    return null;
  }

  const now = new Date();
  const doc = {
    email,
    displayName,
    role: "superadmin",
    passwordHash: hashAdminPassword(password),
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(admins).createIndex({ email: 1 }, { unique: true });
  await db.collection(admins).insertOne(doc as any);
  return doc;
}

export async function findAdminByEmail(db: Db, email: string) {
  const { admins } = getAdminCollections(db);
  return db
    .collection(admins)
    .findOne({ email: email.toLowerCase() }) as Promise<AdminRecord | null>;
}

export async function createAdminSession(db: Db, admin: AdminRecord) {
  const { sessions } = getAdminCollections(db);
  const now = new Date();
  const session: AdminSession = {
    sid: randomUUID(),
    adminId: toStringId(admin._id),
    role: admin.role || "admin",
    exp: now.getTime() + SESSION_TTL_MS,
  };

  await db.collection(sessions).createIndex({ sid: 1 }, { unique: true });
  await db.collection(sessions).insertOne({
    sid: session.sid,
    adminId: session.adminId,
    role: session.role,
    createdAt: now,
    expiresAt: new Date(session.exp),
    revokedAt: null,
  } as any);

  return { session, token: encodeSession(session) };
}

export async function revokeAdminSessionBySid(db: Db, sid: string) {
  const { sessions } = getAdminCollections(db);
  await db
    .collection(sessions)
    .updateOne({ sid }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllAdminSessionsForAdmin(db: Db, adminId: string) {
  const { sessions } = getAdminCollections(db);
  await db
    .collection(sessions)
    .updateMany(
      { adminId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
}

export async function getAuthenticatedAdminFromToken(
  db: Db,
  token: string | undefined | null,
) {
  const context = await getAdminContextFromToken(db, token);
  return context?.admin || null;
}

export async function getAdminContextFromToken(
  db: Db,
  token: string | undefined | null,
) {
  if (!token) {
    return null;
  }

  const session = decodeAdminSessionToken(token);
  if (!session || session.exp < Date.now()) {
    return null;
  }

  const { sessions, admins } = getAdminCollections(db);
  const storedSession = await db
    .collection(sessions)
    .findOne({ sid: session.sid, adminId: session.adminId });
  if (
    !storedSession ||
    storedSession.revokedAt ||
    storedSession.expiresAt < new Date()
  ) {
    return null;
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(storedSession.adminId as string);
  } catch {
    return null;
  }

  const admin = await db.collection(admins).findOne({ _id: objectId });
  if (!admin) {
    return null;
  }

  const adminContext: AdminContext = {
    admin: {
      _id: String(admin._id),
      email: admin.email,
      role: admin.role || "admin",
      displayName: admin.displayName,
    },
    session: {
      sid: session.sid,
      adminId: session.adminId,
      role: session.role,
      exp: session.exp,
    },
  };

  return adminContext;
}

export async function getAuthenticatedAdminFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const { db } = await getMongoDb();
  return getAuthenticatedAdminFromToken(db, token);
}

export function adminCookieName() {
  return ADMIN_COOKIE_NAME;
}

export function buildAdminCookieOptions(maxAgeSeconds = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function clearAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export function parseAdminSessionToken(
  cookieHeader: string | null | undefined,
) {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader.match(
    new RegExp(`(?:^|; )${ADMIN_COOKIE_NAME}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}
