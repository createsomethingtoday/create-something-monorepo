/**
 * Notion client factory — two workspaces (Half Dozen + client).
 * No Composio; operator-managed tokens only.
 */

import { Client } from '@notionhq/client';

export type Workspace = 'halfdozen' | 'client';

export interface NotionClients {
  halfdozen: Client | null;
  client: Client | null;
  createSomething?: Client | null;
}

/**
 * Wrapper that calls the global fetch. In Cloudflare Workers, fetch must be invoked
 * with the correct this (global scope); passing this to the SDK avoids "Illegal invocation".
 */
const workerFetch: typeof fetch = (input, init) => globalThis.fetch(input, init);

/**
 * Build both Notion clients from env. Either or both may be null if secret is missing.
 */
export function getNotionClients(env: {
  NOTION_API_KEY?: string;
  NOTION_CLIENT_API_KEY?: string;
  NOTION_CREATE_SOMETHING_API_KEY?: string;
}): NotionClients {
  return {
    halfdozen: env.NOTION_API_KEY ? new Client({ auth: env.NOTION_API_KEY, fetch: workerFetch }) : null,
    client: env.NOTION_CLIENT_API_KEY ? new Client({ auth: env.NOTION_CLIENT_API_KEY, fetch: workerFetch }) : null,
    createSomething: env.NOTION_CREATE_SOMETHING_API_KEY
      ? new Client({ auth: env.NOTION_CREATE_SOMETHING_API_KEY, fetch: workerFetch })
      : null,
  };
}

/**
 * Get the client for the given workspace. Throws if that workspace is not configured.
 */
export function getClient(clients: NotionClients, workspace: Workspace): Client {
  const c = workspace === 'halfdozen' ? clients.halfdozen : clients.client;
  if (!c) {
    const secret = workspace === 'halfdozen' ? 'NOTION_API_KEY' : 'NOTION_CLIENT_API_KEY';
    throw new Error(`${secret} is not set; cannot use workspace "${workspace}".`);
  }
  return c;
}
