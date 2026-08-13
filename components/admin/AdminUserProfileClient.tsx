'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import LoadingSpinner from '../ui/LoadingSpinner';

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

type PlanOption = {
  id: string;
  name: string;
  details: string;
  costInr: number;
};

type UserPayment = {
  id: string;
  planId: string;
  planName: string;
  amountInr: number;
  status: string;
  paymentLinkUrl: string;
  createdAt: string | null;
  paidAt: string | null;
  dispatchLog: Array<{
    channel: string;
    dispatchedAt: string;
  }>;
};

type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  registrationDate: string | null;
  lastQuestionnaireSubmissionDate: string | null;
  submissionCount: number;
  planEnrollment: {
    planId: string;
    planName: string;
    status: string;
    enrolledAt: string | null;
    paymentId: string;
  } | null;
  payments: UserPayment[];
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
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [latestPaymentLink, setLatestPaymentLink] = useState<string>('');
  const [latestPaymentId, setLatestPaymentId] = useState<string>('');
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

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        const response = await fetch('/api/admin/plans', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          return;
        }

        const nextPlans = Array.isArray(payload?.plans)
          ? payload.plans.map((item: any) => ({
              id: String(item.id),
              name: String(item.name || ''),
              details: String(item.details || ''),
              costInr: Number(item.costInr || 0),
            }))
          : [];

        if (!cancelled) {
          setPlans(nextPlans);
          if (nextPlans.length > 0) {
            setSelectedPlanId(nextPlans[0].id);
          }
        }
      } catch {
        // Ignore failures here and keep page usable.
      }
    }

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  async function markDispatched(channel: 'email' | 'whatsapp') {
    if (!latestPaymentId) {
      return;
    }

    await fetch(`/api/admin/payments/${encodeURIComponent(latestPaymentId)}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel }),
    }).catch(() => null);
  }

  async function createPaymentRequest() {
    if (!selectedPlanId) {
      setPaymentStatus('Please select a plan first.');
      return;
    }

    setCreatingPayment(true);
    setPaymentStatus(null);

    try {
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, planId: selectedPlanId }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create payment request.');
      }

      const payment = payload?.payment;
      const link = String(payment?.paymentLinkUrl || '');
      const paymentId = String(payment?.id || '');
      setLatestPaymentLink(link);
      setLatestPaymentId(paymentId);
      setPaymentStatus('Payment link created successfully. Use the send buttons below.');

      const refreshed = await fetch(`/api/admin/users/${userId}`, { cache: 'no-store' });
      const refreshedPayload = await refreshed.json().catch(() => null);
      if (refreshed.ok && refreshedPayload?.user) {
        setUser(refreshedPayload.user);
      }
    } catch (err) {
      setPaymentStatus(err instanceof Error ? err.message : 'Unable to create payment request.');
    } finally {
      setCreatingPayment(false);
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading user profile..." />;
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
  const selectedPlan = plans.find((item) => item.id === selectedPlanId) || null;
  const paymentMessage = latestPaymentLink
    ? `Hello ${user.fullName}, please complete your DPHT plan payment using this secure link: ${latestPaymentLink}`
    : '';
  const whatsappPaymentHref = whatsappPhone && paymentMessage
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(paymentMessage)}`
    : '';
  const emailPaymentHref = paymentMessage
    ? `mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent('DPHT Plan Payment Link')}&body=${encodeURIComponent(paymentMessage)}`
    : '';

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
          <Link href="/admin/payments" className="secondary-button">Payments</Link>
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
          <p><strong>Enrolled Plan:</strong> {user.planEnrollment?.planName || '-'}</p>
          <p><strong>Enrollment Status:</strong> {user.planEnrollment?.status || '-'}</p>
          <p><strong>Enrolled At:</strong> {user.planEnrollment?.enrolledAt ? new Date(user.planEnrollment.enrolledAt).toLocaleString() : '-'}</p>
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

        <div className="admin-profile-panel">
          <h2>Send Plan Payment Link</h2>
          <p>Select a plan, generate Razorpay payment link, then send to user on WhatsApp and Email.</p>
          <label>
            Choose plan for payment request
            <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.details}) - INR {plan.costInr}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-contact-actions">
            <button type="button" className="primary-button" onClick={createPaymentRequest} disabled={creatingPayment || !selectedPlan}>
              {creatingPayment ? 'Creating link...' : 'Create Payment Link'}
            </button>
            {latestPaymentLink ? (
              <a href={latestPaymentLink} className="secondary-button" target="_blank" rel="noopener noreferrer">
                Open Payment Link
              </a>
            ) : null}
            {whatsappPaymentHref ? (
              <a
                href={whatsappPaymentHref}
                className="secondary-button"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markDispatched('whatsapp')}
              >
                Send on WhatsApp
              </a>
            ) : null}
            {emailPaymentHref ? (
              <a href={emailPaymentHref} className="secondary-button" onClick={() => markDispatched('email')}>
                Send on Email
              </a>
            ) : null}
          </div>
          {paymentStatus ? <p className="status">{paymentStatus}</p> : null}
        </div>
      </div>

      <div className="admin-history">
        <h2>Payment Requests</h2>
        {user.payments && user.payments.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Paid At</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {user.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.planName || '-'}</td>
                    <td>INR {payment.amountInr}</td>
                    <td>{payment.status || '-'}</td>
                    <td>{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '-'}</td>
                    <td>{payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '-'}</td>
                    <td>{payment.paymentLinkUrl ? <a href={payment.paymentLinkUrl} target="_blank" rel="noopener noreferrer">Open</a> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No payment requests recorded for this user.</p>
        )}
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
