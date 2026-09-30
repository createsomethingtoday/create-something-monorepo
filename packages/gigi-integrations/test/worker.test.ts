import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handleConnectorRequest, readSourcePage } from '../worker/index.ts';

const selectedGmailScopes = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/profile.language.read',
  'https://www.googleapis.com/auth/user.addresses.read',
  'https://www.googleapis.com/auth/user.birthday.read',
  'https://www.googleapis.com/auth/user.emails.read',
  'https://www.googleapis.com/auth/user.phonenumbers.read',
  'https://www.googleapis.com/auth/profile.emails.read',
  'https://mail.google.com/',
];
const selectedCalendarScopes = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

test('Gmail malformed message aborts page before exposing next cursor', async () => {
  await assert.rejects(readSourcePage({ COMPOSIO_API_KEY: 'ak_test' }, async (request) => {
    const payload = await (request as Request).json() as { endpoint: string };
    if (payload.endpoint.endsWith('/messages')) return Response.json({ status: 200, data: { messages: [{ id: 'bad/id' }], nextPageToken: 'next' } });
    throw new Error('unexpected detail fetch');
  }, 'gmail', 'ca_account1', null), /gmail_message_id_invalid/);
});

test('Calendar malformed event aborts page before exposing next cursor', async () => {
  await assert.rejects(readSourcePage({ COMPOSIO_API_KEY: 'ak_test' }, async (request) => {
    const payload = await (request as Request).json() as { endpoint: string };
    if (payload.endpoint.endsWith('/calendars/primary')) return Response.json({ status: 200, data: { id: 'primary@example.test' } });
    if (payload.endpoint.endsWith('/events')) return Response.json({ status: 200, data: { items: [{ summary: 'Missing ID' }], nextPageToken: 'next' } });
    throw new Error('unexpected proxy route');
  }, 'googlecalendar', 'ca_account1', null), /calendar_event_id_invalid/);
});

test('Composio callback has no authentication dependency and performs no mutation', async () => {
  let calls = 0;
  const response = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connection-callback?code=secret&state=secret'), {}, async () => {
    calls++; throw new Error('unexpected provider call');
  });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Return to GiGi/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(calls, 0);
});

test('health is loud when D1 or server-only beta allowlist is missing', async () => {
  const response = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/health'), {});
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { service: 'gigi-connector', status: 'unconfigured' });
});

test('health rejects legacy Composio auth configs even with their formerly approved scopes', async () => {
  const db = { prepare() { throw new Error('health must not query D1'); } };
  const selected = {
    GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test', DB: db,
    GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h', GIGI_GMAIL_APPROVED_SCOPES: selectedGmailScopes.join(','),
    GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID: 'ac_F0JVbnFvV3DQ', GIGI_GOOGLECALENDAR_APPROVED_SCOPES: selectedCalendarScopes.join(','),
  };
  for (const legacy of [
    { GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_s2YEkh21bMT8', GIGI_GMAIL_APPROVED_SCOPES: 'https://www.googleapis.com/auth/gmail.readonly' },
    { GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID: 'ac_oldcalendar', GIGI_GOOGLECALENDAR_APPROVED_SCOPES: 'https://www.googleapis.com/auth/calendar.readonly' },
  ]) {
    const response = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/health'), { ...selected, ...legacy });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { service: 'gigi-connector', status: 'unconfigured' });
  }
});

test('link rejects legacy Composio auth configs before journaling or provider mutation', async () => {
  let dbCalls = 0;
  let providerCalls = 0;
  const db = { prepare() { dbCalls++; throw new Error('legacy config must not journal'); } };
  for (const [provider, env] of [
    ['gmail', { GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_s2YEkh21bMT8', GIGI_GMAIL_APPROVED_SCOPES: 'https://www.googleapis.com/auth/gmail.readonly' }],
    ['googlecalendar', { GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID: 'ac_oldcalendar', GIGI_GOOGLECALENDAR_APPROVED_SCOPES: 'https://www.googleapis.com/auth/calendar.readonly' }],
  ] as const) {
    const response = await handleConnectorRequest(new Request(`https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/${provider}/link`, {
      method: 'POST', headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: JSON.stringify({ requestId: 'request-123' }),
    }), { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test', DB: db, ...env }, async (request) => {
      if (new URL((request as Request).url).pathname === '/oauth/userinfo') return Response.json({
        sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true,
      });
      providerCalls++;
      throw new Error('legacy config must not call Composio');
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'unconfigured' });
  }
  assert.equal(dbCalls, 0);
  assert.equal(providerCalls, 0);
});

test('broker denies a caller whose online Identity userinfo is not for GiGi', async () => {
  const calls: string[] = [];
  const response = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail', {
    headers: { authorization: 'Bearer test-token', 'x-mcp-account-id': 'forged-owner' },
  }), {
    GIGI_ALLOWED_SUBJECTS: 'actual-subject',
    COMPOSIO_API_KEY: 'ak_test',
  }, async (request) => {
    calls.push(request instanceof Request ? request.url : String(request));
    return Response.json({ sub: 'actual-subject', resource: 'https://another-app.example', email_verified: true });
  });
  assert.equal(response.status, 401);
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0]!).pathname, '/oauth/userinfo');
});

