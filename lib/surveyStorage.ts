export type SurveyData = {
  name: string;
  email: string;
  stressLevel: "low" | "moderate" | "high";
  sleepQuality: "poor" | "fair" | "good";
  energy: "low" | "moderate" | "high";
  focus: "rarely" | "sometimes" | "often";
  cravings: "never" | "occasionally" | "frequently";
  goals: string;
};

const STORAGE_KEY = "healthifi-survey";

const defaultSurveyData: SurveyData = {
  name: "",
  email: "",
  stressLevel: "moderate",
  sleepQuality: "fair",
  energy: "moderate",
  focus: "sometimes",
  cravings: "occasionally",
  goals: "Improve energy and balance cortisol",
};

export function getSurveyData(): SurveyData {
  if (typeof window === "undefined") {
    return defaultSurveyData;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return defaultSurveyData;
  }

  try {
    return { ...defaultSurveyData, ...JSON.parse(stored) };
  } catch {
    return defaultSurveyData;
  }
}

export function saveSurveyData(partial: Partial<SurveyData>): SurveyData {
  const current = getSurveyData();
  const next = { ...current, ...partial };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function getStoredSurveyValues(): Record<string, unknown> {
  if (typeof window === "undefined") {
    return {};
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return {};
  }

  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

export function saveStoredSurveyValues(
  partial: Record<string, unknown>,
): Record<string, unknown> {
  const current = getStoredSurveyValues();
  const next = { ...current, ...partial };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearSurveyData() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

const PROGRESS_STORAGE_KEY = "healthifi-survey-progress";

export function getStoredQuestionIndex(slug: string): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const stored = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
  if (!stored) {
    return 0;
  }

  try {
    const parsed = JSON.parse(stored);
    if (parsed && parsed.slug === slug && Number.isFinite(parsed.index)) {
      return parsed.index;
    }
  } catch {
    // Ignore malformed progress data.
  }

  return 0;
}

export function saveStoredQuestionIndex(slug: string, index: number) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ slug, index }),
    );
  }
}

export function clearStoredQuestionIndex() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
  }
}
