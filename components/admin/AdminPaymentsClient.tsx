'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../ui/LoadingSpinner';

type PaymentRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  planName: string;
  amountInr: number;
  status: string;
  paymentLinkUrl: string;
  createdAt: string | null;
  paidAt: string | null;
};

export default function AdminPaymentsClient() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPayments() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (statusFilter) {
          params.set('status', statusFilter);
        }

        const response = await fetch(`/api/admin/payments?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load payments.');
        }

        if (!cancelled) {
          setPayments(Array.isArray(payload?.payments) ? payload.payments : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load payments.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPayments();

    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h1>Payments</h1>
          <p className="subtitle">Track payment requests and successful user payments.</p>
        </div>
        <div className="admin-toolbar-actions">
          <Link href="/admin" className="secondary-button">User Responses</Link>
          <Link href="/admin/plans" className="secondary-button">Manage Plans</Link>
          <button type="button" className="secondary-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="admin-filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-input">
          <option value="">All statuses</option>
          <option value="link_created">Link Created</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
          <option value="updated">Updated</option>
        </select>
      </div>

      {loading ? <LoadingSpinner message="Loading payments..." /> : null}
      {error ? <p className="validation-error">{error}</p> : null}

      {!loading && !error ? (
        payments.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Paid At</th>
                  <th>Profile</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong>{payment.userName || '-'}</strong>
                      <br />
                      <span>{payment.userEmail || '-'}</span>
                    </td>
                    <td>{payment.planName || '-'}</td>
                    <td>INR {payment.amountInr}</td>
                    <td>{payment.status || '-'}</td>
                    <td>{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '-'}</td>
                    <td>{payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '-'}</td>
                    <td>{payment.userId ? <Link href={`/admin/users/${payment.userId}`}>Open User</Link> : '-'}</td>
                    <td>{payment.paymentLinkUrl ? <a href={payment.paymentLinkUrl} target="_blank" rel="noopener noreferrer">Open</a> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No payments found.</p>
        )
      ) : null}
    </section>
  );
}
