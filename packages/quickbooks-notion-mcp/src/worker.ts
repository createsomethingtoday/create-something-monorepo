import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { ConnectionManager } from "./services/connections.js";
import { QuickBooksClient } from "./services/quickbooks.js";
import { NotionClient } from "./services/notion.js";
import { registerQuickBooksTools } from "./tools/quickbooks.js";
import type { QBOClientGetter } from "./tools/quickbooks.js";
import { registerNotionTools } from "./tools/notion.js";
import { registerConnectionTools } from "./tools/connections.js";
import { logger } from "./services/logger.js";
import type { QBOCompanyInfo } from "./types.js";

export interface Env {
  QBO_CLIENT_ID: string;
  QBO_CLIENT_SECRET: string;
  QBO_ENVIRONMENT: string;
  QBO_REDIRECT_URI: string;
  NOTION_API_KEY: string;
  QBO_TOKENS: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Create ConnectionManager (shared across routes)
    const connManager = new ConnectionManager(env.QBO_TOKENS, {
      clientId: env.QBO_CLIENT_ID,
      clientSecret: env.QBO_CLIENT_SECRET,
      redirectUri: env.QBO_REDIRECT_URI || `${baseUrl}/auth/callback`,
      environment: env.QBO_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
    });

    // Ensure legacy tokens are migrated
    await connManager.ensureMigrated();

    // ── Health check ───────────────────────────────────────────────
    if (url.pathname === "/health" && request.method === "GET") {
      const connections = await connManager.listConnections();
      return Response.json({
        status: "ok",
        server: "quickbooks-notion-mcp-server",
        version: "2.1.0",
        connections: connections.length,
      });
    }

    // ── OAuth: Generate auth URL ───────────────────────────────────
    if (url.pathname === "/auth/connect" && request.method === "GET") {
      const state = crypto.randomUUID();
      const authUrl = connManager.generateAuthUrl(state);

      return Response.json({
        authUrl,
        state,
        instructions: "Redirect the user to authUrl. After authorization, Intuit will redirect back to /auth/callback with the tokens.",
      });
    }

    // ── OAuth: Callback from Intuit ────────────────────────────────
    if (url.pathname === "/auth/callback" && request.method === "GET") {
      const code = url.searchParams.get("code");
      const realmId = url.searchParams.get("realmId");
      const error = url.searchParams.get("error");

      if (error) {
        return new Response(authResultPage(false, `Authorization denied: ${error}`), {
          status: 400,
          headers: { "Content-Type": "text/html" },
        });
      }

      if (!code || !realmId) {
        return new Response(authResultPage(false, "Missing code or realmId from Intuit."), {
          status: 400,
          headers: { "Content-Type": "text/html" },
        });
      }

      try {
        // Exchange code for tokens and store the connection
        const token = await connManager.exchangeCode(code, realmId);

        // Best-effort: fetch company info for metadata
        let companyName = "Unknown Company";
        let email: string | undefined;
        try {
          const tempClient = new QuickBooksClient(
            { getAccessToken: async () => token.accessToken, getRealmId: async () => token.realmId },
            token.realmId,
            env.QBO_ENVIRONMENT === "sandbox"
          );
          const info = await tempClient.getCompanyInfo<QBOCompanyInfo>();
          companyName = info.CompanyName || companyName;
          email = info.Email?.Address;

          // Update connection metadata with company info
          await connManager.addConnection(token, { companyName, email });
        } catch (metaError) {
          logger.error("Failed to fetch company info for metadata", {
            error: metaError instanceof Error ? metaError.message : String(metaError),
          });
        }

        return new Response(
          authResultPage(true, `Successfully connected **${companyName}** (${realmId}).`),
          {
            status: 200,
            headers: { "Content-Type": "text/html" },
          }
        );
      } catch (err) {
        logger.error("OAuth callback failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        return new Response(
          authResultPage(false, `Token exchange failed: ${err instanceof Error ? err.message : String(err)}`),
          {
            status: 500,
            headers: { "Content-Type": "text/html" },
          }
        );
      }
    }

