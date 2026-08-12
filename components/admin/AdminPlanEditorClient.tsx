'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../ui/LoadingSpinner';

type PlanForm = {
  name: string;
  details: string;
  description: string;
  durationWeeks: number;
  costInr: number;
  isActive: boolean;
  sortOrder: number;
};

type PlanRow = PlanForm & {
  id: string;
};

const defaultForm: PlanForm = {
  name: '',
  details: '',
  description: '',
  durationWeeks: 4,
  costInr: 1000,
  isActive: true,
  sortOrder: 1,
};

export default function AdminPlanEditorClient({
  mode,
  planId,
}: {
  mode: 'new' | 'edit';
  planId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<PlanForm>(defaultForm);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  useEffect(() => {
    if (mode !== 'edit' || !planId) {
      return;
    }

    const targetPlanId = planId;

    let cancelled = false;

    async function loadPlan() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/plans/${encodeURIComponent(targetPlanId)}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load plan.');
        }

        const plan = payload?.plan as PlanRow;
        if (!plan) {
          throw new Error('Plan not found.');
        }

        if (!cancelled) {
          setForm({
            name: plan.name,
            details: plan.details,
            description: plan.description,
            durationWeeks: plan.durationWeeks,
            costInr: plan.costInr,
            isActive: plan.isActive,
            sortOrder: plan.sortOrder,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load plan.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPlan();

    return () => {
      cancelled = true;
    };
  }, [mode, planId]);

  async function savePlan() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const endpoint =
        mode === 'new'
          ? '/api/admin/plans'
          : `/api/admin/plans/${encodeURIComponent(planId as string)}`;
      const method = mode === 'new' ? 'POST' : 'PUT';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save plan.');
      }

      if (mode === 'new') {
        router.push('/admin/plans');
        router.refresh();
        return;
      }

      setSuccess('Plan updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save plan.');
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan() {
    if (mode !== 'edit' || !planId) {
      return;
    }

    const targetPlanId = planId;

    const approved = window.confirm('Delete this plan?');
    if (!approved) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/plans/${encodeURIComponent(targetPlanId)}`, {
        method: 'DELETE',
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to delete plan.');
      }

      router.push('/admin/plans');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete plan.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h1>{mode === 'new' ? 'Add New Plan' : 'Edit Plan'}</h1>
          <p className="subtitle">Update plan details, pricing, and visibility.</p>
        </div>
        <div className="admin-toolbar-actions">
          <Link href="/admin/plans" className="secondary-button">Back to Plans</Link>
          <button type="button" className="secondary-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {loading ? <LoadingSpinner message="Loading plan..." /> : null}
      {error ? <p className="validation-error">{error}</p> : null}
      {success ? <p className="status">{success}</p> : null}

      {!loading ? (
        <div className="questionnaire-editor-panel">
          <label>
            Plan name
            <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          </label>

          <label>
            Plan details
            <input
              value={form.details}
              onChange={(e) => setForm((c) => ({ ...c, details: e.target.value }))}
              placeholder="Visible Improvement / Consistent / Reversal"
            />
          </label>

          <label>
            Plan description
            <textarea
              rows={5}
              value={form.description}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
            />
          </label>

          <div className="questionnaire-question-row">
            <label>
              Duration (weeks)
              <input
                type="number"
                min={1}
                value={String(form.durationWeeks)}
                onChange={(e) => setForm((c) => ({ ...c, durationWeeks: Number(e.target.value) }))}
              />
            </label>

            <label>
              Cost (INR)
              <input
                type="number"
                min={1}
                value={String(form.costInr)}
                onChange={(e) => setForm((c) => ({ ...c, costInr: Number(e.target.value) }))}
              />
            </label>
          </div>

          <div className="questionnaire-question-row">
            <label>
              Sort order
              <input
                type="number"
                min={0}
                value={String(form.sortOrder)}
                onChange={(e) => setForm((c) => ({ ...c, sortOrder: Number(e.target.value) }))}
              />
            </label>

            <label className="question-required-toggle" style={{ marginTop: '2.1rem' }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))}
              />
              Active
            </label>
          </div>

          <div className="questionnaire-actions">
            <button type="button" className="primary-button" onClick={savePlan} disabled={saving || deleting}>
              {saving ? 'Saving...' : mode === 'new' ? 'Create Plan' : 'Save Changes'}
            </button>
            {mode === 'edit' ? (
              <button type="button" className="secondary-button" onClick={deletePlan} disabled={deleting || saving}>
                {deleting ? 'Deleting...' : 'Delete Plan'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
