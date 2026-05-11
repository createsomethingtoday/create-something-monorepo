// Tool registration for the Bettermode Marketplace Creator MCP.
//
// Tools exposed:
//   fetch_post_thread          (Bettermode → post body + replies + author)
//   get_creator_context        (Airtable → Creator + linked Assets/templates)
//   list_recent_approved_drafts (D1 → few-shot examples for Dify)
//   get_draft_status           (D1 → audit lookup by post ID)
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
  getDraftStatusByPostId,
  listRecentApprovedDrafts,
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
      'Fetch a Marketplace Creator post by Bettermode post ID and return the post body,',
      'reply thread, post author (member), space ID, and parent post (for replies).',
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
    body_text: stripHtml(post.shortContent || post.description || ''),
    author: author
      ? {
          id: author.id,
          name: author.name ?? null,
          username: author.username ?? null,
          email: author.email ?? null,
          role: author.role?.name ?? null,
        }
      : null,
    replies: (post.replies?.nodes ?? []).map((reply) => ({
      id: reply.id,
      url: reply.url ?? null,
      published_at: reply.publishedAt ?? null,
      author: {
        id: reply.createdBy?.id ?? null,
        name: reply.createdBy?.name ?? null,
        username: reply.createdBy?.username ?? null,
      },
      body_text: stripHtml(reply.shortContent || reply.description || ''),
    })),
  };
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
  for (const name of names) {
    const value = fields[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}
