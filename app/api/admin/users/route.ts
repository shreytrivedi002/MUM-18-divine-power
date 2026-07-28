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

  return NextResponse.json({ users: filtered });
}
