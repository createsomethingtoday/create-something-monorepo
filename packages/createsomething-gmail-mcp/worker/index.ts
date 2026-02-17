/**
 * CREATE SOMETHING Gmail MCP — Cloudflare Worker (single-user)
 *
 * Endpoints:
 * - GET  /              health/info
 * - GET  /auth?email=   start OAuth (redirects to Google)
 * - GET  /callback      OAuth callback (stores refresh token in KV)
 * - ALL  /mcp           MCP Streamable HTTP endpoint (protected by MCP_API_KEY if set)
 *
 * Auth model:
 * - OAuth refresh token is stored in KV under the user's email key.
 * - Access token is minted on demand via refresh token.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { enableTelemetry } from '@create-something/mcp-core';

interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  AUTHORIZED_EMAIL: string;
  MCP_API_KEY?: string;
  GMAIL_TOKENS: KVNamespace;
  TELEMETRY_DB?: D1Database;
}

type StoredToken = {
  refresh_token: string;
  email: string;
  authorized_at: string;
};

const SERVER_NAME = 'createsomething-gmail-mcp';
const SERVER_VERSION = '0.1.0';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

function getAuthorizedEmail(env: Env): string {
  if (!env.AUTHORIZED_EMAIL?.trim()) throw new Error('AUTHORIZED_EMAIL is required.');
  return env.AUTHORIZED_EMAIL.trim().toLowerCase();
}

function requireApiKey(request: Request, env: Env): Response | null {
  if (!env.MCP_API_KEY) return null;
  const authHeader = request.headers.get('Authorization');
  const apiKey = request.headers.get('X-API-Key');
  const ok = authHeader === `Bearer ${env.MCP_API_KEY}` || apiKey === env.MCP_API_KEY;
  if (ok) return null;
  return Response.json(
    { error: 'Unauthorized. Provide Authorization: Bearer <MCP_API_KEY> or X-API-Key header.' },
    { status: 401 },
  );
}

function getRedirectUri(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/callback`;
}

async function signState(payloadJson: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadJson));
  const sigHex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  const payloadB64 = btoa(payloadJson);
  return `${payloadB64}.${sigHex}`;
}

async function verifyState(state: string, secret: string): Promise<{ email: string } | null> {
  const dotIndex = state.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const payloadB64 = state.substring(0, dotIndex);
  const sigHex = state.substring(dotIndex + 1);

  let payload: string;
  try {
    payload = atob(payloadB64);
  } catch {
    return null;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)?.map(b => parseInt(b, 16)) ?? []);
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload));
  if (!valid) return null;

  try {
    return JSON.parse(payload) as { email: string };
  } catch {
    return null;
  }
}

async function getAccessToken(env: Env): Promise<string> {
  const userEmail = getAuthorizedEmail(env);
  const stored = await env.GMAIL_TOKENS.get<StoredToken>(userEmail, 'json');
  if (!stored?.refresh_token) {
    throw new Error(`No Gmail authorization found for ${userEmail}. Visit /auth?email=${encodeURIComponent(userEmail)} to authorize first.`);
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: stored.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token for ${userEmail}: ${error}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

async function gmailFetch(
  env: Env,
  path: string,
  init?: RequestInit & { params?: Record<string, string | string[]> },
): Promise<unknown> {
  const token = await getAccessToken(env);
  const url = new URL(`${GMAIL_API}${path}`);

  if (init?.params) {
    for (const [k, v] of Object.entries(init.params)) {
      if (Array.isArray(v)) v.forEach(val => url.searchParams.append(k, val));
      else url.searchParams.set(k, v);
    }
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

function decodeBase64Url(data: string): string {
  // Gmail uses base64url without padding.
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return atob(normalized + pad);
}

type MessagePart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: MessagePart[];
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
};

function extractBodyFromPayload(payload?: MessagePart): { plain: string; html: string } {
  if (!payload) return { plain: '', html: '' };
  let plain = '';
  let html = '';

  const processPart = (part: MessagePart) => {
    if (part.mimeType === 'text/plain' && part.body?.data && !plain) {
      plain = decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data && !html) {
      html = decodeBase64Url(part.body.data);
    }
    if (part.parts) for (const sub of part.parts) processPart(sub);
  };

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === 'text/plain') plain = decoded;
    if (payload.mimeType === 'text/html') html = decoded;
  }
  if (payload.parts) for (const part of payload.parts) processPart(part);

  if (!plain && html) {
    plain = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return { plain, html };
}

function parseEmailAddressList(value: string): Array<{ name?: string; email: string }> {
  if (!value) return [];
  const parts = value.split(/,(?![^"]*")/g).map(s => s.trim()).filter(Boolean);
  return parts.map(parseEmailAddress);
}

function parseEmailAddress(raw: string): { name?: string; email: string } {
  const match = raw.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+)>?$/);
  if (match) return { name: match[1]?.trim() || undefined, email: match[2]?.trim() || raw.trim() };
  return { email: raw.trim() };
}

function base64UrlEncode(raw: string): string {
  const b64 = btoa(raw);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function formatAddressList(addrs: string[] | string): string {
  const list = Array.isArray(addrs) ? addrs : [addrs];
  return list.map(s => s.trim()).filter(Boolean).join(', ');
}

function buildRawEmail(input: {
  to: string[] | string;
  subject: string;
  bodyText: string;
  cc?: string[] | string;
  bcc?: string[] | string;
  bodyHtml?: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const headers: string[] = [];
  headers.push(`To: ${formatAddressList(input.to)}`);
  if (input.cc) headers.push(`Cc: ${formatAddressList(input.cc)}`);
  if (input.bcc) headers.push(`Bcc: ${formatAddressList(input.bcc)}`);
  headers.push(`Subject: ${input.subject}`);
  headers.push('MIME-Version: 1.0');
  if (input.inReplyTo) headers.push(`In-Reply-To: ${input.inReplyTo}`);
  if (input.references) headers.push(`References: ${input.references}`);

  if (input.bodyHtml) {
    const boundary = `alt_${Math.random().toString(16).slice(2)}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    const body = [
      ...headers,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      input.bodyText,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      input.bodyHtml,
      '',
      `--${boundary}--`,
      '',
    ].join('\r\n');
    return base64UrlEncode(body);
  }

  headers.push('Content-Type: text/plain; charset="UTF-8"');
  const raw = [...headers, '', input.bodyText, ''].join('\r\n');
  return base64UrlEncode(raw);
}

function createServer(env: Env) {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  if (env.TELEMETRY_DB) {
    // Avoid SDK minor-version type mismatch across the monorepo.
    enableTelemetry(server as any, env.TELEMETRY_DB as any, SERVER_NAME);
  }

  server.tool('gmail_whoami', 'Return the authenticated Gmail account (AUTHORIZED_EMAIL) and profile totals.', {}, async () => {
    try {
      const profile = await gmailFetch(env, '/profile') as {
        emailAddress?: string; messagesTotal?: number; threadsTotal?: number; historyId?: string;
      };
      return { content: [{ type: 'text', text: JSON.stringify({ authorizedEmail: getAuthorizedEmail(env), ...profile }, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: String(e) }, null, 2) }], isError: true };
    }
  });

  server.tool('gmail_list_labels', 'List Gmail labels (id + name).', {}, async () => {
    try {
      const labels = await gmailFetch(env, '/labels') as { labels?: Array<{ id: string; name: string }> };
      return { content: [{ type: 'text', text: JSON.stringify({ count: labels.labels?.length ?? 0, labels: labels.labels ?? [] }, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: String(e) }, null, 2) }], isError: true };
    }
  });

  server.tool(
    'gmail_search',
    'Search Gmail using Gmail query syntax (from:, to:, subject:, after:, before:, label:, in:inbox, is:unread, etc.).',
    {
      query: z.string(),
      limit: z.number().min(1).max(100).default(10),
      include_body: z.boolean().default(false),
    },
    async ({ query, limit, include_body }) => {
      try {
        const list = await gmailFetch(env, '/messages', { params: { q: query, maxResults: String(limit) } }) as {
          messages?: Array<{ id: string }>;
        };

        const ids = (list.messages ?? []).map(m => m.id).filter(Boolean).slice(0, limit);
        const emails: unknown[] = [];

        for (const id of ids) {
          const msg = await gmailFetch(env, `/messages/${id}`, {
            params: include_body
              ? { format: 'full' }
              : { format: 'metadata', metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date', 'Message-ID'] },
          }) as {
            id?: string;
            threadId?: string;
            snippet?: string;
            labelIds?: string[];
            payload?: MessagePart;
          };

          const headers = msg.payload?.headers ?? [];
          const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
          const { plain, html } = include_body ? extractBodyFromPayload(msg.payload) : { plain: '', html: '' };

          emails.push({
            id: msg.id,
            threadId: msg.threadId,
            messageIdHeader: getHeader('Message-ID') || null,
            subject: getHeader('Subject') || '(No Subject)',
            from: parseEmailAddress(getHeader('From')),
            to: parseEmailAddressList(getHeader('To')),
            cc: getHeader('Cc') ? parseEmailAddressList(getHeader('Cc')) : undefined,
            date: new Date(getHeader('Date') || 0).toISOString(),
            snippet: msg.snippet || '',
            labels: msg.labelIds || [],
            body: plain,
            bodyHtml: html,
          });
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ count: emails.length, has_more: emails.length === limit, emails }, null, 2),
          }],
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: String(e) }, null, 2) }], isError: true };
      }
    },
  );

  server.tool('gmail_get_email', 'Fetch a single email by Gmail message ID.', { email_id: z.string() }, async ({ email_id }) => {
    try {
      const msg = await gmailFetch(env, `/messages/${email_id}`, { params: { format: 'full' } }) as {
        id?: string;
        threadId?: string;
        snippet?: string;
        labelIds?: string[];
        payload?: MessagePart;
      };

      const headers = msg.payload?.headers ?? [];
      const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
      const { plain, html } = extractBodyFromPayload(msg.payload);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id: msg.id,
            threadId: msg.threadId,
            messageIdHeader: getHeader('Message-ID') || null,
            subject: getHeader('Subject') || '(No Subject)',
            from: parseEmailAddress(getHeader('From')),
            to: parseEmailAddressList(getHeader('To')),
            cc: getHeader('Cc') ? parseEmailAddressList(getHeader('Cc')) : undefined,
            date: new Date(getHeader('Date') || 0).toISOString(),
            snippet: msg.snippet || '',
            labels: msg.labelIds || [],
            body: plain,
            bodyHtml: html,
          }, null, 2),
        }],
      };
    } catch (e) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: String(e) }, null, 2) }], isError: true };
    }
  });

  server.tool(
    'gmail_get_thread',
    'Fetch a thread by Gmail thread ID.',
    { thread_id: z.string(), include_body: z.boolean().default(false), limit: z.number().min(1).max(100).default(50) },
    async ({ thread_id, include_body, limit }) => {
      try {
        const thread = await gmailFetch(env, `/threads/${thread_id}`, {
          params: include_body
            ? { format: 'full' }
            : { format: 'metadata', metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date', 'Message-ID'] },
        }) as {
          id?: string;
          messages?: Array<{ id?: string; threadId?: string; snippet?: string; labelIds?: string[]; payload?: MessagePart }>;
        };

        const messages = (thread.messages ?? []).slice(-limit).map(m => {
          const headers = m.payload?.headers ?? [];
          const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
          const { plain, html } = include_body ? extractBodyFromPayload(m.payload) : { plain: '', html: '' };
          return {
            id: m.id,
            threadId: m.threadId,
            messageIdHeader: getHeader('Message-ID') || null,
            subject: getHeader('Subject') || '(No Subject)',
            from: parseEmailAddress(getHeader('From')),
            to: parseEmailAddressList(getHeader('To')),
            cc: getHeader('Cc') ? parseEmailAddressList(getHeader('Cc')) : undefined,
            date: new Date(getHeader('Date') || 0).toISOString(),
            snippet: m.snippet || '',
            labels: m.labelIds || [],
            body: plain,
            bodyHtml: html,
          };
        });

        return { content: [{ type: 'text', text: JSON.stringify({ id: thread.id, messages }, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: String(e) }, null, 2) }], isError: true };
      }
    },
  );

  server.tool(
    'gmail_send',
    'Send an email. Optional: thread_id and reply headers for in-thread replies.',
    {
      to: z.union([z.string(), z.array(z.string())]),
      subject: z.string(),
      body_text: z.string(),
      body_html: z.string().optional(),
      cc: z.union([z.string(), z.array(z.string())]).optional(),
      bcc: z.union([z.string(), z.array(z.string())]).optional(),
      thread_id: z.string().optional(),
      in_reply_to: z.string().optional(),
      references: z.string().optional(),
    },
    async ({ to, subject, body_text, body_html, cc, bcc, thread_id, in_reply_to, references }) => {
      try {
        const raw = buildRawEmail({ to, subject, bodyText: body_text, bodyHtml: body_html, cc, bcc, inReplyTo: in_reply_to, references });
        const res = await gmailFetch(env, '/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw, ...(thread_id ? { threadId: thread_id } : {}) }),
        }) as { id?: string; threadId?: string };

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, id: res.id, threadId: res.threadId }, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: String(e) }, null, 2) }], isError: true };
      }
    },
  );

  server.tool(
    'gmail_create_draft',
    'Create a draft (does not send).',
    {
      to: z.union([z.string(), z.array(z.string())]),
      subject: z.string(),
      body_text: z.string(),
      body_html: z.string().optional(),
      cc: z.union([z.string(), z.array(z.string())]).optional(),
      bcc: z.union([z.string(), z.array(z.string())]).optional(),
      thread_id: z.string().optional(),
      in_reply_to: z.string().optional(),
      references: z.string().optional(),
    },
    async ({ to, subject, body_text, body_html, cc, bcc, thread_id, in_reply_to, references }) => {
      try {
        const raw = buildRawEmail({ to, subject, bodyText: body_text, bodyHtml: body_html, cc, bcc, inReplyTo: in_reply_to, references });
        const res = await gmailFetch(env, '/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: { raw, ...(thread_id ? { threadId: thread_id } : {}) } }),
        }) as { id?: string; message?: { id?: string; threadId?: string } };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, draftId: res.id, messageId: res.message?.id, threadId: res.message?.threadId }, null, 2),
          }],
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: String(e) }, null, 2) }], isError: true };
      }
    },
  );

  server.tool(
    'gmail_modify_labels',
    'Add/remove label IDs on a message.',
    { email_id: z.string(), add_label_ids: z.array(z.string()).default([]), remove_label_ids: z.array(z.string()).default([]) },
    async ({ email_id, add_label_ids, remove_label_ids }) => {
      try {
        await gmailFetch(env, `/messages/${email_id}/modify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addLabelIds: add_label_ids, removeLabelIds: remove_label_ids }),
        });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: String(e) }, null, 2) }], isError: true };
      }
    },
  );

  server.tool('gmail_trash', 'Move an email to Trash.', { email_id: z.string() }, async ({ email_id }) => {
    try {
      await gmailFetch(env, `/messages/${email_id}/trash`, { method: 'POST' });
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: String(e) }, null, 2) }], isError: true };
    }
  });

  return server;
}

async function handleAuthStart(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  const authorized = getAuthorizedEmail(env);

  if (!email) {
    return new Response(`Missing email parameter. Usage: /auth?email=${authorized}`, { status: 400 });
  }

  if (email.trim().toLowerCase() !== authorized) {
    return new Response(`This MCP is configured for ${authorized}. You cannot authorize as ${email} here.`, { status: 403 });
  }

  const state = await signState(JSON.stringify({ email: authorized }), env.GOOGLE_CLIENT_SECRET);
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', getRedirectUri(request));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', OAUTH_SCOPES);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  return Response.redirect(authUrl.toString(), 302);
}

async function handleOAuthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return new Response(`OAuth error: ${error}`, { status: 400 });
  if (!code || !state) return new Response('Missing code or state parameter', { status: 400 });

  const stateData = await verifyState(state, env.GOOGLE_CLIENT_SECRET);
  if (!stateData) return new Response('Invalid or tampered state parameter', { status: 400 });

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: getRedirectUri(request),
    }),
  });

  if (!tokenResponse.ok) {
    const t = await tokenResponse.text();
    return new Response(`Token exchange failed: ${t}`, { status: 500 });
  }

  const tokens = await tokenResponse.json() as { access_token: string; refresh_token?: string };
  if (!tokens.refresh_token) {
    return new Response('No refresh token received. Revoke access at https://myaccount.google.com/permissions and try again.', { status: 400 });
  }

  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userInfoResponse.json() as { email?: string };
  const authorizedEmail = userInfo.email?.toLowerCase();
  if (!authorizedEmail) return new Response('Could not verify email from Google', { status: 500 });

  const expected = getAuthorizedEmail(env);
  if (authorizedEmail !== expected) {
    return new Response(`Authorized email mismatch. Expected ${expected}, got ${authorizedEmail}.`, { status: 403 });
  }

  const stored: StoredToken = { refresh_token: tokens.refresh_token, email: authorizedEmail, authorized_at: new Date().toISOString() };
  await env.GMAIL_TOKENS.put(expected, JSON.stringify(stored));

  return new Response(
    `<!doctype html><html><body style="font-family:system-ui;max-width:720px;margin:40px auto;padding:16px">
      <h1>&#10004; Gmail Authorized</h1>
      <p><strong>${authorizedEmail}</strong> is now connected to ${SERVER_NAME}.</p>
      <p>You can close this window and use the MCP from ChatGPT.</p>
    </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return Response.json({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        endpoints: { mcp: '/mcp', auth: '/auth?email=...', callback: '/callback' },
        authorizedEmail: env.AUTHORIZED_EMAIL ? getAuthorizedEmail(env) : null,
        oauthRedirectUri: `${url.origin}/callback`,
        mcpAuthRequired: Boolean(env.MCP_API_KEY),
      });
    }

    if (url.pathname === '/auth') {
      return handleAuthStart(request, env);
    }

    if (url.pathname === '/callback') {
      return handleOAuthCallback(request, env);
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const unauthorized = requireApiKey(request, env);
      if (unauthorized) return unauthorized;

      const server = createServer(env);
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      return await transport.handleRequest(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
