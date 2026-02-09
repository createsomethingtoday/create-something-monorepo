/**
 * D1TokenStore — Cloudflare D1-based token persistence
 *
 * For Cloudflare Workers deployments where you need SQL queries,
 * relationships, or more complex token management than KV provides.
 *
 * Table schema (create via migration):
 *   CREATE TABLE IF NOT EXISTS tokens (
 *     account_id TEXT PRIMARY KEY,
 *     access_token TEXT NOT NULL,
 *     refresh_token TEXT,
 *     expires_at INTEGER,
 *     scopes TEXT,
 *     updated_at INTEGER NOT NULL DEFAULT (unixepoch())
 *   );
 */

import type { TokenSet, TokenStore } from '../context.js';

/**
 * Minimal D1Database interface — matches Cloudflare Workers D1 API
 * without requiring the full @cloudflare/workers-types dependency.
 */
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
}

/** Row shape from the tokens table */
interface TokenRow {
  account_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
  scopes: string | null;
  updated_at: number;
}

export class D1TokenStore implements TokenStore {
  private readonly db: D1Database;
  private readonly table: string;

  /**
   * @param db    - Cloudflare D1 database binding
   * @param table - Table name (default: 'tokens')
   */
  constructor(db: D1Database, table: string = 'tokens') {
    this.db = db;
    this.table = table;
  }

  async get(accountId: string): Promise<TokenSet | null> {
    const row = await this.db
      .prepare(`SELECT * FROM ${this.table} WHERE account_id = ?`)
      .bind(accountId)
      .first<TokenRow>();

    if (!row) return null;

    return {
      access_token: row.access_token,
      refresh_token: row.refresh_token ?? undefined,
      expires_at: row.expires_at ?? undefined,
      scopes: row.scopes ? row.scopes.split(' ') : undefined,
    };
  }

  async set(accountId: string, tokens: TokenSet): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO ${this.table}
         (account_id, access_token, refresh_token, expires_at, scopes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        accountId,
        tokens.access_token,
        tokens.refresh_token ?? null,
        tokens.expires_at ?? null,
        tokens.scopes?.join(' ') ?? null,
        Math.floor(Date.now() / 1000),
      )
      .run();
  }

  async delete(accountId: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM ${this.table} WHERE account_id = ?`)
      .bind(accountId)
      .run();
  }

  /**
   * SQL migration to create the tokens table.
   *
   * Run this via `wrangler d1 migrations apply` or manually.
   */
  static get migration(): string {
    return `
CREATE TABLE IF NOT EXISTS tokens (
  account_id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER,
  scopes TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
    `.trim();
  }
}
