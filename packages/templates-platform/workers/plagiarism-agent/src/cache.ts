/**
 * Signature and Embedding Cache
 * 
 * Caches computed MinHash signatures and OpenAI embeddings to avoid
 * recomputation and reduce API costs.
 * 
 * Canon: Compute once, use many.
 */

import type { MinHashSignature } from './minhash';

// =============================================================================
// TYPES
// =============================================================================

export interface CachedSignature {
  contentHash: string;
  templateId?: string;
  signatureType: 'css' | 'html' | 'combined' | 'js_function';
  signature: MinHashSignature;
  createdAt: string;
}

export interface CachedEmbedding {
  contentHash: string;
  modelVersion: string;
  featureType: 'html' | 'css' | 'js' | 'webflow' | 'dom';
  embedding: number[];
  dimensions: number;
  expiresAt?: string;
}

export interface CacheStats {
  signatures: {
    count: number;
    totalAccesses: number;
    avgAccessesPerEntry: number;
  };
  embeddings: {
    count: number;
    expiredCount: number;
  };
}

// D1 Database interface (subset needed for cache)
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Results<T>>;
}

interface D1Result {
  success: boolean;
  meta: { changes: number };
}

interface D1Results<T> {
  results: T[];
}

// =============================================================================
// HASH UTILITIES
// =============================================================================

/**
 * Compute SHA-256 hash of content for cache key.
 * Normalizes whitespace before hashing.
 */
export async function computeContentHash(content: string): Promise<string> {
  // Normalize whitespace
  const normalized = content.replace(/\s+/g, ' ').trim();
  
  // Use Web Crypto API (available in Workers)
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

// =============================================================================
// SIGNATURE CACHE
// =============================================================================

/**
 * Get cached signature by content hash.
 */
export async function getCachedSignature(
  db: D1Database,
  contentHash: string,
  signatureType: string
): Promise<MinHashSignature | null> {
  try {
    const row = await db.prepare(`
      SELECT signature_data, shingle_count
      FROM signature_cache
      WHERE content_hash = ? AND signature_type = ?
    `).bind(contentHash, signatureType).first<{
      signature_data: string;
      shingle_count: number;
    }>();
    
    if (!row) return null;
    
    // Update access stats
    await db.prepare(`
      UPDATE signature_cache 
      SET last_accessed_at = datetime('now'),
          access_count = access_count + 1
      WHERE content_hash = ? AND signature_type = ?
    `).bind(contentHash, signatureType).run();
    
    const signature = JSON.parse(row.signature_data);
    return signature;
    
  } catch (error) {
    console.error('[Cache] Error getting cached signature:', error);
    return null;
  }
}

/**
 * Store signature in cache.
 */
export async function cacheSignature(
  db: D1Database,
  contentHash: string,
  signatureType: string,
  signature: MinHashSignature,
  templateId?: string
): Promise<void> {
  try {
    await db.prepare(`
      INSERT OR REPLACE INTO signature_cache 
      (content_hash, template_id, signature_type, signature_data, shingle_count, created_at, last_accessed_at, access_count)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1)
    `).bind(
      contentHash,
      templateId || null,
      signatureType,
      JSON.stringify(signature),
      signature.numShingles
    ).run();
    
  } catch (error) {
    // Cache write failures are non-fatal
    console.error('[Cache] Error caching signature:', error);
  }
}

/**
 * Get or compute signature with caching.
 * This is the main entry point for cached signature computation.
 */
export async function getOrComputeSignature(
  db: D1Database,
  content: string,
  signatureType: 'css' | 'html' | 'combined' | 'js_function',
  computeFn: () => MinHashSignature,
  templateId?: string
): Promise<MinHashSignature> {
  // Compute content hash
  const contentHash = await computeContentHash(content);
  
  // Try cache first
  const cached = await getCachedSignature(db, contentHash, signatureType);
  if (cached) {
    return cached;
  }
  
  // Compute and cache
  const signature = computeFn();
  await cacheSignature(db, contentHash, signatureType, signature, templateId);
  
  return signature;
}

// =============================================================================
// EMBEDDING CACHE
// =============================================================================

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_TTL_DAYS = 30; // Cache embeddings for 30 days

/**
 * Get cached embedding by content hash.
 */
export async function getCachedEmbedding(
  db: D1Database,
  contentHash: string,
  featureType: string
): Promise<number[] | null> {
  try {
    const row = await db.prepare(`
      SELECT embedding_data, expires_at
      FROM embedding_cache
      WHERE content_hash = ? 
        AND model_version = ? 
        AND feature_type = ?
        AND (expires_at IS NULL OR expires_at > datetime('now'))
    `).bind(contentHash, EMBEDDING_MODEL, featureType).first<{
      embedding_data: string;
      expires_at: string | null;
    }>();
    
    if (!row) return null;
    
    return JSON.parse(row.embedding_data);
    
  } catch (error) {
    console.error('[Cache] Error getting cached embedding:', error);
    return null;
  }
}

/**
 * Store embedding in cache.
 */
export async function cacheEmbedding(
  db: D1Database,
  contentHash: string,
  featureType: string,
  embedding: number[]
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + EMBEDDING_TTL_DAYS);
    
    await db.prepare(`
      INSERT OR REPLACE INTO embedding_cache 
      (content_hash, model_version, feature_type, embedding_data, dimensions, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
    `).bind(
      contentHash,
      EMBEDDING_MODEL,
      featureType,
      JSON.stringify(embedding),
      embedding.length,
      expiresAt.toISOString()
    ).run();
    
  } catch (error) {
    console.error('[Cache] Error caching embedding:', error);
  }
}