test('broker derives owner from Identity and reports disconnected without provider access', async () => {
  const calls: string[] = [];
  const response = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail', {
    headers: { authorization: 'Bearer test-token', 'x-mcp-account-id': 'forged-owner' },
  }), {
    GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test',
    DB: { prepare() { return { bind() { return { async first() { return null; }, async run() {}, async all() { return { results: [] }; } }; } }; } },
  }, async (request) => {
    const url = request instanceof Request ? request.url : String(request);
    assert.equal((request as Request).redirect, 'manual', 'Worker outbound requests must use the edge-supported manual redirect mode');
    calls.push(url);
    return Response.json({ sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true });
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { provider: 'gmail', state: 'disconnected' });
  assert.equal(calls.length, 1);
});

test('status recovers only the authenticated owner’s unexpired pending consent link without another POST', async () => {
  const rows: Record<string, Record<string, unknown>> = {
    gmail: { subject: 'actual-subject', provider: 'gmail', request_id: 'gmail-attempt', status: 'linked',
      connected_account_id: 'ca_gmail1', redirect_url: 'https://connect.composio.dev/session/gmail', expires_at: '2030-01-01T00:00:00Z' },
    googlecalendar: { subject: 'actual-subject', provider: 'googlecalendar', request_id: 'calendar-attempt', status: 'linked',
      connected_account_id: 'ca_calendar1', redirect_url: 'https://connect.composio.dev/session/calendar', expires_at: '2030-01-01T00:00:00Z' },
  };
  const queries: unknown[][] = [];
  const db = { prepare() { return { bind(...values: unknown[]) { queries.push(values); return {
    async first() { return values[0] === 'actual-subject' ? rows[String(values[1])] ?? null : null; },
    async run() { throw new Error('status must not mutate'); }, async all() { return { results: [] }; },
  }; } }; } };
  let providerGets = 0;
  let mismatchedProviderOwner = false;
  const fetcher: typeof fetch = async (request) => {
    const req = request as Request;
    assert.equal(req.redirect, 'manual');
    if (new URL(req.url).pathname === '/oauth/userinfo') return Response.json({
      sub: req.headers.get('authorization') === 'Bearer other-token' ? 'other-subject' : 'actual-subject',
      resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true,
    });
    assert.equal(req.method, 'GET');
    providerGets++;
    const accountId = new URL(req.url).pathname.split('/').at(-1);
    const provider = accountId === 'ca_gmail1' ? 'gmail' : 'googlecalendar';
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('actual-subject'));
    const userId = 'gigi_' + [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
    return Response.json({ id: accountId, user_id: mismatchedProviderOwner ? 'gigi_otherowner' : userId,
      auth_config: { id: provider === 'gmail' ? 'ac_qXoEQURadG-h' : 'ac_F0JVbnFvV3DQ' },
      toolkit: { slug: provider }, experimental: { account_type: 'PRIVATE' },
      requested_scopes: provider === 'gmail' ? selectedGmailScopes : selectedCalendarScopes,
      status: 'INITIATED', is_disabled: false });
  };
  const env = { GIGI_ALLOWED_SUBJECTS: 'actual-subject,other-subject', COMPOSIO_API_KEY: 'ak_test',
    GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h', GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID: 'ac_F0JVbnFvV3DQ',
    GIGI_GMAIL_APPROVED_SCOPES: selectedGmailScopes.join(','),
    GIGI_GOOGLECALENDAR_APPROVED_SCOPES: selectedCalendarScopes.join(','), DB: db };
  const status = (provider: string, token = 'test-token') => handleConnectorRequest(new Request(
    `https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/${provider}`, {
      headers: { authorization: `Bearer ${token}` },
    }), env, fetcher);
  const gmail = await (await status('gmail')).json();
  assert.deepEqual(gmail, { provider: 'gmail', state: 'pending', connectedAccountId: 'ca_gmail1',
    url: 'https://connect.composio.dev/session/gmail', expiresAt: '2030-01-01T00:00:00Z' });
  const calendar = await (await status('googlecalendar')).json();
  assert.deepEqual(calendar, { provider: 'googlecalendar', state: 'pending', connectedAccountId: 'ca_calendar1',
    url: 'https://connect.composio.dev/session/calendar', expiresAt: '2030-01-01T00:00:00Z' });
  assert.deepEqual(await (await status('gmail', 'other-token')).json(), { provider: 'gmail', state: 'disconnected' });
  assert.equal(providerGets, 2);
  assert.deepEqual(queries.map((values) => values.slice(0, 2)), [
    ['actual-subject', 'gmail'], ['actual-subject', 'googlecalendar'], ['other-subject', 'gmail'],
  ]);
  rows.gmail!.expires_at = '2020-01-01T00:00:00Z';
  assert.deepEqual(await (await status('gmail')).json(), {
    provider: 'gmail', state: 'attention', connectedAccountId: 'ca_gmail1', recovery: 'operator_review',
  });
  rows.gmail!.expires_at = '2030-01-01T00:00:00Z';
  rows.gmail!.redirect_url = 'https://evil.example/claim';
  const unsafe = await (await status('gmail')).json() as Record<string, unknown>;
  assert.equal(unsafe.url, undefined);
  assert.equal(unsafe.state, 'attention');
  rows.gmail!.redirect_url = 'https://connect.composio.dev/session/gmail';
  mismatchedProviderOwner = true;
  const mismatched = await (await status('gmail')).json() as Record<string, unknown>;
  assert.equal(mismatched.url, undefined);
  assert.equal(mismatched.state, 'attention');
});

