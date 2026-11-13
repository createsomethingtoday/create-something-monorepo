// Tool registration for the Bettermode Marketplace Creator MCP.
//
// Tools exposed:
//   fetch_post_thread          (Bettermode → post body + replies + author)
//   get_creator_context        (Airtable → Creator + linked Assets/templates)
//   list_recent_approved_drafts (D1 → few-shot examples for Dify)
//   get_draft_status           (D1 → audit lookup by post ID)
//   list_response_queue        (D1 → threads where a creator is waiting)
//   save_draft                 (D1 write → agent draft for admin review)
//   dismiss_queue_item         (D1 write → close an item that needs no reply)
//
// No tool posts to Bettermode. An admin sends the draft from the post page.
//
// Each tool returns a single text content block with JSON. The Dify agent
// (or any MCP client) parses JSON for downstream use.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  airtableConfig,
  fetchCreatorContext,
} from '../lib/airtable.js';
import {
  appAccessToken,
  bettermodeAuth,
  fetchPostThread,
  type BettermodePost,
} from '../lib/bettermode.js';
import {
  dismissQueueItem,
  getDraftStatusByPostId,
  listRecentApprovedDrafts,
  listResponseQueue,
  saveAgentDraft,
} from '../lib/store.js';

export type McpEnv = {
  DB: D1Database;
  BETTERMODE_GRAPHQL_ENDPOINT?: string;
  BETTERMODE_DEFAULT_NETWORK_ID?: string;
  BETTERMODE_MARKETPLACE_SPACE_ID?: string;
  BETTERMODE_CLIENT_ID?: string;
  BETTERMODE_CLIENT_SECRET?: string;
  AIRTABLE_API_BASE?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_CREATORS_TABLE?: string;
  AIRTABLE_ASSETS_TABLE?: string;
  AIRTABLE_CREATORS_EMAIL_FIELD?: string;
  AIRTABLE_CREATORS_ASSETS_LINK_FIELD?: string;
};

