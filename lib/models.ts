export type QuestionType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "likert"
  | "rating";

export type Question = {
  key: string;
  label: string;
  type: QuestionType;
  category?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  minValue?: number;
  maxValue?: number;
  step?: number;
};

export type Questionnaire = {
  slug: string;
  title: string;
  description: string;
  questions: Question[];
};

export type SurveyResponse = {
  questionnaireSlug: string;
  questionnaireTitle: string;
  values: Record<string, string | string[] | number>;
  createdAt?: string | Date;
};

export type ResponseEntry = {
  question: string;
  answer: string | string[] | number;
};

export type User = {
  _id?: string;
  email: string;
  phone?: string;
  responses: ResponseEntry[];
  submittedAt: Date;
  questionnaireSlug?: string;
  questionnaireTitle?: string;
};
