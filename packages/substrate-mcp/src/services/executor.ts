/**
 * Execution abstractions for D1 and R2 — makes the service layer
 * work with both stdio mode (REST/S3 APIs) and Worker mode (bindings).
 *
 * Stdio: D1 REST API, R2 S3-compatible API
 * Worker: env.DB binding, env.FILES binding
 */

import type { D1Config, R2Config } from '../types.js';
import { CF_API_BASE } from '../constants.js';

// ═══════════════════════════════════════════════════════════════════
// D1 Executor
// ═══════════════════════════════════════════════════════════════════

export interface QueryResult {
  results: Record<string, unknown>[];
  meta: { changes: number };
}

/** Execute a SQL query against D1. Both modes produce the same shape. */
export type D1Exec = (sql: string, params?: unknown[]) => Promise<QueryResult>;

/**
 * Create a D1Exec from Cloudflare REST API (stdio mode).
 * Uses CF_API_TOKEN + D1 database ID to call the HTTP endpoint.
 */
export function restExecutor(config: D1Config): D1Exec {
  const url = `${CF_API_BASE}/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;

  return async (sql: string, params: unknown[] = []): Promise<QueryResult> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`D1 query failed (${res.status}): ${text}`);
    }
    const body = await res.json() as {
      result: Array<{ results: Record<string, unknown>[]; meta: { changes: number } }>;
    };
    return body.result[0];
  };
}

/**
 * Create a D1Exec from a D1Database Worker binding.
 * Uses env.DB directly — no REST API overhead.
 */
export function bindingExecutor(db: D1Database): D1Exec {
  return async (sql: string, params: unknown[] = []): Promise<QueryResult> => {
    const stmt = db.prepare(sql).bind(...params);
    const result = await stmt.all();
    return {
      results: result.results as Record<string, unknown>[],
      meta: { changes: result.meta?.changes ?? 0 },
    };
  };
}

// ═══════════════════════════════════════════════════════════════════
// R2 Store
// ═══════════════════════════════════════════════════════════════════

/** Unified interface for R2 file operations. */
export interface R2Store {
  put(key: string, data: ArrayBuffer, contentType: string): Promise<void>;
  get(key: string): Promise<ArrayBuffer | null>;
  delete(key: string): Promise<void>;
}

/**
 * Create an R2Store from a Worker R2Bucket binding.
 * Uses env.FILES directly — no S3 signing overhead.
 */
export function bindingR2Store(bucket: R2Bucket): R2Store {
  return {
    async put(key: string, data: ArrayBuffer, contentType: string): Promise<void> {
      await bucket.put(key, data, {
        httpMetadata: { contentType },
      });
    },
    async get(key: string): Promise<ArrayBuffer | null> {
      const obj = await bucket.get(key);
      if (!obj) return null;
      return obj.arrayBuffer();
    },
    async delete(key: string): Promise<void> {
      await bucket.delete(key);
    },
  };
}

/**
 * Create an R2Store from S3-compatible API (stdio mode).
 * Wraps the existing SigV4 signing from r2.ts.
 */
export function s3R2Store(config: R2Config): R2Store {
  // Lazy-import the S3 functions to avoid loading crypto signing in Worker mode
  let _mod: typeof import('./r2.js') | null = null;
  const getMod = async () => {
    if (!_mod) _mod = await import('./r2.js');
    return _mod;
  };

  return {
    async put(key: string, data: ArrayBuffer, contentType: string): Promise<void> {
      const mod = await getMod();
      await mod.putObject(config, key, data, contentType);
    },
    async get(key: string): Promise<ArrayBuffer | null> {
      const mod = await getMod();
      return mod.getObject(config, key);
    },
    async delete(key: string): Promise<void> {
      const mod = await getMod();
      await mod.deleteObject(config, key);
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// D1Database type (for Worker builds that don't have @cloudflare/workers-types)
// ═══════════════════════════════════════════════════════════════════

// The D1Database and R2Bucket types are provided by @cloudflare/workers-types
// which is a devDependency. In the Worker build, wrangler provides them globally.
// For the src/ build, we declare minimal shapes here.

declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
  }
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    all(): Promise<D1Result>;
  }
  interface D1Result {
    results: unknown[];
    meta?: { changes?: number };
  }
  interface R2Bucket {
    put(key: string, value: ArrayBuffer | ReadableStream, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
    get(key: string): Promise<R2ObjectBody | null>;
    delete(key: string): Promise<void>;
    head(key: string): Promise<unknown | null>;
  }
  interface R2ObjectBody {
    arrayBuffer(): Promise<ArrayBuffer>;
  }
}
