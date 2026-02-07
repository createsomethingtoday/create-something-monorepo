import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { QBOAuthManager } from "./services/auth.js";
import { QuickBooksClient } from "./services/quickbooks.js";
import { NotionClient } from "./services/notion.js";
import { registerQuickBooksTools } from "./tools/quickbooks.js";
import { registerNotionTools } from "./tools/notion.js";
import { logger } from "./services/logger.js";

export interface Env {
  QBO_CLIENT_ID: string;
  QBO_CLIENT_SECRET: string;
  QBO_ENVIRONMENT: string;
  NOTION_API_KEY: string;
  QBO_TOKENS: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health" && request.method === "GET") {
      return Response.json({
        status: "ok",
        server: "quickbooks-notion-mcp-server",
        version: "1.0.0",
      });
    }

    // MCP endpoint
    if (url.pathname === "/mcp") {
      try {
        // Initialize auth from KV
        const authManager = new QBOAuthManager({
          clientId: env.QBO_CLIENT_ID,
          clientSecret: env.QBO_CLIENT_SECRET,
          redirectUri: "",
          environment: env.QBO_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
          kvStore: env.QBO_TOKENS,
        });

        const initialized = await authManager.initialize();
        if (!initialized) {
          return Response.json(
            { error: "QuickBooks tokens not configured. Seed tokens via KV." },
            { status: 503 }
          );
        }

        // Create MCP server
        const server = new McpServer({
          name: "quickbooks-notion-mcp-server",
          version: "1.0.0",
        });

        // Initialize clients
        const realmId = await authManager.getRealmId();
        const sandbox = env.QBO_ENVIRONMENT === "sandbox";
        const qbo = new QuickBooksClient(authManager, realmId, sandbox);
        const notion = new NotionClient({ apiKey: env.NOTION_API_KEY });

        // Register tools
        registerQuickBooksTools(server, qbo);
        registerNotionTools(server, qbo, notion);

        // Create web-standard transport (Workers-native)
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });

        await server.connect(transport);
        return await transport.handleRequest(request);
      } catch (error) {
        logger.error("Worker request failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return Response.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
