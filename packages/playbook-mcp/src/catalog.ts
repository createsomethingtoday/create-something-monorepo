/**
 * MCP Server Catalog — Registry of known MCP servers.
 *
 * Used by the installation tools to list available servers and generate
 * config entries. Includes CREATE SOMETHING ecosystem, WORKWAY vertical,
 * and common third-party servers.
 */

import { REGISTRY_CATALOG_ENTRIES } from './catalog.registry.generated.js';
import type { McpCatalogEntry } from './catalog-types.js';

export type { McpCatalogEntry } from './catalog-types.js';

const CATALOG_OVERRIDES: Record<
  string,
  Partial<Pick<McpCatalogEntry, 'description' | 'setupNotes' | 'authType'>>
> = {
  playbook: {
    description:
      'Host workflow playbooks for MCP onboarding. Teaches non-technical users how to work effectively in Codex, Cursor, and Claude Desktop.',
  },
  'three-tier-framework': {
    description:
      'The Three-Tier Framework (Database, Automation, Judgment) as an MCP server. Classification, debugging heuristics, and architecture analysis.',
  },
  'create-something': {
    description:
      'Single entry point to philosophy, research, design system, and practices across all CREATE SOMETHING properties.',
  },
  schedule: {
    description:
      'Shared scheduling with backfill/forecast. Universal AI client access for calendar and scheduling operations.',
  },
  substrate: {
    description:
      'Agent-native data layer. MCP-managed workspaces where teams interact through agents, not UI. 22 tools, 8 resources, 5 prompts. Bearer token auth with admin/editor/reader roles.',
    authType: 'bearer',
    setupNotes: `**Bootstrap**: First connection without tokens grants admin access. Use \`create_token\` to create your first token, then add \`Authorization: Bearer <token>\` to config.

**Roles**: admin (full + token management), editor (CRUD), reader (read-only).

**Quick start**: After connecting, use the \`getting_started\` prompt or call \`list_workspaces\` to begin.

**Dashboard**: Each workspace has a shareable read-only view at \`/dashboard/{workspace_id}\`.

**Reader endpoint**: \`/reader/mcp\` for read-only access (4 tools: find_records, list_workspaces, get_record, upvote_content).`,
  },
  outerfields: {
    description:
      'Remote MCP server for OUTERFIELDS Premium Content Network. Stateless Streamable HTTP on Cloudflare Workers.',
  },
  'quickbooks-notion': {
    description:
      'Read-only MCP server connecting QuickBooks Online data to Notion databases. Financial data access for AI agents. Supports multiple QuickBooks companies simultaneously.',
    authType: 'oauth',
    setupNotes: `**Multi-connection**: Multiple QuickBooks companies can be connected simultaneously. Each user authenticates independently — no need to disconnect others.

**First-time setup** (2 steps):
1. **Authorize**: The agent provides an OAuth link. Click it, sign in to QuickBooks, and authorize the WORKWAY app.
2. **Provide your Company ID**: In QuickBooks Online, press \`Ctrl+Alt+?\` (Windows) or \`Control+Option+?\` (Mac). A dialog shows "Your Company ID is XXXX XXXX XXXX XXXX" with a Copy button. Paste it back to the agent. Alternatively: Gear icon > Account and Settings > Billing & Subscription — Company ID is at the top. **[Video walkthrough](https://share.descript.com/view/67jew4dxSbU)** for visual learners.

The agent handles the rest — your connection is stored and all QBO tools work immediately.

**Switching connections**: Pass \`connection="{companyId}"\` to any QBO tool to query a specific company. Use \`qbo_list_connections\` to see all connected companies.

**Disconnecting**: Use \`qbo_disconnect\` to remove a connection. Also revoke the app in your Intuit account settings.`,
  },
  'youtube-sync': {
    description:
      'YouTube playlist transcript extraction and Notion sync. Pull video transcripts and metadata into your workspace.',
  },
  'gmail-sync': {
    description:
      'Gmail to Notion sync for interactions and contacts linking. Email data accessible to AI agents.',
  },
  'zoom-sync': {
    description:
      'Zoom Clips to Notion sync (browser automation) plus optional Zoom API tools (meetings, recordings, webinars via Composio). Two auth surfaces: Clips = session context; Zoom API = Composio connect. Codex-ready (Streamable HTTP /mcp).',
    setupNotes: `**Two auth surfaces** (independent):

1. **Zoom Clips** (sync_clips, extract_clip, search_clips): Use \`get_session_status\`; if not connected, run \`npx tsx watch-session.ts\` locally, log into Zoom in Steel Live View, then \`upload_session_context\` with the captured JSON.

2. **Zoom API** (zoom_api_* tools, when server has Composio configured): Use \`zoom_api_connection_status\`; if not connected, call \`zoom_api_get_connect_link\` and present the URL to the user.

Health: \`GET /\` returns \`auth_surfaces\` with tools per surface.`,
  },
};

