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
  {
    name: 'Notion Sync',
    slug: 'notion-sync',
    url: 'https://notion-sync-mcp-worker.createsomething.workers.dev',
    description: 'Two-way issue tracking for consultants who work across client Notion workspaces. Keep one central Issues database in your workspace synced with each client\'s database in theirs. Changes flow both ways, conflicts resolve automatically, background sync every 15 minutes.',
    category: 'create-something',
    transports: ['http'],
    requiresAuth: true,
    authType: 'bearer',
    setupNotes: `**API key required**: You will receive a Bearer token from CREATE SOMETHING. Add it to your config as shown below.

**After connecting**, use the \`client_onboarding\` prompt — the agent walks through everything step by step.

**Who this is for**: Consultants, agencies, and freelancers who manage projects across multiple client Notion workspaces. You track all issues in your own central database, and each client sees only their issues in their own workspace — kept in sync automatically.

**What you need ready** (for each client you connect):

1. **Your workspace** (the consultant's central hub)
   - A Notion integration token for your workspace (you likely already have one)
   - Your master Issues database ID (the 32-char string from the Notion URL)
   - A property in that database that tags which client an issue belongs to (e.g., a "Client" select property)

2. **The client's workspace**
   - A Notion integration token with access to the client's workspace (your client adds your integration, or you create one if you're an admin/member)
   - The client's Issues database ID in their workspace

**Creating a Notion integration** (if you don't have one):
- Go to notion.so/profile/integrations > New integration
- Name it (e.g., "Issue Sync"), select the workspace, copy the token (starts with \`ntn_\`)
- For each database: open it > ••• > Connections > add the integration

**How it works**:
- Register each client with both database IDs, tokens, and which properties to sync
- Run \`notion_sync_issues\` with \`dry_run: true\` to preview before the first real sync
- After that, issues sync bidirectionally every 15 minutes — no action needed
- You create an issue tagged "Acme Corp" in your database → it appears in Acme's database
- Acme updates the status in their database → your central database reflects the change
- Use \`sync://status\` or \`sync://client/{name}\` to check sync health anytime

**Multiple clients**: Register each client separately. Your central database holds everything; each client only sees their filtered issues. Add new clients anytime with the same onboarding flow.`,
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
2. **Provide your Company ID**: In QuickBooks Online, press \`Ctrl+Alt+?\` (Windows) or \`Control+Option+?\` (Mac). A dialog shows "Your Company ID is XXXX XXXX XXXX XXXX" with a Copy button. Paste it back to the agent. Alternatively: Gear icon > Account and Settings > Billing & Subscription — Company ID is at the top. **[Video walkthrough](https://share.descript.com/view/67jew4dxSbU)** for visual learners.

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
