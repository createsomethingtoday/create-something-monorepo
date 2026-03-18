'use client';

import { useEffect, useRef, useState } from 'react';
import { appPath } from '../lib/runtime-paths';

type VerifyState = 'idle' | 'verifying' | 'success' | 'error';

export function VerifyForm({ initialToken }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken || '');
  const [state, setState] = useState<VerifyState>(initialToken ? 'verifying' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  async function verifyToken(tokenValue: string) {
    setState('verifying');
    setError(null);

    try {
      const response = await fetch(appPath('/api/auth/verify-token'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenValue })
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setState('error');
        setError(data.error || 'Verification failed');
        return;
      }

      setState('success');
      window.location.assign(appPath('/dashboard'));
    } catch {
      setState('error');
      setError('An error occurred during verification');
    }
  }

  useEffect(() => {
    if (!initialToken || startedRef.current) return;
    startedRef.current = true;
    void verifyToken(initialToken);
  }, [initialToken]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.trim()) return;
    await verifyToken(token.trim());
  }

  return (
    <div className="form-stack">
      {state === 'verifying' ? (
        <div className="notice">Verifying your email token…</div>
      ) : null}
      {state === 'success' ? <div className="notice notice-success">Verification successful.</div> : null}
      {state === 'error' && error ? <div className="notice notice-error">{error}</div> : null}

      <form className="form-stack" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="token">
            Verification token
          </label>
          <input
            className="field-input"
            id="token"
            name="token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <button className="button button-primary" type="submit" disabled={state === 'verifying' || !token.trim()}>
          {state === 'verifying' ? 'Verifying…' : 'Verify'}
        </button>
      </form>

      <a className="button-link button-secondary" href={appPath('/login')}>
        Request a new verification email
      </a>
    </div>
  );
}
