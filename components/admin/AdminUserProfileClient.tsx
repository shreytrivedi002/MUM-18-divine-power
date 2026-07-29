'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';

type SubmissionAnswer = {
  key: string;
  question: string;
  answer: unknown;
  section?: string;
};

type Submission = {
  questionnaireSlug: string;
  questionnaireTitle: string;
  submittedAt: string;
  timestamp: string;
  answers: SubmissionAnswer[];
};

type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  registrationDate: string | null;
  lastQuestionnaireSubmissionDate: string | null;
  submissionCount: number;
  responses: Submission[];
};

function renderAnswer(answer: unknown) {
  if (Array.isArray(answer)) {
    return answer.join(', ');
  }

  if (answer === null || answer === undefined || answer === '') {
    return '-';
  }

  if (typeof answer === 'object') {
    return JSON.stringify(answer);
  }

  return String(answer);
}

export default function AdminUserProfileClient({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/users/${userId}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load user profile.');
        }

        if (!cancelled) {
          setUser(payload.user);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load user profile.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return <p>Loading user profile…</p>;
  }

  if (error) {
    return <p className="validation-error">{error}</p>;
  }

  if (!user) {
    return <p>User not found.</p>;
  }

  const phoneHref = user.phone ? user.phone.replace(/\s+/g, '') : '';
  const whatsappPhone = user.phone ? user.phone.replace(/\D+/g, '') : '';
  const whatsappHref = whatsappPhone ? `https://wa.me/${whatsappPhone}` : '';

  function groupAnswersBySection(answers: SubmissionAnswer[]) {
    const grouped = new Map<string, SubmissionAnswer[]>();

    for (const answer of answers) {
      const section = (answer.section || 'General').trim() || 'General';
      if (!grouped.has(section)) {
        grouped.set(section, []);
      }
      grouped.get(section)?.push(answer);
    }

    return Array.from(grouped.entries()).map(([section, sectionAnswers]) => ({
      section,
      answers: sectionAnswers,
    }));
  }

  function downloadResponsesPdf() {
    if (!user) {
      return;
    }

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const left = 42;
    const right = 553;
    const lineHeight = 16;
    let cursorY = 44;

    const addWrappedLine = (text: string, size = 11, style: 'normal' | 'bold' = 'normal') => {
      pdf.setFont('helvetica', style);
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(text, right - left);
      for (const line of lines) {
        if (cursorY > 790) {
          pdf.addPage();
          cursorY = 44;
        }
        pdf.text(line, left, cursorY);
        cursorY += lineHeight;
      }
    };

    addWrappedLine(`DPHT User Response Report`, 14, 'bold');
    addWrappedLine(`Generated: ${new Date().toLocaleString()}`);
    cursorY += 4;
    addWrappedLine(`Name: ${user.fullName}`, 11, 'bold');
    addWrappedLine(`Email: ${user.email}`);
    addWrappedLine(`Mobile: ${user.phone || '-'}`);
    addWrappedLine(`Total Submissions: ${user.submissionCount}`);
    cursorY += 8;

    user.responses.forEach((submission, submissionIndex) => {
      addWrappedLine(`Submission ${submissionIndex + 1}: ${submission.questionnaireTitle}`, 12, 'bold');
      addWrappedLine(`Submitted At: ${new Date(submission.submittedAt).toLocaleString()}`);
      addWrappedLine(`Answers: ${submission.answers.length}`);
      cursorY += 4;

      const groupedSections = groupAnswersBySection(submission.answers);
      groupedSections.forEach((group) => {
        addWrappedLine(`Section: ${group.section}`, 11, 'bold');
        group.answers.forEach((answer, answerIndex) => {
          addWrappedLine(`${answerIndex + 1}. ${answer.question}`);
          addWrappedLine(`   ${renderAnswer(answer.answer)}`);
        });
      });

      cursorY += 10;
    });

    const safeName = user.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    pdf.save(`dpht-response-${safeName || 'user'}.pdf`);
  }

  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">User Profile</p>
          <h1>{user.fullName}</h1>
          <p className="subtitle">Questionnaire history and contact details.</p>
        </div>
        <div className="admin-toolbar-actions">
          <Link href="/admin" className="secondary-button">Back to Dashboard</Link>
          <Link href="/admin/questionnaires" className="secondary-button">Manage Questionnaires</Link>
          <Link href="/admin/change-password" className="secondary-button">Change Password</Link>
          <button type="button" className="secondary-button" onClick={downloadResponsesPdf}>Download PDF</button>
        </div>
      </div>

      <div className="admin-profile-grid">
        <div className="admin-profile-panel">
          <h2>Profile</h2>
          <p><strong>Full Name:</strong> {user.fullName}</p>
          <p><strong>Email:</strong> <a href={`mailto:${user.email}`}>{user.email}</a></p>
          <p><strong>Mobile:</strong> {user.phone ? <a href={`tel:${phoneHref}`}>{user.phone}</a> : '-'}</p>
          <p><strong>Registered:</strong> {user.registrationDate ? new Date(user.registrationDate).toLocaleString() : '-'}</p>
          <p><strong>Last Submission:</strong> {user.lastQuestionnaireSubmissionDate ? new Date(user.lastQuestionnaireSubmissionDate).toLocaleString() : '-'}</p>
          <p><strong>Total Submissions:</strong> {user.submissionCount}</p>
        </div>

        <div className="admin-profile-panel">
          <h2>Quick Contact</h2>
          <p>Email, call, or open WhatsApp chat directly from this page.</p>
          <div className="admin-contact-actions">
            <a href={`mailto:${user.email}`} className="primary-button">Email User</a>
            {user.phone ? <a href={`tel:${phoneHref}`} className="secondary-button">Call User</a> : null}
            {whatsappHref ? (
              <a href={whatsappHref} className="secondary-button" target="_blank" rel="noopener noreferrer">WhatsApp User</a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="admin-history">
        <h2>Questionnaire History</h2>
        {user.responses.length > 0 ? (
          user.responses.map((submission, submissionIndex) => (
            <article className="admin-submission-card" key={`${submission.questionnaireSlug}-${submission.timestamp}`}>
              <div className="admin-submission-header">
                <div>
                  <p className="admin-submission-index">Submission {submissionIndex + 1}</p>
                  <h3>{submission.questionnaireTitle}</h3>
                  <p>{new Date(submission.submittedAt).toLocaleString()}</p>
                </div>
                <span className="admin-badge">{submission.answers.length} answers</span>
              </div>
              {groupAnswersBySection(submission.answers).map((group) => (
                <div className="admin-section-group" key={`${submission.timestamp}-${group.section}`}>
                  <h4 className="admin-section-title">{group.section}</h4>
                  <div className="admin-answer-list">
                    {group.answers.map((answer, answerIndex) => (
                      <div className="admin-answer-row" key={`${answer.key}-${answer.question}-${answerIndex}`}>
                        <strong>{answer.question}</strong>
                        <span>{renderAnswer(answer.answer)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </article>
          ))
        ) : (
          <p>No questionnaire submissions recorded.</p>
        )}
      </div>
    </section>
  );
}
