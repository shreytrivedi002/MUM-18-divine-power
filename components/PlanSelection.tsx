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
  { id: 'trial', name: '1 Week Trial', details: 'Trial of 4-week transformation path', description: 'Best to experience the DPHT method with direct weekly coaching touchpoints.', durationWeeks: 1, costInr: 1000 },
  { id: 'visible', name: '4 Weeks Plan', details: 'Visible Improvement', description: 'Structured daily and weekly plan to trigger visible wellness changes in 30 days.', durationWeeks: 4, costInr: 3000 },
  { id: 'consistent', name: '12 Weeks Plan', details: 'Consistent Results', description: 'Longer reinforcement cycle for consistency, energy improvement, and lifestyle reset.', durationWeeks: 12, costInr: 10000 },
  { id: 'reversal', name: '25 Weeks Plan', details: 'Reversal of Symptoms', description: 'Extended therapeutic support for deeper metabolic and stress-pattern correction.', durationWeeks: 25, costInr: 18000 },
  { id: 'complete', name: '52 Weeks Plan', details: 'Completely Healthy Track', description: 'Year-long guided framework for sustainable long-term holistic health outcomes.', durationWeeks: 52, costInr: 35000 },
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
    <section>
      <p className="eyebrow">DPHT Programs</p>
      <h2>{user ? `${user.fullName}, choose your healing path` : 'Choose Your Healing Path'}</h2>
      <p className="subtitle">Select a plan below to proceed directly to secure Razorpay payment.</p>

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