test('link consent is journaled before provider call and replay does not create another link', async () => {
  const rows = new Map<string, Record<string, unknown>>();
  const db = { prepare(sql: string) { return { bind(...values: unknown[]) { return {
    async first() {
      if (sql.includes("status IN ('dispatched'")) return [...rows.values()].find((row) =>
        row.subject === values[0] && row.provider === values[1] && ['dispatched', 'linked', 'active'].includes(String(row.status))) ?? null;
      return rows.get(values.slice(0, 3).join(':')) ?? null;
    },
    async run() {
      if (sql.startsWith('INSERT')) {
        assert.match(sql, /auth_config_id/u);
        assert.equal(values[4], 'ac_qXoEQURadG-h');
      }
      if (sql.startsWith('INSERT') && [...rows.values()].some((row) => row.subject === values[0] && row.provider === values[1] &&
        ['dispatched', 'linked', 'active'].includes(String(row.status)))) return { meta: { changes: 0 } };
      if (sql.startsWith('INSERT') && !rows.has(values.slice(0, 3).join(':'))) { rows.set(values.slice(0, 3).join(':'), {
        subject: values[0], provider: values[1], request_id: values[2], status: 'dispatched', connected_account_id: null,
      }); return { meta: { changes: 1 } }; }
      if (sql.startsWith('INSERT')) return { meta: { changes: 0 } };
      if (sql.startsWith('UPDATE')) Object.assign(rows.get(values.slice(3, 6).join(':'))!, {
        connected_account_id: values[0], status: 'linked', redirect_url: values[1], expires_at: values[2],
      });
      return { meta: { changes: 1 } };
    },
    async all() { return { results: [] }; },
  }; } }; } };
  let linkCalls = 0;
  const fetcher: typeof fetch = async (request) => {
    const req = request as Request;
    if (new URL(req.url).pathname === '/oauth/userinfo') return Response.json({
      sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true,
    });
    assert.equal(new URL(req.url).pathname, '/api/v3.1/connected_accounts/link');
    linkCalls++;
    const body = await req.json() as Record<string, unknown>;
    assert.match(String(body.user_id), /^gigi_[0-9a-f]{32}$/u);
    assert.equal(body.auth_config_id, 'ac_qXoEQURadG-h');
    return Response.json({ connected_account_id: 'ca_account1', redirect_url: 'https://connect.composio.dev/session', expires_at: '2030-01-01T00:00:00Z' });
  };
  const env = {
    GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test', GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h',
    GIGI_GMAIL_APPROVED_SCOPES: selectedGmailScopes.join(','), DB: db,
  };
  const request = () => new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail/link', {
    method: 'POST', headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
    body: JSON.stringify({ requestId: 'request-123' }),
  });
  const first = await handleConnectorRequest(request(), env, fetcher);
  assert.equal(first.status, 200);
  assert.equal((await first.json() as { status: string }).status, 'awaiting_consent');
  const repeat = await handleConnectorRequest(request(), env, fetcher);
  assert.equal(repeat.status, 200);
  const another = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail/link', {
    method: 'POST', headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
    body: JSON.stringify({ requestId: 'request-456' }),
  }), env, fetcher);
  assert.equal(another.status, 200);
  assert.equal((await another.json() as { attemptId: string }).attemptId, 'request-123');
  assert.equal(linkCalls, 1);
});

test('new Gmail pin never replays an old-config consent URL', async () => {
  const db = { prepare() { return { bind() { return {
    async first() { return { status: 'linked', request_id: 'old-request', connected_account_id: 'ca_old',
      redirect_url: 'https://connect.composio.dev/session/old', expires_at: '2030-01-01T00:00:00Z' }; },
    async run() { return { meta: { changes: 0 } }; }, async all() { return { results: [] }; },
  }; } }; } };
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('actual-subject'));
  const userId = 'gigi_' + [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
  let linkPosts = 0;
  const response = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail/link', {
    method: 'POST', headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
    body: JSON.stringify({ requestId: 'new-request' }),
  }), { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test',
    GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h', GIGI_GMAIL_APPROVED_SCOPES: selectedGmailScopes.join(','), DB: db,
  }, async (request) => {
    const req = request as Request;
    const path = new URL(req.url).pathname;
    if (path === '/oauth/userinfo') return Response.json({ sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true });
    if (path === '/api/v3.1/connected_accounts/ca_old') return Response.json({ id: 'ca_old', user_id: userId,
      auth_config: { id: 'ac_s2YEkh21bMT8' }, toolkit: { slug: 'gmail' }, status: 'INITIATED', is_disabled: false,
      experimental: { account_type: 'PRIVATE' }, requested_scopes: ['https://www.googleapis.com/auth/gmail.readonly'] });
    linkPosts++;
    throw new Error('old attempt must stay guarded');
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { provider: 'gmail', status: 'readback_required', attemptId: 'old-request' });
  assert.equal(linkPosts, 0);
});

