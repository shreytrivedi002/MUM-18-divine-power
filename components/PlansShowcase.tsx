'use client';

import { useEffect, useState } from 'react';

type PlanRow = {
  id: string;
  name: string;
  details: string;
  description: string;
  durationWeeks: number;
  costInr: number;
  isActive: boolean;
};

const fallbackPlans: PlanRow[] = [
  {
    id: 'trial',
    name: '1 Week Trial Plan',
    details: 'Your Testing Transformation Journey',
    description: 'Trial of 1 week to make you feel comfortable with your DPHT plan.\n\nIntroductory plan to begin your DPHT journey.',
    durationWeeks: 1,
    costInr: 1000,
    isActive: true,
  },
  {
    id: 'visible',
    name: '4 Weeks Plan',
    details: 'Visible improvement in Symptoms:\n- Anxiety\n- Fatigue\n- Sleep Pattern',
    description: 'Focused support for visible improvement in 4 weeks.',
    durationWeeks: 4,
    costInr: 3000,
    isActive: true,
  },
  {
    id: 'consistent',
    name: '12 Weeks Plan',
    details: 'Consistent Improvement In Recovery\n- Withdrawal Of Symptoms Beings\n- Improvement In Health\n- Enhanced\n- Efficiency',
    description: 'Structured progression for consistency and momentum.',
    durationWeeks: 12,
    costInr: 8000,
    isActive: true,
  },
  {
    id: 'reversal',
    name: '25 Weeks Plan',
    details: 'Reversal Of Symptoms\n- Restored Efficiency\n- Health Restored\n- Symptoms Vanished',
    description: 'Live a healthy and energetic life. As a precaution against possible recurrence in some cases, continue with a comprehensive long-term plan.',
    durationWeeks: 25,
    costInr: 15000,
    isActive: true,
  },
  {
    id: 'complete',
    name: '52 Weeks Plan',
    details: 'Completely Healthy:\n- Boosted Health\n- Confidence Regained\n- Enjoy Lifelong Wellness',
    description: 'Longer care cycle aimed at deeper symptom reversal.',
    durationWeeks: 52,
    costInr: 30000,
    isActive: true,
  },
];

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PlansShowcase() {
  const [plans, setPlans] = useState<PlanRow[]>(fallbackPlans);

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        const response = await fetch('/api/plans', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          return;
        }

        const list = Array.isArray(payload?.plans) ? (payload.plans as PlanRow[]) : [];
        if (!cancelled && list.length > 0) {
          setPlans(list);
        }
      } catch {
        // Keep fallback plans in UI when API is unavailable.
      }
    }

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <p className="eyebrow">DPHT Plan</p>
      <h2>Choose your DIVINE POWER HOLISTIC THERAPY (DPHT) Plan.</h2>
      <div className="plan-grid">
        {plans.map((plan) => (
          <article className="plan-card" key={plan.id}>
            <h3>{plan.name}</h3>
            <p><strong>{plan.details}</strong></p>
            <p>{plan.description}</p>
            <p>Duration: {plan.durationWeeks} week{plan.durationWeeks > 1 ? 's' : ''}</p>
            <p>Cost: {formatInr(plan.costInr)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
