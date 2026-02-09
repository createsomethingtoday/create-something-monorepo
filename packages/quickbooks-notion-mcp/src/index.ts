import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(import.meta.dirname, "../.env") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";

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

async function startServer(): Promise<void> {
  // Initialize OAuth
  const authManager = createAuthManagerFromEnv();
  const initialized = await authManager.initialize();

  if (!initialized) {
    logger.error("No QuickBooks tokens found. Run: pnpm auth");
    process.exit(1);
  }

  // Create server
  const server = new McpServer({
    name: "quickbooks-notion-mcp-server",
    version: "1.0.0",
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTEyIDd2MTQiLz48cGF0aCBkPSJNMyAxOGExIDEgMCAwIDEtMS0xVjRhMSAxIDAgMCAxIDEtMWg1YTQgNCAwIDAgMSA0IDQgNCA0IDAgMCAxIDQtNGg1YTEgMSAwIDAgMSAxIDF2MTNhMSAxIDAgMCAxLTEgMWgtNmEzIDMgMCAwIDAtMyAzIDMgMyAwIDAgMC0zLTN6Ii8+PC9nPjwvc3ZnPg==',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
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
  } else if (transport === "sse") {
    await runHTTP(server, true);
  } else {
    await runStdio(server);
  }
}

// ── Transport: stdio ────────────────────────────────────────────────

async function runStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("QuickBooks → Notion MCP server running on stdio");
}

// ── Transport: HTTP (Streamable HTTP + SSE) ─────────────────────────

async function runHTTP(server: McpServer, sseOnly = false): Promise<void> {
  const app = express();
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      server: "quickbooks-notion-mcp-server",
      version: "1.0.0",
    });
  });

  // ── Streamable HTTP endpoint ────────────────────────────────────
  if (!sseOnly) {
    app.post("/mcp", async (req, res) => {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on("close", () => transport.close());
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });
  }

  // ── SSE endpoint (for ChatGPT, OpenAI API) ─────────────────────
  const sseTransports: Record<string, SSEServerTransport> = {};

  // GET /sse — establish SSE stream
  app.get("/sse", async (req, res) => {
    logger.info("SSE connection established");
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;
    sseTransports[sessionId] = transport;

    transport.onclose = () => {
      logger.info("SSE transport closed", { sessionId });
      delete sseTransports[sessionId];
    };

    await server.connect(transport);
  });

  // POST /messages — receive client JSON-RPC messages
  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).send("Missing sessionId parameter");
      return;
    }

    const transport = sseTransports[sessionId];
    if (!transport) {
      res.status(404).send("Session not found");
      return;
    }

    await transport.handlePostMessage(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || "3000");
  app.listen(port, () => {
    const endpoints = sseOnly
      ? { sse: "/sse", messages: "/messages" }
      : { mcp: "/mcp", sse: "/sse", messages: "/messages" };
    logger.info("QuickBooks → Notion MCP server running on HTTP", { port, ...endpoints });
  });

  // Cleanup on shutdown
  process.on("SIGINT", async () => {
    for (const sessionId in sseTransports) {
      await sseTransports[sessionId].close();
      delete sseTransports[sessionId];
    }
    process.exit(0);
  });
}
