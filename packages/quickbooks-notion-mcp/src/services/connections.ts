/**
 * ConnectionManager — Multi-tenant QuickBooks connection management.
 *
 * Stores multiple QBO connections keyed by realmId in KV.
 * Each connection has its own OAuth tokens and metadata.
 *
 * KV Schema:
 *   "qbo-conn:{realmId}"  — Serialized QBOToken for each connection
 *   "qbo-connections"      — JSON array of ConnectionMeta (index)
 *   "qbo-token"            — Legacy single-token key (backward compat)
 */

import { QBOAuthManager, type QBOToken, type QBOAuthConfig, type KVNamespace } from "./auth.js";
import { QuickBooksClient } from "./quickbooks.js";
import { logger } from "./logger.js";

// ── Types ────────────────────────────────────────────────────────────

export interface ConnectionMeta {
  realmId: string;
  companyName?: string;
  connectedAt: string;
  email?: string;
}

export interface ConnectionManagerConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: "sandbox" | "production";
}

// ── ConnectionManager ────────────────────────────────────────────────

export class ConnectionManager {
  private readonly kvStore: KVNamespace;
  private readonly config: ConnectionManagerConfig;
  private readonly sandbox: boolean;

  constructor(kvStore: KVNamespace, config: ConnectionManagerConfig) {
    this.kvStore = kvStore;
    this.config = config;
    this.sandbox = config.environment === "sandbox";
  }

  // ── Migration ────────────────────────────────────────────────────

