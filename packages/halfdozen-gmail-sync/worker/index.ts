/**
 * Half Dozen Gmail Sync - MCP Worker (Single-User Isolated)
 * 
 * Cloudflare Worker with Streamable HTTP transport for remote MCP access.
 * Each instance serves a single team member (set via AUTHORIZED_EMAIL env var).
 * Deploy separate instances per user via wrangler environments for inbox isolation.
 * Uses direct fetch for both Gmail and Notion APIs (no SDK — Workers compatible).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { z } from 'zod';
import { registerFeedbackTool, D1FeedbackStore, enableTelemetry } from '@create-something/mcp-core';

// Types
interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  NOTION_API_KEY: string;
  NOTION_INTERACTIONS_DB_ID: string;
  NOTION_CONTACTS_DB_ID: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;
  AUTHORIZED_EMAIL: string;        // The single user this instance serves
  TEAM_EMAILS?: string;            // Optional: full team list for direction detection
  ADMIN_SECRET?: string;
  ADDON_SECRET?: string;
  FEEDBACK_DB: any;  // D1Database — shared feedback across Half Dozen MCPs
  GMAIL_TOKENS: KVNamespace;
  MCP_OBJECT: DurableObjectNamespace;
}

interface StoredToken {
  refresh_token: string;
  email: string;
  authorized_at: string;
}

interface SyncResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  interactionId?: string;
  contactId?: string;
  contactCreated?: boolean;
  error?: string;
}

interface AutomationRun {
  id: string;
  started_at: string;
  completed_at: string;
  status: 'success' | 'error' | 'partial';
  emails_found: number;
  emails_synced: number;
  emails_skipped: number;
  error?: string;
  summary: string;
}

interface Automation {
  id: string;
  user_email: string;
  name: string;
  gmail_query: string;
  frequency_minutes: number;
  max_results: number;
  status: 'active' | 'paused';
  created_at: string;
  updated_at: string;
  last_run_at?: string;
  runs: AutomationRun[];
}

// ═══════════════════════════════════════════════════════════════
// Gmail API helpers
// ═══════════════════════════════════════════════════════════════
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const DEFAULT_LANGFUSE_PROJECT_NAME = 'CREATE SOMETHING';

function resolveLangfuseProjectName(env: { LANGFUSE_PROJECT_NAME?: string }): string {
  const configured = env.LANGFUSE_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_LANGFUSE_PROJECT_NAME;
}

const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

async function getAccessToken(env: Env, userEmail?: string): Promise<string> {
  if (!userEmail) {
    throw new Error('user_email is required. Authorize Gmail at /auth?email=your@email.com');
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

/** The single authorized email for this instance. */
function getAuthorizedEmail(env: Env): string {
  if (!env.AUTHORIZED_EMAIL?.trim()) {
    throw new Error('AUTHORIZED_EMAIL not configured. Set it to the email this instance serves.');
  }
  return env.AUTHORIZED_EMAIL.trim().toLowerCase();
}

