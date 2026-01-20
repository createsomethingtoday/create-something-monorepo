/**
 * Template Indexer for Vector Similarity Search
 * 
 * Indexes templates into Vectorize for automatic plagiarism discovery
 * 
 * Enhanced with:
 * - Bloom filter for URL deduplication (skip DB queries for new URLs)
 * - HyperLogLog for cardinality tracking (template counts, colors, patterns)
 * - JS function extraction for component-level detection
 * 
 * Canon: Index once, query forever. Convergence reveals truth.
 */

import OpenAI from 'openai';
import {
  fetchPublishedContent,
  fetchAllTemplateContent,
  extractCodeFeatures,
  type FetchedContent,
  type CodeFeatures
} from './vector-similarity';
import { SketchManager } from './sketches';
import { 
  extractFunctions, 
  extractAnimationFingerprints,
  extractWebflowPatterns,
  type ExtractedFunction 
} from './js-analysis';
import { extractCSSPatterns } from './minhash';

// =============================================================================
// TYPES
// =============================================================================

export interface TemplateMetadata {
  name: string;
  creator: string;
  url: string;
  published_at?: number;
}

export interface IndexedTemplate {
  id: string;
  similarity: number;
  name: string;
  url: string;
  creator: string;
  indexed_at: number;
}

interface Env {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  OPENAI_API_KEY: string;
}

// Cached sketch manager (initialized once per worker instance)
let sketchManager: SketchManager | null = null;

/**
 * Get or initialize the sketch manager.
 */
export async function getSketchManager(db: D1Database): Promise<SketchManager> {
  if (!sketchManager) {
    sketchManager = new SketchManager(db);
    await sketchManager.init();
  }
  return sketchManager;
}

// =============================================================================
// EMBEDDING COMPUTATION
// =============================================================================

/**
 * Compute a single combined embedding for all features
 */
async function computeCombinedEmbedding(
  features: CodeFeatures,
  apiKey: string
): Promise<number[]> {
  const openai = new OpenAI({ apiKey });

  // Combine all features into one text for a unified embedding
  const combined = `
[HTML Structure] ${features.html_structure}
[CSS Patterns] ${features.css_patterns}
[JavaScript] ${features.js_logic}
[Webflow Interactions] ${features.webflow_interactions}
[DOM Hierarchy] ${features.dom_hierarchy}
  `.trim();

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: combined,
      dimensions: 512
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('[Indexer] Embedding error:', error);
    throw error;
  }
}

// =============================================================================
// INDEXING
// =============================================================================

/**
 * Index a single template into Vectorize
 * 
 * Enhanced with:
 * - Bloom filter pre-check (skip if definitely already indexed)
 * - HyperLogLog cardinality tracking
 * - JS function extraction for component-level detection
 */
