'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to change password.');
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label>
        Current password
        <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" autoComplete="current-password" />
      </label>
      <label>
        New password
        <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" />
      </label>
      <label>
        Confirm new password
        <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" />
      </label>
      {error ? <p className="validation-error">{error}</p> : null}
      <button type="submit" className="primary-button" disabled={loading}>
        {loading ? 'Saving…' : 'Update Password'}
      </button>
    </form>
  );
}