const INTERNAL_MCPS: McpCatalogEntry[] = REGISTRY_CATALOG_ENTRIES.map((entry) => {
  const override = CATALOG_OVERRIDES[entry.slug];
  return {
    ...entry,
    transports: [...entry.transports],
    ...override,
    description: override?.description ?? entry.description,
  };
});

// ============================================================================
// Third-Party (Common Public MCPs)
// ============================================================================

const THIRD_PARTY_MCPS: McpCatalogEntry[] = [
  {
    name: 'Cloudflare Docs',
    slug: 'cloudflare-docs',
    url: 'https://docs.mcp.cloudflare.com',
    description: 'Search and access Cloudflare documentation. Workers, Pages, D1, KV, Durable Objects, and more.',
    category: 'third-party',
    transports: ['http'],
    requiresAuth: false,
  },
  {
    name: 'Cloudflare Workers Bindings',
    slug: 'cloudflare-bindings',
    url: 'https://bindings.mcp.cloudflare.com',
    description: 'Manage Cloudflare Workers bindings. KV, D1, R2, Queues, and Durable Object configuration.',
    category: 'third-party',
    transports: ['http'],
    requiresAuth: true,
  },
  {
    name: 'Cloudflare Agents SDK',
    slug: 'cloudflare-agents',
    url: 'https://agents.cloudflare.com',
    description: 'Cloudflare Agents SDK documentation and tools. Build AI agents on Cloudflare Workers.',
    category: 'third-party',
    transports: ['http'],
    requiresAuth: false,
  },
  {
    name: 'Webflow',
    slug: 'webflow',
    url: 'https://mcp.webflow.com',
    description:
      'Official Webflow hosted MCP server. OAuth-authorized access to sites, Workspaces, CMS collections, and Designer workflows through the Webflow MCP Bridge App.',
    category: 'third-party',
    transports: ['http'],
    requiresAuth: true,
    authType: 'oauth',
    setupNotes: `**Authorization**: First connection opens Webflow OAuth. Select only the sites or Workspaces this agent should access.

**Designer access**: To let the agent work in the Designer, open the site in Webflow Designer, press \`E\` for Apps, launch "Webflow MCP Bridge App", and wait for it to connect.

**Claude Code**: \`claude mcp add --transport http webflow https://mcp.webflow.com/mcp\`

**Claude Desktop manual setup**: If direct remote HTTP is unavailable, use \`npx mcp-remote https://mcp.webflow.com/mcp\`. The \`mcp-remote\` path requires Node.js 22.3.0 or later.

**Starter prompts**: "List all my collections and show me their field structures", "Audit my site for broken links, missing alt text, and incomplete meta descriptions", or "Create a responsive hero section with a headline, description, and CTA button".`,
  },
  {
    name: 'Stripe',
    slug: 'stripe',
    url: 'https://mcp.stripe.com',
    description: 'Stripe payment data and operations. Access customers, subscriptions, invoices, and payment methods.',
    category: 'third-party',
    transports: ['http'],
    requiresAuth: true,
  },
];

export const MCP_CATALOG: McpCatalogEntry[] = [
  ...INTERNAL_MCPS,
  ...THIRD_PARTY_MCPS,
];

export function getCatalogByCategory(category?: string): McpCatalogEntry[] {
  if (!category || category === 'all') return MCP_CATALOG;
  return MCP_CATALOG.filter((entry) => entry.category === category);
}

export function getCatalogEntry(slug: string): McpCatalogEntry | undefined {
  return MCP_CATALOG.find((entry) => entry.slug === slug);
}