    // ── Token Seed: upload tokens from local pnpm auth ───────────
    if (url.pathname === "/auth/seed" && request.method === "POST") {
      try {
        // Require admin secret to prevent unauthorized token uploads
        const authHeader = request.headers.get("Authorization");
        const expectedSecret = env.QBO_CLIENT_SECRET;
        if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
          return Response.json(
            { error: "Unauthorized. Provide Authorization: Bearer <QBO_CLIENT_SECRET>" },
            { status: 401 }
          );
        }

        const body = await request.json() as {
          accessToken?: string;
          refreshToken?: string;
          accessTokenExpiresAt?: string;
          refreshTokenExpiresAt?: string;
          realmId?: string;
          tokenType?: string;
        };

        // Validate required fields
        if (!body.accessToken || !body.refreshToken || !body.realmId) {
          return Response.json(
            { error: "Missing required fields: accessToken, refreshToken, realmId" },
            { status: 400 }
          );
        }

        const token = {
          accessToken: body.accessToken,
          refreshToken: body.refreshToken,
          accessTokenExpiresAt: body.accessTokenExpiresAt || new Date(Date.now() + 3600 * 1000).toISOString(),
          refreshTokenExpiresAt: body.refreshTokenExpiresAt || new Date(Date.now() + 100 * 86400 * 1000).toISOString(),
          realmId: body.realmId,
          tokenType: body.tokenType || "bearer",
        };

        // Fetch company info for metadata
        let companyName = "Unknown Company";
        let email: string | undefined;
        try {
          const tempClient = new QuickBooksClient(
            { getAccessToken: async () => token.accessToken, getRealmId: async () => token.realmId },
            token.realmId,
            env.QBO_ENVIRONMENT === "sandbox"
          );
          const info = await tempClient.getCompanyInfo<QBOCompanyInfo>();
          companyName = info.CompanyName || companyName;
          email = info.Email?.Address;
        } catch {
          // Best effort
        }

        await connManager.addConnection(token, { companyName, email });

        return Response.json({
          status: "ok",
          message: `Connection seeded: ${companyName} (${token.realmId})`,
          realmId: token.realmId,
          companyName,
          email,
        });
      } catch (error) {
        logger.error("Token seed failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return Response.json(
          { error: `Seed failed: ${error instanceof Error ? error.message : String(error)}` },
          { status: 500 }
        );
      }
    }

    // ── MCP endpoint ───────────────────────────────────────────────
    if (url.pathname === "/mcp") {
      try {
        // Create client getter that resolves connections at call time
        const getClient: QBOClientGetter = async (connectionId?: string) => {
          const result = await connManager.getClient(connectionId);
          if (!result) {
            throw new Error(
              connectionId
                ? `QuickBooks connection "${connectionId}" not found. Use qbo_list_connections to see available connections.`
                : "No QuickBooks connections found. Use qbo_connect to add a connection."
            );
          }
          return result.client;
        };

        // Create MCP server
        const server = new McpServer({
          name: "quickbooks-notion-mcp-server",
          version: "2.1.0",
        });

        // Initialize Notion client
        const notion = new NotionClient({ apiKey: env.NOTION_API_KEY });

        // Register tools
        registerQuickBooksTools(server, getClient);
        registerNotionTools(server, getClient, notion);
        registerConnectionTools(server, connManager, baseUrl);

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

// ── HTML Templates ─────────────────────────────────────────────────

function authResultPage(success: boolean, message: string): string {
  const title = success ? "QuickBooks Connected" : "Connection Failed";
  const icon = success ? "&#10003;" : "&#10007;";
  const color = success ? "#22c55e" : "#ef4444";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — WORKWAY</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 3rem;
      max-width: 480px;
      text-align: center;
    }
    .icon {
      font-size: 3rem;
      color: ${color};
      margin-bottom: 1rem;
    }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    p { color: rgba(255,255,255,0.7); line-height: 1.6; }
    .hint { margin-top: 1.5rem; font-size: 0.875rem; color: rgba(255,255,255,0.4); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="hint">You can close this window and return to your AI assistant.</p>
  </div>
</body>
</html>`;
}
