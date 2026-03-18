'use client';

import type { ApiKey, Creator } from '@create-something/webflow-dashboard-core';
import { useState } from 'react';
import { appPath } from '../lib/runtime-paths';

const API_SCOPES = [
  { id: 'read:assets', label: 'Read assets' },
  { id: 'read:profile', label: 'Read profile' }
] as const;

export function AccountPanel({
  initialProfile,
  initialKeys,
  userEmail
}: {
  initialProfile: Creator | null;
  initialKeys: ApiKey[];
  userEmail: string;
}) {
  const [profile, setProfile] = useState<Creator | null>(initialProfile);
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read:assets']);
  const [latestGeneratedKey, setLatestGeneratedKey] = useState<string | null>(null);

  async function refreshKeys() {
    const response = await fetch(appPath('/api/keys'), { cache: 'no-store' });
    if (!response.ok) return;
    const data = (await response.json()) as { keys?: ApiKey[] };
    if (data.keys) {
      setKeys(data.keys);
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') || ''),
      biography: String(formData.get('biography') || ''),
      legalName: String(formData.get('legalName') || '')
    };

    const response = await fetch(appPath('/api/profile'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = (await response.json().catch(() => ({}))) as Creator & { error?: string };

    if (!response.ok) {
      setError(data.error || 'Failed to update profile');
      setSaving(false);
      return;
    }

    setProfile(data);
    setMessage('Profile updated.');
    setSaving(false);
  }

  async function generateKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setLatestGeneratedKey(null);

    const response = await fetch(appPath('/api/keys/generate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyName,
        scopes: selectedScopes
      })
    });

    const data = (await response.json().catch(() => ({}))) as {
      apiKey?: string;
      error?: string;
    };

    if (!response.ok || !data.apiKey) {
      setError(data.error || 'Failed to generate API key');
      return;
    }

    setLatestGeneratedKey(data.apiKey);
    setMessage('API key generated. Copy it now; it will not be shown again.');
    setKeyName('');
    await refreshKeys();
  }

  async function revokeKey(keyId: string) {
    setMessage(null);
    setError(null);

    const response = await fetch(appPath('/api/keys/revoke'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyId })
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error || 'Failed to revoke key');
      return;
    }

    setMessage('API key revoked.');
    await refreshKeys();
  }

  async function handleLogout() {
    await fetch(appPath('/api/auth/logout'), { method: 'POST' });
    window.location.assign(appPath('/login'));
  }

  return (
    <div className="grid" style={{ gap: '1rem' }}>
      <section className="card">
        <div className="page-header">
          <div>
            <h2 className="card-title">Creator profile</h2>
            <p className="card-subtitle">{userEmail}</p>
          </div>
          <button className="button button-secondary" type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>

        <form className="form-stack" onSubmit={saveProfile} style={{ marginTop: '1rem' }}>
          <div className="field">
            <label className="field-label" htmlFor="name">
              Creator name
            </label>
            <input className="field-input" id="name" name="name" defaultValue={profile?.name || ''} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="legalName">
              Legal name
            </label>
            <input
              className="field-input"
              id="legalName"
              name="legalName"
              defaultValue={profile?.legalName || ''}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="biography">
              Biography
            </label>
            <textarea
              className="field-textarea"
              id="biography"
              name="biography"
              defaultValue={profile?.biography || ''}
            />
          </div>

          {message ? <div className="notice notice-success">{message}</div> : null}
          {error ? <div className="notice notice-error">{error}</div> : null}

          <button className="button button-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="card-title">API keys</h2>
        <p className="card-subtitle">Generate creator-scoped keys for read-only integrations.</p>

        <form className="form-stack" onSubmit={generateKey} style={{ marginTop: '1rem' }}>
          <div className="field">
            <label className="field-label" htmlFor="keyName">
              Key name
            </label>
            <input
              className="field-input"
              id="keyName"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="Marketplace analytics"
            />
          </div>

          <div className="field">
            <span className="field-label">Scopes</span>
            <div className="grid" style={{ gap: '0.5rem' }}>
              {API_SCOPES.map((scope) => {
                const checked = selectedScopes.includes(scope.id);
                return (
                  <label key={scope.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setSelectedScopes((current) => {
                          if (event.target.checked) return [...new Set([...current, scope.id])];
                          return current.filter((value) => value !== scope.id);
                        });
                      }}
                    />
                    <span>{scope.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button className="button button-primary" type="submit" disabled={!keyName.trim()}>
            Generate key
          </button>
        </form>

        {latestGeneratedKey ? (
          <div className="notice notice-warning" style={{ marginTop: '1rem' }}>
            <strong>Copy this key now:</strong> <span className="inline-code">{latestGeneratedKey}</span>
          </div>
        ) : null}

        <table className="key-list" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Scopes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={4}>No API keys yet.</td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id}>
                  <td>
                    <strong>{key.name}</strong>
                    <div style={{ color: 'var(--color-fg-subtle)', fontSize: '0.88rem' }}>
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td>{key.status}</td>
                  <td>{key.scopes.join(', ') || 'None'}</td>
                  <td>
                    {key.status === 'Active' ? (
                      <button className="button button-secondary" type="button" onClick={() => revokeKey(key.id)}>
                        Revoke
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
