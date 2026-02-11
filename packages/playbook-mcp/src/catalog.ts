/**
 * MCP Server Catalog — Registry of known MCP servers.
 *
 * Used by the installation tools to list available servers and generate
 * config entries. Includes CREATE SOMETHING ecosystem, WORKWAY vertical,
 * and common third-party servers.
 */

// ============================================================================
// Types
// ============================================================================

export interface McpCatalogEntry {
  name: string;
  slug: string;
  url: string;
  description: string;
  category: 'create-something' | 'workway' | 'third-party';
  transports: ('http' | 'sse')[];
  requiresAuth: boolean;
  /** Auth type hint for config generation. Default: 'bearer' if requiresAuth. */
  authType?: 'bearer' | 'oauth';
  /** Setup notes shown when listing or installing. Markdown-formatted. */
  setupNotes?: string;
}

// ============================================================================
// CREATE SOMETHING Ecosystem
// ============================================================================

const CREATE_SOMETHING_MCPS: McpCatalogEntry[] = [
  {
    name: 'Playbook',
    slug: 'playbook',
    url: 'https://playbook.mcp.createsomething.ltd',
    description: 'Host workflow playbooks for MCP onboarding. Teaches non-technical users how to work effectively in Codex, Cursor, and Claude Desktop.',
    category: 'create-something',
    transports: ['http', 'sse'],
    requiresAuth: false,
  },
  {
    name: 'Three-Tier Framework',
    slug: 'three-tier-framework',
    url: 'https://framework.mcp.createsomething.agency',
    description: 'The Three-Tier Framework (Database, Automation, Judgment) as an MCP server. Classification, debugging heuristics, and architecture analysis.',
    category: 'create-something',
    transports: ['http', 'sse'],
    requiresAuth: false,
  },
  {
    name: 'CREATE SOMETHING Content',
    slug: 'create-something',
    url: 'https://mcp.createsomething.ltd',
    description: 'Single entry point to philosophy, research, design system, and practices across all CREATE SOMETHING properties.',
    category: 'create-something',
    transports: ['http', 'sse'],
    requiresAuth: false,
  },
  {
    name: 'Schedule',
    slug: 'schedule',
    url: 'https://schedule.mcp.createsomething.agency',
    description: 'Shared scheduling with backfill/forecast. Universal AI client access for calendar and scheduling operations.',
    category: 'create-something',
    transports: ['http', 'sse'],
    requiresAuth: false,
  },
  {
    name: 'Substrate',
    slug: 'substrate',
    url: 'https://substrate.mcp.createsomething.agency',
    description: 'Agent-native data layer. MCP-managed workspaces where teams interact through agents, not UI. 22 tools, 8 resources, 5 prompts. Bearer token auth with admin/editor/reader roles.',
    category: 'create-something',
    transports: ['http', 'sse'],
    requiresAuth: true,
    authType: 'bearer',
    setupNotes: `**Bootstrap**: First connection without tokens grants admin access. Use \`create_token\` to create your first token, then add \`Authorization: Bearer <token>\` to config.

**Roles**: admin (full + token management), editor (CRUD), reader (read-only).

**Quick start**: After connecting, use the \`getting_started\` prompt or call \`list_workspaces\` to begin.

**Dashboard**: Each workspace has a shareable read-only view at \`/dashboard/{workspace_id}\`.

**Reader endpoint**: \`/reader/mcp\` for read-only access (4 tools: find_records, list_workspaces, get_record, upvote_content).`,
  },
  {
    name: 'Outerfields PCN',
    slug: 'outerfields',
    url: 'https://outerfields.mcp.createsomething.agency',
    description: 'Remote MCP server for OUTERFIELDS Premium Content Network. Stateless Streamable HTTP on Cloudflare Workers.',
    category: 'create-something',
    transports: ['http', 'sse'],
    requiresAuth: false,
  },
];

// ============================================================================
// WORKWAY Vertical (Construction)
// ============================================================================

const WORKWAY_MCPS: McpCatalogEntry[] = [
  {
    name: 'QuickBooks Notion Sync',
    slug: 'quickbooks-notion',
    url: 'https://quickbooks.mcp.workway.co',
    description: 'Read-only MCP server connecting QuickBooks Online data to Notion databases. Financial data access for AI agents. Supports multiple QuickBooks companies simultaneously.',
    category: 'workway',
    transports: ['http', 'sse'],
    requiresAuth: true,
    authType: 'oauth',
    setupNotes: `**Multi-connection**: Multiple QuickBooks companies can be connected simultaneously. Each user authenticates independently — no need to disconnect others.

**First-time setup** (2 steps):
1. **Authorize**: The agent provides an OAuth link. Click it, sign in to QuickBooks, and authorize the WORKWAY app.
2. **Provide your Company ID**: In QuickBooks Online, press \`Ctrl+Alt+?\` (Windows) or \`Control+Option+?\` (Mac). A dialog shows "Your Company ID is XXXX XXXX XXXX XXXX" with a Copy button. Paste it back to the agent. Alternatively: Gear icon > Account and Settings > Billing & Subscription — Company ID is at the top.

The agent handles the rest — your connection is stored and all QBO tools work immediately.

**Switching connections**: Pass \`connection="{companyId}"\` to any QBO tool to query a specific company. Use \`qbo_list_connections\` to see all connected companies.

**Disconnecting**: Use \`qbo_disconnect\` to remove a connection. Also revoke the app in your Intuit account settings.`,
  },
  {
    name: 'YouTube Sync',
    slug: 'youtube-sync',
    url: 'https://youtube.mcp.workway.co',
    description: 'YouTube playlist transcript extraction and Notion sync. Pull video transcripts and metadata into your workspace.',
    category: 'workway',
    transports: ['http', 'sse'],
    requiresAuth: true,
  },
  {
    name: 'Gmail Sync',
    slug: 'gmail-sync',
    url: 'https://gmail.mcp.workway.co',
    description: 'Gmail to Notion sync for interactions and contacts linking. Email data accessible to AI agents.',
    category: 'workway',
    transports: ['http', 'sse'],
    requiresAuth: true,
  },
  {
    name: 'Zoom Sync',
    slug: 'zoom-sync',
    url: 'https://zoom.mcp.workway.co',
    description: 'Zoom Clips to Notion sync with browser automation. Meeting recordings and clips accessible to AI agents.',
    category: 'workway',
    transports: ['http', 'sse'],
    requiresAuth: true,
  },
];

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
    description: 'Webflow site management. Read and modify site content, collections, and design elements.',
    category: 'third-party',
    transports: ['http'],
    requiresAuth: true,
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

// ============================================================================
// Combined Catalog
// ============================================================================

export const MCP_CATALOG: McpCatalogEntry[] = [
  ...CREATE_SOMETHING_MCPS,
  ...WORKWAY_MCPS,
  ...THIRD_PARTY_MCPS,
];

export function getCatalogByCategory(category?: string): McpCatalogEntry[] {
  if (!category || category === 'all') return MCP_CATALOG;
  return MCP_CATALOG.filter(e => e.category === category);
}

export function getCatalogEntry(slug: string): McpCatalogEntry | undefined {
  return MCP_CATALOG.find(e => e.slug === slug);
}
