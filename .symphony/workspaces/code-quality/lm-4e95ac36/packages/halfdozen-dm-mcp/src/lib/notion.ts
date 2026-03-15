/**
 * Notion client factory — single workspace for DM client.
 * No Composio; operator-managed token only.
 */

import { Client } from '@notionhq/client';

/**
 * Wrapper that calls the global fetch. In Cloudflare Workers, fetch must be invoked
 * with the correct this (global scope); passing this to the SDK avoids "Illegal invocation".
 */
const workerFetch: typeof fetch = (input, init) => globalThis.fetch(input, init);

export function getNotionClient(env: { NOTION_API_KEY?: string }): Client | null {
  return env.NOTION_API_KEY ? new Client({ auth: env.NOTION_API_KEY, fetch: workerFetch }) : null;
}

export function requireNotionClient(client: Client | null): Client {
  if (!client) {
    throw new Error('NOTION_API_KEY is not set; Notion tools are unavailable.');
  }
  return client;
}
