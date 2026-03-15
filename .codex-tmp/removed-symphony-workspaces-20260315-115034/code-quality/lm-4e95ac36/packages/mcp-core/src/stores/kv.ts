/**
 * KVTokenStore — Cloudflare KV-based token persistence
 *
 * For Cloudflare Workers deployments. Stores each account's tokens
 * as a separate KV key.
 *
 * Key format: `tokens:${accountId}`
 *
 * Requires a KVNamespace binding in the Worker's env.
 */

import type { TokenSet, TokenStore } from '../context.js';

/**
 * Minimal KVNamespace interface — matches Cloudflare Workers KV API
 * without requiring the full @cloudflare/workers-types dependency.
 */
export interface KVNamespace {
  get(key: string, type: 'json'): Promise<unknown | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export class KVTokenStore implements TokenStore {
  private readonly namespace: KVNamespace;
  private readonly prefix: string;

  /**
   * @param namespace - Cloudflare KV namespace binding
   * @param prefix    - Key prefix (default: 'tokens')
   */
  constructor(namespace: KVNamespace, prefix: string = 'tokens') {
    this.namespace = namespace;
    this.prefix = prefix;
  }

  async get(accountId: string): Promise<TokenSet | null> {
    const key = `${this.prefix}:${accountId}`;
    const data = await this.namespace.get(key, 'json');
    return (data as TokenSet) ?? null;
  }

  async set(accountId: string, tokens: TokenSet): Promise<void> {
    const key = `${this.prefix}:${accountId}`;
    await this.namespace.put(key, JSON.stringify(tokens));
  }

  async delete(accountId: string): Promise<void> {
    const key = `${this.prefix}:${accountId}`;
    await this.namespace.delete(key);
  }
}
