export const GIGI_RESOURCE = 'https://gigi-connector.createsomething.workers.dev';
const IDENTITY_USERINFO = 'https://id.createsomething.space/oauth/userinfo';
const SELECTED_GMAIL_AUTH_CONFIG_ID = 'ac_qXoEQURadG-h';
const SELECTED_GMAIL_SCOPES = [
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
] as const;
const SELECTED_CALENDAR_AUTH_CONFIG_ID = 'ac_F0JVbnFvV3DQ';
const SELECTED_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
] as const;

export interface ConnectorEnv {
  COMPOSIO_API_KEY?: string;
  GIGI_ALLOWED_SUBJECTS?: string;
  GIGI_GMAIL_AUTH_CONFIG_ID?: string;
  GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID?: string;
  GIGI_GMAIL_APPROVED_SCOPES?: string;
  GIGI_GOOGLECALENDAR_APPROVED_SCOPES?: string;
  DB?: D1Like;
}

export interface D1Like {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first(): Promise<Record<string, unknown> | null>;
      run(): Promise<unknown>;
      all(): Promise<{ results: Record<string, unknown>[] }>;
    };
  };
}

export default {
  fetch(request: Request, env: ConnectorEnv): Promise<Response> {
    return handleConnectorRequest(request, env);
  },
};

