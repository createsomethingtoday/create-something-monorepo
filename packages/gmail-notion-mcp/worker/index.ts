/**
 * Gmail → Notion MCP — Cloudflare Worker (Composio-backed)
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP transport
 *   /     — Health/info JSON
 *
 * Identity: send X-MCP-Account-Id or Authorization: Bearer <accountId> for multi-user metering.
 * Pricing: 100 free runs/period, then 1¢/run (1 run = 1 tool call).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { ComposioToolFactory } from '@create-something/composio-bridge';
import { enableTelemetry } from '@create-something/mcp-core';
import { registerAuthTools } from '../src/tools/auth.js';
import { incrementRun, getUsage } from '../src/metering.js';
import { normalizeAccountId } from '../src/identity.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  COMPOSIO_API_KEY: string;
  COMPOSIO_GMAIL_AUTH_CONFIG_ID?: string;
  COMPOSIO_NOTION_AUTH_CONFIG_ID?: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;
  /** D1 for run metering (100 free, then 1¢/run). Create with wrangler d1 create gmail-notion-mcp-runs */
  RUNS_DB?: D1Database;
}

const DEFAULT_LANGFUSE_PROJECT_NAME = 'CREATE SOMETHING';

function resolveLangfuseProjectName(env: { LANGFUSE_PROJECT_NAME?: string }): string {
  const configured = env.LANGFUSE_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_LANGFUSE_PROJECT_NAME;
}

// =============================================================================
// MCP Agent
// =============================================================================

