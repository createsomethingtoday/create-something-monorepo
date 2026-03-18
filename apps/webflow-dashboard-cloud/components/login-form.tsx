'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { appPath } from '../lib/runtime-paths';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(appPath('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error || 'Login failed. Please check your email and try again.');
        return;
      }

      router.push(appPath('/verify'));
      router.refresh();
    } catch {
      setError('An error occurred during the login process. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <div className="field">
        <label className="field-label" htmlFor="email">
          Email address
        </label>
        <input
          className="field-input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@webflow.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
          required
        />
      </div>

      {error ? <div className="notice notice-error">{error}</div> : null}

      <button className="button button-primary" type="submit" disabled={loading || !email}>
        {loading ? 'Sending…' : 'Continue with Email'}
      </button>
    </form>
  );
}