export async function handleConnectorRequest(
  request: Request,
  env: ConnectorEnv,
  providerFetch: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.origin !== GIGI_RESOURCE) return json({ error: 'invalid_host' }, 400);
  if (url.pathname === '/health' && request.method === 'GET') {
    const configured = Boolean(env.DB && env.COMPOSIO_API_KEY && env.GIGI_ALLOWED_SUBJECTS?.trim() &&
      env.GIGI_GMAIL_AUTH_CONFIG_ID && env.GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID &&
      approvedScopes('gmail', env.GIGI_GMAIL_AUTH_CONFIG_ID, env.GIGI_GMAIL_APPROVED_SCOPES) &&
      approvedScopes('googlecalendar', env.GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID, env.GIGI_GOOGLECALENDAR_APPROVED_SCOPES));
    return json({ service: 'gigi-connector', status: configured ? 'available' : 'unconfigured' }, configured ? 200 : 503);
  }
  if (url.pathname === '/v1/gigi/connection-callback' && request.method === 'GET') {
    return new Response('Connection step received. Return to GiGi to verify this source.', {
      status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' },
    });
  }
  if (!url.pathname.startsWith('/v1/gigi/')) return json({ error: 'not_found' }, 404);
  const subject = await authenticate(request, env, providerFetch);
  if (!subject) return json({ error: 'unauthorized' }, 401);
  if (!env.DB || !env.COMPOSIO_API_KEY) return json({ error: 'unconfigured' }, 503);
  const status = /^\/v1\/gigi\/connections\/(gmail|googlecalendar)$/u.exec(url.pathname);
  if (status && request.method === 'GET') {
    const provider = status[1] as 'gmail' | 'googlecalendar';
    const row = await env.DB.prepare(
      'SELECT connected_account_id, status, request_id, reconnectable, created_at, redirect_url, expires_at FROM gigi_connection_attempts WHERE subject = ? AND provider = ? ORDER BY created_at DESC LIMIT 1',
    ).bind(subject, provider).first() as { connected_account_id: string | null; status: string; request_id: string; reconnectable?: number; created_at?: string; redirect_url?: string | null; expires_at?: string | null } | null;
    if (!row) return json({ provider, state: 'disconnected' });
    if (row.status === 'dispatched' && !row.connected_account_id) {
      const recovered = await recoverDispatchedAccount(env, providerFetch, subject, provider, row);
      if (recovered) return json(recovered);
      if (row.created_at && Date.now() - Date.parse(row.created_at) >= 10 * 60_000) {
        return json({ provider, state: 'attention', recovery: 'operator_review' });
      }
    }
    if ((row.status === 'active' || row.status === 'linked' || row.status === 'dispatched') && row.connected_account_id) {
      const state = await readAccountState(env, providerFetch, subject, provider, row.connected_account_id);
      if (state === 'terminal') {
        const release = await env.DB.prepare("UPDATE gigi_connection_attempts SET status = 'attention', reconnectable = 1 WHERE subject = ? AND provider = ? AND request_id = ? AND status IN ('active', 'linked', 'dispatched')")
          .bind(subject, provider, row.request_id).run() as { meta?: { changes?: number } };
        return json({ provider, state: 'attention', connectedAccountId: row.connected_account_id,
          ...(release.meta?.changes === 1 ? { reconnectable: true } : {}) });
      }
      if (row.status === 'active') return state === 'active'
        ? json({ provider, state: 'connected', connectedAccountId: row.connected_account_id })
        : json({ provider, state: 'attention', connectedAccountId: row.connected_account_id });
      if (row.status === 'linked' && state === 'pending') {
        if (validConsentLink(row.redirect_url, row.expires_at)) {
          return json({ provider, state: 'pending', connectedAccountId: row.connected_account_id,
            url: row.redirect_url, expiresAt: row.expires_at });
        }
        return json({ provider, state: 'attention', connectedAccountId: row.connected_account_id, recovery: 'operator_review' });
      }
      if (row.status === 'linked' && (state === 'invalid' || state === 'unavailable')) {
        return json({ provider, state: 'attention', connectedAccountId: row.connected_account_id,
          ...(state === 'invalid' ? { recovery: 'operator_review' } : {}) });
      }
    }
    return json({ provider, state: row.status === 'dispatched' || row.status === 'linked' ? 'pending' : 'attention',
      ...(row.connected_account_id ? { connectedAccountId: row.connected_account_id } : {}),
      ...(row.status === 'attention' && row.reconnectable === 1 ? { reconnectable: true } : {}) });
  }
  const link = /^\/v1\/gigi\/connections\/(gmail|googlecalendar)\/link$/u.exec(url.pathname);
  if (link && request.method === 'POST') {
    return beginLink(request, env, providerFetch, subject, link[1] as 'gmail' | 'googlecalendar');
  }
  const reconcile = /^\/v1\/gigi\/connections\/(gmail|googlecalendar)\/([A-Za-z0-9._:-]+)$/u.exec(url.pathname);
  if (reconcile && request.method === 'GET') {
    const provider = reconcile[1] as 'gmail' | 'googlecalendar';
    const accountId = reconcile[2]!;
    const row = await env.DB.prepare(
      'SELECT status, connected_account_id FROM gigi_connection_attempts WHERE subject = ? AND provider = ? AND connected_account_id = ? ORDER BY created_at DESC LIMIT 1',
    ).bind(subject, provider, accountId).first();
    if (!row || row.connected_account_id !== accountId || !['linked', 'active'].includes(String(row.status))) {
      return json({ error: 'not_found' }, 404);
    }
    const valid = await verifyComposioAccount(env, providerFetch, subject, provider, accountId);
    if (!valid) return json({ error: 'provider_readback_invalid' }, 502);
    const activation = await env.DB.prepare(
      "UPDATE gigi_connection_attempts SET status = 'active' WHERE subject = ? AND provider = ? AND connected_account_id = ? AND status IN ('linked', 'active')",
    ).bind(subject, provider, accountId).run() as { meta?: { changes?: number } };
    if (activation.meta?.changes !== 1) return json({ error: 'connection_changed' }, 409);
    return json({ provider, state: 'connected', connectedAccountId: accountId });
  }
  const source = /^\/v1\/gigi\/sources\/(gmail|googlecalendar)\/([A-Za-z0-9._:-]+)\/page$/u.exec(url.pathname);
  if (source && request.method === 'GET') {
    const provider = source[1] as 'gmail' | 'googlecalendar';
    const accountId = source[2]!;
    const row = await env.DB.prepare(
      'SELECT status, connected_account_id FROM gigi_connection_attempts WHERE subject = ? AND provider = ? AND connected_account_id = ? ORDER BY created_at DESC LIMIT 1',
    ).bind(subject, provider, accountId).first();
    if (!row || row.connected_account_id !== accountId || row.status !== 'active') return json({ error: 'not_found' }, 404);
    if (!await verifyComposioAccount(env, providerFetch, subject, provider, accountId)) return json({ error: 'provider_readback_invalid' }, 502);
    const cursor = url.searchParams.get('cursor');
    if (cursor && (cursor.length > 512 || /[\r\n]/u.test(cursor))) return json({ error: 'invalid_cursor' }, 400);
    try { return json(await readSourcePage(env, providerFetch, provider, accountId, cursor)); }
    catch { return json({ error: 'source_unavailable' }, 503); }
  }
  return json({ error: 'not_implemented' }, 501);
}

