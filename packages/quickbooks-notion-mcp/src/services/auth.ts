import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
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
  kvStore?: KVNamespace;
}

// KV namespace type (Cloudflare Workers)
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

// ── Token Types ─────────────────────────────────────────────────────

export interface QBOToken {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string; // ISO date
  refreshTokenExpiresAt: string; // ISO date
  realmId: string;
  tokenType: string;
}

// ── Constants ───────────────────────────────────────────────────────

const INTUIT_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QBO_SCOPE = "com.intuit.quickbooks.accounting";

const DEFAULT_TOKEN_PATH = resolve(process.cwd(), ".qbo-tokens.json");
const DEFAULT_REDIRECT_URI = "http://localhost:3000/api/callback";

// Access tokens expire in ~60 minutes; refresh 5 min early
const ACCESS_TOKEN_BUFFER_MS = 5 * 60 * 1000;

// ── QBO Auth Manager ────────────────────────────────────────────────

/**
 * Manages QuickBooks OAuth tokens with raw fetch calls.
 *
 * Pattern A: Own auth — no vendor SDK.
 * Standard OAuth 2.0 authorization code flow with token refresh.
 * Workers-ready: only uses fetch, no Node.js-specific HTTP libraries.
 */
export class QBOAuthManager implements TokenProvider {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly tokenPath: string;
  private readonly kvStore?: KVNamespace;
  private token: QBOToken | null = null;
  private initialized = false;

  constructor(config: QBOAuthConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri || DEFAULT_REDIRECT_URI;
    this.tokenPath = config.tokenPath ?? DEFAULT_TOKEN_PATH;
    this.kvStore = config.kvStore;
  }

  // ── OAuth URL Generation ────────────────────────────────────────

  /**
   * Generate the OAuth authorization URL for the consent screen.
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: QBO_SCOPE,
      redirect_uri: this.redirectUri,
      response_type: "code",
      state: state ?? randomUUID(),
    });
    return `${INTUIT_AUTH_URL}?${params.toString()}`;
  }

  // ── Token Exchange ──────────────────────────────────────────────

  /**
   * Exchange an authorization code for access + refresh tokens.
   */
  async exchangeCode(code: string, realmId: string): Promise<QBOToken> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
    });

    const response = await fetch(INTUIT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${this.basicAuthHeader()}`,
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Token exchange failed (${response.status}): ${errorBody}`
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
      token_type: string;
    };

    const now = Date.now();
    const token: QBOToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: new Date(
        now + data.expires_in * 1000
      ).toISOString(),
      refreshTokenExpiresAt: new Date(
        now + data.x_refresh_token_expires_in * 1000
      ).toISOString(),
      realmId,
      tokenType: data.token_type,
    };

    this.token = token;
    this.initialized = true;
    await this.persistToken();

    return token;
  }

  // ── Token Refresh ───────────────────────────────────────────────

  /**
   * Refresh the access token using the refresh token.
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.token) {
      throw new Error("No token to refresh. Run `pnpm auth` first.");
    }

    // Check if refresh token itself is expired
    if (new Date(this.token.refreshTokenExpiresAt) <= new Date()) {
      throw new Error(
        "QuickBooks refresh token has expired (100-day limit). " +
          "Run `pnpm auth` to re-authorize."
      );
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.token.refreshToken,
    });

    const response = await fetch(INTUIT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${this.basicAuthHeader()}`,
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();

      if (response.status === 401 || response.status === 400) {
        throw new Error(
          "QuickBooks refresh token is invalid or revoked. " +
            "Run `pnpm auth` to re-authorize. " +
            `(${response.status}: ${errorBody})`
        );
      }

      throw new Error(
        `Token refresh failed (${response.status}): ${errorBody}`
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
      token_type: string;
    };

    const now = Date.now();
    this.token = {
      ...this.token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: new Date(
        now + data.expires_in * 1000
      ).toISOString(),
      refreshTokenExpiresAt: new Date(
        now + data.x_refresh_token_expires_in * 1000
      ).toISOString(),
    };

    await this.persistToken();
    logger.info("Token refreshed and persisted");
  }

  // ── TokenProvider Interface ─────────────────────────────────────

  /**
   * Initialize from persisted tokens.
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
    if (!this.initialized || !this.token) {
      throw new Error(
        "QBOAuthManager not initialized. Call initialize() first or run `pnpm auth`."
      );
    }

    // Check if access token needs refresh
    const expiresAt = new Date(this.token.accessTokenExpiresAt).getTime();
    if (Date.now() >= expiresAt - ACCESS_TOKEN_BUFFER_MS) {
      logger.info("Access token expiring soon, refreshing");
      await this.refreshAccessToken();
    }

    return this.token!.accessToken;
  }

  /**
   * Get the realm ID (company ID).
   */
  async getRealmId(): Promise<string> {
    if (!this.initialized || !this.token) {
      throw new Error(
        "QBOAuthManager not initialized. Call initialize() first or run `pnpm auth`."
      );
    }
    return this.token.realmId;
  }

  // ── Token Persistence (file-based, swappable for KV) ────────────

  /**
   * Check if tokens exist on disk.
   */
  hasPersistedTokens(): boolean {
    return existsSync(this.tokenPath);
  }

  /**
   * Persist token to disk as JSON.
   */
  private async persistToken(): Promise<void> {
    if (!this.token) return;

    try {
      const serialized = JSON.stringify(this.token, null, 2);
      if (this.kvStore) {
        await this.kvStore.put("qbo-token", serialized);
      } else {
        await writeFile(this.tokenPath, serialized, "utf-8");
      }
    } catch (error) {
      logger.error("Failed to persist token", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load token from disk.
   */
  private async loadPersistedToken(): Promise<boolean> {
    try {
      let raw: string | null = null;

      if (this.kvStore) {
        raw = await this.kvStore.get("qbo-token");
      } else if (this.hasPersistedTokens()) {
        raw = await readFile(this.tokenPath, "utf-8");
      }

      if (!raw) return false;

      this.token = JSON.parse(raw) as QBOToken;
      logger.info("Loaded persisted tokens successfully");
      return true;
    } catch (error) {
      logger.error("Failed to load persisted token", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────

  /**
   * Base64-encoded client_id:client_secret for Intuit token endpoint.
   */
  private basicAuthHeader(): string {
    return Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    );
  }
}

// ── Factory ─────────────────────────────────────────────────────────

/**
 * Create a QBOAuthManager from environment variables.
 */
export function createAuthManagerFromEnv(): QBOAuthManager {
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  const environment =
    process.env.QBO_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
  const redirectUri = process.env.QBO_REDIRECT_URI || DEFAULT_REDIRECT_URI;
  const tokenPath = process.env.QBO_TOKEN_PATH || DEFAULT_TOKEN_PATH;

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
  });
}
