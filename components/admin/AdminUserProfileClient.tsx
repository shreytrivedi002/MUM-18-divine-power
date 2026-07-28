'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type SubmissionAnswer = {
  key: string;
  question: string;
  answer: unknown;
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
          <Link href="/admin/change-password" className="secondary-button">Change Password</Link>
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
          <p>Email the user or place a call directly from this page.</p>
          <div className="admin-contact-actions">
            <a href={`mailto:${user.email}`} className="primary-button">Email User</a>
            {user.phone ? <a href={`tel:${phoneHref}`} className="secondary-button">Call User</a> : null}
          </div>
        </div>
      </div>

      <div className="admin-history">
        <h2>Questionnaire History</h2>
        {user.responses.length > 0 ? (
          user.responses.map((submission) => (
            <article className="admin-submission-card" key={`${submission.questionnaireSlug}-${submission.timestamp}`}>
              <div className="admin-submission-header">
                <div>
                  <h3>{submission.questionnaireTitle}</h3>
                  <p>{new Date(submission.submittedAt).toLocaleString()}</p>
                </div>
                <span className="admin-badge">{submission.answers.length} answers</span>
              </div>
              <div className="admin-answer-list">
                {submission.answers.map((answer) => (
                  <div className="admin-answer-row" key={answer.key}>
                    <strong>{answer.question}</strong>
                    <span>{renderAnswer(answer.answer)}</span>
                  </div>
                ))}
              </div>
            </article>
          ))
        ) : (
          <p>No questionnaire submissions recorded.</p>
        )}
      </div>
    </section>
  );
}