export async function readSourcePage(
  env: ConnectorEnv,
  providerFetch: typeof fetch,
  provider: 'gmail' | 'googlecalendar',
  accountId: string,
  cursor: string | null,
): Promise<unknown> {
  const observedAt = new Date().toISOString();
  if (provider === 'gmail') {
    const query: Array<{ name: string; value: string; type: 'query' }> = [{ name: 'maxResults', value: '2', type: 'query' }];
    if (cursor) query.push({ name: 'pageToken', value: cursor, type: 'query' });
    const page = await proxyRead(env, providerFetch, accountId, 'https://gmail.googleapis.com/gmail/v1/users/me/messages', query);
    if (page.messages !== undefined && !Array.isArray(page.messages)) throw new Error('gmail_page_invalid');
    if (page.nextPageToken !== undefined && (typeof page.nextPageToken !== 'string' || page.nextPageToken.length > 512)) throw new Error('gmail_cursor_invalid');
    if ((page.nextPageToken && !Array.isArray(page.messages)) || (Array.isArray(page.messages) && page.messages.length > 2)) throw new Error('gmail_page_invalid');
    const messages = Array.isArray(page.messages) ? page.messages : [];
    const records = [];
    for (const message of messages) {
      if (!isRecord(message) || typeof message.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/u.test(message.id)) throw new Error('gmail_message_id_invalid');
      const detail = await proxyRead(env, providerFetch, accountId, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
        [{ name: 'format', value: 'metadata', type: 'query' },
          { name: 'metadataHeaders', value: 'Subject', type: 'query' }, { name: 'metadataHeaders', value: 'From', type: 'query' },
          { name: 'metadataHeaders', value: 'Date', type: 'query' }]);
      if (detail.id !== message.id) throw new Error('gmail_detail_mismatch');
      const headers = isRecord(detail.payload) && Array.isArray(detail.payload.headers) ? detail.payload.headers : [];
      const header = (name: string) => {
        const item = headers.find((candidate: unknown) => isRecord(candidate) && String(candidate.name).toLowerCase() === name.toLowerCase());
        return isRecord(item) && typeof item.value === 'string' ? item.value.slice(0, 500) : '';
      };
      records.push({ externalId: message.id, kind: 'message', observedAt, data: {
        threadId: typeof detail.threadId === 'string' ? detail.threadId.slice(0, 128) : '',
        subject: header('Subject'), from: header('From'), date: header('Date'),
        snippet: typeof detail.snippet === 'string' ? detail.snippet.slice(0, 500) : '',
      } });
    }
    return { provider, connectedAccountId: accountId, records,
      nextCursor: typeof page.nextPageToken === 'string' ? page.nextPageToken : null };
  }

  const primary = await proxyRead(env, providerFetch, accountId, 'https://www.googleapis.com/calendar/v3/calendars/primary', []);
  if (typeof primary.id !== 'string' || !primary.id || primary.id.length > 320) throw new Error('calendar_identity_invalid');
  const calendarId = primary.id;
  const params: Array<{ name: string; value: string; type: 'query' }> = [
    { name: 'maxResults', value: '10', type: 'query' },
    { name: 'singleEvents', value: 'true', type: 'query' },
  ];
  if (cursor) params.push({ name: 'pageToken', value: cursor, type: 'query' });
  const page = await proxyRead(env, providerFetch, accountId,
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, params);
  if (!Array.isArray(page.items) || page.items.length > 10 ||
      (page.nextPageToken !== undefined && (typeof page.nextPageToken !== 'string' || page.nextPageToken.length > 512))) throw new Error('calendar_page_invalid');
  const records = page.items.map((item: unknown) => {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id || item.id.length > 256) throw new Error('calendar_event_id_invalid');
    return { externalId: item.id, kind: 'event' as const, observedAt, data: {
      calendarId, summary: typeof item.summary === 'string' ? item.summary.slice(0, 500) : '',
      start: isRecord(item.start) ? item.start : {}, end: isRecord(item.end) ? item.end : {},
      location: typeof item.location === 'string' ? item.location.slice(0, 500) : '',
      description: typeof item.description === 'string' ? item.description.slice(0, 1000) : '',
    } };
  });
  return { provider, connectedAccountId: accountId, records,
    nextCursor: typeof page.nextPageToken === 'string' ? page.nextPageToken : null };
}