  /**
   * Migrate legacy single-token storage to connection-keyed storage.
   * Idempotent: no-op if connections index already exists.
   */
  async ensureMigrated(): Promise<void> {
    const existing = await this.kvStore.get("qbo-connections");
    if (existing) return; // Already migrated

    const legacy = await this.kvStore.get("qbo-token");
    if (!legacy) return; // No tokens at all

    try {
      const token = JSON.parse(legacy) as QBOToken;
      if (!token.realmId) return;

      // Store under connection key
      await this.kvStore.put(`qbo-conn:${token.realmId}`, legacy);

      // Create connections index
      const meta: ConnectionMeta = {
        realmId: token.realmId,
        connectedAt: new Date().toISOString(),
      };
      await this.kvStore.put("qbo-connections", JSON.stringify([meta], null, 2));

      logger.info("Migrated legacy token to connection-keyed storage", {
        realmId: token.realmId,
      });
    } catch (error) {
      logger.error("Migration failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ── Connection Listing ───────────────────────────────────────────

  /**
   * List all stored connections with metadata.
   */
  async listConnections(): Promise<ConnectionMeta[]> {
    const raw = await this.kvStore.get("qbo-connections");
    if (!raw) return [];

    try {
      return JSON.parse(raw) as ConnectionMeta[];
    } catch {
      return [];
    }
  }

  // ── Client Resolution ────────────────────────────────────────────

  /**
   * Get a QuickBooksClient for a specific connection (by realmId).
   * If no realmId specified, uses the first available connection.
   */
  async getClient(realmId?: string): Promise<{ client: QuickBooksClient; realmId: string } | null> {
    const authManager = await this.getAuthManager(realmId);
    if (!authManager) return null;

    const resolvedRealmId = await authManager.getRealmId();
    const client = new QuickBooksClient(authManager, resolvedRealmId, this.sandbox);
    return { client, realmId: resolvedRealmId };
  }

  /**
   * Get a QBOAuthManager for a specific connection.
   */
  private async getAuthManager(realmId?: string): Promise<QBOAuthManager | null> {
    // If specific realmId requested, load that connection
    if (realmId) {
      return this.loadConnection(realmId);
    }

    // Otherwise, try first available connection
    const connections = await this.listConnections();
    if (connections.length === 0) return null;

    return this.loadConnection(connections[0].realmId);
  }

  /**
   * Load a connection's auth manager from KV.
   */
  private async loadConnection(realmId: string): Promise<QBOAuthManager | null> {
    // Try connection-keyed storage first
    let raw = await this.kvStore.get(`qbo-conn:${realmId}`);

    // Fall back to legacy key
    if (!raw) {
      raw = await this.kvStore.get("qbo-token");
      if (raw) {
        const token = JSON.parse(raw) as QBOToken;
        if (token.realmId !== realmId) return null;
      }
    }

    if (!raw) return null;

    const token = JSON.parse(raw) as QBOToken;
    const authManager = new QBOAuthManager({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUri: this.config.redirectUri,
      environment: this.config.environment,
      kvStore: this.kvStore,
      kvKey: `qbo-conn:${realmId}`,
    });

    authManager.initializeWithToken(token);
    return authManager;
  }

  // ── Connection Management ────────────────────────────────────────

  /**
   * Add a new connection (or update an existing one).
   * Stores token under connection key and updates the connections index.
   */
  async addConnection(token: QBOToken, meta?: Partial<ConnectionMeta>): Promise<void> {
    // Store token under connection key
    const serialized = JSON.stringify(token, null, 2);
    await this.kvStore.put(`qbo-conn:${token.realmId}`, serialized);

    // Update connections index
    const connections = await this.listConnections();
    const existing = connections.findIndex(c => c.realmId === token.realmId);

    const connectionMeta: ConnectionMeta = {
      realmId: token.realmId,
      connectedAt: new Date().toISOString(),
      ...meta,
    };

    if (existing >= 0) {
      connections.splice(existing, 1);
    }
    // Most recently added/updated connection becomes the default (first in list)
    connections.unshift(connectionMeta);

    await this.kvStore.put("qbo-connections", JSON.stringify(connections, null, 2));

    // Update legacy key (most recent connection becomes default for old code)
    await this.kvStore.put("qbo-token", serialized);

    logger.info("Connection added", {
      realmId: token.realmId,
      companyName: meta?.companyName,
      totalConnections: connections.length,
    });
  }

  /**
   * Remove a connection by realmId.
   */
  async removeConnection(realmId: string): Promise<boolean> {
    const connections = await this.listConnections();
    const index = connections.findIndex(c => c.realmId === realmId);
    if (index < 0) return false;

    connections.splice(index, 1);
    await this.kvStore.put("qbo-connections", JSON.stringify(connections, null, 2));

    try {
      await this.kvStore.delete(`qbo-conn:${realmId}`);
    } catch {
      // KV delete may not be available in all environments
    }

    // Update legacy key to next available connection
    if (connections.length > 0) {
      const nextToken = await this.kvStore.get(`qbo-conn:${connections[0].realmId}`);
      if (nextToken) await this.kvStore.put("qbo-token", nextToken);
    } else {
      try {
        await this.kvStore.delete("qbo-token");
      } catch {
        // Best effort
      }
    }

    logger.info("Connection removed", { realmId, remainingConnections: connections.length });
    return true;
  }

  // ── OAuth Flow ───────────────────────────────────────────────────

  /**
   * Generate an OAuth authorization URL for connecting a new QuickBooks company.
   */
  generateAuthUrl(state?: string): string {
    const authManager = new QBOAuthManager({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUri: this.config.redirectUri,
      environment: this.config.environment,
    });
    return authManager.generateAuthUrl(state);
  }

  /**
   * Exchange an authorization code for tokens and store the connection.
   * Returns the token for further processing (e.g., fetching company info).
   */
  async exchangeCode(code: string, realmId: string): Promise<QBOToken> {
    const authManager = new QBOAuthManager({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUri: this.config.redirectUri,
      environment: this.config.environment,
      kvStore: this.kvStore,
      kvKey: `qbo-conn:${realmId}`,
    });

    const token = await authManager.exchangeCode(code, realmId);
    // addConnection handles the index and legacy key
    await this.addConnection(token);
    return token;
  }
}
