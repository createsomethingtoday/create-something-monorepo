import { AuthProvider, AuthScopes, Environment } from "quickbooks-api";
import type { Token } from "quickbooks-api";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { logger } from "./logger.js";

// ── Token Provider Interface ────────────────────────────────────────

export interface TokenProvider {
  getAccessToken(): Promise<string>;
  getRealmId(): Promise<string>;
}

// ── Configuration ───────────────────────────────────────────────────

export interface QBOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: "sandbox" | "production";
  tokenPath?: string;
  encryptionKey?: string;
}

// ── Default paths ───────────────────────────────────────────────────

const DEFAULT_TOKEN_PATH = resolve(process.cwd(), ".qbo-tokens.json");
const DEFAULT_REDIRECT_URI = "http://localhost:3000/api/callback";
const DEFAULT_ENCRYPTION_KEY = "quickbooks-notion-mcp-local-dev-key!!";

// ── QBO Auth Manager ────────────────────────────────────────────────

/**
 * Manages QuickBooks OAuth tokens using the quickbooks-api SDK.
 * 
 * Implements the SDK Auth Pattern:
 * - SDK handles token lifecycle (refresh, serialize, validate)
 * - We handle persistence (file storage) and MCP integration
 */
export class QBOAuthManager implements TokenProvider {
  private authProvider: AuthProvider;
  private readonly tokenPath: string;
  private readonly encryptionKey: string;
  private initialized = false;

  constructor(config: QBOAuthConfig) {
    const env =
      config.environment === "sandbox"
        ? Environment.Sandbox
        : Environment.Production;

    this.tokenPath = config.tokenPath ?? DEFAULT_TOKEN_PATH;
    this.encryptionKey = config.encryptionKey ?? DEFAULT_ENCRYPTION_KEY;

    this.authProvider = new AuthProvider(
      config.clientId,
      config.clientSecret,
      config.redirectUri || DEFAULT_REDIRECT_URI,
      [AuthScopes.Accounting],
      undefined,
      env
    );

    // Enable auto-refresh so the SDK refreshes expired tokens automatically
    this.authProvider.enableAutoRefresh();

    // Persist tokens whenever they're refreshed
    this.authProvider.onRefresh(async (refreshedToken: Token) => {
      await this.persistToken(refreshedToken);
      logger.info("Token auto-refreshed and persisted");
    });
  }

  /**
   * Get the underlying AuthProvider (for OAuth setup flow).
   */
  getAuthProvider(): AuthProvider {
    return this.authProvider;
  }

  /**
   * Initialize from persisted tokens.
   * Must be called before getAccessToken().
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    const loaded = await this.loadPersistedToken();
    if (loaded) {
      this.initialized = true;
      return true;
    }

    return false;
  }

  /**
   * Get a valid access token. Refreshes automatically if expired.
   */
  async getAccessToken(): Promise<string> {
    if (!this.initialized) {
      throw new Error(
        "QBOAuthManager not initialized. Call initialize() first or run the auth setup."
      );
    }

    try {
      const token = await this.authProvider.getToken();
      return token.accessToken;
    } catch (error) {
      // Detect refresh token expiration
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes("refresh") ||
        msg.includes("token") ||
        msg.includes("expired") ||
        msg.includes("invalid_grant")
      ) {
        throw new Error(
          "QuickBooks refresh token has expired or is invalid. " +
            "Run `pnpm auth` to re-authorize. " +
            `(Original error: ${msg})`
        );
      }
      throw error;
    }
  }

  /**
   * Get the realm ID (company ID) from the stored token.
   */
  async getRealmId(): Promise<string> {
    if (!this.initialized) {
      throw new Error(
        "QBOAuthManager not initialized. Call initialize() first or run the auth setup."
      );
    }

    const token = await this.authProvider.getToken();
    return token.realmId;
  }

  /**
   * Set token after OAuth exchange and persist.
   */
  async setToken(token: Token): Promise<void> {
    await this.authProvider.setToken(token);
    await this.persistToken(token);
    this.initialized = true;
  }

  /**
   * Check if tokens exist on disk.
   */
  hasPersistedTokens(): boolean {
    return existsSync(this.tokenPath);
  }

  /**
   * Persist encrypted token to disk.
   */
  private async persistToken(token?: Token): Promise<void> {
    try {
      const serialized = await this.authProvider.serializeToken(
        this.encryptionKey
      );
      if (serialized) {
        await writeFile(this.tokenPath, serialized, "utf-8");
      }
    } catch (error) {
      logger.error("Failed to persist token", { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Load encrypted token from disk.
   */
  private async loadPersistedToken(): Promise<boolean> {
    if (!this.hasPersistedTokens()) return false;

    try {
      const serialized = await readFile(this.tokenPath, "utf-8");
      await this.authProvider.deserializeToken(serialized, this.encryptionKey);
      logger.info("Loaded persisted tokens successfully");
      return true;
    } catch (error) {
      logger.error("Failed to load persisted token", { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }
}

// ── Factory ─────────────────────────────────────────────────────────

/**
 * Create a QBOAuthManager from environment variables.
 */
export function createAuthManagerFromEnv(): QBOAuthManager {
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  const environment = process.env.QBO_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
  const redirectUri = process.env.QBO_REDIRECT_URI || DEFAULT_REDIRECT_URI;
  const tokenPath = process.env.QBO_TOKEN_PATH || DEFAULT_TOKEN_PATH;
  const encryptionKey = process.env.QBO_ENCRYPTION_KEY || DEFAULT_ENCRYPTION_KEY;

  if (!clientId) {
    throw new Error(
      "QBO_CLIENT_ID environment variable is required. " +
        "Get yours from https://developer.intuit.com"
    );
  }
  if (!clientSecret) {
    throw new Error(
      "QBO_CLIENT_SECRET environment variable is required. " +
        "Get yours from https://developer.intuit.com"
    );
  }

  return new QBOAuthManager({
    clientId,
    clientSecret,
    redirectUri,
    environment,
    tokenPath,
    encryptionKey,
  });
}
