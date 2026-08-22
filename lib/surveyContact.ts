export type QuestionnaireQuestion = {
  key?: string;
  label?: string;
  type?: string;
};

export function normalizeIndianPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (compact.startsWith("+91")) {
    return compact.slice(3);
  }
  if (compact.startsWith("91") && compact.length === 12) {
    return compact.slice(2);
  }
  return compact;
}

export function isValidIndianPhone(value: string) {
  const normalized = normalizeIndianPhone(value);
  return /^[6-9]\d{9}$/.test(normalized);
}

export function toSafeString(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

export function pickContactValue(
  values: Record<string, unknown>,
  questions: QuestionnaireQuestion[],
  typeHints: string[],
  keyHints: string[],
) {
  for (const question of questions) {
    const key = toSafeString(question.key);
    const label = toSafeString(question.label).toLowerCase();
    const type = toSafeString(question.type).toLowerCase();
    if (!key) {
      continue;
    }

    const matchesType = typeHints.includes(type);
    const matchesKeyOrLabel = keyHints.some(
      (hint) => key.toLowerCase().includes(hint) || label.includes(hint),
    );

    if (matchesType || matchesKeyOrLabel) {
      const raw = values[key];
      const picked = toSafeString(raw);
      if (picked) {
        return picked;
      }
    }
  }

  for (const key of Object.keys(values)) {
    const lowered = key.toLowerCase();
    const matches = keyHints.some((hint) => lowered.includes(hint));
    if (matches) {
      const picked = toSafeString(values[key]);
      if (picked) {
        return picked;
      }
    }
  }

  return "";
}