export class GmailNotionMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'gmail-notion-mcp',
    version: '0.1.0',
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjRkZGIiBzdHJva2U9IiM2NjYiLz48cGF0aCBkPSJNNiAxMGg0djRINlYxMHptMCA2aDR2NEg2di00em0xMC02aDR2NGgtNHYtNHptMCA2aDR2NGgtNHYtNHoiIGZpbGw9IiM2NjYiLz48L3N2Zz4=',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
  });

  /** Set in fetch() from X-MCP-Account-Id or Authorization Bearer; used for Composio entityId and metering. */
  private currentAccountId = 'default';

  override async fetch(request: Request): Promise<Response> {
    this.currentAccountId = normalizeAccountId(this.getAccountIdFromRequest(request));
    return super.fetch(request);
  }

  private getAccountIdFromRequest(request: Request): string | null {
    const accountHeader = request.headers.get('x-mcp-account-id');
    if (accountHeader?.trim()) return accountHeader.trim();
    const auth = request.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) return auth.slice(7).trim() || null;
    return null;
  }

  async init() {
    if (this.env.LANGFUSE_PUBLIC_KEY && this.env.LANGFUSE_SECRET_KEY) {
      enableTelemetry(
        this.server,
        undefined as unknown as D1Database,
        'gmail-notion-mcp',
        () => this.currentAccountId,
        {
          publicKey: this.env.LANGFUSE_PUBLIC_KEY,
          secretKey: this.env.LANGFUSE_SECRET_KEY,
          projectName: resolveLangfuseProjectName(this.env),
        },
      );
    }

    const apiKey = this.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      console.warn('COMPOSIO_API_KEY not set; Gmail/Notion tools will not be registered.');
      this.registerResourcesAndPromptsOnly();
      return;
    }

    const getEntityId = () => this.currentAccountId ?? 'default';

    const factory = new ComposioToolFactory({
      apiKey,
      apps: [
        { app: 'GMAIL', prefix: 'gmail' },
        { app: 'NOTION', prefix: 'notion' },
      ],
    });

    const count = await factory.registerToolsOnMcpServerWithResolver(
      this.server as import('@create-something/composio-bridge').McpServerLike,
      getEntityId,
      async (entityId) => {
        if (!this.env.RUNS_DB) return;
        try {
          await incrementRun(this.env.RUNS_DB, entityId);
        } catch (e) {
          console.warn('Run metering failed (tool call still succeeded):', e);
        }
      },
    );

    registerAuthTools(this.server, {
      composioClient: factory.getClient(),
      composioApiKey: apiKey,
      gmailAuthConfigId: this.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID,
      notionAuthConfigId: this.env.COMPOSIO_NOTION_AUTH_CONFIG_ID,
      getEntityId,
    });

    if (count > 0) {
      console.info(`Registered ${count} Composio tools (gmail_*, notion_*) and auth tools.`);
    }

    this.registerResourcesAndPromptsOnly();
  }

  private registerResourcesAndPromptsOnly() {
    const getEntityId = () => this.currentAccountId ?? 'default';

    // Database tier — Resources
    this.server.resource(
      'sync-config',
      'sync://config',
      { description: 'Sync configuration and connection status', mimeType: 'application/json' },
      async () => ({
        contents: [{
          uri: 'sync://config',
          mimeType: 'application/json',
          text: JSON.stringify({
            entityId: getEntityId(),
            gmailAuthConfigured: Boolean(this.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID),
            notionAuthConfigured: Boolean(this.env.COMPOSIO_NOTION_AUTH_CONFIG_ID),
            composioConfigured: Boolean(this.env.COMPOSIO_API_KEY),
          }, null, 2),
        }],
      }),
    );

    this.server.resource(
      'usage',
      'usage://self',
      { description: 'Run usage and pricing for the current account (100 free, then 1¢/run)', mimeType: 'application/json' },
      async () => {
        const accountId = getEntityId();
        const usage = this.env.RUNS_DB
          ? await getUsage(this.env.RUNS_DB, accountId)
          : { accountId, period: '', runsThisPeriod: 0, freeRuns: 0, billableRuns: 0, limit: 100 };
        return {
          contents: [{
            uri: 'usage://self',
            mimeType: 'application/json',
            text: JSON.stringify(usage, null, 2),
          }],
        };
      },
    );

    // Judgment tier — Prompts
    this.server.prompt(
      'capabilities',
      'What this Gmail–Notion MCP can do and how to connect',
      () => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `You are connected to the Gmail–Notion MCP (Composio-backed).

## Connecting
- Use gmail_connection_status and notion_connection_status to check if the user has connected their accounts.
- If not connected, use gmail_get_connect_link or notion_get_connect_link and present the URL to the user.
- After they authorize, check connection_status again.

## Tools
- gmail_* — Search, read, send emails (Gmail toolkit).
- notion_* — Create pages, query databases, update blocks (Notion toolkit).
- Use these to sync emails to Notion, find or create contacts, and build workflows.

## Tips
- Gmail search: from:, to:, subject:, after:, before:, label:, has:attachment.
- Notion: you need database IDs or page IDs from the user or from previous tool results.`,
          },
        }],
      }),
    );

    this.server.prompt(
      'sync_workflow',
      'Guided workflow: find emails and sync to Notion',
      () => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Help me sync emails to Notion. Steps:
1. Use gmail_connection_status and notion_connection_status; if either is disconnected, get the connect link and have the user authorize.
2. Ask what emails to sync (e.g. from a sender, a label, or a date range).
3. Use gmail_* search/list tools to find the emails.
4. Use notion_* tools to create pages or database rows (user must provide or you discover the target database ID).
5. Summarize what was synced.`,
          },
        }],
      }),
    );

    // Domain-expertise Prompts (Judgment tier)

    this.server.prompt(
      'client_onboarding_catchup',
      'Onboard a new client: sync all emails from their domain, create contacts, and link to a company page in Notion',
      () => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `You are helping onboard a new client by syncing their email history into Notion. Follow this workflow:

## Step 1: Verify Connections
- Check gmail_connection_status and notion_connection_status.
- If either is disconnected, get the connect link and have the user authorize.

## Step 2: Identify the Client Domain
- Ask the user for the client's email domain (e.g., "acme.com").
- Search Gmail for all emails from/to that domain: \`from:@acme.com OR to:@acme.com\`.

## Step 3: Extract Contacts
- From the email results, build a list of unique contacts (name + email).
- For each contact, check if they already exist in the user's Notion contacts database.
- Create new contact pages for any that don't exist yet.

## Step 4: Create Company Page
- Ask the user for their Notion workspace's companies database ID (or help them find it).
- Create a company page with: name, domain, primary contacts (linked), first interaction date, total email count.

## Step 5: Sync Key Emails
- Sync the most recent 20 emails as Notion pages linked to the company.
- For each email, capture: subject, date, from, to, snippet/summary.
- Link each email page to the relevant contact(s).

## Step 6: Summary
- Report: contacts created, company page created, emails synced.
- Suggest next steps: set up ongoing sync, add labels in Gmail for auto-categorization.

## Tips
- Gmail search operators: \`from:@domain.com\`, \`to:@domain.com\`, \`after:2025/01/01\`.
- When creating Notion pages, match the user's existing database schema — ask about required properties.
- If the contacts database doesn't exist yet, offer to help create one with standard fields (Name, Email, Company, Role, Last Contact).`,
          },
        }],
      }),
    );

    this.server.prompt(
      'contact_deduplication',
      'Find and merge duplicate contacts across Gmail and Notion using fuzzy matching',
      () => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `You are helping clean up duplicate contacts between Gmail and Notion. Follow this workflow:

## Step 1: Verify Connections
- Check gmail_connection_status and notion_connection_status.
- If either is disconnected, get the connect link and have the user authorize.

## Step 2: Gather Contacts
- Ask the user for their Notion contacts database ID.
- Query all contacts from Notion (name, email, company fields).
- Search recent Gmail threads to extract sender/recipient contacts.

## Step 3: Identify Duplicates
Look for these duplicate patterns:
- **Exact email match**: Same email in multiple Notion records.
- **Domain + name match**: Same domain and similar first/last name (e.g., "John Smith" and "J. Smith" at acme.com).
- **Alias match**: Gmail "+"-aliases (john+newsletter@acme.com = john@acme.com).
- **Company variants**: Same person appearing under different company name spellings.

## Step 4: Present Candidates
For each duplicate group, present:
- All matching records with their source (Gmail vs Notion).
- Confidence level: HIGH (exact email), MEDIUM (name + domain), LOW (fuzzy name only).
- Recommended merge action: which record to keep as primary, what data to merge.

## Step 5: Execute Merges (with user approval)
- For each approved merge, update the primary Notion record with combined data.
- Archive or delete the duplicate records.
- Log what was merged for audit purposes.

## Step 6: Report
- Total duplicates found, grouped by confidence level.
- Merges completed vs skipped.
- Suggest: periodic re-run schedule (monthly), Gmail label rules to prevent future duplicates.

## Important
- NEVER auto-merge without user confirmation.
- Present duplicates sorted by confidence (HIGH first).
- When in doubt about a match, flag it as LOW confidence and let the user decide.`,
          },
        }],
      }),
    );

    this.server.prompt(
      'interaction_quality_check',
      'Audit email-to-Notion sync quality: find orphaned interactions, missing links, and stale contacts',
      () => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `You are auditing the quality of the user's email-to-Notion sync. The goal is to find gaps, orphaned data, and opportunities for better organization.

## Step 1: Verify Connections
- Check gmail_connection_status and notion_connection_status.

## Step 2: Audit Orphaned Emails
- Query Notion for email/interaction pages that are NOT linked to any contact.
- For each orphan, search Gmail for the sender/recipient email.
- Present matches and suggest which contact to link them to.

## Step 3: Audit Stale Contacts
- Find Notion contacts with no linked interactions in the last 90 days.
- Cross-reference with Gmail: are there recent emails from these contacts that weren't synced?
- Categorize:
  - **Active but unsynced**: Recent Gmail activity, no Notion records → recommend sync.
  - **Truly dormant**: No Gmail activity either → recommend archiving or follow-up.
  - **Missing email**: Contact has no email field → flag for data entry.

## Step 4: Audit Data Completeness
Check contacts for missing fields:
- No company name → search Gmail signatures for company info.
- No role/title → check Gmail signatures.
- No phone number → check Gmail signatures.
- Suggest field updates based on Gmail signature data.

## Step 5: Sync Gap Analysis
- Compare the date range of synced emails in Notion vs actual Gmail history.
- Identify time periods with no synced emails (sync gaps).
- Recommend backfill for important gaps.

## Step 6: Report Card
Present a quality scorecard:
- **Linkage**: X% of interactions linked to contacts (target: >95%).
- **Freshness**: X contacts active in last 90 days (target: varies).
- **Completeness**: X% of contacts have email + company + name (target: >90%).
- **Coverage**: Sync covers X% of email date range (target: >80%).

Recommend specific actions sorted by impact (highest first).`,
          },
        }],
      }),
    );
  }
}

// =============================================================================
// Worker entry
// =============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return GmailNotionMCP.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/') {
      return new Response(
        JSON.stringify(
          {
            name: 'gmail-notion-mcp',
            version: '0.1.0',
            description: 'Gmail to Notion MCP (Composio-backed). Tools, prompts, resources.',
            auth_surfaces: {
              gmail: {
                method: 'composio',
                tools: ['gmail_connection_status', 'gmail_get_connect_link', 'gmail_*'],
              },
              notion: {
                method: 'composio',
                tools: ['notion_connection_status', 'notion_get_connect_link', 'notion_*'],
              },
            },
            identity: 'Send X-MCP-Account-Id or Authorization: Bearer <accountId> for multi-user metering.',
            endpoints: { mcp: '/mcp' },
          },
          null,
          2,
        ),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response('Not found', { status: 404 });
  },
};
