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

  registerQuickBooksTools(server, qbo);
  registerNotionTools(server, qbo, notion);

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