export async function indexTemplate(
  templateId: string,
  templateUrl: string,
  metadata: TemplateMetadata,
  env: Env,
  multiPage = true // Default to multi-page scanning
): Promise<boolean> {
  console.log(`[Indexer] Indexing ${templateId}: ${metadata.name}...`);

  try {
    // 0. Initialize sketch manager
    const sketches = await getSketchManager(env.DB);
    
    // 1. Bloom filter pre-check: skip if URL definitely not indexed
    // Note: Bloom filter "contains" means "maybe indexed", so we still need to
    // check the database for a definitive answer. But if "not contains", we know
    // for certain this is a new URL.
    const maybeExists = sketches.maybeIndexed(templateUrl);
    if (maybeExists) {
      // Could be a false positive - check DB for definitive answer
      const existing = await env.DB.prepare(
        'SELECT id FROM template_minhash WHERE url = ? LIMIT 1'
      ).bind(templateUrl).first();
      
      if (existing) {
        console.log(`[Indexer] Template ${templateId} already indexed, skipping`);
        return true;
      }
    }
    // If maybeExists is false, we know for certain this URL hasn't been indexed

    // 2. Fetch content (multi-page or single-page)
    const content = multiPage 
      ? await fetchAllTemplateContent(templateUrl, 10) // Scan up to 10 pages
      : await fetchPublishedContent(templateUrl);
      
    if (!content) {
      console.log(`[Indexer] Failed to fetch content for ${templateId}`);
      return false;
    }

    console.log(`[Indexer] Content fetched for ${templateId} (multiPage=${multiPage})`);

    // 3. Extract features for embedding
    const features = extractCodeFeatures(content);
    console.log(`[Indexer] Features extracted for ${templateId}`);

    // 4. Compute combined embedding
    const embedding = await computeCombinedEmbedding(features, env.OPENAI_API_KEY);
    console.log(`[Indexer] Embedding computed for ${templateId} (${embedding.length} dimensions)`);

    // 5. Store in Vectorize
    await env.VECTORIZE.upsert([{
      id: templateId,
      values: embedding,
      metadata: {
        name: metadata.name,
        url: templateUrl,
        creator: metadata.creator,
        indexed_at: Date.now()
      }
    }]);

    // 6. Update sketches for cardinality tracking
    sketches.markIndexed(templateUrl);
    sketches.trackTemplate(templateId);
    
    // Track CSS patterns and colors
    if (content.css) {
      const cssPatterns = extractCSSPatterns(content.css);
      sketches.trackColors(cssPatterns.colors);
      sketches.trackPatterns([
        ...cssPatterns.gradients,
        ...cssPatterns.animations,
        ...cssPatterns.keyframes
      ]);
    }

    // 7. Extract and store JS functions for component-level detection
    if (content.javascript && content.javascript.length > 100) {
      await indexJsFunctions(env.DB, templateId, templateUrl, content.javascript);
    }

    // 8. Save sketches (batched, only if dirty)
    await sketches.save();

    console.log(`[Indexer] ✅ Successfully indexed ${templateId}`);
    return true;

  } catch (error: any) {
    console.error(`[Indexer] ❌ Error indexing ${templateId}:`, error.message);
    return false;
  }
}

/**
 * Index JavaScript functions from a template for component-level detection.
 */
