import { createServer } from "node:http";
import { URL } from "node:url";
import { createAuthManagerFromEnv } from "./services/auth.js";
import { logger } from "./services/logger.js";

const CALLBACK_PORT = 3000;
const CALLBACK_PATH = "/api/callback";

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

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <html><head><meta charset="UTF-8"></head><body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1 style="color: #22c55e;">&#x2705; Connected!</h1>
            <p>QuickBooks account successfully connected.</p>
            <p>Realm ID: <code>${token.realmId}</code></p>
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
