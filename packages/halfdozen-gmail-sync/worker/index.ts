/**
 * Half Dozen Gmail Sync - MCP Worker (Multi-User)
 * 
 * Cloudflare Worker with Streamable HTTP transport for remote MCP access.
 * Supports multiple team members, each with their own Gmail authorization.
 * Uses direct fetch for both Gmail and Notion APIs (no SDK — Workers compatible).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { z } from 'zod';

// Types
interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  NOTION_API_KEY: string;
  NOTION_INTERACTIONS_DB_ID: string;
  NOTION_CONTACTS_DB_ID: string;
  TEAM_EMAILS: string;
  ADMIN_SECRET?: string;
  GMAIL_TOKENS: KVNamespace;
  MCP_OBJECT: DurableObjectNamespace;
}

interface StoredToken {
  refresh_token: string;
  email: string;
  authorized_at: string;
}

// ═══════════════════════════════════════════════════════════════
// Gmail API helpers
// ═══════════════════════════════════════════════════════════════
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

async function getAccessToken(env: Env, userEmail?: string): Promise<string> {
  if (!userEmail) {
    throw new Error('user_email is required. Each team member must authorize their own Gmail at /auth?email=their@email.com');
  }

  const stored = await env.GMAIL_TOKENS.get<StoredToken>(userEmail.toLowerCase(), 'json');
  if (!stored?.refresh_token) {
    throw new Error(`No Gmail authorization found for ${userEmail}. They need to visit: https://halfdozen-gmail-sync-mcp.half-dozen.workers.dev/auth?email=${encodeURIComponent(userEmail)}`);
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

async function gmailFetch(env: Env, path: string, params?: Record<string, string | string[]>, userEmail?: string) {
  const token = await getAccessToken(env, userEmail);
  const url = new URL(`${GMAIL_API}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach(val => url.searchParams.append(k, val));
      } else {
        url.searchParams.set(k, v);
      }
    });
  }
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

function parseEmailAddress(raw: string): { name?: string; email: string } {
  const match = raw.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+)>?$/);
  if (match) {
    return { name: match[1]?.trim() || undefined, email: match[2]?.trim() || raw.trim() };
  }
  return { email: raw.trim() };
}

function getTeamEmails(env: Env): string[] {
  return (env.TEAM_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

function getDefaultUser(env: Env): string {
  const team = getTeamEmails(env);
  if (team.length === 0) {
    throw new Error('No TEAM_EMAILS configured. Set TEAM_EMAILS env var with at least one authorized email.');
  }
  return team[0];
}

// ═══════════════════════════════════════════════════════════════
// Notion API helpers (direct fetch, no SDK)
// ═══════════════════════════════════════════════════════════════
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

async function notionFetch(env: Env, path: string, method: string = 'GET', body?: unknown) {
  const response = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${env.NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error (${response.status}): ${error}`);
  }

  return response.json();
}

async function notionQueryDatabase(env: Env, databaseId: string, filter: unknown, pageSize: number = 10) {
  return notionFetch(env, `/databases/${databaseId}/query`, 'POST', {
    filter,
    page_size: pageSize,
  }) as Promise<{ results: Array<{ id: string; properties: Record<string, any> }> }>;
}

async function notionCreatePage(env: Env, databaseId: string, properties: Record<string, unknown>) {
  return notionFetch(env, '/pages', 'POST', {
    parent: { database_id: databaseId },
    properties,
  }) as Promise<{ id: string }>;
}

async function notionAppendBlocks(env: Env, blockId: string, children: unknown[]) {
  return notionFetch(env, `/blocks/${blockId}/children`, 'PATCH', { children });
}

// ═══════════════════════════════════════════════════════════════
// OAuth helpers
// ═══════════════════════════════════════════════════════════════

function getRedirectUri(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/callback`;
}

async function signState(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sigHex = [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${btoa(payload)}.${sigHex}`;
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
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload));

  if (!valid) return null;

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

async function handleAuthStart(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  if (!email) {
    return new Response('Missing email parameter. Usage: /auth?email=you@example.com', { status: 400 });
  }

  const state = await signState(JSON.stringify({ email: email.toLowerCase() }), env.GOOGLE_CLIENT_SECRET);
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

  if (error) {
    return new Response(`OAuth error: ${error}`, { status: 400 });
  }

  if (!code || !state) {
    return new Response('Missing code or state parameter', { status: 400 });
  }

  const stateData = await verifyState(state, env.GOOGLE_CLIENT_SECRET);
  if (!stateData) {
    return new Response('Invalid or tampered state parameter', { status: 400 });
  }

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
    const error = await tokenResponse.text();
    return new Response(`Token exchange failed: ${error}`, { status: 500 });
  }

  const tokens = await tokenResponse.json() as { 
    access_token: string; 
    refresh_token?: string;
  };

  if (!tokens.refresh_token) {
    return new Response('No refresh token received. Try revoking access at https://myaccount.google.com/permissions and trying again.', { status: 400 });
  }

  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userInfoResponse.json() as { email?: string };
  const authorizedEmail = userInfo.email?.toLowerCase();

  if (!authorizedEmail) {
    return new Response('Could not verify email from Google', { status: 500 });
  }

  const storedToken: StoredToken = {
    refresh_token: tokens.refresh_token,
    email: authorizedEmail,
    authorized_at: new Date().toISOString(),
  };

  await env.GMAIL_TOKENS.put(authorizedEmail, JSON.stringify(storedToken));

  if (stateData.email !== authorizedEmail) {
    await env.GMAIL_TOKENS.put(stateData.email, JSON.stringify(storedToken));
  }

  return new Response(`
<!DOCTYPE html>
<html>
<head><title>Gmail Authorized</title></head>
<body style="font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px;">
  <h1>&#10004; Gmail Authorized</h1>
  <p><strong>${authorizedEmail}</strong> is now connected to the Half Dozen Gmail Sync MCP.</p>
  <p>You can close this window and use the MCP tools in Claude or Cursor.</p>
  <h3>Example usage:</h3>
  <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px;">Search my recent emails
(The tool will use your authorized account)</pre>
</body>
</html>
  `, { 
    status: 200, 
    headers: { 'Content-Type': 'text/html; charset=utf-8' } 
  });
}

async function handleListUsers(request: Request, env: Env): Promise<Response> {
  if (!env.ADMIN_SECRET) {
    return new Response('Admin endpoint not configured', { status: 404 });
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const list = await env.GMAIL_TOKENS.list();
  const users = list.keys.map(k => k.name);

  return new Response(JSON.stringify({ authorized_users: users }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// ═══════════════════════════════════════════════════════════════
// MCP Agent
// ═══════════════════════════════════════════════════════════════

// Legacy class - needed for migration
export class GmailSyncMCP extends McpAgent<Env> {
  server = new McpServer({ name: 'legacy', version: '1.0.0' });
  async init() {}
}

// MCP Agent (v2 with SQLite and multi-user support)
export class GmailSyncMCPv2 extends McpAgent<Env> {
  server = new McpServer({
    name: 'halfdozen-gmail-sync',
    version: '2.2.0',
  });

  async init() {
    // Tool: Search Emails
    this.server.tool(
      'search_emails',
      {
        query: z.string().describe('Gmail search query (from:, to:, subject:, label:, etc.)'),
        limit: z.number().optional().describe('Max results (default: 10)'),
        user_email: z.string().describe('Email of team member (must be authorized)'),
      },
      async ({ query, limit = 10, user_email }) => {
        try {
          const listData = await gmailFetch(this.env, '/messages', {
            q: query,
            maxResults: String(limit),
          }, user_email) as { messages?: Array<{ id: string }> };

          const messageIds = listData.messages || [];
          const emails: Array<{ id: string; subject: string; from: string; date: string; snippet: string }> = [];

          for (const { id } of messageIds.slice(0, limit)) {
            const msg = await gmailFetch(this.env, `/messages/${id}`, {
              format: 'metadata',
              metadataHeaders: ['From', 'Subject', 'Date'],
            }, user_email) as { payload?: { headers?: Array<{ name: string; value: string }> }; snippet?: string };

            const headers = msg.payload?.headers || [];
            const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

            emails.push({
              id,
              subject: getHeader('Subject') || '(No Subject)',
              from: getHeader('From'),
              date: getHeader('Date'),
              snippet: msg.snippet || '',
            });
          }

          return { content: [{ type: 'text', text: JSON.stringify({ count: emails.length, emails, user: user_email }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // Tool: Sync Email to Notion
    this.server.tool(
      'sync_email',
      {
        email_id: z.string().describe('Gmail message ID'),
        create_contact: z.boolean().optional().describe('Create contact if not found'),
        user_email: z.string().describe('Email of team member (must be authorized)'),
      },
      async ({ email_id, create_contact = false, user_email }) => {
        try {
          // Fetch email from Gmail
          const msg = await gmailFetch(this.env, `/messages/${email_id}`, { format: 'full' }, user_email) as {
            payload?: {
              headers?: Array<{ name: string; value: string }>;
              body?: { data?: string };
              parts?: Array<{ mimeType: string; body?: { data?: string } }>;
            };
          };

          const headers = msg.payload?.headers || [];
          const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

          const from = parseEmailAddress(getHeader('From'));
          const subject = getHeader('Subject') || '(No Subject)';
          const date = new Date(getHeader('Date')).toISOString();

          // Extract body
          let body = '';
          if (msg.payload?.body?.data) {
            body = atob(msg.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
          if (msg.payload?.parts) {
            for (const part of msg.payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                break;
              }
            }
          }

          // Check if already synced
          const existing = await notionQueryDatabase(this.env, this.env.NOTION_INTERACTIONS_DB_ID, {
            property: 'Interaction',
            title: { contains: `[${email_id}]` },
          }, 1);

          if (existing.results.length > 0) {
            return { content: [{ type: 'text', text: JSON.stringify({ skipped: true, reason: 'Already synced' }) }] };
          }

          // Find contact
          let contactId: string | undefined;
          let contactCreated = false;

          const contactSearch = await notionQueryDatabase(this.env, this.env.NOTION_CONTACTS_DB_ID, {
            property: 'Email',
            email: { equals: from.email },
          }, 1);

          if (contactSearch.results.length > 0) {
            contactId = contactSearch.results[0].id;
          } else if (create_contact) {
            const newContact = await notionCreatePage(this.env, this.env.NOTION_CONTACTS_DB_ID, {
              Name: { title: [{ text: { content: from.name || from.email.split('@')[0] } }] },
              Email: { email: from.email },
            });
            contactId = newContact.id;
            contactCreated = true;
          }

          // Direction
          const teamEmails = getTeamEmails(this.env);
          const direction = teamEmails.includes(from.email.toLowerCase()) ? 'Outbound' : 'Inbound';

          // Create interaction
          const properties: Record<string, unknown> = {
            Interaction: { title: [{ text: { content: `${subject} [${email_id}]` } }] },
            Date: { date: { start: date.split('T')[0] } },
            Type: { select: { name: 'Email' } },
          };
          if (contactId) {
            properties.Contacts = { relation: [{ id: contactId }] };
          }

          const page = await notionCreatePage(this.env, this.env.NOTION_INTERACTIONS_DB_ID, properties);

          // Add email content as blocks
          await notionAppendBlocks(this.env, page.id, [
            {
              type: 'callout',
              callout: {
                icon: { emoji: '📧' },
                rich_text: [{ type: 'text', text: { content: `From: ${from.email}\nDirection: ${direction}\nSynced by: ${user_email}` } }],
              },
            },
            {
              type: 'toggle',
              toggle: {
                rich_text: [{ type: 'text', text: { content: 'Email Body' } }],
                children: [{ type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: body.substring(0, 1900) } }] } }],
              },
            },
          ]);

          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, interactionId: page.id, contactId, contactCreated, syncedBy: user_email }, null, 2) }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // Tool: Find Contact
    this.server.tool(
      'find_contact',
      {
        email: z.string().optional().describe('Email to search'),
        name: z.string().optional().describe('Name to search'),
      },
      async ({ email, name }) => {
        try {
          let filter: unknown;
          if (email) {
            filter = { property: 'Email', email: { equals: email } };
          } else if (name) {
            filter = { property: 'Name', title: { contains: name } };
          } else {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'Provide email or name' }) }] };
          }

          const response = await notionQueryDatabase(this.env, this.env.NOTION_CONTACTS_DB_ID, filter, 5);

          const contacts = response.results.map((page: any) => ({
            id: page.id,
            name: page.properties.Name?.title?.[0]?.plain_text || 'Unknown',
            email: page.properties.Email?.email,
            url: `https://notion.so/${page.id.replace(/-/g, '')}`,
          }));

          return { content: [{ type: 'text', text: JSON.stringify({ found: contacts.length > 0, contacts }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // Tool: Create Contact
    this.server.tool(
      'create_contact',
      {
        name: z.string().describe('Contact name'),
        email: z.string().optional().describe('Contact email'),
        company: z.string().optional().describe('Company name'),
      },
      async ({ name, email, company }) => {
        try {
          const properties: Record<string, unknown> = {
            Name: { title: [{ text: { content: name } }] },
          };
          if (email) properties.Email = { email };
          if (company) properties.Company = { rich_text: [{ text: { content: company } }] };

          const page = await notionCreatePage(this.env, this.env.NOTION_CONTACTS_DB_ID, properties);

          return {
            content: [{ type: 'text', text: JSON.stringify({ created: true, id: page.id, name, email, url: `https://notion.so/${page.id.replace(/-/g, '')}` }, null, 2) }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // Tool: Get Labels
    this.server.tool(
      'get_email_labels',
      {
        user_email: z.string().describe('Email of team member (must be authorized)'),
      },
      async ({ user_email }) => {
        try {
          const response = await gmailFetch(this.env, '/labels', undefined, user_email) as { labels?: Array<{ id: string; name: string }> };
          const labels = (response.labels || []).filter(l => l.id && l.name).map(l => ({ id: l.id, name: l.name }));
          return { content: [{ type: 'text', text: JSON.stringify({ count: labels.length, labels, user: user_email }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // Tool: List Authorized Users
    this.server.tool(
      'list_authorized_users',
      {},
      async () => {
        const list = await this.env.GMAIL_TOKENS.list();
        const users = list.keys.map(k => k.name);
        return { content: [{ type: 'text', text: JSON.stringify({ count: users.length, users }, null, 2) }] };
      }
    );

    // ═══════════════════════════════════════════════════════════════
    // ChatGPT Connector Tools
    // ═══════════════════════════════════════════════════════════════

    this.server.tool(
      'search',
      {
        query: z.string().describe('Search query for Gmail emails (supports Gmail syntax: from:, to:, subject:, label:, after:, before:)'),
        user_email: z.string().optional().describe('Team member email (defaults to first TEAM_EMAILS entry)'),
      },
      async ({ query, user_email }) => {
        try {
          const effectiveUser = user_email || getDefaultUser(this.env);

          const listData = await gmailFetch(this.env, '/messages', {
            q: query,
            maxResults: '10',
          }, effectiveUser) as { messages?: Array<{ id: string }> };

          const messageIds = listData.messages || [];
          const results: Array<{ id: string; title: string; url: string }> = [];

          for (const { id } of messageIds.slice(0, 10)) {
            const msg = await gmailFetch(this.env, `/messages/${id}`, {
              format: 'metadata',
              metadataHeaders: ['From', 'Subject', 'Date'],
            }, effectiveUser) as { payload?: { headers?: Array<{ name: string; value: string }> }; snippet?: string };

            const headers = msg.payload?.headers || [];
            const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

            results.push({
              id,
              title: `${getHeader('Subject') || '(No Subject)'} — from ${getHeader('From')} (${getHeader('Date')})`,
              url: `https://mail.google.com/mail/u/0/#inbox/${id}`,
            });
          }

          return { content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    this.server.tool(
      'fetch',
      {
        id: z.string().describe('Gmail message ID (from search results)'),
        user_email: z.string().optional().describe('Team member email (defaults to first TEAM_EMAILS entry)'),
      },
      async ({ id, user_email }) => {
        try {
          const effectiveUser = user_email || getDefaultUser(this.env);

          const msg = await gmailFetch(this.env, `/messages/${id}`, { format: 'full' }, effectiveUser) as {
            id: string;
            threadId?: string;
            snippet?: string;
            payload?: {
              headers?: Array<{ name: string; value: string }>;
              body?: { data?: string };
              parts?: Array<{ mimeType: string; body?: { data?: string } }>;
            };
          };

          const headers = msg.payload?.headers || [];
          const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

          const subject = getHeader('Subject') || '(No Subject)';
          const from = getHeader('From');
          const to = getHeader('To');
          const date = getHeader('Date');

          let body = '';
          if (msg.payload?.body?.data) {
            body = atob(msg.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
          if (msg.payload?.parts) {
            for (const part of msg.payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                break;
              }
            }
          }

          const cleanText = body.replace(/<[^>]*>/g, '').trim();

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                id: msg.id,
                title: subject,
                text: `From: ${from}\nTo: ${to}\nDate: ${date}\nSubject: ${subject}\n\n${cleanText}`,
                url: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
                metadata: { from, to, date, subject, threadId: msg.threadId, snippet: msg.snippet },
              }, null, 2),
            }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Worker entry point
// ═══════════════════════════════════════════════════════════════
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === '/auth') {
      return handleAuthStart(request, env);
    }

    if (url.pathname === '/callback') {
      return handleOAuthCallback(request, env);
    }

    if (url.pathname === '/users') {
      return handleListUsers(request, env);
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return GmailSyncMCPv2.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return GmailSyncMCPv2.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: 'halfdozen-gmail-sync-mcp',
        version: '2.2.0',
        features: ['multi-user', 'chatgpt-connector'],
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
          auth: '/auth?email=you@example.com',
          users: '/users (requires ADMIN_SECRET)',
        },
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
