import { NextResponse } from "next/server";
import { getMongoDb } from "../../../../lib/mongodbClient";
import {
  getAdminContextFromToken,
  parseAdminSessionToken,
} from "../../../../lib/adminAuth";
import {
  deriveUserProfile,
  type AdminUserDocument,
} from "../../../../lib/adminData";

function normalizeSearch(value: string | null) {
  return (value || "").trim().toLowerCase();
}

function parsePage(value: string | null) {
  const parsed = Number.parseInt(value || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parsePageSize(value: string | null) {
  const parsed = Number.parseInt(value || "10", 10);
  return [10, 20, 30].includes(parsed) ? parsed : 10;
}

export async function GET(request: Request) {
  const token = parseAdminSessionToken(request.headers.get("cookie"));
  const { db } = await getMongoDb();
  const admin = await getAdminContextFromToken(db, token);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const search = normalizeSearch(url.searchParams.get("search"));
  const sort = url.searchParams.get("sort") || "lastSubmissionAt";
  const order = url.searchParams.get("order") === "asc" ? 1 : -1;
  const page = parsePage(url.searchParams.get("page"));
  const pageSize = parsePageSize(url.searchParams.get("pageSize"));

  const usersCollection = process.env.MONGODB_USERS_COLLECTION || "users";
  const documents = (await db
    .collection(usersCollection)
    .find()
    .toArray()) as AdminUserDocument[];

  const filtered = documents
    .map((user) => deriveUserProfile(user))
    .filter((user) => {
      if (!search) {
        return true;
      }

      return [user.fullName, user.email, user.phone || ""]
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .sort((left, right) => {
      const leftValue =
        sort === "name"
          ? left.fullName
          : sort === "email"
            ? left.email
            : sort === "registeredAt"
              ? left.registrationDate || ""
              : left.lastQuestionnaireSubmissionDate || "";
      const rightValue =
        sort === "name"
          ? right.fullName
          : sort === "email"
            ? right.email
            : sort === "registeredAt"
              ? right.registrationDate || ""
              : right.lastQuestionnaireSubmissionDate || "";

      return String(leftValue).localeCompare(String(rightValue)) * order;
    });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const users = filtered.slice(start, start + pageSize);

  return NextResponse.json({
    users,
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
