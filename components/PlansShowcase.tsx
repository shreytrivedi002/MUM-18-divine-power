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
    name: '1 Week Trial',
    details: 'Trial of 4-week transformation path',
    description: 'Best to experience the DPHT method with direct weekly coaching touchpoints.',
    durationWeeks: 1,
    costInr: 1000,
    isActive: true,
  },
  {
    id: 'visible',
    name: '4 Weeks Plan',
    details: 'Visible Improvement',
    description: 'Structured daily and weekly plan to trigger visible wellness changes in 30 days.',
    durationWeeks: 4,
    costInr: 3000,
    isActive: true,
  },
  {
    id: 'consistent',
    name: '12 Weeks Plan',
    details: 'Consistent Results',
    description: 'Longer reinforcement cycle for consistency, energy improvement, and lifestyle reset.',
    durationWeeks: 12,
    costInr: 10000,
    isActive: true,
  },
  {
    id: 'reversal',
    name: '25 Weeks Plan',
    details: 'Reversal of Symptoms',
    description: 'Extended therapeutic support for deeper metabolic and stress-pattern correction.',
    durationWeeks: 25,
    costInr: 18000,
    isActive: true,
  },
  {
    id: 'complete',
    name: '52 Weeks Plan',
    details: 'Completely Healthy Track',
    description: 'Year-long guided framework for sustainable long-term holistic health outcomes.',
    durationWeeks: 52,
    costInr: 35000,
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
      <p className="eyebrow">DPHT Programs</p>
      <h2>Choose Your Healing Path</h2>
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