async function proxyRead(
  env: ConnectorEnv,
  providerFetch: typeof fetch,
  accountId: string,
  endpoint: string,
  parameters: Array<{ name: string; value: string; type: 'query' }>,
): Promise<Record<string, unknown>> {
  const response = await providerFetch(new Request('https://backend.composio.dev/api/v3.1/tools/execute/proxy', {
    method: 'POST', headers: { 'x-api-key': env.COMPOSIO_API_KEY!, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ connected_account_id: accountId, endpoint, method: 'GET', parameters }),
    redirect: 'manual', signal: AbortSignal.timeout(8_000),
  }));
  if (!response.ok) throw new Error('composio_proxy_unavailable');
  const outer = await boundedJson(response);
  if (!isRecord(outer) || outer.status !== 200 || !isRecord(outer.data)) throw new Error('composio_proxy_invalid');
  return outer.data;
}

async function readAccountState(
  env: ConnectorEnv,
  providerFetch: typeof fetch,
  subject: string,
  provider: 'gmail' | 'googlecalendar',
  accountId: string,
): Promise<'active' | 'pending' | 'terminal' | 'invalid' | 'unavailable'> {
  if (!/^ca_[A-Za-z0-9_-]{1,128}$/u.test(accountId)) return 'invalid';
  const authConfigId = provider === 'gmail' ? env.GIGI_GMAIL_AUTH_CONFIG_ID : env.GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID;
  const scopesRaw = provider === 'gmail' ? env.GIGI_GMAIL_APPROVED_SCOPES : env.GIGI_GOOGLECALENDAR_APPROVED_SCOPES;
  if (!authConfigId || !approvedScopes(provider, authConfigId, scopesRaw)) return 'invalid';
  let data: unknown;
  try {
    const response = await providerFetch(new Request(`https://backend.composio.dev/api/v3.1/connected_accounts/${encodeURIComponent(accountId)}`, {
      method: 'GET', headers: { 'x-api-key': env.COMPOSIO_API_KEY!, accept: 'application/json' },
      redirect: 'manual', signal: AbortSignal.timeout(8_000),
    }));
    if (!response.ok) return 'unavailable';
    data = await boundedJson(response);
  } catch { return 'unavailable'; }
  if (!isRecord(data) || data.id !== accountId || data.user_id !== await composioUserId(subject) ||
    !isRecord(data.auth_config) || data.auth_config.id !== authConfigId ||
    !isRecord(data.toolkit) || data.toolkit.slug !== provider ||
    !isRecord(data.experimental) || data.experimental.account_type !== 'PRIVATE' || !Array.isArray(data.requested_scopes)) return 'invalid';
  const expected = scopesRaw!.split(',').map((scope) => scope.trim()).filter(Boolean);
  const actual = data.requested_scopes;
  if (actual.length !== expected.length || !expected.every((scope) => actual.includes(scope))) return 'invalid';
  if (data.status === 'ACTIVE' && data.is_disabled === false) return 'active';
  if (['INITIALIZING', 'INITIATED'].includes(String(data.status)) && data.is_disabled === false) return 'pending';
  if (['FAILED', 'EXPIRED', 'INACTIVE', 'REVOKED'].includes(String(data.status))) return 'terminal';
  return 'invalid';
}

async function recoverDispatchedAccount(env: ConnectorEnv, providerFetch: typeof fetch, subject: string,
  provider: 'gmail' | 'googlecalendar', row: { request_id: string; created_at?: string }): Promise<Record<string, unknown> | null> {
  const authConfigId = provider === 'gmail' ? env.GIGI_GMAIL_AUTH_CONFIG_ID : env.GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID;
  if (!authConfigId || !row.created_at || !Number.isFinite(Date.parse(row.created_at))) return null;
  const owner = await composioUserId(subject);
  const url = new URL('https://backend.composio.dev/api/v3.1/connected_accounts');
  url.searchParams.set('user_ids', owner);
  url.searchParams.set('auth_config_ids', authConfigId);
  url.searchParams.set('limit', '100');
  let listing: unknown;
  try {
    const response = await providerFetch(new Request(url, { method: 'GET',
      headers: { 'x-api-key': env.COMPOSIO_API_KEY!, accept: 'application/json' },
      redirect: 'manual', signal: AbortSignal.timeout(8_000) }));
    if (!response.ok) return null;
    listing = await boundedJson(response);
  } catch { return null; }
  if (!isRecord(listing) || !Array.isArray(listing.items) || listing.items.length > 100 || listing.next_cursor !== null) return null;
  const earliest = Date.parse(row.created_at) - 5 * 60_000;
  const matches = listing.items.filter((item: unknown) => isRecord(item) && item.alias === row.request_id &&
    item.user_id === owner && /^ca_[A-Za-z0-9_-]{1,128}$/u.test(String(item.id)) &&
    isRecord(item.auth_config) && item.auth_config.id === authConfigId &&
    isRecord(item.toolkit) && item.toolkit.slug === provider &&
    isRecord(item.experimental) && item.experimental.account_type === 'PRIVATE' &&
    typeof item.created_at === 'string' && Date.parse(item.created_at) >= earliest);
  if (matches.length !== 1) return null;
  const accountId = (matches[0] as Record<string, unknown>).id as string;
  const state = await readAccountState(env, providerFetch, subject, provider, accountId);
  if (state === 'invalid' || state === 'unavailable') return null;
  const nextStatus = state === 'active' ? 'active' : state === 'terminal' ? 'attention' : 'linked';
  const update = await env.DB!.prepare(
    `UPDATE gigi_connection_attempts SET connected_account_id = ?, status = '${nextStatus}', reconnectable = ? WHERE subject = ? AND provider = ? AND request_id = ? AND status = 'dispatched' AND connected_account_id IS NULL`,
  ).bind(accountId, state === 'terminal' ? 1 : 0, subject, provider, row.request_id).run() as { meta?: { changes?: number } };
  if (update.meta?.changes !== 1) return null;
  return { provider, state: state === 'active' ? 'connected' : 'attention',
    connectedAccountId: accountId,
    ...(state === 'terminal' ? { reconnectable: true } : state === 'pending' ? { recovery: 'operator_review' } : {}) };
}