test('late link response cannot overwrite an attempt changed during provider POST', async () => {
  let updateSql = '';
  let updateValues: unknown[] = [];
  const db = { prepare(sql: string) { return { bind(...values: unknown[]) { return {
    async first() { return { status: 'dispatched', request_id: 'request-1', connected_account_id: null }; },
    async run() {
      if (sql.startsWith('INSERT')) return { meta: { changes: 1 } };
      updateSql = sql;
      updateValues = values;
      return { meta: { changes: 0 } };
    }, async all() { return { results: [] }; },
  }; } }; } };
  const response = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail/link', {
    method: 'POST', headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
    body: JSON.stringify({ requestId: 'request-1' }),
  }), { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test',
    GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h', GIGI_GMAIL_APPROVED_SCOPES: selectedGmailScopes.join(','), DB: db,
  }, async (request) => {
    const req = request as Request;
    if (new URL(req.url).pathname === '/oauth/userinfo') return Response.json({ sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true });
    assert.equal(new URL(req.url).pathname, '/api/v3.1/connected_accounts/link');
    assert.equal((await req.json() as { auth_config_id: string }).auth_config_id, 'ac_qXoEQURadG-h');
    return Response.json({ connected_account_id: 'ca_new', redirect_url: 'https://connect.composio.dev/session/new', expires_at: '2030-01-01T00:00:00Z' });
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { provider: 'gmail', status: 'readback_required', attemptId: 'request-1' });
  assert.match(updateSql, /status = 'dispatched' AND connected_account_id IS NULL/u);
  assert.deepEqual(updateValues.slice(-3), ['actual-subject', 'gmail', 'request-1']);
});

test('unknown provider result blocks a second link with a different request ID', async () => {
  let pending: Record<string, unknown> | null = null;
  const db = { prepare(sql: string) { return { bind(...values: unknown[]) { return {
    async first() {
      if (sql.includes('request_id = ?')) return pending?.request_id === values[2] ? pending : null;
      return pending;
    },
    async run() {
      if (sql.startsWith('INSERT') && !pending) {
        pending = { subject: values[0], provider: values[1], request_id: values[2], status: 'dispatched', connected_account_id: null };
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }, async all() { return { results: [] }; },
  }; } }; } };
  let providerCalls = 0;
  const fetcher: typeof fetch = async (request) => {
    if (new URL((request as Request).url).pathname === '/oauth/userinfo') return Response.json({
      sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true,
    });
    providerCalls++;
    return new Response('provider uncertain', { status: 503 });
  };
  const env = { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test',
    GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h', GIGI_GMAIL_APPROVED_SCOPES: selectedGmailScopes.join(','), DB: db };
  const begin = (requestId: string) => handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail/link', {
    method: 'POST', headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' }, body: JSON.stringify({ requestId }),
  }), env, fetcher);
  assert.equal((await (await begin('request-1')).json() as { status: string }).status, 'readback_required');
  const second = await begin('request-2');
  assert.equal((await second.json() as { attemptId: string }).attemptId, 'request-1');
  assert.equal(providerCalls, 1);
});

test('Composio link redirect leaves the attempt pending without accepting its response body', async () => {
  let pending: Record<string, unknown> | null = null;
  const db = { prepare(sql: string) { return { bind(...values: unknown[]) { return {
    async first() {
      if (sql.includes('request_id = ?')) return pending?.request_id === values[2] ? pending : null;
      return pending;
    },
    async run() {
      if (sql.startsWith('INSERT') && !pending) {
        pending = { subject: values[0], provider: values[1], request_id: values[2], status: 'dispatched', connected_account_id: null };
        return { meta: { changes: 1 } };
      }
      if (sql.startsWith('UPDATE')) throw new Error('redirect response must not link an account');
      return { meta: { changes: 0 } };
    }, async all() { return { results: [] }; },
  }; } }; } };
  let linkCalls = 0;
  const fetcher: typeof fetch = async (request) => {
    const req = request as Request;
    assert.equal(req.redirect, 'manual');
    if (new URL(req.url).pathname === '/oauth/userinfo') return Response.json({
      sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true,
    });
    assert.equal(new URL(req.url).pathname, '/api/v3.1/connected_accounts/link');
    linkCalls++;
    return new Response(JSON.stringify({ connected_account_id: 'ca_redirected',
      redirect_url: 'https://connect.composio.dev/session', expires_at: '2030-01-01T00:00:00Z' }), {
      status: 302, headers: { location: 'https://other.example/redirect', 'content-type': 'application/json' },
    });
  };
  const env = { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test',
    GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h', GIGI_GMAIL_APPROVED_SCOPES: selectedGmailScopes.join(','), DB: db };
  const begin = (requestId: string) => handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail/link', {
    method: 'POST', headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' }, body: JSON.stringify({ requestId }),
  }), env, fetcher);
  const first = await begin('request-redirect');
  assert.equal(first.status, 503);
  assert.deepEqual(await first.json(), { provider: 'gmail', status: 'readback_required', attemptId: 'request-redirect' });
  assert.deepEqual(pending, { subject: 'actual-subject', provider: 'gmail', request_id: 'request-redirect',
    status: 'dispatched', connected_account_id: null });
  const replay = await begin('request-new');
  assert.deepEqual(await replay.json(), { provider: 'gmail', status: 'readback_required', attemptId: 'request-redirect' });
  assert.equal(linkCalls, 1);
});

