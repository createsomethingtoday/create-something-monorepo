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
  ADDON_SECRET?: string;
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${errorText}`);
  }

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
// Text chunking helpers (Notion API limits)
// ═══════════════════════════════════════════════════════════════

/** Maximum characters per rich text object (Notion limit: 2000, with buffer) */
const CHUNK_SIZE = 1900;

/** Maximum blocks per array in a single request (Notion limit: 100) */
const MAX_BLOCKS_PER_REQUEST = 100;

/**
 * Chunk text at sentence boundaries, respecting Notion's 2000-char rich_text limit.
 */
function chunkText(text: string, maxLength: number = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find sentence boundary
    const sentenceEnd = remaining.lastIndexOf('. ', maxLength);
    const splitAt = sentenceEnd > maxLength * 0.5
      ? sentenceEnd + 2
      : maxLength;

    chunks.push(remaining.substring(0, splitAt).trim());
    remaining = remaining.substring(splitAt).trim();
  }

  return chunks;
}

/**
 * Build chunked paragraph blocks for email body, appended inside a toggle.
 * Returns the toggle block and any overflow paragraphs that need separate append calls.
 */
function buildBodyBlocks(body: string): {
  toggleBlock: unknown;
  overflowBatches: unknown[][];
} {
  const chunks = chunkText(body);

  if (chunks.length === 0) {
    return {
      toggleBlock: {
        type: 'toggle',
        toggle: {
          rich_text: [{ type: 'text', text: { content: 'Email Body' } }],
          children: [{ type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: '(empty)' } }] } }],
        },
      },
      overflowBatches: [],
    };
  }

  const paragraphs = chunks.map(chunk => ({
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: chunk } }],
    },
  }));

  // First batch goes inside the toggle (leave room for the toggle itself)
  const firstBatchSize = Math.min(paragraphs.length, MAX_BLOCKS_PER_REQUEST - 1);
  const firstBatch = paragraphs.slice(0, firstBatchSize);

  const toggleBlock = {
    type: 'toggle',
    toggle: {
      rich_text: [{ type: 'text', text: { content: 'Email Body' } }],
      children: firstBatch,
    },
  };

  // Remaining paragraphs need to be appended to the toggle block after creation
  const overflowBatches: unknown[][] = [];
  for (let i = firstBatchSize; i < paragraphs.length; i += MAX_BLOCKS_PER_REQUEST) {
    overflowBatches.push(paragraphs.slice(i, i + MAX_BLOCKS_PER_REQUEST));
  }

  return { toggleBlock, overflowBatches };
}

// ═══════════════════════════════════════════════════════════════
// Email body extraction (recursive multipart)
// ═══════════════════════════════════════════════════════════════

interface MessagePart {
  mimeType?: string;
  body?: { data?: string };
  parts?: MessagePart[];
}

/**
 * Recursively extract plain text and HTML from a Gmail message payload.
 * Handles nested multipart structures (multipart/mixed > multipart/alternative).
 */
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

    // Recurse into nested parts
    if (part.parts) {
      for (const subPart of part.parts) {
        processPart(subPart);
      }
    }
  };

  // Handle single-part messages
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === 'text/plain') {
      plain = decoded;
    } else if (payload.mimeType === 'text/html') {
      html = decoded;
    }
  }

  // Handle multipart messages
  if (payload.parts) {
    for (const part of payload.parts) {
      processPart(part);
    }
  }

  // Fallback: strip HTML tags if no plain text
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

/** Decode base64url-encoded string (Gmail API uses URL-safe base64). */
function decodeBase64Url(data: string): string {
  return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
}

/** Shorten a Gmail ID for display in Notion titles (8 chars + ellipsis). */
function shortenGmailId(gmailId: string): string {
  return gmailId.length > 8 ? gmailId.substring(0, 8) : gmailId;
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
        user_email: z.string().describe('Email of team member (must be authorized)'),
      },
      async ({ email_id, user_email }) => {
        try {
          // Fetch email from Gmail
          const msg = await gmailFetch(this.env, `/messages/${email_id}`, { format: 'full' }, user_email) as {
            payload?: MessagePart & {
              headers?: Array<{ name: string; value: string }>;
            };
          };

          const headers = msg.payload?.headers || [];
          const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

          const from = parseEmailAddress(getHeader('From'));
          const subject = getHeader('Subject') || '(No Subject)';
          const date = new Date(getHeader('Date')).toISOString();

          // Extract body (recursive multipart traversal)
          const { plain: body } = extractBodyFromPayload(msg.payload);

          // Check if already synced
          const shortId = shortenGmailId(email_id);
          const existing = await notionQueryDatabase(this.env, this.env.NOTION_INTERACTIONS_DB_ID, {
            property: 'Interaction',
            title: { contains: `[${shortId}` },
          }, 1);

          if (existing.results.length > 0) {
            return { content: [{ type: 'text', text: JSON.stringify({ skipped: true, reason: 'Already synced' }) }] };
          }

          // Find contact: primary email -> secondary email -> auto-create
          let contactId: string | undefined;
          let contactCreated = false;

          const contactSearch = await notionQueryDatabase(this.env, this.env.NOTION_CONTACTS_DB_ID, {
            property: 'Email',
            email: { equals: from.email },
          }, 1);

          if (contactSearch.results.length > 0) {
            contactId = contactSearch.results[0].id;
          } else {
            // Try secondary email
            const secondarySearch = await notionQueryDatabase(this.env, this.env.NOTION_CONTACTS_DB_ID, {
              property: 'Secondary Email',
              email: { equals: from.email },
            }, 1);

            if (secondarySearch.results.length > 0) {
              contactId = secondarySearch.results[0].id;
            } else {
              // Auto-create contact
              const newContact = await notionCreatePage(this.env, this.env.NOTION_CONTACTS_DB_ID, {
                Name: { title: [{ text: { content: from.name || from.email.split('@')[0] } }] },
                Email: { email: from.email },
              });
              contactId = newContact.id;
              contactCreated = true;
            }
          }

          // Direction
          const teamEmails = getTeamEmails(this.env);
          const direction = teamEmails.includes(from.email.toLowerCase()) ? 'Outbound' : 'Inbound';

          // Create interaction
          const properties: Record<string, unknown> = {
            Interaction: { title: [{ text: { content: `${subject} [${shortId}...]`.substring(0, 2000) } }] },
            Date: { date: { start: date.split('T')[0] } },
            Type: { select: { name: 'Email' } },
          };
          if (contactId) {
            properties.Contacts = { relation: [{ id: contactId }] };
          }

          const page = await notionCreatePage(this.env, this.env.NOTION_INTERACTIONS_DB_ID, properties);

          // Add email content as blocks (with proper chunking)
          const calloutBlock = {
            type: 'callout',
            callout: {
              icon: { emoji: '📧' },
              rich_text: [{ type: 'text', text: { content: `From: ${from.email}\nDirection: ${direction}\nSynced by: ${user_email}` } }],
            },
          };

          const { toggleBlock, overflowBatches } = buildBodyBlocks(body);

          const appendResult = await notionAppendBlocks(this.env, page.id, [calloutBlock, toggleBlock]) as {
            results: Array<{ id: string }>;
          };

          // Append overflow body chunks to the toggle block
          if (overflowBatches.length > 0) {
            const toggleId = appendResult.results[1].id;
            for (const batch of overflowBatches) {
              await notionAppendBlocks(this.env, toggleId, batch);
            }
          }

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

    // Tool: List Authorized Users (requires admin_secret)
    this.server.tool(
      'list_authorized_users',
      {
        admin_secret: z.string().describe('Admin secret (must match ADMIN_SECRET env var)'),
      },
      async ({ admin_secret }) => {
        if (!this.env.ADMIN_SECRET) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Admin endpoint not configured' }) }] };
        }
        if (admin_secret !== this.env.ADMIN_SECRET) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Unauthorized: invalid admin_secret' }) }] };
        }
        const list = await this.env.GMAIL_TOKENS.list();
        const users = list.keys.map(k => k.name);
        return { content: [{ type: 'text', text: JSON.stringify({ count: users.length, users }, null, 2) }] };
      }
    );

    // Tool: Link Contact (re-link interaction to a different contact + save alias)
    this.server.tool(
      'link_contact',
      {
        interaction_id: z.string().describe('Notion page ID of the Interaction to re-link'),
        contact_id: z.string().describe('Notion page ID of the correct Contact to link to'),
        sender_email: z.string().optional().describe('Email address to save as alias on the contact'),
        delete_auto_created_contact_id: z.string().optional().describe('Notion page ID of an auto-created contact to archive'),
      },
      async ({ interaction_id, contact_id, sender_email, delete_auto_created_contact_id }) => {
        try {
          // 1. Update the Interaction's Contacts relation
          await notionFetch(this.env, `/pages/${interaction_id}`, 'PATCH', {
            properties: {
              Contacts: { relation: [{ id: contact_id }] },
            },
          });

          // 2. Try to save sender email as Secondary Email alias
          let aliasSaved = false;
          let aliasNote: string | undefined;

          if (sender_email) {
            const contact = await notionFetch(this.env, `/pages/${contact_id}`, 'GET') as {
              properties: Record<string, any>;
            };

            const secondaryEmail = contact.properties['Secondary Email']?.email;

            if (!secondaryEmail) {
              await notionFetch(this.env, `/pages/${contact_id}`, 'PATCH', {
                properties: {
                  'Secondary Email': { email: sender_email },
                },
              });
              aliasSaved = true;
            } else {
              aliasNote = 'Both email fields in use — alias not saved';
            }
          }

          // 3. Archive the auto-created contact if requested
          if (delete_auto_created_contact_id) {
            await notionFetch(this.env, `/pages/${delete_auto_created_contact_id}`, 'PATCH', {
              archived: true,
            });
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                linked: true,
                contact_id,
                alias_saved: aliasSaved,
                alias_note: aliasNote,
                auto_created_archived: !!delete_auto_created_contact_id,
              }, null, 2),
            }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
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
            payload?: MessagePart & {
              headers?: Array<{ name: string; value: string }>;
            };
          };

          const headers = msg.payload?.headers || [];
          const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

          const subject = getHeader('Subject') || '(No Subject)';
          const from = getHeader('From');
          const to = getHeader('To');
          const date = getHeader('Date');

          // Extract body (recursive multipart traversal)
          const { plain: body } = extractBodyFromPayload(msg.payload);
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
// REST API endpoints (for Gmail Add-on)
// ═══════════════════════════════════════════════════════════════

async function handleApiRoute(pathname: string, request: Request, env: Env): Promise<Response> {
  // Authenticate via ADDON_SECRET
  const auth = request.headers.get('Authorization');
  if (!env.ADDON_SECRET || auth !== `Bearer ${env.ADDON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json() as Record<string, unknown>;
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data, null, 2), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    switch (pathname) {
      case '/api/check': {
        const gmailId = body.gmail_id as string;
        if (!gmailId) return json({ error: 'gmail_id required' }, 400);

        const checkShortId = shortenGmailId(gmailId);
        const existing = await notionQueryDatabase(env, env.NOTION_INTERACTIONS_DB_ID, {
          property: 'Interaction',
          title: { contains: `[${checkShortId}` },
        }, 1);

        const exists = existing.results.length > 0;
        const pageId = exists ? existing.results[0].id : undefined;

        return json({
          exists,
          page_url: pageId ? `https://notion.so/${pageId.replace(/-/g, '')}` : undefined,
        });
      }

      case '/api/sync': {
        const subject = body.subject as string;
        const from = body.from as { name?: string; email: string };
        const to = body.to as string[];
        const date = body.date as string;
        const emailBody = body.body as string || '';
        const gmailId = body.gmail_id as string;
        const direction = body.direction as 'Inbound' | 'Outbound';

        if (!gmailId || !from?.email || !subject) {
          return json({ error: 'gmail_id, from.email, and subject are required' }, 400);
        }

        // Dedup check
        const syncShortId = shortenGmailId(gmailId);
        const existing = await notionQueryDatabase(env, env.NOTION_INTERACTIONS_DB_ID, {
          property: 'Interaction',
          title: { contains: `[${syncShortId}` },
        }, 1);

        if (existing.results.length > 0) {
          return json({
            success: true,
            skipped: true,
            page_url: `https://notion.so/${existing.results[0].id.replace(/-/g, '')}`,
          });
        }

        // Find contact: primary -> secondary -> auto-create
        let contactId: string | undefined;
        let contactCreated = false;
        let contactName: string | undefined;

        const primarySearch = await notionQueryDatabase(env, env.NOTION_CONTACTS_DB_ID, {
          property: 'Email',
          email: { equals: from.email },
        }, 1);

        if (primarySearch.results.length > 0) {
          contactId = primarySearch.results[0].id;
          contactName = primarySearch.results[0].properties.Name?.title?.[0]?.plain_text;
        } else {
          const secondarySearch = await notionQueryDatabase(env, env.NOTION_CONTACTS_DB_ID, {
            property: 'Secondary Email',
            email: { equals: from.email },
          }, 1);

          if (secondarySearch.results.length > 0) {
            contactId = secondarySearch.results[0].id;
            contactName = secondarySearch.results[0].properties.Name?.title?.[0]?.plain_text;
          } else {
            const name = from.name || from.email.split('@')[0];
            const newContact = await notionCreatePage(env, env.NOTION_CONTACTS_DB_ID, {
              Name: { title: [{ text: { content: name } }] },
              Email: { email: from.email },
            });
            contactId = newContact.id;
            contactName = name;
            contactCreated = true;
          }
        }

        // Create interaction
        const properties: Record<string, unknown> = {
          Interaction: { title: [{ text: { content: `${subject} [${syncShortId}...]`.substring(0, 2000) } }] },
          Date: { date: { start: (date || new Date().toISOString()).split('T')[0] } },
          Type: { select: { name: 'Email' } },
        };
        if (contactId) {
          properties.Contacts = { relation: [{ id: contactId }] };
        }

        const page = await notionCreatePage(env, env.NOTION_INTERACTIONS_DB_ID, properties);

        // Add email content blocks
        const calloutBlock = {
          type: 'callout',
          callout: {
            icon: { emoji: '📧' },
            rich_text: [{ type: 'text', text: { content: `From: ${from.email}\nTo: ${(to || []).join(', ')}\nDirection: ${direction || 'Inbound'}` } }],
          },
        };
        const { toggleBlock, overflowBatches } = buildBodyBlocks(emailBody);

        const appendResult = await notionAppendBlocks(env, page.id, [calloutBlock, toggleBlock]) as {
          results: Array<{ id: string }>;
        };

        if (overflowBatches.length > 0) {
          const toggleId = appendResult.results[1].id;
          for (const batch of overflowBatches) {
            await notionAppendBlocks(env, toggleId, batch);
          }
        }

        return json({
          success: true,
          page_url: `https://notion.so/${page.id.replace(/-/g, '')}`,
          contact_id: contactId,
          contact_name: contactName,
          contact_created: contactCreated,
        });
      }

      case '/api/contact/find': {
        const email = body.email as string | undefined;
        const name = body.name as string | undefined;

        if (!email && !name) return json({ error: 'email or name required' }, 400);

        let filter: unknown;
        if (email) {
          filter = { property: 'Email', email: { equals: email } };
        } else {
          filter = { property: 'Name', title: { contains: name } };
        }

        const response = await notionQueryDatabase(env, env.NOTION_CONTACTS_DB_ID, filter, 5);
        const contacts = response.results.map((page: any) => ({
          id: page.id,
          name: page.properties.Name?.title?.[0]?.plain_text || 'Unknown',
          email: page.properties.Email?.email,
          secondary_email: page.properties['Secondary Email']?.email,
          url: `https://notion.so/${page.id.replace(/-/g, '')}`,
        }));

        return json({ found: contacts.length > 0, contacts });
      }

      case '/api/link-contact': {
        const interactionId = body.interaction_id as string;
        const contactId = body.contact_id as string;
        const senderEmail = body.sender_email as string | undefined;
        const deleteId = body.delete_auto_created_contact_id as string | undefined;

        if (!interactionId || !contactId) {
          return json({ error: 'interaction_id and contact_id required' }, 400);
        }

        // Update Interaction's Contacts relation
        await notionFetch(env, `/pages/${interactionId}`, 'PATCH', {
          properties: {
            Contacts: { relation: [{ id: contactId }] },
          },
        });

        // Try to save alias
        let aliasSaved = false;
        let aliasNote: string | undefined;

        if (senderEmail) {
          const contact = await notionFetch(env, `/pages/${contactId}`, 'GET') as {
            properties: Record<string, any>;
          };
          const secondaryEmail = contact.properties['Secondary Email']?.email;

          if (!secondaryEmail) {
            await notionFetch(env, `/pages/${contactId}`, 'PATCH', {
              properties: { 'Secondary Email': { email: senderEmail } },
            });
            aliasSaved = true;
          } else {
            aliasNote = 'Both email fields in use — alias not saved';
          }
        }

        // Archive auto-created contact
        if (deleteId) {
          await notionFetch(env, `/pages/${deleteId}`, 'PATCH', { archived: true });
        }

        return json({
          linked: true,
          contact_id: contactId,
          alias_saved: aliasSaved,
          alias_note: aliasNote,
          auto_created_archived: !!deleteId,
        });
      }

      default:
        return json({ error: 'Not found' }, 404);
    }
  } catch (error) {
    return json({ error: String(error) }, 500);
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

    // REST API endpoints (for Gmail Add-on and external integrations)
    if (url.pathname.startsWith('/api/')) {
      return handleApiRoute(url.pathname, request, env);
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