export function registerCreatorTools(server: McpServer, env: McpEnv): void {
  server.tool(
    'fetch_post_thread',
    [
      'Fetch a Marketplace Creator post by Bettermode post ID and return the full post body,',
      'reply thread with nested replies (oldest first), post author (member), space ID,',
      'and parent post (for replies).',
      'Use this to ground the drafted admin reply in what the creator and prior',
      'replies have actually said. The marketplace_space_id field is the Bettermode',
      'space for /marketplace-creators; if the post is in a different space,',
      'in_marketplace_space is false and the agent should not draft for it.',
    ].join(' '),
    { post_id: z.string().min(1).describe('Bettermode post ID') },
    async ({ post_id }) => {
      const auth = bettermodeAuth(env);
      const networkId = env.BETTERMODE_DEFAULT_NETWORK_ID;
      if (!networkId) throw new Error('BETTERMODE_DEFAULT_NETWORK_ID not configured');
      const token = await appAccessToken(networkId, auth);
      const post = await fetchPostThread(post_id, token, auth);
      const body = post ? shapePost(post, env.BETTERMODE_MARKETPLACE_SPACE_ID) : { found: false };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(body, null, 2) }],
      };
    },
  );

  server.tool(
    'get_creator_context',
    [
      'Look up a Webflow Marketplace Creator by email in the canonical Airtable',
      'Creators base, and return their record plus linked Assets/templates.',
      'Use this to enrich the drafted admin reply with creator-specific context',
      '(submitted templates, status, etc.). Returns null when no record matches',
      "the email; the agent should still draft, just without creator context.",
    ].join(' '),
    { email: z.string().min(1).describe('Author email from Bettermode profile') },
    async ({ email }) => {
      const config = airtableConfig(env);
      if (!config) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ configured: false }) }],
        };
      }
      const context = await fetchCreatorContext(email, config);
      const body = context
        ? {
            configured: true,
            found: true,
            creator: {
              id: context.creator.id,
              name: context.creator.name ?? null,
              email: context.creator.email ?? null,
            },
            assets: context.assets.map((asset) => ({
              id: asset.id,
              name: asset.name ?? null,
              status: pickString(asset.fields, ['Status', 'Approval Status', 'Marketplace Status']),
              slug: pickString(asset.fields, ['Slug', 'URL Slug']),
            })),
          }
        : { configured: true, found: false };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(body, null, 2) }],
      };
    },
  );

  server.tool(
    'list_recent_approved_drafts',
    [
      'Return the most recent admin replies that were drafted, approved, and sent',
      'to Bettermode via this agent. Use these as few-shot voice examples when',
      'drafting a new reply: tone, brevity, structure, and what kinds of next',
      "steps the team has previously offered.",
    ].join(' '),
    {
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(5)
        .describe('How many examples to return; default 5, max 20'),
    },
    async ({ limit }) => {
      const samples = await listRecentApprovedDrafts(env.DB, limit);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ samples }, null, 2) }],
      };
    },
  );

  server.tool(
    'get_draft_status',
    [
      'Audit lookup: return whether a draft already exists for a Bettermode post,',
      'its current status (pending / approved / sent / rejected / expired), the',
      'first 240 chars of the draft, and when it was created. Use to avoid',
      'double-drafting on retried webhook events.',
    ].join(' '),
    { post_id: z.string().min(1).describe('Bettermode post ID') },
    async ({ post_id }) => {
      const status = await getDraftStatusByPostId(env.DB, post_id);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(status, null, 2) }],
      };
    },
  );

  server.tool(
    'list_response_queue',
    [
      'List Marketplace Creator threads where a creator spoke last and no staff',
      'reply followed, longest wait first. Each item has the thread post_id, URL,',
      'title, hours_waiting, who is waiting, the current draft if one exists, and',
      'last_error when automatic drafting failed. status is "new" (no current',
      'draft) or "queued" (draft ready for admin review). Call fetch_post_thread',
      'with post_id for the full thread before you write or change a draft.',
    ].join(' '),
    {
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20)
        .describe('How many items to return; default 20, max 50'),
    },
    async ({ limit }) => {
      const items = await listResponseQueue(env.DB, limit);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify({ count: items.length, items }, null, 2) },
        ],
      };
    },
  );

  server.tool(
    'save_draft',
    [
      'Save a reply draft for an open queue item. It replaces the current draft.',
      'The draft is internal: an admin reviews, edits, and sends it from the post',
      'page in Bettermode. This tool does not post to the community. Use plain',
      'text with blank lines between paragraphs. post_id is the thread post_id',
      'from list_response_queue.',
    ].join(' '),
    {
      post_id: z.string().min(1).describe('Thread post ID from list_response_queue'),
      draft: z.string().min(1).max(6000).describe('Reply text for the admin to review'),
      reasoning: z
        .string()
        .max(2000)
        .optional()
        .describe('Short note for the admin: sources used and what to verify before sending'),
    },
    async ({ post_id, draft, reasoning }) => {
      const result = await saveAgentDraft(env.DB, post_id, draft, reasoning ?? null);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    'dismiss_queue_item',
    [
      'Close an open queue item that needs no staff reply, for example a creator',
      'who only said thanks. It rejects the open draft. A creator message after',
      'the dismissal reopens the item. Give the reason in one sentence.',
    ].join(' '),
    {
      post_id: z.string().min(1).describe('Thread post ID from list_response_queue'),
      reason: z.string().min(1).max(500).describe('Why no reply is needed'),
    },
    async ({ post_id, reason }) => {
      const result = await dismissQueueItem(env.DB, post_id, reason);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}

function shapePost(
  post: BettermodePost,
  marketplaceSpaceId: string | undefined,
): Record<string, unknown> {
  const author = post.owner || post.createdBy;
  return {
    found: true,
    id: post.id,
    title: post.title ?? null,
    url: post.url ?? null,
    published_at: post.publishedAt ?? null,
    is_top_level: !post.parentId,
    parent_post_id: post.parentId ?? null,
    space: post.space
      ? { id: post.space.id, name: post.space.name ?? null, slug: post.space.slug ?? null }
      : null,
    in_marketplace_space:
      !!marketplaceSpaceId && (post.spaceId === marketplaceSpaceId || post.space?.id === marketplaceSpaceId),
    body_text: bodyText(post),
    author: author
      ? {
          id: author.id,
          name: author.name ?? null,
          username: author.username ?? null,
          email: author.email ?? null,
          role: author.role?.name ?? null,
        }
      : null,
    replies: flattenReplies(post).map((reply) => ({
      id: reply.id,
      parent_post_id: reply.parentId ?? null,
      status: reply.status ?? null,
      url: reply.url ?? null,
      published_at: reply.publishedAt ?? null,
      author: {
        id: reply.createdBy?.id ?? null,
        name: reply.createdBy?.name ?? null,
        username: reply.createdBy?.username ?? null,
      },
      body_text: bodyText(reply),
    })),
  };
}

// Direct replies and their nested replies, oldest first.
function flattenReplies(post: BettermodePost): BettermodePost[] {
  const flat: BettermodePost[] = [];
  for (const reply of post.replies?.nodes ?? []) {
    flat.push(reply, ...(reply.replies?.nodes ?? []));
  }
  return flat.sort((a, b) =>
    (a.createdAt || a.publishedAt || '').localeCompare(b.createdAt || b.publishedAt || ''),
  );
}

// shortContent and description are truncated previews; textContent is the full body.
function bodyText(post: BettermodePost): string {
  return post.textContent?.trim() || stripHtml(post.shortContent || post.description || '');
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>(?!\n)/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pickString(
  fields: Record<string, unknown>,
  names: string[],
): string | null {
  // Exact-name match first.
  for (const name of names) {
    const s = coerceFieldToString(fields[name]);
    if (s) return s;
  }
  // Fallback: case-insensitive substring match ignoring non-alphanumerics
  // so "Status" matches Airtable fields like "🥞CMS Status".
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targets = names.map(norm).filter(Boolean);
  if (targets.length === 0) return null;
  for (const [key, value] of Object.entries(fields)) {
    const nk = norm(key);
    if (!targets.some((t) => nk.includes(t))) continue;
    const s = coerceFieldToString(value);
    if (s) return s;
  }
  return null;
}

function coerceFieldToString(value: unknown): string | null {
  if (typeof value === 'string') {
    const t = value.trim();
    return t || null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const s = coerceFieldToString(item);
      if (s) return s;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const candidate = obj.name ?? obj.email ?? obj.text;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}
