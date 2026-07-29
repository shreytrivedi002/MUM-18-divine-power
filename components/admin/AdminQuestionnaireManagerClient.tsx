'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type AdminQuestion = {
  key: string;
  label: string;
  type: string;
  category?: string;
};

type QuestionnaireSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  sections: string[];
  questionCount: number;
};

type QuestionnaireDetail = {
  slug: string;
  title: string;
  description: string;
  sections: string[];
  questions: AdminQuestion[];
};

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 16.25V20h3.75l11-11-3.75-3.75-11 11Zm16.71-9.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0l-1.96 1.96 3.75 3.75 2.13-2.04Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM6 9h2v9H6V9Z" />
    </svg>
  );
}

export default function AdminQuestionnaireManagerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [summaries, setSummaries] = useState<QuestionnaireSummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [detail, setDetail] = useState<QuestionnaireDetail | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  async function loadSummaries() {
    setLoadingSummaries(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/questionnaires', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load questionnaires.');
      }

      const list = (payload.questionnaires || []) as QuestionnaireSummary[];
      setSummaries(list);

      const urlSlug = (searchParams.get('slug') || '').trim();
      const validSlug = list.some((item) => item.slug === urlSlug);
      const nextSlug = validSlug ? urlSlug : list[0]?.slug || '';
      setSelectedSlug(nextSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load questionnaires.');
    } finally {
      setLoadingSummaries(false);
    }
  }

  async function loadDetail(slug: string) {
    if (!slug) {
      return;
    }

    setLoadingDetail(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/questionnaires/${encodeURIComponent(slug)}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load questionnaire details.');
      }

      const questionnaire = payload.questionnaire as QuestionnaireDetail;
      setDetail(questionnaire);

      const availableSections = Array.from(
        new Set([
          ...(questionnaire.sections || []),
          ...(questionnaire.questions || []).map((question) => (question.category || 'General').trim() || 'General'),
        ]),
      );

      const urlSection = (searchParams.get('section') || '').trim();
      const validSection = availableSections.includes(urlSection);
      setSelectedSection(validSection ? urlSection : availableSections[0] || 'General');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load questionnaire details.');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function saveQuestionnaire(nextDetail: QuestionnaireDetail, successMessage: string) {
    setWorking(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/questionnaires/${encodeURIComponent(nextDetail.slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextDetail),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save questionnaire.');
      }

      const updated = payload.questionnaire as QuestionnaireDetail;
      setDetail(updated);
      setSuccess(successMessage);
      await loadSummaries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save questionnaire.');
    } finally {
      setWorking(false);
    }
  }

  useEffect(() => {
    loadSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedSlug) {
      loadDetail(selectedSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  const sections = useMemo(() => {
    if (!detail) {
      return [] as string[];
    }

    return Array.from(
      new Set([
        ...(detail.sections || []),
        ...(detail.questions || []).map((question) => (question.category || 'General').trim() || 'General'),
      ]),
    );
  }, [detail]);

  const sectionQuestions = useMemo(() => {
    if (!detail || !selectedSection) {
      return [] as AdminQuestion[];
    }

    return detail.questions.filter(
      (question) => ((question.category || 'General').trim() || 'General') === selectedSection,
    );
  }, [detail, selectedSection]);

  async function addSection() {
    const section = newSectionName.trim();
    if (!section || !detail) {
      return;
    }

    if (sections.includes(section)) {
      setError('Section already exists.');
      return;
    }

    const nextDetail: QuestionnaireDetail = {
      ...detail,
      sections: [...sections, section],
    };

    await saveQuestionnaire(nextDetail, 'Section created successfully.');
    setSelectedSection(section);
    setNewSectionName('');
  }

  async function deleteQuestion(questionKey: string) {
    if (!detail) {
      return;
    }

    const approved = window.confirm('Delete this question?');
    if (!approved) {
      return;
    }

    const nextQuestions = detail.questions.filter((question) => question.key !== questionKey);
    const nextDetail: QuestionnaireDetail = {
      ...detail,
      questions: nextQuestions,
    };

    await saveQuestionnaire(nextDetail, 'Question deleted successfully.');
  }

  function openAddQuestionPage() {
    if (!selectedSlug || !selectedSection) {
      return;
    }

    router.push(`/admin/questionnaires/${encodeURIComponent(selectedSlug)}/add?section=${encodeURIComponent(selectedSection)}`);
  }

  function openEditQuestionPage(questionKey: string) {
    router.push(
      `/admin/questionnaires/${encodeURIComponent(selectedSlug)}/edit/${encodeURIComponent(questionKey)}?section=${encodeURIComponent(selectedSection)}`,
    );
  }

  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Superadmin Panel</p>
          <h1>Questionnaire Management</h1>
        </div>
        <div className="admin-toolbar-actions">
          <Link href="/admin" className="secondary-button">Back to Dashboard</Link>
          <Link href="/admin/admins" className="secondary-button">Admin Management</Link>
          <Link href="/admin/change-password" className="secondary-button">Change Password</Link>
          <button type="button" className="secondary-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error ? <p className="validation-error">{error}</p> : null}
      {success ? <p className="validation-success">{success}</p> : null}

      {loadingSummaries ? <p>Loading questionnaires…</p> : null}

      {!loadingSummaries && summaries.length > 0 ? (
        <div className="questionnaire-simple-controls">
          <label>
            Questionnaire
            <select
              className="admin-input"
              value={selectedSlug}
              onChange={(event) => setSelectedSlug(event.target.value)}
            >
              {summaries.map((summary) => (
                <option key={summary.slug} value={summary.slug}>{summary.title}</option>
              ))}
            </select>
          </label>

          <label>
            Section
            <select
              className="admin-input"
              value={selectedSection}
              onChange={(event) => setSelectedSection(event.target.value)}
            >
              {sections.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </label>

          <div className="questionnaire-section-add-row">
            <input
              className="admin-input"
              value={newSectionName}
              onChange={(event) => setNewSectionName(event.target.value)}
              placeholder="Create new section"
            />
            <button type="button" className="secondary-button" onClick={addSection} disabled={working}>
              Add Section
            </button>
          </div>
        </div>
      ) : null}

      {loadingDetail ? <p>Loading section questions…</p> : null}

      {!loadingDetail && detail ? (
        <section className="questionnaire-section-card">
          <div className="questionnaire-section-header">
            <h2>{selectedSection || 'Section'}</h2>
            <button type="button" className="primary-button" onClick={openAddQuestionPage}>
              Add New Question
            </button>
          </div>

          {sectionQuestions.length === 0 ? (
            <p>No questions in this section yet.</p>
          ) : (
            <div className="questionnaire-question-list">
              {sectionQuestions.map((question) => (
                <div className="questionnaire-question-item" key={question.key}>
                  <button
                    type="button"
                    className="questionnaire-question-open"
                    onClick={() => openEditQuestionPage(question.key)}
                    title="Edit question"
                  >
                    <strong>{question.label?.trim() || 'Untitled question'}</strong>
                  </button>
                  <div className="questionnaire-question-item-actions">
                    <button
                      type="button"
                      className="icon-button"
                      title="Edit question"
                      onClick={() => openEditQuestionPage(question.key)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      title="Delete question"
                      onClick={() => deleteQuestion(question.key)}
                      disabled={working}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
