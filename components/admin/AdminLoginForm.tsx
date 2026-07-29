'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { InlineSpinner } from '../ui/LoadingSpinner';

export default function AdminLoginForm() {
  const router = useRouter();
  // Temporary testing defaults for quick SuperAdmin sign-in on local/dev.
  const [email, setEmail] = useState('admin@dpht.local');
  const [password, setPassword] = useState('DPHT@Admin123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to sign in.');
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label>
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
      </label>
      <label>
        Password
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
      </label>
      {error ? <p className="validation-error">{error}</p> : null}
      <button type="submit" className="primary-button" disabled={loading}>
        {loading ? <InlineSpinner label="Signing in..." /> : 'Sign In'}
      </button>
    </form>
  );
}