/** Team emails for direction detection (inbound vs outbound). Always includes AUTHORIZED_EMAIL. */
function getTeamEmails(env: Env): string[] {
  const team = (env.TEAM_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const authorized = getAuthorizedEmail(env);
  if (!team.includes(authorized)) team.push(authorized);
  return team;
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
// Reusable sync logic
// ═══════════════════════════════════════════════════════════════

/**
 * Sync a single Gmail email to Notion. Handles dedup, contact matching,
 * interaction creation, and body chunking.
 * Used by both the manual sync_email tool and automated background sync.
 */
async function syncSingleEmail(
  env: Env,
  emailId: string,
  userEmail: string,
  syncedBy?: string,
): Promise<SyncResult> {
  // Fetch email from Gmail
  const msg = await gmailFetch(env, `/messages/${emailId}`, { format: 'full' }, userEmail) as {
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

  // Check if already synced (dedup via Gmail ID in title)
  const shortId = shortenGmailId(emailId);
  const existing = await notionQueryDatabase(env, env.NOTION_INTERACTIONS_DB_ID, {
    property: 'Interaction',
    title: { contains: `[${shortId}` },
  }, 1);

  if (existing.results.length > 0) {
    return { success: true, skipped: true, reason: 'Already synced' };
  }

  // Find contact: primary email -> secondary email -> auto-create
  let contactId: string | undefined;
  let contactCreated = false;

  const contactSearch = await notionQueryDatabase(env, env.NOTION_CONTACTS_DB_ID, {
    property: 'Email',
    email: { equals: from.email },
  }, 1);

  if (contactSearch.results.length > 0) {
    contactId = contactSearch.results[0].id;
  } else {
    const secondarySearch = await notionQueryDatabase(env, env.NOTION_CONTACTS_DB_ID, {
      property: 'Secondary Email',
      email: { equals: from.email },
    }, 1);

    if (secondarySearch.results.length > 0) {
      contactId = secondarySearch.results[0].id;
    } else {
      const newContact = await notionCreatePage(env, env.NOTION_CONTACTS_DB_ID, {
        Name: { title: [{ text: { content: from.name || from.email.split('@')[0] } }] },
        Email: { email: from.email },
      });
      contactId = newContact.id;
      contactCreated = true;
    }
  }

  // Direction
  const teamEmails = getTeamEmails(env);
  const direction = teamEmails.includes(from.email.toLowerCase()) ? 'Outbound' : 'Inbound';

  // Create interaction page
  const properties: Record<string, unknown> = {
    Interaction: { title: [{ text: { content: `${subject} [${shortId}...]`.substring(0, 2000) } }] },
    Date: { date: { start: date.split('T')[0] } },
    Type: { select: { name: 'Email' } },
  };
  if (contactId) {
    properties.Contacts = { relation: [{ id: contactId }] };
  }

  const page = await notionCreatePage(env, env.NOTION_INTERACTIONS_DB_ID, properties);

  // Add email content blocks (callout + toggle with chunked body)
  const calloutBlock = {
    type: 'callout',
    callout: {
      icon: { emoji: '📧' },
      rich_text: [{ type: 'text', text: { content: `From: ${from.email}\nDirection: ${direction}\nSynced by: ${syncedBy || userEmail}` } }],
    },
  };

  const { toggleBlock, overflowBatches } = buildBodyBlocks(body);

  const appendResult = await notionAppendBlocks(env, page.id, [calloutBlock, toggleBlock]) as {
    results: Array<{ id: string }>;
  };

  // Append overflow body chunks to the toggle block
  if (overflowBatches.length > 0) {
    const toggleId = appendResult.results[1].id;
    for (const batch of overflowBatches) {
      await notionAppendBlocks(env, toggleId, batch);
    }
  }

  return {
    success: true,
    interactionId: page.id,
    contactId,
    contactCreated,
  };
}

// ═══════════════════════════════════════════════════════════════
// Automation helpers (KV-backed)
// ═══════════════════════════════════════════════════════════════

const AUTOMATION_PREFIX = 'automation:';
const MAX_RUNS_HISTORY = 20;

function automationPrefixForUser(userEmail: string): string {
  return `${AUTOMATION_PREFIX}${userEmail.toLowerCase()}:`;
}

function automationKeyForUser(userEmail: string, id: string): string {
  return `${automationPrefixForUser(userEmail)}${id}`;
}

async function getAutomationById(kv: KVNamespace, userEmail: string, id: string): Promise<Automation | null> {
  return kv.get<Automation>(automationKeyForUser(userEmail, id), 'json');
}

async function putAutomation(kv: KVNamespace, automation: Automation): Promise<void> {
  await kv.put(automationKeyForUser(automation.user_email, automation.id), JSON.stringify(automation));
}

async function deleteAutomationFromKV(kv: KVNamespace, userEmail: string, id: string): Promise<void> {
  await kv.delete(automationKeyForUser(userEmail, id));
}

async function listAutomationsByUser(kv: KVNamespace, userEmail: string): Promise<Automation[]> {
  const keys = await kv.list({ prefix: automationPrefixForUser(userEmail) });
  const automations: Automation[] = [];
  for (const key of keys.keys) {
    const automation = await kv.get<Automation>(key.name, 'json');
    if (automation) automations.push(automation);
  }
  return automations;
}

/**
 * Execute a single automation: search Gmail, sync matching emails to Notion,
 * record run history. Called from the Worker's scheduled() handler.
 */
async function executeAutomationJob(env: Env, automation: Automation): Promise<void> {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  let emailsFound = 0;
  let emailsSynced = 0;
  let emailsSkipped = 0;
  let runError: string | undefined;

  try {
    // Search Gmail with the automation's query
    const listData = await gmailFetch(env, '/messages', {
      q: automation.gmail_query,
      maxResults: String(automation.max_results),
    }, automation.user_email) as { messages?: Array<{ id: string }> };

    const messageIds = listData.messages || [];
    emailsFound = messageIds.length;

    // Sync each email (sequential with rate limiting)
    for (const { id } of messageIds) {
      try {
        const result = await syncSingleEmail(
          env, id, automation.user_email,
          `Automation: ${automation.name}`,
        );
        if (result.skipped) {
          emailsSkipped++;
        } else if (result.success) {
          emailsSynced++;
        }
      } catch (err) {
        console.error(`Automation ${automation.id}: failed to sync email ${id}:`, err);
        // Continue with remaining emails
      }

      // Rate limit: 350ms between syncs to respect Notion API limits
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  } catch (err) {
    runError = String(err);
    console.error(`Automation ${automation.id} (${automation.name}) failed:`, err);
  }

  // Record the run in history
  const run: AutomationRun = {
    id: runId,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    status: runError ? 'error' : 'success',
    emails_found: emailsFound,
    emails_synced: emailsSynced,
    emails_skipped: emailsSkipped,
    error: runError,
    summary: runError
      ? `Failed: ${runError}`
      : `Found ${emailsFound} emails, synced ${emailsSynced}, skipped ${emailsSkipped} (already in Notion)`,
  };

  // Update automation with run history (keep last N runs)
  automation.last_run_at = new Date().toISOString();
  automation.runs = [...automation.runs.slice(-(MAX_RUNS_HISTORY - 1)), run];
  automation.updated_at = new Date().toISOString();

  await putAutomation(env.GMAIL_TOKENS, automation);
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

  // Only allow the configured user to authorize on this instance
  const authorized = getAuthorizedEmail(env);
  if (email.trim().toLowerCase() !== authorized) {
    return new Response(
      `This instance is configured for ${authorized}. You cannot authorize as ${email} here.`,
      { status: 403 },
    );
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
    version: '3.0.0',
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjE2IiB4PSIyIiB5PSI0IiByeD0iMiIvPjxwYXRoIGQ9Im0yMiA3LTguOTcgNS43YTEuOTQgMS45NCAwIDAgMS0yLjA2IDBMMiA3Ii8+PC9nPjwvc3ZnPg==',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
  });

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.FEEDBACK_DB) {
      enableTelemetry(this.server, this.env.FEEDBACK_DB, 'halfdozen-gmail-sync', undefined, {
        publicKey: (this.env as any).LANGFUSE_PUBLIC_KEY,
        secretKey: (this.env as any).LANGFUSE_SECRET_KEY,
        projectName: resolveLangfuseProjectName(this.env),
      });
    }

    // Tool: Search Emails
    this.server.tool(
      'search_emails',
      {
        query: z.string().describe('Gmail search query (from:, to:, subject:, label:, etc.)'),
        limit: z.number().optional().describe('Max results (default: 10)'),
      },
      async ({ query, limit = 10 }) => {
        try {
          const userEmail = getAuthorizedEmail(this.env);
          const listData = await gmailFetch(this.env, '/messages', {
            q: query,
            maxResults: String(limit),
          }, userEmail) as { messages?: Array<{ id: string }> };

          const messageIds = listData.messages || [];
          const emails: Array<{ id: string; subject: string; from: string; date: string; snippet: string }> = [];

          for (const { id } of messageIds.slice(0, limit)) {
            const msg = await gmailFetch(this.env, `/messages/${id}`, {
              format: 'metadata',
              metadataHeaders: ['From', 'Subject', 'Date'],
            }, userEmail) as { payload?: { headers?: Array<{ name: string; value: string }> }; snippet?: string };

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

          return { content: [{ type: 'text', text: JSON.stringify({ count: emails.length, emails, user: userEmail }, null, 2) }] };
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
      },
      async ({ email_id }) => {
        try {
          const userEmail = getAuthorizedEmail(this.env);
          const result = await syncSingleEmail(this.env, email_id, userEmail);
          return {
            content: [{ type: 'text', text: JSON.stringify({ ...result, syncedBy: userEmail }, null, 2) }],
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

    // Tool: Enrich Contact (append research notes to contact page)
    this.server.tool(
      'enrich_contact',
      {
        contact_id: z.string().describe('Notion page ID of the contact to enrich'),
        notes: z.string().describe('Research notes to append (plain text, can be multi-paragraph)'),
        source: z.string().optional().describe('Source of the information (e.g., "LinkedIn", "Perplexity", "Company website")'),
      },
      async ({ contact_id, notes, source }) => {
        try {
          const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

          // Build blocks: heading + optional source callout + chunked paragraphs
          const blocks: unknown[] = [
            {
              type: 'heading_2',
              heading_2: {
                rich_text: [{ type: 'text', text: { content: `Research Notes \u2014 ${date}` } }],
              },
            },
          ];

          if (source) {
            blocks.push({
              type: 'callout',
              callout: {
                icon: { emoji: '\uD83D\uDD0D' },
                rich_text: [{ type: 'text', text: { content: `Source: ${source}` } }],
              },
            });
          }

          // Chunk notes into paragraphs respecting Notion's 2000-char limit
          const chunks = chunkText(notes);
          for (const chunk of chunks) {
            blocks.push({
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content: chunk } }],
              },
            });
          }

          // Add a divider at the end
          blocks.push({ type: 'divider', divider: {} });

          await notionAppendBlocks(this.env, contact_id, blocks);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                contact_id,
                blocks_added: blocks.length,
                url: `https://notion.so/${contact_id.replace(/-/g, '')}`,
              }, null, 2),
            }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // Tool: Get Labels
    this.server.tool(
      'get_email_labels',
      {},
      async () => {
        try {
          const userEmail = getAuthorizedEmail(this.env);
          const response = await gmailFetch(this.env, '/labels', undefined, userEmail) as { labels?: Array<{ id: string; name: string }> };
          const labels = (response.labels || []).filter(l => l.id && l.name).map(l => ({ id: l.id, name: l.name }));
          return { content: [{ type: 'text', text: JSON.stringify({ count: labels.length, labels, user: userEmail }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
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
    // Automation Management Tools
    // ═══════════════════════════════════════════════════════════════

    // Tool: Preview Automation (dry run)
    this.server.tool(
      'preview_automation',
      {
        gmail_query: z.string().describe('Gmail search query to preview (from:, to:, subject:, label:, etc.)'),
        limit: z.number().optional().describe('Max emails to preview (default: 10)'),
      },
      async ({ gmail_query, limit = 10 }) => {
        try {
          const user_email = getAuthorizedEmail(this.env);
          const listData = await gmailFetch(this.env, '/messages', {
            q: gmail_query,
            maxResults: String(limit),
          }, user_email) as { messages?: Array<{ id: string }> };

          const messageIds = listData.messages || [];
          const previews: Array<{
            id: string;
            subject: string;
            from: string;
            date: string;
            already_synced: boolean;
          }> = [];

          for (const { id } of messageIds.slice(0, limit)) {
            const msg = await gmailFetch(this.env, `/messages/${id}`, {
              format: 'metadata',
              metadataHeaders: ['From', 'Subject', 'Date'],
            }, user_email) as { payload?: { headers?: Array<{ name: string; value: string }> } };

            const headers = msg.payload?.headers || [];
            const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

            // Check if already synced to Notion
            const shortId = shortenGmailId(id);
            const existing = await notionQueryDatabase(this.env, this.env.NOTION_INTERACTIONS_DB_ID, {
              property: 'Interaction',
              title: { contains: `[${shortId}` },
            }, 1);

            previews.push({
              id,
              subject: getHeader('Subject') || '(No Subject)',
              from: getHeader('From'),
              date: getHeader('Date'),
              already_synced: existing.results.length > 0,
            });
          }

          const newCount = previews.filter(p => !p.already_synced).length;
          const syncedCount = previews.filter(p => p.already_synced).length;

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                query: gmail_query,
                total_matches: messageIds.length,
                previewed: previews.length,
                new_emails: newCount,
                already_synced: syncedCount,
                emails: previews,
              }, null, 2),
            }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // Tool: Create Automation
    this.server.tool(
      'create_automation',
      {
        name: z.string().describe('Human-readable name (e.g., "Sync client emails daily")'),
        gmail_query: z.string().describe('Gmail search query (from:, to:, subject:, label:, etc.)'),
        frequency_minutes: z.number().describe('How often to run: 60=hourly, 360=every 6 hours, 1440=daily'),
        max_results: z.number().optional().describe('Max emails to sync per run (default: 20)'),
      },
      async ({ name, gmail_query, frequency_minutes, max_results = 20 }) => {
        try {
          const user_email = getAuthorizedEmail(this.env);

          // Validate user is authorized
          const stored = await this.env.GMAIL_TOKENS.get<StoredToken>(user_email, 'json');
          if (!stored?.refresh_token) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: `No Gmail authorization found. Visit /auth?email=${encodeURIComponent(user_email)} to authorize first.` }) }] };
          }

          // Validate frequency (minimum 5 minutes)
          if (frequency_minutes < 5) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'Minimum frequency is 5 minutes.' }) }] };
          }

          // Preview what the query currently matches
          const listData = await gmailFetch(this.env, '/messages', {
            q: gmail_query,
            maxResults: '5',
          }, user_email) as { messages?: Array<{ id: string }> };
          const previewCount = listData.messages?.length || 0;

          // Create automation
          const automation: Automation = {
            id: crypto.randomUUID(),
            user_email,
            name,
            gmail_query,
            frequency_minutes,
            max_results,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            runs: [],
          };

          await putAutomation(this.env.GMAIL_TOKENS, automation);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                created: true,
                automation: {
                  id: automation.id,
                  name: automation.name,
                  gmail_query: automation.gmail_query,
                  frequency_minutes: automation.frequency_minutes,
                  max_results: automation.max_results,
                  status: automation.status,
                },
                preview: {
                  matching_emails_now: previewCount,
                  note: previewCount > 0
                    ? `Found ${previewCount}+ matching emails. The automation will sync up to ${max_results} per run every ${frequency_minutes} minutes.`
                    : 'No matching emails found right now. The automation will check on its schedule.',
                },
              }, null, 2),
            }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // Tool: List Automations
    this.server.tool(
      'list_automations',
      {},
      async () => {
        try {
          const userEmail = getAuthorizedEmail(this.env);
          const automations = await listAutomationsByUser(this.env.GMAIL_TOKENS, userEmail);

          const summary = automations.map(a => ({
            id: a.id,
            name: a.name,
            user_email: a.user_email,
            gmail_query: a.gmail_query,
            frequency_minutes: a.frequency_minutes,
            max_results: a.max_results,
            status: a.status,
            last_run_at: a.last_run_at || 'never',
            total_runs: a.runs.length,
            last_run_summary: a.runs.length > 0 ? a.runs[a.runs.length - 1].summary : 'n/a',
          }));

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ count: automations.length, automations: summary }, null, 2),
            }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // Tool: Pause Automation
    this.server.tool(
      'pause_automation',
      {
        automation_id: z.string().describe('ID of the automation to pause'),
      },
      async ({ automation_id }) => {
        try {
          const userEmail = getAuthorizedEmail(this.env);
          const automation = await getAutomationById(this.env.GMAIL_TOKENS, userEmail, automation_id);
          if (!automation) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'Automation not found' }) }] };
          }

          if (automation.status === 'paused') {
            return { content: [{ type: 'text', text: JSON.stringify({ already_paused: true, name: automation.name }) }] };
          }

          automation.status = 'paused';
          automation.updated_at = new Date().toISOString();
          await putAutomation(this.env.GMAIL_TOKENS, automation);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ paused: true, id: automation.id, name: automation.name }, null, 2),
            }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // Tool: Resume Automation
    this.server.tool(
      'resume_automation',
      {
        automation_id: z.string().describe('ID of the automation to resume'),
      },
      async ({ automation_id }) => {
        try {
          const userEmail = getAuthorizedEmail(this.env);
          const automation = await getAutomationById(this.env.GMAIL_TOKENS, userEmail, automation_id);
          if (!automation) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'Automation not found' }) }] };
          }

          if (automation.status === 'active') {
            return { content: [{ type: 'text', text: JSON.stringify({ already_active: true, name: automation.name }) }] };
          }

          automation.status = 'active';
          automation.updated_at = new Date().toISOString();
          await putAutomation(this.env.GMAIL_TOKENS, automation);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ resumed: true, id: automation.id, name: automation.name, frequency_minutes: automation.frequency_minutes }, null, 2),
            }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // Tool: Delete Automation
    this.server.tool(
      'delete_automation',
      {
        automation_id: z.string().describe('ID of the automation to delete permanently'),
      },
      async ({ automation_id }) => {
        try {
          const userEmail = getAuthorizedEmail(this.env);
          const automation = await getAutomationById(this.env.GMAIL_TOKENS, userEmail, automation_id);
          if (!automation) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'Automation not found' }) }] };
          }

          await deleteAutomationFromKV(this.env.GMAIL_TOKENS, userEmail, automation_id);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ deleted: true, id: automation_id, name: automation.name }, null, 2),
            }],
          };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // Tool: Get Automation History
    this.server.tool(
      'get_automation_history',
      {
        automation_id: z.string().describe('ID of the automation to get history for'),
        limit: z.number().optional().describe('Number of recent runs to return (default: 10)'),
      },
      async ({ automation_id, limit = 10 }) => {
        try {
          const userEmail = getAuthorizedEmail(this.env);
          const automation = await getAutomationById(this.env.GMAIL_TOKENS, userEmail, automation_id);
          if (!automation) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'Automation not found' }) }] };
          }

          const recentRuns = automation.runs.slice(-limit).reverse(); // Most recent first

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                automation: {
                  id: automation.id,
                  name: automation.name,
                  status: automation.status,
                  gmail_query: automation.gmail_query,
                  frequency_minutes: automation.frequency_minutes,
                  last_run_at: automation.last_run_at || 'never',
                },
                total_runs: automation.runs.length,
                showing: recentRuns.length,
                runs: recentRuns,
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
      },
      async ({ query }) => {
        try {
          const userEmail = getAuthorizedEmail(this.env);

          const listData = await gmailFetch(this.env, '/messages', {
            q: query,
            maxResults: '10',
          }, userEmail) as { messages?: Array<{ id: string }> };

          const messageIds = listData.messages || [];
          const results: Array<{ id: string; title: string; url: string }> = [];

          for (const { id } of messageIds.slice(0, 10)) {
            const msg = await gmailFetch(this.env, `/messages/${id}`, {
              format: 'metadata',
              metadataHeaders: ['From', 'Subject', 'Date'],
            }, userEmail) as { payload?: { headers?: Array<{ name: string; value: string }> }; snippet?: string };

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
      },
      async ({ id }) => {
        try {
          const userEmail = getAuthorizedEmail(this.env);

          const msg = await gmailFetch(this.env, `/messages/${id}`, { format: 'full' }, userEmail) as {
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

    // ═══════════════════════════════════════════════════════════════
    // MCP Prompts (Judgment tier — user-controlled)
    // ═══════════════════════════════════════════════════════════════

    // Prompt: What can this MCP do?
    this.server.prompt(
      'capabilities',
      'Explains what this Gmail-Notion MCP can do and how to use it',
      () => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `You are connected to the Half Dozen Gmail Sync MCP. Here's what you can help the user with:

## Email Search & Sync
- **Search emails** using Gmail query syntax (from:, to:, subject:, label:, after:, before:)
- **Sync individual emails** to the Notion Interactions database with automatic contact matching
- **Labels**: List all Gmail labels to help build queries

## Contact Management
- **Find contacts** by email or name in the Notion Contacts database
- **Create contacts** with name, email, and company
- **Enrich contacts** by appending research notes to their Notion page
- **Re-link contacts** when an auto-created contact should be merged with an existing one

## Background Automations
- **Preview an automation** — dry-run a Gmail query to see what would be synced before committing
- **Create automations** — set up recurring sync rules (e.g., "sync all emails from label:clients every 6 hours")
- **List automations** — see all configured automations and their status
- **Pause/Resume automations** — temporarily stop or restart without deleting
- **Delete automations** — permanently remove an automation
- **Review automation history** — see what each automation has done (emails synced, errors, timing)

## How Automations Work
1. You help the user define a Gmail query and frequency
2. Use \`preview_automation\` to verify the query matches the right emails
3. Use \`create_automation\` to activate it
4. Every 5 minutes, the system checks if any automations are due and runs them automatically
5. Use \`get_automation_history\` to review results and adjust if needed

## Tips
- Gmail queries support: \`from:\`, \`to:\`, \`subject:\`, \`label:\`, \`after:\`, \`before:\`, \`has:attachment\`, \`is:unread\`
- This instance is connected to a single Gmail account (authorize at /auth if needed)
- Already-synced emails are automatically skipped (deduplication by Gmail ID)
- Contacts are auto-created if no match is found, and can be re-linked later`,
          },
        }],
      })
    );

    // Prompt: Set up an automation (guided workflow)
    this.server.prompt(
      'setup_automation',
      'Step-by-step guide to help the user create a background email sync automation',
      () => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Help me set up a background automation to sync emails to Notion. Walk me through it step by step:

1. **Ask what I want to sync** — which emails? From a specific person, label, or topic?
2. **Build the Gmail query** — translate my intent into Gmail search syntax
3. **Preview the results** — use \`preview_automation\` to show me what matches and whether any are already synced
4. **Let me adjust** — if the matches don't look right, refine the query and preview again
5. **Choose frequency** — ask how often I want it to run (hourly, every 6 hours, daily, etc.)
6. **Create it** — use \`create_automation\` to activate
7. **Confirm** — show me the automation details and explain what will happen next

Important: Don't skip the preview step. I want to see what will be synced before committing.`,
          },
        }],
      })
    );

    // Prompt: Review automations health
    this.server.prompt(
      'review_automations',
      'Check on all running automations — are they healthy? Any errors? Anything to adjust?',
      () => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Review all my email sync automations and give me a health report:

1. Use \`list_automations\` to see all automations
2. For each active automation, use \`get_automation_history\` to check recent runs
3. Flag any issues:
   - Automations with errors in recent runs
   - Automations that haven't run recently (might be stale)
   - Automations syncing 0 emails consistently (query might need updating)
   - Paused automations I might have forgotten about
4. Give me a clear summary and recommendations

Format the report so it's easy to scan.`,
          },
        }],
      })
    );

    // ═══════════════════════════════════════════════════════════════
    // Feedback (cross-cutting — support ticket pathway)
    // ═══════════════════════════════════════════════════════════════
    if (this.env.FEEDBACK_DB) {
      registerFeedbackTool(this.server, new D1FeedbackStore(this.env.FEEDBACK_DB), 'halfdozen-gmail-sync');
    }
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

      case '/api/enrich-contact': {
        const contactId = body.contact_id as string;
        const notes = body.notes as string;
        const source = body.source as string | undefined;

        if (!contactId || !notes) {
          return json({ error: 'contact_id and notes are required' }, 400);
        }

        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

        const blocks: unknown[] = [
          {
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: `Research Notes \u2014 ${date}` } }],
            },
          },
        ];

        if (source) {
          blocks.push({
            type: 'callout',
            callout: {
              icon: { emoji: '\uD83D\uDD0D' },
              rich_text: [{ type: 'text', text: { content: `Source: ${source}` } }],
            },
          });
        }

        const enrichChunks = chunkText(notes);
        for (const chunk of enrichChunks) {
          blocks.push({
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: chunk } }],
            },
          });
        }

        blocks.push({ type: 'divider', divider: {} });

        await notionAppendBlocks(env, contactId, blocks);

        return json({
          success: true,
          contact_id: contactId,
          blocks_added: blocks.length,
          url: `https://notion.so/${contactId.replace(/-/g, '')}`,
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
  /**
   * Scheduled handler: runs on cron trigger to execute due automations.
   * Each automation's frequency is checked against its last run time.
   */
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const userEmail = getAuthorizedEmail(env);
    const automations = await listAutomationsByUser(env.GMAIL_TOKENS, userEmail);
    const now = Date.now();
    let executed = 0;
    let skipped = 0;

    for (const automation of automations) {
      if (automation.status !== 'active') {
        skipped++;
        continue;
      }

      const lastRun = automation.last_run_at ? new Date(automation.last_run_at).getTime() : 0;
      const intervalMs = automation.frequency_minutes * 60 * 1000;

      if (now - lastRun < intervalMs) {
        skipped++;
        continue;
      }

      try {
        await executeAutomationJob(env, automation);
        executed++;
      } catch (error) {
        console.error(`Scheduled: automation ${automation.id} (${automation.name}) failed:`, error);
      }
    }

    console.log(`Scheduled run complete: ${executed} executed, ${skipped} skipped, ${automations.length} total`);
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === '/auth') {
      return handleAuthStart(request, env);
    }

    if (url.pathname === '/callback') {
      return handleOAuthCallback(request, env);
    }

    if (url.pathname === '/users') {
      return new Response('Not found', { status: 404 });
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

    if (url.pathname === '/' || url.pathname === '/health') {
      const authorizedEmail = env.AUTHORIZED_EMAIL?.trim() || '(not configured)';
      return new Response(JSON.stringify({
        name: 'halfdozen-gmail-sync-mcp',
        version: '4.0.0',
        features: ['single-user-isolation', 'chatgpt-connector', 'background-automations'],
        authorized_email: authorizedEmail,
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
          auth: `/auth?email=${encodeURIComponent(authorizedEmail)}`,
        },
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