test('verified revoked account releases the guard for a new consent attempt', async () => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('actual-subject'));
  const owner = 'gigi_' + [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
  const row = { subject: 'actual-subject', provider: 'gmail', request_id: 'old-request', status: 'active', connected_account_id: 'ca_old', reconnectable: 0 };
  const rows: Array<Record<string, unknown>> = [row];
  const db = { prepare(sql: string) { return { bind(...values: unknown[]) { return {
    async first() {
      if (sql.includes('request_id = ?')) return rows.find((item) => item.request_id === values[2]) ?? null;
      if (sql.includes("status IN ('dispatched'")) return rows.find((item) => ['dispatched', 'linked', 'active'].includes(String(item.status))) ?? null;
      return rows.at(-1) ?? null;
    },
    async run() {
      if (sql.startsWith('UPDATE') && sql.includes("status = 'attention'")) { row.status = 'attention'; row.reconnectable = 1; return { meta: { changes: 1 } }; }
      if (sql.startsWith('INSERT') && row.status === 'attention') {
        rows.push({ subject: values[0], provider: values[1], request_id: values[2], status: 'dispatched', connected_account_id: null });
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }, async all() { return { results: [] }; },
  }; } }; } };
  let linkCalls = 0;
  const fetcher: typeof fetch = async (request) => {
    const path = new URL((request as Request).url).pathname;
    if (path === '/oauth/userinfo') return Response.json({ sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true });
    if (path.includes('/connected_accounts/ca_old')) return Response.json({ id: 'ca_old', user_id: owner,
      auth_config: { id: 'ac_qXoEQURadG-h' }, toolkit: { slug: 'gmail' }, status: 'REVOKED', is_disabled: true,
      experimental: { account_type: 'PRIVATE' }, requested_scopes: selectedGmailScopes });
    linkCalls++;
    return new Response('pending', { status: 503 });
  };
  const env = { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test',
    GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h', GIGI_GMAIL_APPROVED_SCOPES: selectedGmailScopes.join(','), DB: db };
  const status = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail', {
    headers: { authorization: 'Bearer test-token' },
  }), env, fetcher);
  assert.deepEqual(await status.json(), { provider: 'gmail', state: 'attention', connectedAccountId: 'ca_old', reconnectable: true });
  assert.equal(row.status, 'attention');
  const renewed = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail/link', {
    method: 'POST', headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
    body: JSON.stringify({ requestId: 'new-request' }),
  }), env, fetcher);
  assert.equal((await renewed.json() as { status: string }).status, 'readback_required');
  assert.equal(linkCalls, 1);
});

test('unknown link outcome recovers only a unique exact-owner Composio alias without another POST', async () => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('actual-subject'));
  const owner = 'gigi_' + [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
  const row = { subject: 'actual-subject', provider: 'gmail', request_id: 'request-1', status: 'dispatched',
    connected_account_id: null as string | null, created_at: '2026-09-30T12:00:00Z', reconnectable: 0 };
  const db = { prepare(sql: string) { return { bind(...values: unknown[]) { return {
    async first() { return row; },
    async run() {
      assert.match(sql, /SET connected_account_id = \?, status = 'active'/);
      assert.deepEqual(values.slice(0, 3), ['ca_recovered', 0, 'actual-subject']);
      row.connected_account_id = 'ca_recovered'; row.status = 'active'; return { meta: { changes: 1 } };
    }, async all() { return { results: [] }; },
  }; } }; } };
  const calls: string[] = [];
  const fetcher: typeof fetch = async (request) => {
    assert.equal((request as Request).redirect, 'manual');
    const url = new URL((request as Request).url); calls.push(url.pathname);
    if (url.pathname === '/oauth/userinfo') return Response.json({ sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true });
    if (url.pathname === '/api/v3.1/connected_accounts') {
      assert.equal(url.searchParams.get('user_ids'), owner);
      assert.equal(url.searchParams.get('auth_config_ids'), 'ac_qXoEQURadG-h');
      return Response.json({ items: [{ id: 'ca_recovered', alias: 'request-1', user_id: owner, created_at: '2026-09-30T12:00:01Z',
        auth_config: { id: 'ac_qXoEQURadG-h' }, toolkit: { slug: 'gmail' }, experimental: { account_type: 'PRIVATE' } }], next_cursor: null });
    }
    if (url.pathname === '/api/v3.1/connected_accounts/ca_recovered') return Response.json({ id: 'ca_recovered', user_id: owner,
      auth_config: { id: 'ac_qXoEQURadG-h' }, toolkit: { slug: 'gmail' }, status: 'ACTIVE', is_disabled: false,
      experimental: { account_type: 'PRIVATE' }, requested_scopes: selectedGmailScopes });
    throw new Error('unexpected provider route');
  };
  const env = { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test',
    GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h', GIGI_GMAIL_APPROVED_SCOPES: selectedGmailScopes.join(','), DB: db };
  const response = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail', {
    headers: { authorization: 'Bearer test-token' },
  }), env, fetcher);
  assert.deepEqual(await response.json(), { provider: 'gmail', state: 'connected', connectedAccountId: 'ca_recovered' });
  assert.deepEqual(calls, ['/oauth/userinfo', '/api/v3.1/connected_accounts', '/api/v3.1/connected_accounts/ca_recovered']);
});

