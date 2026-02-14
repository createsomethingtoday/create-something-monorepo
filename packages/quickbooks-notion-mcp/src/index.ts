import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(import.meta.dirname, "../.env") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer as createHttpServer } from "node:http";
import { z } from "zod";

import { createAuthManagerFromEnv } from "./services/auth.js";
import { createQBOClient } from "./services/quickbooks.js";
import { createNotionClientFromEnv } from "./services/notion.js";
import { registerQuickBooksTools } from "./tools/quickbooks.js";
import { registerNotionTools } from "./tools/notion.js";
import { runAuthSetup } from "./auth-setup.js";
import { logger } from "./services/logger.js";

// ── CLI: Auth Setup ─────────────────────────────────────────────────

const command = process.argv[2];
if (command === "auth") {
  runAuthSetup()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error("Auth setup failed", { error: String(error) });
      process.exit(1);
    });
} else {
  // ── MCP Server ──────────────────────────────────────────────────

  startServer().catch((error) => {
    logger.error("Server error", { error: String(error) });
    process.exit(1);
  });
}

/**
 * Create and configure the MCP server with all tools.
 * Factory pattern: returns a new instance per request for HTTP mode (MCP SDK 1.26+ requirement).
 */
function createMcpServer(
  authManager: Awaited<ReturnType<typeof createAuthManagerFromEnv>>,
  realmId: string,
  sandbox: boolean,
) {
  const server = new McpServer({
    name: "quickbooks-notion-mcp-server",
    version: "2.0.0",
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTEyIDd2MTQiLz48cGF0aCBkPSJNMyAxOGExIDEgMCAwIDEtMS0xVjRhMSAxIDAgMCAxIDEtMWg1YTQgNCAwIDAgMSA0IDQgNCA0IDAgMCAxIDQtNGg1YTEgMSAwIDAgMSAxIDF2MTNhMSAxIDAgMCAxLTEgMWgtNmEzIDMgMCAwIDAtMyAzIDMgMyAwIDAgMC0zLTN6Ii8+PC9nPjwvc3ZnPg==',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
  });

  const qbo = createQBOClient(authManager, realmId, sandbox);
  const notion = createNotionClientFromEnv();

  // Wrap single-user client in getClient closure (local mode — no multi-connection)
  const getClient = async () => qbo;
  registerQuickBooksTools(server, getClient);
  registerNotionTools(server, getClient, notion);

  // ── Database Tier — Resources (read-only data) ──────────────────

  server.resource(
    'qbo-company-info',
    'qbo://company',
    { description: 'QuickBooks Online company information and configuration', mimeType: 'application/json' },
    async () => {
      try {
        const info = await qbo.getCompanyInfo();
        return {
          contents: [{
            uri: 'qbo://company',
            mimeType: 'application/json',
            text: JSON.stringify(info, null, 2),
          }],
        };
      } catch {
        return {
          contents: [{
            uri: 'qbo://company',
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'Failed to fetch company info. Check QuickBooks OAuth tokens.' }),
          }],
        };
      }
    },
  );

  server.resource(
    'server-capabilities',
    'server://capabilities',
    { description: 'Available tools, their descriptions, and supported QuickBooks entities', mimeType: 'application/json' },
    async () => ({
      contents: [{
        uri: 'server://capabilities',
        mimeType: 'application/json',
        text: JSON.stringify({
          mode: 'read-only',
          quickbooks_entities: ['Customer', 'Invoice', 'Payment', 'Estimate', 'Bill', 'Vendor', 'Item', 'Account', 'Employee', 'PurchaseOrder'],
          reports: ['ProfitAndLoss', 'BalanceSheet', 'CashFlow', 'CustomerBalance', 'VendorBalance', 'AgedReceivables', 'AgedPayables'],
          notion_integration: true,
        }, null, 2),
      }],
    }),
  );

  // ── Judgment Tier — Prompts (reusable interaction templates) ─────

  server.prompt(
    'financial_review',
    'Review QuickBooks financial data for a specific period. Analyzes P&L, balance sheet, and cash flow.',
    { period: z.string().describe('Time period to review (e.g., "Q4 2025", "January 2026", "last 90 days")') },
    async ({ period }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Run a financial review for ${period}. Pull the Profit & Loss, Balance Sheet, and Cash Flow reports. Summarize key metrics: revenue, expenses, net income, cash position, and any notable changes or concerns.`,
        },
      }],
    }),
  );

  server.prompt(
    'sync_to_notion',
    'Sync QuickBooks data to Notion databases for the team to review.',
    { entity_type: z.string().describe('What to sync (e.g., "invoices", "customers", "payments")') },
    async ({ entity_type }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Sync ${entity_type} from QuickBooks to the corresponding Notion database. List what was found, sync the data, and report on any issues or mismatches.`,
        },
      }],
    }),
  );

  // ── Domain-Expertise Prompts (Judgment tier — encode CFO/controller workflows) ──

  server.prompt(
    'month_end_close',
    'CFO month-end close workflow: P&L + Balance Sheet + AR Aging bundled with interpretation guidance. Encodes the sequence a controller runs every close cycle.',
    { period: z.string().describe('Accounting period to close (e.g., "January 2026", "Q4 2025")') },
    async ({ period }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Run a month-end close review for ${period}. Execute this sequence:

1. **Pull reports** (use qbo_report for each):
   - Profit & Loss for ${period}
   - Balance Sheet as of period end
   - Aged Receivables Detail
   - Aged Payables Detail

2. **Analyze P&L**:
   - Revenue vs prior period (growth/decline %)
   - Top 5 expense categories and any anomalies (>20% change)
   - Net income margin

3. **Analyze Balance Sheet**:
   - Cash position and trend
   - Total AR vs AP (working capital health)
   - Any large liability changes

4. **Receivables health**:
   - Total outstanding AR
   - Amount >30 days, >60 days, >90 days overdue
   - Top 3 overdue customers by amount

5. **Payables check**:
   - Any bills approaching due date
   - Vendor concentration risk

6. **Close summary**: One paragraph executive summary suitable for a board update, highlighting the 2-3 most important things.

Flag anything that looks unusual — this is the controller's safety net.`,
        },
      }],
    }),
  );

  server.prompt(
    'customer_payment_analysis',
    'Revenue investigation: analyze a customer\'s invoice and payment history to answer "why is revenue from this customer down?" or "what\'s their payment pattern?"',
    { customer_name: z.string().describe('Customer name to investigate') },
    async ({ customer_name }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Investigate the financial relationship with customer "${customer_name}". Run this analysis:

1. **Find the customer** (use qbo_search with entity Customer, name "${customer_name}")

2. **Pull their invoices** (use qbo_list with entity Invoice, filter by CustomerRef)
   - List all invoices: date, amount, status (paid/open/overdue)
   - Calculate total invoiced (all time and last 12 months)

3. **Pull their payments** (use qbo_list with entity Payment, filter by CustomerRef)
   - Match payments to invoices
   - Calculate average days-to-pay (invoice date → payment date)

4. **Pull their credit memos** if any (use qbo_list with entity CreditMemo)

5. **Revenue trend**: Compare last 3 months vs prior 3 months
   - Is revenue up, down, or flat?
   - Any gaps in ordering?

6. **Payment behavior**:
   - Average days to pay
   - Any late payments (>30 days)?
   - Outstanding balance right now

7. **Assessment**: One paragraph summary — is this customer healthy, at risk, or growing? What action should we take?`,
        },
      }],
    }),
  );

  server.prompt(
    'sync_decision_tree',
    'Guide Notion database schema decisions before syncing QuickBooks data. Helps decide which properties to create, which relations to set up, and what the target structure should look like.',
    { entity_type: z.string().describe('QuickBooks entity type to sync (e.g., "Invoice", "Customer", "Payment", "Vendor")') },
    async ({ entity_type }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Help me set up a Notion database to sync ${entity_type} data from QuickBooks. Walk through these decisions:

1. **Discover the data shape** (use qbo_list for ${entity_type}, limit 3):
   - What fields does this entity have?
   - Which fields carry the most signal for a team reviewing in Notion?

2. **Recommend Notion properties** for each important field:
   - Title property (what should be the row name?)
   - Which fields → Select/Multi-select (finite options)?
   - Which fields → Number (amounts, quantities)?
   - Which fields → Date (dates, deadlines)?
   - Which fields → Rich text (descriptions, notes)?
   - Which fields to skip (internal IDs, metadata noise)?

3. **Relation recommendations**:
   - If syncing Invoices: should we link to a Customers database?
   - If syncing Payments: should we link to Invoices?
   - What relations make the Notion view most useful?

4. **View recommendations**:
   - What Notion views would help the team? (e.g., "Overdue" filter, "By Customer" group, calendar by due date)

5. **Output**: Provide the exact notion_sync_qbo parameters to use, including property mapping. Make it copy-pasteable.

The goal is a Notion database that a non-financial team member can use to understand the business — not a raw data dump.`,
        },
      }],
    }),
  );

  // ── Additional Resources (Database tier — agent discovery) ──────────

  server.resource(
    'qbo-companies',
    'qbo://companies',
    { description: 'Connected QuickBooks companies with realm IDs', mimeType: 'application/json' },
    async () => {
      try {
        const info = await qbo.getCompanyInfo();
        return {
          contents: [{
            uri: 'qbo://companies',
            mimeType: 'application/json',
            text: JSON.stringify({
              companies: [{
                realm_id: realmId,
                name: info?.CompanyName ?? 'Unknown',
                country: info?.Country ?? 'Unknown',
                fiscal_year_start: info?.FiscalYearStartMonth ?? 'January',
                environment: sandbox ? 'sandbox' : 'production',
              }],
            }, null, 2),
          }],
        };
      } catch {
        return {
          contents: [{
            uri: 'qbo://companies',
            mimeType: 'application/json',
            text: JSON.stringify({ companies: [], error: 'Failed to fetch. Check OAuth tokens.' }),
          }],
        };
      }
    },
  );

  server.resource(
    'qbo-sync-status',
    'qbo://sync-status',
    { description: 'Last sync timestamps and status per entity type', mimeType: 'application/json' },
    async () => ({
      contents: [{
        uri: 'qbo://sync-status',
        mimeType: 'application/json',
        text: JSON.stringify({
          note: 'Sync status tracking not yet implemented. Use qbo_list to check current data.',
          realm_id: realmId,
          environment: sandbox ? 'sandbox' : 'production',
          entities: ['Customer', 'Invoice', 'Payment', 'Vendor', 'Item', 'Bill', 'Estimate'],
        }, null, 2),
      }],
    }),
  );

  server.resource(
    'qbo-schema',
    'qbo://schema/{entity}',
    { description: 'Available fields for a QuickBooks entity type', mimeType: 'application/json' },
    async (uri) => {
      const entity = uri.pathname.split('/').pop() || 'Customer';
      const schemas: Record<string, object> = {
        Customer: { key_fields: ['DisplayName', 'PrimaryEmailAddr', 'PrimaryPhone', 'Balance', 'Active'], filterable: ['Active', 'Balance', 'MetaData.CreateTime'], sortable: ['DisplayName', 'Balance'] },
        Invoice: { key_fields: ['DocNumber', 'CustomerRef', 'TxnDate', 'DueDate', 'TotalAmt', 'Balance', 'Line'], filterable: ['TxnDate', 'DueDate', 'CustomerRef', 'Balance'], sortable: ['TxnDate', 'DueDate', 'TotalAmt'] },
        Payment: { key_fields: ['TxnDate', 'CustomerRef', 'TotalAmt', 'Line'], filterable: ['TxnDate', 'CustomerRef'], sortable: ['TxnDate', 'TotalAmt'] },
        Vendor: { key_fields: ['DisplayName', 'PrimaryEmailAddr', 'Balance', 'Active'], filterable: ['Active', 'Balance'], sortable: ['DisplayName', 'Balance'] },
        Bill: { key_fields: ['DocNumber', 'VendorRef', 'TxnDate', 'DueDate', 'TotalAmt', 'Balance'], filterable: ['TxnDate', 'DueDate', 'VendorRef'], sortable: ['TxnDate', 'DueDate'] },
        Item: { key_fields: ['Name', 'Type', 'UnitPrice', 'Active', 'Description'], filterable: ['Type', 'Active'], sortable: ['Name'] },
        Estimate: { key_fields: ['DocNumber', 'CustomerRef', 'TxnDate', 'ExpirationDate', 'TotalAmt'], filterable: ['TxnDate', 'CustomerRef'], sortable: ['TxnDate', 'TotalAmt'] },
        Account: { key_fields: ['Name', 'AccountType', 'AccountSubType', 'CurrentBalance', 'Active'], filterable: ['AccountType', 'Active'], sortable: ['Name'] },
      };
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            entity,
            schema: schemas[entity] ?? { error: `Unknown entity. Available: ${Object.keys(schemas).join(', ')}` },
          }, null, 2),
        }],
      };
    },
  );

  return server;
}

