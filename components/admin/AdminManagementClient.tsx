'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';

type AdminRow = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string | null;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export default function AdminManagementClient() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [canManageAdmins, setCanManageAdmins] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [createAdminError, setCreateAdminError] = useState<string | null>(null);
  const [createAdminSuccess, setCreateAdminSuccess] = useState<string | null>(null);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  async function loadAdmins(targetPage: number) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/admins?page=${targetPage}`, { cache: 'no-store' });
      if (response.status === 403) {
        setCanManageAdmins(false);
        setAdmins([]);
        setPagination(null);
        setError('Only superadmin can access admin management.');
        return;
      }

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load admins.');
      }

      setAdmins(payload.admins || []);
      setPagination(payload.pagination || null);
      setCanManageAdmins(true);
      if (payload?.pagination?.page) {
        setPage(payload.pagination.page);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admins.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  async function handleCreateAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateAdminLoading(true);
    setCreateAdminError(null);
    setCreateAdminSuccess(null);

    try {
      const response = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: newAdminName.trim(),
          email: newAdminEmail.trim(),
          password: newAdminPassword,
          role: 'admin',
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create admin.');
      }

      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setCreateAdminSuccess('Admin account created successfully.');
      await loadAdmins(1);
    } catch (err) {
      setCreateAdminError(err instanceof Error ? err.message : 'Unable to create admin.');
    } finally {
      setCreateAdminLoading(false);
    }
  }

  async function handleDeleteAdmin(adminId: string) {
    const approved = window.confirm('Delete this admin account? This action cannot be undone.');
    if (!approved) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/admin/admins/${adminId}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to delete admin.');
      }

      const fallbackPage = pagination && admins.length === 1 && pagination.page > 1
        ? pagination.page - 1
        : pagination?.page || 1;
      await loadAdmins(fallbackPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete admin.');
    }
  }

  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Superadmin Panel</p>
          <h1>Admin Management</h1>
          <p className="subtitle">Create normal admins, list all admins, and delete non-superadmin accounts.</p>
        </div>
        <div className="admin-toolbar-actions">
          <Link href="/admin" className="secondary-button">Back to Dashboard</Link>
          <Link href="/admin/change-password" className="secondary-button">Change Password</Link>
          <button type="button" className="secondary-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {canManageAdmins ? (
      <form className="admin-form admin-create-admin-form" onSubmit={handleCreateAdmin}>
        <label>
          Display Name
          <input
            className="admin-input"
            value={newAdminName}
            onChange={(event) => setNewAdminName(event.target.value)}
            placeholder="DPHT Team Member"
          />
        </label>

        <label>
          Admin Email
          <input
            className="admin-input"
            value={newAdminEmail}
            onChange={(event) => setNewAdminEmail(event.target.value)}
            type="email"
            placeholder="teammember@dpht.local"
            required
          />
        </label>

        <label>
          Temporary Password
          <input
            className="admin-input"
            value={newAdminPassword}
            onChange={(event) => setNewAdminPassword(event.target.value)}
            type="password"
            minLength={8}
            required
          />
        </label>

        <button type="submit" className="primary-button" disabled={createAdminLoading}>
          {createAdminLoading ? 'Creating…' : 'Create Admin'}
        </button>
      </form>
      ) : null}

      {createAdminError ? <p className="validation-error">{createAdminError}</p> : null}
      {createAdminSuccess ? <p className="validation-success">{createAdminSuccess}</p> : null}
      {error ? <p className="validation-error">{error}</p> : null}

      {pagination ? (
        <p className="admin-page-meta">
          Showing {admins.length} of {pagination.total} admins | Page {pagination.page} of {pagination.totalPages}
        </p>
      ) : null}

      {loading ? <p>Loading admins…</p> : null}

      {!loading && canManageAdmins ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.displayName || '-'}</td>
                  <td>{admin.email}</td>
                  <td><span className="admin-role-chip">{admin.role}</span></td>
                  <td>{admin.createdAt ? new Date(admin.createdAt).toLocaleString() : '-'}</td>
                  <td>
                    {admin.role === 'superadmin' ? (
                      <span className="admin-protected-label">Protected</span>
                    ) : (
                      <button
                        type="button"
                        className="admin-delete-button"
                        onClick={() => handleDeleteAdmin(admin.id)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {pagination && canManageAdmins ? (
        <div className="admin-pagination-controls">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={!pagination.hasPrevious || loading}
          >
            Previous
          </button>
          <span className="admin-page-indicator">Page {pagination.page} / {pagination.totalPages}</span>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
            disabled={!pagination.hasNext || loading}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