async function verifyComposioAccount(env: ConnectorEnv, providerFetch: typeof fetch, subject: string,
  provider: 'gmail' | 'googlecalendar', accountId: string): Promise<boolean> {
  return await readAccountState(env, providerFetch, subject, provider, accountId) === 'active';
}

async function composioUserId(subject: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subject));
  return 'gigi_' + [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function beginLink(
  request: Request,
  env: ConnectorEnv,
  providerFetch: typeof fetch,
  subject: string,
  provider: 'gmail' | 'googlecalendar',
): Promise<Response> {
  const authConfigId = provider === 'gmail' ? env.GIGI_GMAIL_AUTH_CONFIG_ID : env.GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID;
  const scopes = provider === 'gmail' ? env.GIGI_GMAIL_APPROVED_SCOPES : env.GIGI_GOOGLECALENDAR_APPROVED_SCOPES;
  if (!authConfigId || !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u.test(authConfigId) || !approvedScopes(provider, authConfigId, scopes)) {
    return json({ error: 'unconfigured' }, 503);
  }
  let input: unknown;
  try { input = await boundedJson(request); } catch { return json({ error: 'invalid_request' }, 400); }
  if (!isRecord(input) || typeof input.requestId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u.test(input.requestId)) {
    return json({ error: 'invalid_request' }, 400);
  }
  const requestId = input.requestId;
  const insertion = await env.DB!.prepare(
    "INSERT OR IGNORE INTO gigi_connection_attempts (subject, provider, request_id, status, created_at, auth_config_id) VALUES (?, ?, ?, 'dispatched', ?, ?)",
  ).bind(subject, provider, requestId, new Date().toISOString(), authConfigId).run() as { meta?: { changes?: number } };
  let prior = await env.DB!.prepare(
    'SELECT status, connected_account_id, redirect_url, expires_at FROM gigi_connection_attempts WHERE subject = ? AND provider = ? AND request_id = ?',
  ).bind(subject, provider, requestId).first() as { status: string; connected_account_id: string | null; redirect_url?: string; expires_at?: string; request_id?: string } | null;
  if (!prior && insertion.meta?.changes !== 1) {
    prior = await env.DB!.prepare(
      "SELECT status, connected_account_id, redirect_url, expires_at, request_id FROM gigi_connection_attempts WHERE subject = ? AND provider = ? AND status IN ('dispatched', 'linked', 'active') ORDER BY created_at DESC LIMIT 1",
    ).bind(subject, provider).first() as typeof prior;
  }
  if (!prior) return json({ error: 'journal_unavailable' }, 503);
  // The insert is authoritative. An existing dispatched row can be the result of
  // an uncertain provider POST, so never send another link mutation for that ID.
  const attemptId = prior.request_id ?? requestId;
  if (prior.status === 'linked' && validConsentLink(prior.redirect_url, prior.expires_at)) {
    if (prior.connected_account_id &&
      await readAccountState(env, providerFetch, subject, provider, prior.connected_account_id) === 'pending') {
      return json({ provider, status: 'awaiting_consent', attemptId,
        connectedAccountId: prior.connected_account_id, url: prior.redirect_url, expiresAt: prior.expires_at });
    }
    return json({ provider, status: 'readback_required', attemptId });
  }
  if (insertion.meta?.changes !== 1) return json({ provider, status: 'readback_required', attemptId });
  const userId = await composioUserId(subject);
  let data: unknown;
  try {
    const response = await providerFetch(new Request('https://backend.composio.dev/api/v3.1/connected_accounts/link', {
      method: 'POST',
      headers: { 'x-api-key': env.COMPOSIO_API_KEY!, accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ auth_config_id: authConfigId, user_id: userId, alias: requestId,
        callback_url: `${GIGI_RESOURCE}/v1/gigi/connection-callback`, experimental: { account_type: 'PRIVATE' } }),
      redirect: 'manual', signal: AbortSignal.timeout(10_000),
    }));
    if (!response.ok) return json({ provider, status: 'readback_required', attemptId: requestId }, 503);
    data = await boundedJson(response);
  } catch { return json({ provider, status: 'readback_required', attemptId: requestId }, 503); }
  if (!isRecord(data) || typeof data.connected_account_id !== 'string' || typeof data.redirect_url !== 'string' ||
    typeof data.expires_at !== 'string' || !Number.isFinite(Date.parse(data.expires_at))) return json({ error: 'provider_readback_invalid' }, 502);
  if (!validConsentLink(data.redirect_url, data.expires_at)) {
    return json({ error: 'provider_readback_invalid' }, 502);
  }
  const linked = await env.DB!.prepare(
    "UPDATE gigi_connection_attempts SET connected_account_id = ?, redirect_url = ?, expires_at = ?, status = 'linked' WHERE subject = ? AND provider = ? AND request_id = ? AND status = 'dispatched' AND connected_account_id IS NULL",
  ).bind(data.connected_account_id, data.redirect_url, data.expires_at, subject, provider, requestId).run() as { meta?: { changes?: number } };
  if (linked.meta?.changes !== 1) return json({ provider, status: 'readback_required', attemptId: requestId });
  return json({ provider, status: 'awaiting_consent', attemptId: requestId, connectedAccountId: data.connected_account_id,
    url: data.redirect_url, expiresAt: data.expires_at });
}