test('old dispatched attempt with zero alias matches requires operator review and stays guarded', async () => {
  let writes = 0;
  const db = { prepare() { return { bind() { return {
    async first() { return { request_id: 'request-1', status: 'dispatched', connected_account_id: null,
      created_at: '2020-01-01T00:00:00Z', reconnectable: 0 }; },
    async run() { writes++; return { meta: { changes: 1 } }; }, async all() { return { results: [] }; },
  }; } }; } };
  const calls: string[] = [];
  const response = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail', {
    headers: { authorization: 'Bearer test-token' },
  }), { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test', GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h',
    GIGI_GMAIL_APPROVED_SCOPES: selectedGmailScopes.join(','), DB: db }, async (request) => {
    const path = new URL((request as Request).url).pathname; calls.push(path);
    if (path === '/oauth/userinfo') return Response.json({ sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true });
    if (path === '/api/v3.1/connected_accounts') return Response.json({ items: [], next_cursor: null });
    throw new Error('no provider POST allowed');
  });
  assert.deepEqual(await response.json(), { provider: 'gmail', state: 'attention', recovery: 'operator_review' });
  assert.equal(writes, 0);
  assert.deepEqual(calls, ['/oauth/userinfo', '/api/v3.1/connected_accounts']);
});

test('reconcile rejects a connected account whose Composio owner differs from Identity owner', async () => {
  const db = { prepare() { return { bind() { return {
    async first() { return { status: 'linked', connected_account_id: 'ca_account1', auth_config_id: 'ac_qXoEQURadG-h' }; },
    async run() { return { meta: { changes: 1 } }; }, async all() { return { results: [] }; },
  }; } }; } };
  const response = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail/ca_account1', {
    headers: { authorization: 'Bearer test-token' },
  }), { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test', GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h',
    GIGI_GMAIL_APPROVED_SCOPES: selectedGmailScopes.join(','), DB: db }, async (request) => {
    const url = new URL((request as Request).url);
    if (url.pathname === '/oauth/userinfo') return Response.json({
      sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true,
    });
    return Response.json({ id: 'ca_account1', user_id: 'gigi_wrong_owner', auth_config: { id: 'ac_qXoEQURadG-h' },
      toolkit: { slug: 'gmail' }, status: 'ACTIVE', is_disabled: false,
      experimental: { account_type: 'PRIVATE' }, requested_scopes: selectedGmailScopes });
  });
  assert.equal(response.status, 502);
});

test('reconcile cannot reactivate an attention row or win a concurrent release', async () => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('actual-subject'));
  const userId = 'gigi_' + [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
  let rowStatus = 'attention';
  let updateChanges = 1;
  let providerGets = 0;
  let updateSql = '';
  const db = { prepare(sql: string) { return { bind() { return {
    async first() { return { status: rowStatus, connected_account_id: 'ca_account1' }; },
    async run() { updateSql = sql; return { meta: { changes: updateChanges } }; },
    async all() { return { results: [] }; },
  }; } }; } };
  const fetcher: typeof fetch = async (request) => {
    const path = new URL((request as Request).url).pathname;
    if (path === '/oauth/userinfo') return Response.json({ sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true });
    providerGets++;
    assert.equal(path, '/api/v3.1/connected_accounts/ca_account1');
    return Response.json({ id: 'ca_account1', user_id: userId, auth_config: { id: 'ac_qXoEQURadG-h' },
      toolkit: { slug: 'gmail' }, status: 'ACTIVE', is_disabled: false,
      experimental: { account_type: 'PRIVATE' }, requested_scopes: selectedGmailScopes });
  };
  const request = () => new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/connections/gmail/ca_account1', {
    headers: { authorization: 'Bearer test-token' },
  });
  const env = { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test', GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h',
    GIGI_GMAIL_APPROVED_SCOPES: selectedGmailScopes.join(','), DB: db };
  assert.equal((await handleConnectorRequest(request(), env, fetcher)).status, 404);
  assert.equal(providerGets, 0);
  assert.equal(updateSql, '');
  rowStatus = 'linked';
  updateChanges = 0;
  assert.equal((await handleConnectorRequest(request(), env, fetcher)).status, 409);
  assert.match(updateSql, /status IN \('linked', 'active'\)/u);
  rowStatus = 'linked';
  updateChanges = 1;
  const connected = await handleConnectorRequest(request(), env, fetcher);
  assert.equal(connected.status, 200);
  assert.deepEqual(await connected.json(), { provider: 'gmail', state: 'connected', connectedAccountId: 'ca_account1' });
  assert.equal(providerGets, 2);
});

