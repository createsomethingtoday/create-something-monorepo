import { createServer } from "node:http";
import { URL } from "node:url";
import { createAuthManagerFromEnv } from "./services/auth.js";
import type { QBOToken } from "./services/auth.js";
import { logger } from "./services/logger.js";

const CALLBACK_PORT = 3000;
const CALLBACK_PATH = "/api/callback";

/** Remote Worker URL for seeding tokens. Set via WORKER_URL env var. */
const WORKER_URL = process.env.WORKER_URL || "https://quickbooks.mcp.workway.co";

/**
 * Run the one-time OAuth setup flow.
 *
 * 1. Start local HTTP server for callback
 * 2. Generate auth URL and print it
 * 3. Wait for user to authorize in browser
 * 4. Exchange code for tokens
 * 5. Persist tokens and exit
 */
export async function runAuthSetup(): Promise<void> {
  logger.info("QuickBooks OAuth Setup — one-time authorization");

  const authManager = createAuthManagerFromEnv();

  // Check if tokens already exist
  if (authManager.hasPersistedTokens()) {
    logger.warn("Existing tokens found — re-authorizing will replace them");
  }

  // Generate auth URL
  const authUrl = authManager.generateAuthUrl();
  logger.info("Open this URL in your browser to authorize", {
    url: authUrl,
  });
  console.error(
    `\n1. Open this URL in your browser:\n\n   ${authUrl}\n\n2. Sign in to QuickBooks and authorize the app.\n3. You'll be redirected back here automatically.\n\nWaiting for authorization...`
  );

  // Start callback server
  return new Promise<void>((resolve, reject) => {
    const server = createServer(async (req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end("Bad request");
        return;
      }

      const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);

      if (url.pathname !== CALLBACK_PATH) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const code = url.searchParams.get("code");
      const realmId = url.searchParams.get("realmId");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <html><head><meta charset="UTF-8"></head><body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1>Authorization Failed</h1>
            <p>Error: ${error}</p>
            <p>You can close this tab.</p>
          </body></html>
        `);
        server.close();
        reject(new Error(`OAuth authorization failed: ${error}`));
        return;
      }

      if (!code || !realmId) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <html><head><meta charset="UTF-8"></head><body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1>Missing Parameters</h1>
            <p>Expected 'code' and 'realmId' in callback.</p>
            <p>You can close this tab.</p>
          </body></html>
        `);
        return;
      }

      try {
        logger.info("Authorization received, exchanging code for tokens");

        const token = await authManager.exchangeCode(code, realmId);

        logger.info("Authorization successful", {
          realmId: token.realmId,
          accessTokenExpiresAt: token.accessTokenExpiresAt,
          refreshTokenExpiresAt: token.refreshTokenExpiresAt,
        });

        // Auto-upload tokens to remote Worker
        const seedResult = await seedTokensToWorker(token);

        const seedMessage = seedResult.ok
          ? `<p style="color: #22c55e;">&#x2705; Tokens synced to remote Worker: ${seedResult.companyName || token.realmId}</p>`
          : `<p style="color: #f59e0b;">&#x26A0; Local tokens saved. Remote sync skipped: ${seedResult.error}</p>`;

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <html><head><meta charset="UTF-8"></head><body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1 style="color: #22c55e;">&#x2705; Connected!</h1>
            <p>QuickBooks account successfully connected.</p>
            <p>Realm ID: <code>${token.realmId}</code></p>
            ${seedMessage}
            <p>You can close this tab and return to the terminal.</p>
          </body></html>
        `);

        server.close();
        resolve();
      } catch (err) {
        logger.error("Token exchange failed", {
          error: err instanceof Error ? err.message : String(err),
        });

        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <html><head><meta charset="UTF-8"></head><body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1 style="color: #ef4444;">Token Exchange Failed</h1>
            <p>${err instanceof Error ? err.message : String(err)}</p>
            <p>You can close this tab and try again.</p>
          </body></html>
        `);

        server.close();
        reject(err);
      }
    });

    server.listen(CALLBACK_PORT, () => {
      logger.info("Callback server listening", {
        port: CALLBACK_PORT,
        path: CALLBACK_PATH,
      });
    });

    server.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
        logger.error("Port already in use", { port: CALLBACK_PORT });
      }
      reject(err);
    });
  });
}

// ── Remote Token Seeding ─────────────────────────────────────────────

/**
 * Upload tokens to the remote Worker's /auth/seed endpoint.
 * Uses QBO_CLIENT_SECRET as the Bearer token for auth.
 */
async function seedTokensToWorker(token: QBOToken): Promise<{ ok: boolean; companyName?: string; error?: string }> {
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  if (!clientSecret) {
    return { ok: false, error: "QBO_CLIENT_SECRET not set — skipping remote sync" };
  }

  try {
    const response = await fetch(`${WORKER_URL}/auth/seed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientSecret}`,
      },
      body: JSON.stringify({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        realmId: token.realmId,
        accessTokenExpiresAt: token.accessTokenExpiresAt,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt,
        tokenType: token.tokenType,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `HTTP ${response.status}: ${text}` };
    }

    const result = await response.json() as { companyName?: string };
    logger.info("Tokens synced to remote Worker", { workerUrl: WORKER_URL });
    return { ok: true, companyName: result.companyName };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to reach Worker: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
