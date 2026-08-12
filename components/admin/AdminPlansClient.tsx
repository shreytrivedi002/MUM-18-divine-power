'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../ui/LoadingSpinner';

type PlanRow = {
  id: string;
  name: string;
  details: string;
  description: string;
  durationWeeks: number;
  costInr: number;
  isActive: boolean;
  sortOrder: number;
};

export default function AdminPlansClient() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingPlanId, setWorkingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  async function loadPlans() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/plans', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load plans.');
      }

      const list = (payload?.plans || []) as PlanRow[];
      setPlans(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load plans.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  async function deletePlan(plan: PlanRow) {
    const approved = window.confirm(`Delete plan: ${plan.name}?`);
    if (!approved) {
      return;
    }

    setWorkingPlanId(plan.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/plans/${encodeURIComponent(plan.id)}`, {
        method: 'DELETE',
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to delete plan.');
      }

      setSuccess('Plan deleted successfully.');
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete plan.');
    } finally {
      setWorkingPlanId(null);
    }
  }

  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h1>Plan Management</h1>
          <p className="subtitle">Create, edit, and delete DPHT plans.</p>
        </div>
        <div className="admin-toolbar-actions">
          <Link href="/admin" className="secondary-button">User Responses</Link>
          <Link href="/admin/questionnaires" className="secondary-button">Manage Questionnaires</Link>
          <Link href="/admin/admins" className="secondary-button">Admin Management</Link>
          <button type="button" className="secondary-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {loading ? <LoadingSpinner message="Loading plans..." /> : null}
      {error ? <p className="validation-error">{error}</p> : null}
      {success ? <p className="status">{success}</p> : null}

      {!loading ? (
        <div className="questionnaire-editor-panel">
          <h2>Plans</h2>
          {plans.length === 0 ? <p>No plans found.</p> : null}
          <div className="admin-plan-list">
            {plans.map((plan) => (
              <article key={plan.id} className="admin-plan-row">
                <div className="admin-plan-row-content">
                  <strong>{plan.name}</strong>
                  <span>{plan.details}</span>
                  <span>{plan.durationWeeks} weeks | INR {plan.costInr}</span>
                </div>
                <div className="admin-plan-row-actions">
                  <Link href={`/admin/plans/${encodeURIComponent(plan.id)}/edit`} className="secondary-button">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => deletePlan(plan)}
                    disabled={workingPlanId === plan.id}
                  >
                    {workingPlanId === plan.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="questionnaire-actions">
            <Link href="/admin/plans/new" className="primary-button">
              Add New Plan
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