test('Gmail source page returns projected read-only message metadata for the verified owner', async () => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('actual-subject'));
  const userId = 'gigi_' + [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
  const endpoints: string[] = [];
  const db = { prepare() { return { bind() { return {
    async first() { return { status: 'active', connected_account_id: 'ca_account1' }; },
    async run() { return { meta: { changes: 1 } }; }, async all() { return { results: [] }; },
  }; } }; } };
  const response = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/sources/gmail/ca_account1/page', {
    headers: { authorization: 'Bearer test-token' },
  }), { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test', GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h',
    GIGI_GMAIL_APPROVED_SCOPES: selectedGmailScopes.join(','), DB: db }, async (request) => {
    const req = request as Request;
    assert.equal(req.redirect, 'manual');
    const url = new URL(req.url);
    if (url.pathname === '/oauth/userinfo') return Response.json({ sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true });
    if (url.pathname.endsWith('/connected_accounts/ca_account1')) return Response.json({ id: 'ca_account1', user_id: userId,
      auth_config: { id: 'ac_qXoEQURadG-h' }, toolkit: { slug: 'gmail' }, status: 'ACTIVE', is_disabled: false,
      experimental: { account_type: 'PRIVATE' }, requested_scopes: selectedGmailScopes });
    const payload = await req.json() as { endpoint: string; method: string };
    assert.equal(payload.method, 'GET');
    endpoints.push(payload.endpoint);
    if (payload.endpoint.endsWith('/messages')) return Response.json({ status: 200, data: { messages: [{ id: 'm1', threadId: 't1' }] } });
    if (payload.endpoint.endsWith('/messages/m1')) return Response.json({ status: 200, data: { id: 'm1', threadId: 't1', snippet: 'Doors at 7',
      payload: { headers: [{ name: 'Subject', value: 'Friday show' }, { name: 'From', value: 'venue@example.com' }] } } });
    throw new Error('unexpected provider endpoint');
  });
  assert.equal(response.status, 200);
  const page = await response.json() as { records: Array<{ externalId: string; data: { subject: string } }>; nextCursor: string | null };
  assert.equal(page.records[0]?.externalId, 'm1');
  assert.equal(page.records[0]?.data.subject, 'Friday show');
  assert.equal(page.nextCursor, null);
  assert.equal(endpoints.length, 2);
});

test('selected Gmail config accepts only its exact provider grant while proxying bounded GETs', async () => {
  const scopes = selectedGmailScopes;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('actual-subject'));
  const userId = 'gigi_' + [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
  const db = { prepare() { return { bind() { return {
    async first() { return { status: 'active', connected_account_id: 'ca_account1' }; },
    async run() { throw new Error('source must not mutate'); }, async all() { return { results: [] }; },
  }; } }; } };
  const baseEnv = { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test',
    GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_qXoEQURadG-h', GIGI_GMAIL_APPROVED_SCOPES: scopes.join(','), DB: db };
  let actualScopes = [...scopes];
  let actualConfig = 'ac_qXoEQURadG-h';
  let proxyCalls = 0;
  const fetcher: typeof fetch = async (request) => {
    const req = request as Request;
    const path = new URL(req.url).pathname;
    if (path === '/oauth/userinfo') return Response.json({ sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true });
    if (path.endsWith('/connected_accounts/ca_account1')) return Response.json({ id: 'ca_account1', user_id: userId,
      auth_config: { id: actualConfig }, toolkit: { slug: 'gmail' }, status: 'ACTIVE', is_disabled: false,
      experimental: { account_type: 'PRIVATE' }, requested_scopes: actualScopes });
    assert.equal(path, '/api/v3.1/tools/execute/proxy');
    const payload = await req.json() as { connected_account_id: string; method: string; endpoint: string };
    assert.equal(payload.connected_account_id, 'ca_account1');
    assert.equal(payload.method, 'GET');
    assert.equal(payload.endpoint, 'https://gmail.googleapis.com/gmail/v1/users/me/messages');
    proxyCalls++;
    return Response.json({ status: 200, data: { messages: [] } });
  };
  const request = () => new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/sources/gmail/ca_account1/page', {
    headers: { authorization: 'Bearer test-token' },
  });
  assert.equal((await handleConnectorRequest(request(), baseEnv, fetcher)).status, 200);
  assert.equal(proxyCalls, 1);
  actualScopes = scopes.slice(0, -1);
  assert.equal((await handleConnectorRequest(request(), baseEnv, fetcher)).status, 502);
  actualScopes = [...scopes, 'https://www.googleapis.com/auth/gmail.send'];
  assert.equal((await handleConnectorRequest(request(), baseEnv, fetcher)).status, 502);
  actualScopes = [...scopes];
  actualConfig = 'ac_other';
  assert.equal((await handleConnectorRequest(request(), baseEnv, fetcher)).status, 502);
  assert.equal((await handleConnectorRequest(request(), { ...baseEnv, GIGI_GMAIL_AUTH_CONFIG_ID: 'ac_other' }, fetcher)).status, 502);
  actualConfig = 'ac_qXoEQURadG-h';
  assert.equal((await handleConnectorRequest(request(), { ...baseEnv, GIGI_GMAIL_APPROVED_SCOPES: scopes.slice(0, -1).join(',') }, fetcher)).status, 502);
  assert.equal(proxyCalls, 1);
});

