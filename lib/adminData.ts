import { ObjectId } from "mongodb";

export type AdminSubmissionAnswer = {
  key: string;
  question: string;
  answer: unknown;
};

export type AdminSubmission = {
  questionnaireSlug: string;
  questionnaireTitle: string;
  submittedAt: string | Date;
  timestamp?: string;
  answers: AdminSubmissionAnswer[];
};

export type AdminUserDocument = {
  _id: ObjectId | string;
  email: string;
  phone?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  fullName?: string;
  responses?: AdminSubmission[];
};

function toDate(value: string | Date | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pickAnswer(submission: AdminSubmission | undefined, hints: string[]) {
  if (!submission) {
    return "";
  }

  for (const answer of submission.answers || []) {
    const key = String(answer.key || "").toLowerCase();
    if (hints.some((hint) => key.includes(hint))) {
      const value = answer.answer;
      return value === null || value === undefined ? "" : String(value).trim();
    }
  }

  return "";
}

function normalizePhoneNumber(value: string | undefined) {
  if (!value) {
    return "";
  }

  const compact = value.replace(/[\s()-]/g, "");
  const indianMobile = /^(?:\+91)?[6-9]\d{9}$/;

  if (indianMobile.test(compact)) {
    return compact.startsWith("+91") ? compact : `+91${compact}`;
  }

  return "";
}

export function deriveUserProfile(user: AdminUserDocument) {
  const responses = Array.isArray(user.responses) ? user.responses : [];
  const sortedResponses = [...responses].sort((left, right) => {
    const leftTime = toDate(left.submittedAt)?.getTime() ?? 0;
    const rightTime = toDate(right.submittedAt)?.getTime() ?? 0;
    return rightTime - leftTime;
  });

  const latestSubmission = sortedResponses[0];
  const fullName = user.fullName || pickAnswer(latestSubmission, ["name"]);
  const email = user.email;
  const phone =
    normalizePhoneNumber(user.phone) ||
    normalizePhoneNumber(pickAnswer(latestSubmission, ["phone"]));
  const createdAt = toDate(user.createdAt);
  const lastSubmissionAt = toDate(
    latestSubmission?.submittedAt || latestSubmission?.timestamp,
  );

  return {
    id: String(user._id),
    fullName: fullName || "Unknown User",
    email,
    phone,
    registrationDate: createdAt ? createdAt.toISOString() : null,
    lastQuestionnaireSubmissionDate: lastSubmissionAt
      ? lastSubmissionAt.toISOString()
      : null,
    submissionCount: responses.length,
  };
}

export function normalizeUserDocument(user: AdminUserDocument) {
  const responses = Array.isArray(user.responses) ? user.responses : [];
  const sortedResponses = [...responses].sort((left, right) => {
    const leftTime = toDate(left.submittedAt)?.getTime() ?? 0;
    const rightTime = toDate(right.submittedAt)?.getTime() ?? 0;
    return rightTime - leftTime;
  });

  return {
    ...deriveUserProfile(user),
    responses: sortedResponses.map((submission) => ({
      questionnaireSlug: submission.questionnaireSlug,
      questionnaireTitle: submission.questionnaireTitle,
      submittedAt:
        toDate(submission.submittedAt)?.toISOString() ||
        new Date().toISOString(),
      timestamp:
        submission.timestamp ||
        toDate(submission.submittedAt)?.toISOString() ||
        new Date().toISOString(),
      answers: (submission.answers || []).map((answer) => ({
        key: answer.key,
        question: answer.question,
        answer: answer.answer,
      })),
    })),
  };
}
