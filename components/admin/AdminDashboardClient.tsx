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

export default function AdminDashboardClient() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('lastSubmissionAt');
  const [users, setUsers] = useState<UserRow[]>([]);
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

        const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load users.');
        }

        if (!cancelled) {
          setUsers(payload.users || []);
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
  }, [search, sort]);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
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
          <Link href="/admin/change-password" className="secondary-button">Change Password</Link>
          <button type="button" className="secondary-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="admin-filters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email, or mobile"
          className="admin-input"
        />
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="admin-input">
          <option value="lastSubmissionAt">Last submission</option>
          <option value="registeredAt">Registration date</option>
          <option value="name">Name</option>
          <option value="email">Email</option>
        </select>
      </div>

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
    </section>
  );
}