test('Calendar page derives primary calendar and projects events without provider writes', async () => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('actual-subject'));
  const userId = 'gigi_' + [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
  const db = { prepare() { return { bind() { return {
    async first() { return { status: 'active', connected_account_id: 'ca_calendar1' }; },
    async run() { return { meta: { changes: 1 } }; }, async all() { return { results: [] }; },
  }; } }; } };
  const endpoints: string[] = [];
  const response = await handleConnectorRequest(new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/sources/googlecalendar/ca_calendar1/page', {
    headers: { authorization: 'Bearer test-token' },
  }), { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test',
    GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID: 'ac_F0JVbnFvV3DQ', GIGI_GOOGLECALENDAR_APPROVED_SCOPES: selectedCalendarScopes.join(','), DB: db,
  }, async (request) => {
    const req = request as Request;
    const url = new URL(req.url);
    if (url.pathname === '/oauth/userinfo') return Response.json({ sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true });
    if (url.pathname.endsWith('/connected_accounts/ca_calendar1')) return Response.json({ id: 'ca_calendar1', user_id: userId,
      auth_config: { id: 'ac_F0JVbnFvV3DQ' }, toolkit: { slug: 'googlecalendar' }, status: 'ACTIVE', is_disabled: false,
      experimental: { account_type: 'PRIVATE' }, requested_scopes: selectedCalendarScopes });
    const payload = await req.json() as { endpoint: string; method: string };
    assert.equal(payload.method, 'GET');
    endpoints.push(payload.endpoint);
    if (payload.endpoint.endsWith('/calendars/primary')) return Response.json({ status: 200, data: { id: 'artist@example.com' } });
    if (payload.endpoint.endsWith('/events')) return Response.json({ status: 200, data: { items: [{ id: 'show-1', summary: 'Friday show',
      start: { dateTime: '2030-01-04T19:00:00Z' }, end: { dateTime: '2030-01-04T23:00:00Z' } }] } });
    throw new Error('unexpected endpoint');
  });
  assert.equal(response.status, 200);
  const page = await response.json() as { records: Array<{ kind: string; data: { summary: string; calendarId: string } }> };
  assert.equal(page.records[0]?.kind, 'event');
  assert.equal(page.records[0]?.data.summary, 'Friday show');
  assert.equal(page.records[0]?.data.calendarId, 'artist@example.com');
  assert.equal(endpoints.length, 2);
});

test('selected Calendar config accepts only its exact grant while proxying bounded GETs', async () => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('actual-subject'));
  const userId = 'gigi_' + [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
  const db = { prepare() { return { bind() { return {
    async first() { return { status: 'active', connected_account_id: 'ca_calendar1' }; },
    async run() { throw new Error('source must not mutate'); }, async all() { return { results: [] }; },
  }; } }; } };
  const env = { GIGI_ALLOWED_SUBJECTS: 'actual-subject', COMPOSIO_API_KEY: 'ak_test',
    GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID: 'ac_F0JVbnFvV3DQ',
    GIGI_GOOGLECALENDAR_APPROVED_SCOPES: selectedCalendarScopes.join(','), DB: db };
  let actualScopes = [...selectedCalendarScopes];
  let actualConfig = 'ac_F0JVbnFvV3DQ';
  const endpoints: string[] = [];
  const fetcher: typeof fetch = async (request) => {
    const req = request as Request;
    const path = new URL(req.url).pathname;
    if (path === '/oauth/userinfo') return Response.json({ sub: 'actual-subject', resource: 'https://gigi-connector.createsomething.workers.dev', email_verified: true });
    if (path.endsWith('/connected_accounts/ca_calendar1')) return Response.json({ id: 'ca_calendar1', user_id: userId,
      auth_config: { id: actualConfig }, toolkit: { slug: 'googlecalendar' }, status: 'ACTIVE', is_disabled: false,
      experimental: { account_type: 'PRIVATE' }, requested_scopes: actualScopes });
    assert.equal(path, '/api/v3.1/tools/execute/proxy');
    const payload = await req.json() as { connected_account_id: string; method: string; endpoint: string };
    assert.equal(payload.connected_account_id, 'ca_calendar1');
    assert.equal(payload.method, 'GET');
    endpoints.push(payload.endpoint);
    if (payload.endpoint.endsWith('/calendars/primary')) return Response.json({ status: 200, data: { id: 'primary@example.test' } });
    if (payload.endpoint.endsWith('/events')) return Response.json({ status: 200, data: { items: [] } });
    throw new Error('unexpected proxy endpoint');
  };
  const request = () => new Request('https://gigi-connector.createsomething.workers.dev/v1/gigi/sources/googlecalendar/ca_calendar1/page', {
    headers: { authorization: 'Bearer test-token' },
  });
  assert.equal((await handleConnectorRequest(request(), env, fetcher)).status, 200);
  assert.equal(endpoints.length, 2);
  actualScopes = selectedCalendarScopes.slice(0, -1);
  assert.equal((await handleConnectorRequest(request(), env, fetcher)).status, 502);
  actualScopes = [...selectedCalendarScopes, 'https://www.googleapis.com/auth/calendar.readonly'];
  assert.equal((await handleConnectorRequest(request(), env, fetcher)).status, 502);
  actualScopes = [...selectedCalendarScopes];
  actualConfig = 'ac_other';
  assert.equal((await handleConnectorRequest(request(), env, fetcher)).status, 502);
  assert.equal((await handleConnectorRequest(request(), { ...env, GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID: 'ac_other' }, fetcher)).status, 502);
  assert.equal(endpoints.length, 2);
});