function validConsentLink(url: unknown, expiresAt: unknown): url is string {
  if (typeof url !== 'string' || typeof expiresAt !== 'string' || url.length > 2048 ||
    !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'connect.composio.dev' &&
      !parsed.port && !parsed.username && !parsed.password && !parsed.hash;
  } catch { return false; }
}

function approvedScopes(provider: 'gmail' | 'googlecalendar', authConfigId: string | undefined, raw: string | undefined): boolean {
  if (!raw) return false;
  const scopes = raw.split(',').map((scope) => scope.trim()).filter(Boolean);
  if (scopes.length === 0 || scopes.length > 16 || new Set(scopes).size !== scopes.length) return false;
  if (provider === 'gmail' && authConfigId === SELECTED_GMAIL_AUTH_CONFIG_ID) {
    return scopes.length === SELECTED_GMAIL_SCOPES.length && SELECTED_GMAIL_SCOPES.every((scope) => scopes.includes(scope));
  }
  if (provider === 'googlecalendar' && authConfigId === SELECTED_CALENDAR_AUTH_CONFIG_ID) {
    return scopes.length === SELECTED_CALENDAR_SCOPES.length && SELECTED_CALENDAR_SCOPES.every((scope) => scopes.includes(scope));
  }
  return false;
}

async function authenticate(request: Request, env: ConnectorEnv, providerFetch: typeof fetch): Promise<string | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/iu)?.[1];
  if (!token || token.length > 4096) return null;
  const allowlist = new Set((env.GIGI_ALLOWED_SUBJECTS ?? '').split(',').map((item) => item.trim()).filter(Boolean));
  if (allowlist.size === 0) return null;
  try {
    const response = await providerFetch(new Request(IDENTITY_USERINFO, {
      method: 'GET',
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    }));
    if (!response.ok) return null;
    const data = await boundedJson(response);
    if (!isRecord(data) || data.resource !== GIGI_RESOURCE || data.email_verified !== true ||
      typeof data.sub !== 'string' || !allowlist.has(data.sub)) return null;
    return data.sub;
  } catch { return null; }
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function boundedJson(response: Request | Response): Promise<unknown> {
  if (!response.body) throw new Error('missing_body');
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 131_072) throw new Error('response_too_large');
      parts.push(next.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
