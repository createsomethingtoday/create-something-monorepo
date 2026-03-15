/**
 * FileTokenStore — file-based token persistence
 *
 * For local/stdio deployments. Stores tokens as JSON in a file,
 * keyed by accountId.
 *
 * File format:
 *   { "account-123": { "access_token": "...", ... }, ... }
 *
 * The file is gitignored by convention (.tokens.json).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { TokenSet, TokenStore } from '../context.js';

export class FileTokenStore implements TokenStore {
  private readonly filePath: string;
  private cache: Record<string, TokenSet> | null = null;

  /**
   * @param filePath - Path to the token file (default: '.tokens.json')
   */
  constructor(filePath: string = '.tokens.json') {
    this.filePath = filePath;
  }

  async get(accountId: string): Promise<TokenSet | null> {
    const data = await this.load();
    return data[accountId] ?? null;
  }

  async set(accountId: string, tokens: TokenSet): Promise<void> {
    const data = await this.load();
    data[accountId] = tokens;
    await this.save(data);
  }

  async delete(accountId: string): Promise<void> {
    const data = await this.load();
    delete data[accountId];
    await this.save(data);
  }

  private async load(): Promise<Record<string, TokenSet>> {
    if (this.cache) return this.cache;

    try {
      const raw = await readFile(this.filePath, 'utf-8');
      this.cache = JSON.parse(raw) as Record<string, TokenSet>;
      return this.cache;
    } catch {
      // File doesn't exist yet — start fresh
      this.cache = {};
      return this.cache;
    }
  }

  private async save(data: Record<string, TokenSet>): Promise<void> {
    this.cache = data;

    // Ensure directory exists
    const dir = dirname(this.filePath);
    if (dir !== '.') {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