async function indexJsFunctions(
  db: D1Database,
  templateId: string,
  templateUrl: string,
  javascript: string
): Promise<void> {
  try {
    // Extract functions
    const functions = extractFunctions(javascript);
    if (functions.length === 0) return;

    console.log(`[Indexer] Extracted ${functions.length} JS functions from ${templateId}`);

    // Hash normalized bodies
    const encoder = new TextEncoder();
    
    for (const func of functions) {
      // Compute hash of normalized body
      const data = encoder.encode(func.normalizedBody);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Store function signature
      await db.prepare(`
        INSERT OR REPLACE INTO template_js_functions 
        (template_id, template_url, function_name, function_type, is_async, line_count, normalized_hash, start_pos, end_pos, indexed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        templateId,
        templateUrl,
        func.name,
        func.type,
        func.isAsync ? 1 : 0,
        func.lineCount,
        hashHex,
        func.startPos,
        func.endPos,
        Date.now()
      ).run();
    }

    // Extract and store animation fingerprints
    const fingerprints = extractAnimationFingerprints(javascript);
    for (const fp of fingerprints) {
      // Determine category from fingerprint
      let category = 'other';
      if (fp.startsWith('tween:') || fp.startsWith('timeline:')) category = 'gsap';
      else if (fp.startsWith('st:')) category = 'scrolltrigger';
      else if (fp.includes('webflow')) category = 'webflow';
      else if (fp.includes('intersection')) category = 'intersection';

      await db.prepare(`
        INSERT OR REPLACE INTO template_animation_fingerprints
        (template_id, fingerprint, category, indexed_at)
        VALUES (?, ?, ?, ?)
      `).bind(templateId, fp, category, Date.now()).run();
    }

    console.log(`[Indexer] Stored ${functions.length} functions, ${fingerprints.length} animation fingerprints for ${templateId}`);

  } catch (error: any) {
    console.error(`[Indexer] Error indexing JS functions:`, error.message);
    // Non-fatal - continue with indexing
  }
}

/**
 * Find templates with duplicate JS functions.
 */
export async function findDuplicateFunctions(
  db: D1Database,
  templateId: string
): Promise<Array<{
  templateId: string;
  functionName: string;
  matchCount: number;
}>> {
  const results = await db.prepare(`
    SELECT 
      other.template_id,
      this.function_name,
      COUNT(*) as match_count
    FROM template_js_functions this
    JOIN template_js_functions other 
      ON this.normalized_hash = other.normalized_hash
      AND this.template_id != other.template_id
    WHERE this.template_id = ?
    GROUP BY other.template_id, this.function_name
    ORDER BY match_count DESC
    LIMIT 20
  `).bind(templateId).all();

  return (results.results || []).map(r => ({
    templateId: (r as any).template_id,
    functionName: (r as any).function_name,
    matchCount: (r as any).match_count
  }));
}

// =============================================================================
// QUERYING
// =============================================================================

/**
 * Find similar templates for a given URL
 */
export async function findSimilarTemplates(
  queryUrl: string,
  env: Env,
  topK: number = 10
): Promise<IndexedTemplate[]> {
  console.log(`[Query] Finding similar templates for: ${queryUrl}`);

  try {
    // 1. Fetch and extract features
    const content = await fetchPublishedContent(queryUrl);
    if (!content) {
      console.log('[Query] Failed to fetch content');
      return [];
    }

    const features = extractCodeFeatures(content);
    console.log('[Query] Features extracted');

    // 2. Compute embedding
    const embedding = await computeCombinedEmbedding(features, env.OPENAI_API_KEY);
    console.log('[Query] Embedding computed');

    // 3. Query Vectorize
    const results = await env.VECTORIZE.query(embedding, {
      topK,
      returnValues: false,
      returnMetadata: true
    });

    console.log(`[Query] Found ${results.matches.length} similar templates`);

    // 4. Format results
    return results.matches.map(match => ({
      id: match.id,
      similarity: match.score,
      name: (match.metadata?.name as string) || 'Unknown',
      url: (match.metadata?.url as string) || '',
      creator: (match.metadata?.creator as string) || 'Unknown',
      indexed_at: (match.metadata?.indexed_at as number) || 0
    }));

  } catch (error: any) {
    console.error('[Query] Error:', error.message);
    return [];
  }
}

/**
 * Get statistics about the index
 */
export async function getIndexStats(env: Env): Promise<{
  total: number;
  sample: any[];
}> {
  try {
    // Query for a random vector to get sample results
    const randomVector = new Array(512).fill(0).map(() => Math.random());
    
    const results = await env.VECTORIZE.query(randomVector, {
      topK: 5,
      returnMetadata: true
    });

    return {
      total: -1, // Vectorize doesn't provide total count directly
      sample: results.matches.map(m => ({
        id: m.id,
        metadata: m.metadata
      }))
    };
  } catch (error: any) {
    console.error('[Stats] Error:', error.message);
    return { total: 0, sample: [] };
  }
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Index multiple templates in batch
 */
export async function batchIndexTemplates(
  templates: Array<{
    id: string;
    url: string;
    metadata: TemplateMetadata;
  }>,
  env: Env
): Promise<{
  success: number;
  failed: number;
}> {
  console.log(`[Batch] Starting batch index of ${templates.length} templates...`);

  let success = 0;
  let failed = 0;

  // Process in smaller batches to respect rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < templates.length; i += BATCH_SIZE) {
    const batch = templates.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(t => indexTemplate(t.id, t.url, t.metadata, env))
    );

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        success++;
      } else {
        failed++;
      }
    });

    // Rate limiting: wait between batches
    if (i + BATCH_SIZE < templates.length) {
      console.log(`[Batch] Waiting before next batch... (${success + failed}/${templates.length})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`[Batch] Complete: ${success} succeeded, ${failed} failed`);
  return { success, failed };
}
