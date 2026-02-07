import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";

import { createAuthManagerFromEnv } from "./services/auth.js";
import { createQBOClient } from "./services/quickbooks.js";
import { createNotionClientFromEnv } from "./services/notion.js";
import { registerQuickBooksTools } from "./tools/quickbooks.js";
import { registerNotionTools } from "./tools/notion.js";
import { runAuthSetup } from "./auth-setup.js";

// ── CLI: Auth Setup ─────────────────────────────────────────────────

const command = process.argv[2];
if (command === "auth") {
  runAuthSetup()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Auth setup failed:", error);
      process.exit(1);
    });
} else {
  // ── MCP Server ──────────────────────────────────────────────────

  startServer().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}

async function startServer(): Promise<void> {
  // Initialize OAuth
  const authManager = createAuthManagerFromEnv();
  const initialized = await authManager.initialize();

  if (!initialized) {
    console.error("═══════════════════════════════════════════════════");
    console.error("  No QuickBooks tokens found.");
    console.error("  Run the auth setup first:");
    console.error("");
    console.error("    pnpm auth");
    console.error("");
    console.error("  This will open your browser to authorize access.");
    console.error("═══════════════════════════════════════════════════");
    process.exit(1);
  }

  // Create server
  const server = new McpServer({
    name: "quickbooks-notion-mcp-server",
    version: "1.0.0",
  });

  // Initialize API clients
  const realmId = await authManager.getRealmId();
  const sandbox = process.env.QBO_ENVIRONMENT === "sandbox";
  const qbo = createQBOClient(authManager, realmId, sandbox);
  const notion = createNotionClientFromEnv();

  // Register all tools
  registerQuickBooksTools(server, qbo);
  registerNotionTools(server, qbo, notion);

  // Start transport
  const transport = process.env.TRANSPORT || "stdio";

  if (transport === "http") {
    await runHTTP(server);
  } else {
    await runStdio(server);
  }
}

// ── Transport: stdio ────────────────────────────────────────────────

async function runStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("QuickBooks → Notion MCP server running on stdio");
}

// ── Transport: Streamable HTTP ──────────────────────────────────────

async function runHTTP(server: McpServer): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      server: "quickbooks-notion-mcp-server",
      version: "1.0.0",
    });
  });

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || "3000");
  app.listen(port, () => {
    console.error(
      `QuickBooks → Notion MCP server running on http://localhost:${port}/mcp`
    );
  });
}