/**
 * Get or compute embedding with caching.
 */
export async function getOrComputeEmbedding(
  db: D1Database,
  content: string,
  featureType: 'html' | 'css' | 'js' | 'webflow' | 'dom',
  computeFn: () => Promise<number[]>
): Promise<number[]> {
  const contentHash = await computeContentHash(content);
  
  // Try cache first
  const cached = await getCachedEmbedding(db, contentHash, featureType);
  if (cached) {
    return cached;
  }
  
  // Compute and cache
  const embedding = await computeFn();
  await cacheEmbedding(db, contentHash, featureType, embedding);
  
  return embedding;
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Get cache statistics.
 */
export async function getCacheStats(db: D1Database): Promise<CacheStats> {
  try {
    const [sigStats, embStats, expiredCount] = await Promise.all([
      db.prepare(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(access_count), 0) as total_accesses,
          COALESCE(AVG(access_count), 0) as avg_accesses
        FROM signature_cache
      `).first<{ count: number; total_accesses: number; avg_accesses: number }>(),
      
      db.prepare(`
        SELECT COUNT(*) as count FROM embedding_cache
      `).first<{ count: number }>(),
      
      db.prepare(`
        SELECT COUNT(*) as count FROM embedding_cache WHERE expires_at < datetime('now')
      `).first<{ count: number }>()
    ]);
    
    return {
      signatures: {
        count: sigStats?.count || 0,
        totalAccesses: sigStats?.total_accesses || 0,
        avgAccessesPerEntry: sigStats?.avg_accesses || 0
      },
      embeddings: {
        count: embStats?.count || 0,
        expiredCount: expiredCount?.count || 0
      }
    };
    
  } catch (error) {
    console.error('[Cache] Error getting stats:', error);
    return {
      signatures: { count: 0, totalAccesses: 0, avgAccessesPerEntry: 0 },
      embeddings: { count: 0, expiredCount: 0 }
    };
  }
}

/**
 * Clean up expired embeddings.
 */
export async function cleanupExpiredCache(db: D1Database): Promise<number> {
  try {
    const result = await db.prepare(`
      DELETE FROM embedding_cache WHERE expires_at < datetime('now')
    `).run();
    
    return result.meta.changes;
    
  } catch (error) {
    console.error('[Cache] Error cleaning up expired cache:', error);
    return 0;
  }
}

/**
 * Clear all cache entries (use with caution).
 */
export async function clearAllCache(db: D1Database): Promise<void> {
  await Promise.all([
    db.prepare('DELETE FROM signature_cache').run(),
    db.prepare('DELETE FROM embedding_cache').run()
  ]);
}
