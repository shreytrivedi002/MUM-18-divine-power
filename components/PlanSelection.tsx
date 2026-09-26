'use client';

import { useEffect, useState } from 'react';

type PlanRow = {
  id: string;
  name: string;
  details: string;
  description: string;
  durationWeeks: number;
  costInr: number;
};

type UserSummary = {
  fullName: string;
  planEnrollment: { planName: string; status: string } | null;
};

const fallbackPlans: PlanRow[] = [
  { id: 'trial', name: '1 Week Trial Plan', details: 'Your Testing Transformation Journey', description: 'Trial of 1 week to make you feel comfortable with your DPHT plan.\n\nIntroductory plan to begin your DPHT journey.', durationWeeks: 1, costInr: 1000 },
  { id: 'visible', name: '4 Weeks Plan', details: 'Visible improvement in Symptoms:\n- Anxiety\n- Fatigue\n- Sleep Pattern', description: 'Focused support for visible improvement in 4 weeks.', durationWeeks: 4, costInr: 3000 },
  { id: 'consistent', name: '12 Weeks Plan', details: 'Consistent Improvement In Recovery\n- Withdrawal Of Symptoms Beings\n- Improvement In Health\n- Enhanced\n- Efficiency', description: 'Structured progression for consistency and momentum.', durationWeeks: 12, costInr: 8000 },
  { id: 'reversal', name: '25 Weeks Plan', details: 'Reversal Of Symptoms\n- Restored Efficiency\n- Health Restored\n- Symptoms Vanished', description: 'Live a healthy and energetic life. As a precaution against possible recurrence in some cases, continue with a comprehensive long-term plan.', durationWeeks: 25, costInr: 15000 },
  { id: 'complete', name: '52 Weeks Plan', details: 'Completely Healthy:\n- Boosted Health\n- Confidence Regained\n- Enjoy Lifelong Wellness', description: 'Longer care cycle aimed at deeper symptom reversal.', durationWeeks: 52, costInr: 30000 },
];

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PlanSelection({ userId }: { userId: string }) {
  const [plans, setPlans] = useState<PlanRow[]>(fallbackPlans);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        const response = await fetch('/api/plans', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) return;
        const list = Array.isArray(payload?.plans) ? (payload.plans as PlanRow[]) : [];
        if (!cancelled && list.length > 0) {
          setPlans(list);
        }
      } catch {
        // Keep fallback plans when API is unavailable.
      }
    }

    async function loadUser() {
      try {
        const response = await fetch(`/api/users/${userId}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!cancelled && response.ok && payload?.user) {
          setUser(payload.user);
        }
      } catch {
        // Ignore; page still works without name.
      }
    }

    loadPlans();
    loadUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function choosePlan(planId: string) {
    setError(null);
    setPayingPlanId(planId);

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, planId }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to start payment. Please try again.');
      }

      const paymentLinkUrl = String(payload?.payment?.paymentLinkUrl || '');
      if (!paymentLinkUrl) {
        throw new Error('Payment link was not generated. Please try again.');
      }

      window.location.href = paymentLinkUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start payment. Please try again.');
      setPayingPlanId(null);
    }
  }

  const alreadyEnrolled = user?.planEnrollment?.status === 'active';

  return (
    <section className="plan-selection">
      <p className="eyebrow">DPHT Plan</p>
      <h2>{`Welcome ${user?.fullName || 'Client Name'}, Choose your DIVINE POWER HOLISTIC THERAPY (DPHT) plan.`}</h2>
      <p className="subtitle">Select a plan below to proceed directly to secure Razorpay payment.</p>

      <div className="plan-selection-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            try { localStorage.removeItem('healthifi-survey'); } catch {}
            window.location.href = '/survey';
          }}
        >
          Retake Questionnaire
        </button>
      </div>

      {alreadyEnrolled ? (
        <p className="status">
          You already have an active plan: <strong>{user?.planEnrollment?.planName}</strong>. You may still choose a new plan below to upgrade or renew.
        </p>
      ) : null}

      {error ? <p className="validation-error">{error}</p> : null}

      <div className="plan-grid">
        {plans.map((plan) => (
          <article className="plan-card" key={plan.id}>
            <h3>{plan.name}</h3>
            <p><strong>{plan.details}</strong></p>
            <p>{plan.description}</p>
            <p>Duration: {plan.durationWeeks} week{plan.durationWeeks > 1 ? 's' : ''}</p>
            <p>Cost: {formatInr(plan.costInr)}</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => choosePlan(plan.id)}
              disabled={payingPlanId !== null}
            >
              {payingPlanId === plan.id ? 'Redirecting to payment...' : 'Choose & Pay'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
