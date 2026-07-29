'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type QuestionType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'likert'
  | 'rating';

type AdminQuestion = {
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

type QuestionnaireDetail = {
  slug: string;
  title: string;
  description: string;
  sections: string[];
  questions: AdminQuestion[];
};

const questionTypes: QuestionType[] = [
  'text',
  'email',
  'phone',
  'number',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'likert',
  'rating',
];

function normalizeKey(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function makeUniqueKey(baseLabel: string, existingKeys: string[], currentKey?: string) {
  const base = normalizeKey(baseLabel) || `question_${Date.now()}`;
  const taken = new Set(existingKeys.filter((key) => key !== currentKey));

  if (!taken.has(base)) {
    return base;
  }

  let count = 2;
  let candidate = `${base}_${count}`;
  while (taken.has(candidate)) {
    count += 1;
    candidate = `${base}_${count}`;
  }

  return candidate;
}

export default function AdminQuestionEditorClient({
  slug,
  mode,
  questionKey,
  initialSection,
}: {
  slug: string;
  mode: 'add' | 'edit';
  questionKey?: string;
  initialSection?: string;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<QuestionnaireDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [label, setLabel] = useState('');
  const [type, setType] = useState<QuestionType>('text');
  const [section, setSection] = useState(initialSection || 'General');
  const [required, setRequired] = useState(false);
  const [helpText, setHelpText] = useState('');
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/questionnaires/${encodeURIComponent(slug)}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load questionnaire details.');
        }

        const questionnaire = payload.questionnaire as QuestionnaireDetail;
        setDetail(questionnaire);

        if (mode === 'edit') {
          const target = questionnaire.questions.find((question) => question.key === questionKey);
          if (!target) {
            throw new Error('Question not found.');
          }

          setLabel(target.label || '');
          setType((target.type || 'text') as QuestionType);
          setSection((target.category || initialSection || questionnaire.sections[0] || 'General').trim() || 'General');
          setRequired(Boolean(target.required));
          setHelpText(target.helpText || '');
          setOptions(target.options || []);
        } else {
          setLabel('');
          setType('text');
          setSection((initialSection || questionnaire.sections[0] || 'General').trim() || 'General');
          setRequired(false);
          setHelpText('');
          setOptions([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load questionnaire details.');
      } finally {
        setLoading(false);
      }
    }

    loadDetail();
  }, [slug, mode, questionKey, initialSection]);

  const generatedKey = useMemo(() => {
    if (!detail) {
      return normalizeKey(label) || '';
    }

    const existingKeys = detail.questions.map((question) => question.key);
    const current = mode === 'edit' ? questionKey : undefined;
    return makeUniqueKey(label || 'new question', existingKeys, current);
  }, [detail, label, mode, questionKey]);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function addOption() {
    setOptions((current) => [...current, 'New option']);
  }

  function removeOption(index: number) {
    setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function saveQuestion() {
    if (!detail) {
      return;
    }

    if (!label.trim()) {
      setError('Question label is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const normalizedSection = section.trim() || 'General';
      const sections = Array.from(new Set([...(detail.sections || []), normalizedSection]));

      const preparedQuestion: AdminQuestion = {
        key: generatedKey,
        label: label.trim(),
        type,
        category: normalizedSection,
        required,
        helpText: helpText.trim() || undefined,
        options: (type === 'select' || type === 'radio' || type === 'checkbox')
          ? options.map((option) => option.trim()).filter(Boolean)
          : undefined,
      };

      const nextQuestions = [...detail.questions];
      if (mode === 'edit') {
        const index = nextQuestions.findIndex((question) => question.key === questionKey);
        if (index < 0) {
          throw new Error('Question not found for editing.');
        }
        nextQuestions[index] = preparedQuestion;
      } else {
        nextQuestions.push(preparedQuestion);
      }

      const payload: QuestionnaireDetail = {
        ...detail,
        sections,
        questions: nextQuestions,
      };

      const response = await fetch(`/api/admin/questionnaires/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || 'Unable to save question.');
      }

      setSuccess(mode === 'edit' ? 'Question updated.' : 'Question created.');
      router.push(`/admin/questionnaires?slug=${encodeURIComponent(slug)}&section=${encodeURIComponent(normalizedSection)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save question.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Superadmin Panel</p>
          <h1>{mode === 'edit' ? 'Edit Question' : 'Add Question'}</h1>
        </div>
        <div className="admin-toolbar-actions">
          <Link href={`/admin/questionnaires?slug=${encodeURIComponent(slug)}&section=${encodeURIComponent(section)}`} className="secondary-button">
            Back to Questions
          </Link>
          <button type="button" className="secondary-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {loading ? <p>Loading question editor…</p> : null}
      {error ? <p className="validation-error">{error}</p> : null}
      {success ? <p className="validation-success">{success}</p> : null}

      {!loading && detail ? (
        <div className="questionnaire-question-card">
          <div className="questionnaire-question-row">
            <label>
              Question
              <input className="admin-input" value={label} onChange={(event) => setLabel(event.target.value)} />
            </label>
            <label>
              Section
              <select className="admin-input" value={section} onChange={(event) => setSection(event.target.value)}>
                {Array.from(new Set([...(detail.sections || []), section])).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="questionnaire-question-row">
            <label>
              Type
              <select className="admin-input" value={type} onChange={(event) => setType(event.target.value as QuestionType)}>
                {questionTypes.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="questionnaire-question-row">
            <label>
              Help text
              <input className="admin-input" value={helpText} onChange={(event) => setHelpText(event.target.value)} />
            </label>
          </div>

          {(type === 'select' || type === 'radio' || type === 'checkbox') ? (
            <div className="questionnaire-option-rows">
              <p className="questionnaire-options-label">Response Rows</p>
              {options.map((option, index) => (
                <div className="questionnaire-option-row" key={`${generatedKey}-option-${index}`}>
                  <input
                    className="admin-input"
                    value={option}
                    onChange={(event) => updateOption(index, event.target.value)}
                  />
                  <button type="button" className="admin-delete-button" onClick={() => removeOption(index)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="secondary-button" onClick={addOption}>Add Response Row</button>
            </div>
          ) : null}

          <div className="questionnaire-question-footer">
            <label className="question-required-toggle">
              <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
              Required
            </label>
            <button type="button" className="primary-button" onClick={saveQuestion} disabled={saving}>
              {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Question'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
