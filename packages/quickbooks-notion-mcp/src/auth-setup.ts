import { createServer } from "node:http";
import { URL } from "node:url";
import { createAuthManagerFromEnv } from "./services/auth.js";

const CALLBACK_PORT = 3847;

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
  console.error("═══════════════════════════════════════════════════");
  console.error("  QuickBooks OAuth Setup");
  console.error("  One-time authorization to connect your QBO account");
  console.error("═══════════════════════════════════════════════════");
  console.error("");

  const authManager = createAuthManagerFromEnv();
  const authProvider = authManager.getAuthProvider();

  // Check if tokens already exist
  if (authManager.hasPersistedTokens()) {
    console.error("⚠️  Existing tokens found. Re-authorizing will replace them.");
    console.error("");
  }

  // Generate auth URL
  const authUrl = authProvider.generateAuthUrl();
  console.error("1. Open this URL in your browser:");
  console.error("");
  console.error(`   ${authUrl.toString()}`);
  console.error("");
  console.error(`2. Sign in to QuickBooks and authorize the app.`);
  console.error(`3. You'll be redirected back here automatically.`);
  console.error("");
  console.error("Waiting for authorization...");

  // Start callback server
  return new Promise<void>((resolve, reject) => {
    const server = createServer(async (req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end("Bad request");
        return;
      }

      const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);

      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const code = url.searchParams.get("code");
      const realmId = url.searchParams.get("realmId");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`
          <html><body style="font-family: system-ui; padding: 40px; text-align: center;">
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
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`
          <html><body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1>Missing Parameters</h1>
            <p>Expected 'code' and 'realmId' in callback.</p>
            <p>You can close this tab.</p>
          </body></html>
        `);
        return;
      }

      try {
        // Exchange code for tokens
        console.error("");
        console.error("Authorization received! Exchanging code for tokens...");

        const token = await authProvider.exchangeCode(code, realmId);
        await authManager.setToken(token);

        console.error("");
        console.error("✅ Authorization successful!");
        console.error(`   Realm ID: ${token.realmId}`);
        console.error(`   Access token expires: ${token.accessTokenExpiryDate}`);
        console.error(`   Refresh token expires: ${token.refreshTokenExpiryDate}`);
        console.error("");
        console.error("Tokens have been securely persisted. You can now start the MCP server.");

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html><body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1 style="color: #22c55e;">✅ Connected!</h1>
            <p>QuickBooks account successfully connected.</p>
            <p>Realm ID: <code>${token.realmId}</code></p>
            <p>You can close this tab and return to the terminal.</p>
          </body></html>
        `);

        server.close();
        resolve();
      } catch (err) {
        console.error("❌ Token exchange failed:", err);

        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(`
          <html><body style="font-family: system-ui; padding: 40px; text-align: center;">
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
      console.error(`Callback server listening on http://localhost:${CALLBACK_PORT}/callback`);
    });

    server.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
        console.error(`❌ Port ${CALLBACK_PORT} is already in use. Close the other process and try again.`);
      }
      reject(err);
    });
  });
}
