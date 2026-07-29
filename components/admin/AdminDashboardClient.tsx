'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  registrationDate: string | null;
  lastQuestionnaireSubmissionDate: string | null;
  submissionCount: number;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export default function AdminDashboardClient() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('lastSubmissionAt');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (search.trim()) {
          params.set('search', search.trim());
        }
        if (sort) {
          params.set('sort', sort);
        }
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));

        const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load users.');
        }

        if (!cancelled) {
          setUsers(payload.users || []);
          setPagination(payload.pagination || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load users.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [search, sort, page, pageSize]);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleSortChange(value: string) {
    setSort(value);
    setPage(1);
  }

  function handlePageSizeChange(value: string) {
    const nextSize = Number(value);
    setPageSize(nextSize);
    setPage(1);
  }

  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h1>User Responses</h1>
          <p className="subtitle">Search and review completed questionnaire submissions.</p>
        </div>
        <div className="admin-toolbar-actions">
          <Link href="/admin/questionnaires" className="secondary-button">Manage Questionnaires</Link>
          <Link href="/admin/admins" className="secondary-button">Admin Management</Link>
          <Link href="/admin/change-password" className="secondary-button">Change Password</Link>
          <button type="button" className="secondary-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="admin-filters">
        <input
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Search by name, email, or mobile"
          className="admin-input"
        />
        <div className="admin-sort-wrap">
          <select value={sort} onChange={(event) => handleSortChange(event.target.value)} className="admin-input">
            <option value="lastSubmissionAt">Sort by Last Submission (latest first)</option>
            <option value="registeredAt">Sort by Registration Date</option>
            <option value="name">Sort by Name (A-Z)</option>
            <option value="email">Sort by Email (A-Z)</option>
          </select>
          <p className="admin-sort-help">Use this dropdown to order users by recent activity or alphabetically.</p>
        </div>
      </div>

      {pagination ? (
        <p className="admin-page-meta">
          Showing {users.length} of {pagination.total} users | Page {pagination.page} of {pagination.totalPages}
        </p>
      ) : null}

      {loading ? <p>Loading users…</p> : null}
      {error ? <p className="validation-error">{error}</p> : null}

      {!loading && !error ? (
        users.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Registered</th>
                  <th>Last Submission</th>
                  <th>Submissions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><Link href={`/admin/users/${user.id}`}>{user.fullName}</Link></td>
                    <td>{user.email}</td>
                    <td>{user.phone || '-'}</td>
                    <td>{user.registrationDate ? new Date(user.registrationDate).toLocaleString() : '-'}</td>
                    <td>{user.lastQuestionnaireSubmissionDate ? new Date(user.lastQuestionnaireSubmissionDate).toLocaleString() : '-'}</td>
                    <td>{user.submissionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No users found.</p>
        )
      ) : null}

      {pagination ? (
        <div className="admin-pagination-controls">
          <div className="admin-page-size-compact">
            <label htmlFor="users-page-size">Users per page</label>
            <select
              id="users-page-size"
              value={String(pageSize)}
              onChange={(event) => handlePageSizeChange(event.target.value)}
              className="admin-input admin-input-compact"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
            </select>
          </div>
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