async function startServer(): Promise<void> {
  // Initialize OAuth
  const authManager = createAuthManagerFromEnv();
  const initialized = await authManager.initialize();

  if (!initialized) {
    logger.error("No QuickBooks tokens found. Run: pnpm auth");
    process.exit(1);
  }

  const realmId = await authManager.getRealmId();
  const sandbox = process.env.QBO_ENVIRONMENT === "sandbox";

  // Start transport
  const transport = process.env.TRANSPORT || "stdio";

  if (transport === "http") {
    await runHTTP(authManager, realmId, sandbox);
  } else {
    await runStdio(authManager, realmId, sandbox);
  }
}

// ── Transport: stdio ────────────────────────────────────────────────

async function runStdio(
  authManager: Awaited<ReturnType<typeof createAuthManagerFromEnv>>,
  realmId: string,
  sandbox: boolean,
): Promise<void> {
  const server = createMcpServer(authManager, realmId, sandbox);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("QuickBooks → Notion MCP server v2.0.0 running on stdio");
}

// ── Transport: Streamable HTTP (replaces Express + SSE) ─────────────

async function runHTTP(
  authManager: Awaited<ReturnType<typeof createAuthManagerFromEnv>>,
  realmId: string,
  sandbox: boolean,
): Promise<void> {
  const port = parseInt(process.env.PORT || "3000");

  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${port}`);

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key, Accept");

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (url.pathname === "/health" || url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        server: "quickbooks-notion-mcp-server",
        version: "2.0.0",
        transport: "streamable-http",
        endpoint: "/mcp",
      }));
      return;
    }

    // MCP Streamable HTTP endpoint
    if (url.pathname === "/mcp") {
      // Create new server instance per request (MCP SDK 1.26+ requirement)
      const server = createMcpServer(authManager, realmId, sandbox);

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      res.on("close", () => transport.close());
      await server.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. MCP endpoint is at /mcp" }));
  });

  httpServer.listen(port, () => {
    logger.info("QuickBooks → Notion MCP server v2.0.0 running on Streamable HTTP", {
      port,
      endpoint: "/mcp",
    });
  });

  // Cleanup on shutdown
  process.on("SIGINT", () => {
    httpServer.close();
    process.exit(0);
  });
}
