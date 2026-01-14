/**
 * Plagiarism Detection Agent
 *
 * Three-tier hybrid system:
 * - Tier 1: Workers AI screening (free)
 * - Tier 2: Claude Haiku analysis ($0.02/case)
 * - Tier 3: Claude Sonnet judgment ($0.15/case)
 *
 * Canon: The infrastructure recedes; decisions emerge.
 */

import Anthropic from '@anthropic-ai/sdk';
import puppeteer from '@cloudflare/puppeteer';
import { runAgentInvestigation, saveAgentState, loadAgentState } from './agent-mode';
import { 
  normalizeWebflowUrl, 
  extractUrls, 
  analyzeVectorSimilarity,
  fetchPublishedContent,
  type VectorSimilarity 
} from './vector-similarity';
import {
  indexTemplate,
  findSimilarTemplates,
  getIndexStats,
  type TemplateMetadata
} from './indexer';
import {
  computeCssMinHash,
  computeHtmlMinHash,
  computeCombinedMinHash,
  estimateSimilarity,
  serializeSignatureCompact,
  deserializeSignatureCompact,
  compareCss,
  compareCustomClasses,
  compareProperties,
  extractCustomClasses,
  computeLSHBandHashes,
  serializeLSHBands,
  type MinHashSignature,
  type SimilarityResult
} from './minhash';

// =============================================================================
// TYPES
// =============================================================================

interface Env {
  DB: D1Database;
  SCREENSHOTS: R2Bucket;
  CASE_QUEUE: Queue;
  AI: any;
  BROWSER: any;
  VECTORIZE: VectorizeIndex;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  AIRTABLE_TABLE_ID: string;
}

interface PlagiarismCase {
  id: string;
  airtableRecordId: string;
  reporterEmail: string;
  originalUrl: string;
  allegedCopyUrl: string;
  complaintText: string;
  allegedCreator: string;
  status: 'pending' | 'processing' | 'completed';
  createdAt: number;
}

type FinalDecision = 'no_violation' | 'minor' | 'major';

// =============================================================================
// EVIDENCE PERSISTENCE (Transparency)
// =============================================================================

async function storeEvidence(
  env: Env,
  caseId: string,
  kind: string,
  data: unknown
): Promise<void> {
  try {
    await env.DB.prepare(`
      INSERT INTO plagiarism_evidence (case_id, kind, data_json, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(
      caseId,
      kind,
      JSON.stringify(data),
      Date.now()
    ).run();
  } catch (error: any) {
    console.log('[Evidence] Failed to store evidence (non-fatal):', error?.message || String(error));
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TIER_COSTS = {
  TIER1: 0.0,  // Workers AI (free)
  TIER2: 0.02, // Claude Haiku
  TIER3: 0.15  // Claude Sonnet
} as const;

const DECISION_TO_AIRTABLE: Record<FinalDecision, string> = {
  'no_violation': 'No violation',
  'minor': 'Minor violation',
  'major': 'Major violation'
};

const DECISION_TO_OUTCOME: Record<FinalDecision, string> = {
  'no_violation': '',
  'minor': 'Notified Creator(s)',
  'major': 'Delisted template'
};

const AIRTABLE_FIELDS = {
  DECISION: 'Decision',
  OUTCOME: 'Outcome',
  EXTENT: '✏️ Extent of copied content',
  TRANSFORMATION: '✏️ Level of Transformation & Originality Added',
  IMPORTANCE: '✏️ Importance of overall work',
  IMPACT: '✏️ Marketplace Impact & Intent'
} as const;

// Confidence threshold for auto-action on major violations
// Below this threshold, flag for human review instead of auto-delisting
const MAJOR_VIOLATION_CONFIDENCE_THRESHOLD = 0.9;

// Tier 2 → Tier 3 escalation threshold
// Cases with confidence below this get code-level analysis
const TIER3_ESCALATION_THRESHOLD = 0.75;

// =============================================================================
// MINHASH HELPERS
// =============================================================================

/**
 * Fetch HTML, CSS, and JS content from a template URL
 */
async function fetchTemplateContent(templateUrl: string): Promise<{
  html: string;
  css: string;
  js: string;
}> {
  const content = await fetchPublishedContent(templateUrl);
  
  if (!content) {
    return { html: '', css: '', js: '' };
  }
  
  return {
    html: content.html || '',
    css: content.css || '',
    js: content.javascript || ''
  };
}

/**
 * Interpret MinHash Jaccard similarity as a plagiarism verdict
 * 
 * Unlike embedding cosine similarity (which has a ~95% baseline for Webflow),
 * Jaccard similarity has a much lower baseline because it measures actual
 * set intersection of shingles.
 */
function interpretMinHashSimilarity(jaccard: number): {
  verdict: 'high_similarity' | 'moderate_similarity' | 'low_similarity' | 'distinct';
  description: string;
  recommendation: string;
} {
  if (jaccard >= 0.7) {
    return {
      verdict: 'high_similarity',
      description: `${(jaccard * 100).toFixed(1)}% Jaccard similarity indicates very similar structure`,
      recommendation: 'Strong evidence of copying - recommend MAJOR violation'
    };
  } else if (jaccard >= 0.4) {
    return {
      verdict: 'moderate_similarity',
      description: `${(jaccard * 100).toFixed(1)}% Jaccard similarity indicates significant overlap`,
      recommendation: 'Possible partial copying - recommend manual review'
    };
  } else if (jaccard >= 0.2) {
    return {
      verdict: 'low_similarity',
      description: `${(jaccard * 100).toFixed(1)}% Jaccard similarity indicates some common patterns`,
      recommendation: 'Likely coincidental similarity - recommend MINOR or NO violation'
    };
  } else {
    return {
      verdict: 'distinct',
      description: `${(jaccard * 100).toFixed(1)}% Jaccard similarity indicates distinct templates`,
      recommendation: 'No significant similarity - recommend NO violation'
    };
  }
}

/**
 * Combined interpretation using multiple signals
 * 
 * This catches plagiarism even when:
 * - Class names are changed (uses property comparison)
 * - Properties are reordered (uses fingerprints)
 * - Colors/gradients/animations are copied (uses pattern matching)
 */
function interpretCombinedSimilarity(
  classJaccard: number,
  declarationJaccard: number,
  patternMatches: { colors: number; gradients: number; animations: number; customProperties: number; keyframes: number }
): {
  verdict: 'high_similarity' | 'moderate_similarity' | 'low_similarity' | 'distinct';
  description: string;
  recommendation: string;
  signals: { name: string; value: string; weight: string }[];
} {
  // Calculate pattern match score
  const patternScore = (
    (patternMatches.gradients > 0 ? 0.3 : 0) +      // Gradients are highly specific
    (patternMatches.animations > 0 ? 0.2 : 0) +     // Animations are template-specific
    (patternMatches.keyframes > 0 ? 0.2 : 0) +      // Keyframes are template-specific
    (patternMatches.customProperties > 2 ? 0.2 : 0) + // Multiple CSS vars = same design system
    (patternMatches.colors > 5 ? 0.1 : 0)           // Many shared colors
  );
  
  // Weighted combination of signals
  const combinedScore = (
    classJaccard * 0.3 +           // Class names (can be renamed)
    declarationJaccard * 0.4 +     // Property blocks (hard to change)
    patternScore * 0.3             // Specific patterns (very hard to change)
  );
  
  const signals = [
    { name: 'Class names', value: `${(classJaccard * 100).toFixed(1)}%`, weight: '30%' },
    { name: 'Property blocks', value: `${(declarationJaccard * 100).toFixed(1)}%`, weight: '40%' },
    { name: 'Pattern matches', value: `${(patternScore * 100).toFixed(0)}%`, weight: '30%' }
  ];
  
  if (combinedScore >= 0.5 || declarationJaccard >= 0.4) {
    return {
      verdict: 'high_similarity',
      description: `Combined score ${(combinedScore * 100).toFixed(1)}% indicates significant structural copying`,
      recommendation: 'Strong evidence of copying - recommend MAJOR violation',
      signals
    };
  } else if (combinedScore >= 0.25 || declarationJaccard >= 0.2) {
    return {
      verdict: 'moderate_similarity',
      description: `Combined score ${(combinedScore * 100).toFixed(1)}% indicates partial copying or shared patterns`,
      recommendation: 'Possible copying - recommend manual review',
      signals
    };
  } else if (combinedScore >= 0.1 || patternScore > 0.3) {
    return {
      verdict: 'low_similarity',
      description: `Combined score ${(combinedScore * 100).toFixed(1)}% indicates some shared elements`,
      recommendation: 'Minor overlap - likely coincidental or common patterns',
      signals
    };
  } else {
    return {
      verdict: 'distinct',
      description: `Combined score ${(combinedScore * 100).toFixed(1)}% indicates distinct templates`,
      recommendation: 'No significant similarity - recommend NO violation',
      signals
    };
  }
}

// =============================================================================
// MAIN WORKER (Webhook Handler)
// =============================================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Airtable webhook endpoint
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleAirtableWebhook(request, env);
    }

    // Status check endpoint
    if (url.pathname.startsWith('/status/')) {
      const caseId = url.pathname.split('/').pop();
      return getCaseStatus(caseId!, env);
    }

    // Test endpoint: Fetch Airtable record and trigger webhook
    if (url.pathname.startsWith('/test-record/')) {
      const recordId = url.pathname.split('/').pop();
      return testRecordWebhook(recordId!, env);
    }

    // Agent mode endpoint: Run agentic investigation for content policy violations
    if (url.pathname.startsWith('/agent/')) {
      const caseId = url.pathname.split('/').pop();
      const dryRun = url.searchParams.get('dry_run') === '1' || url.searchParams.get('dryRun') === '1';
      return runAgentMode(caseId!, env, { dryRun });
    }

    // Vector index endpoint: Index a template
    if (url.pathname === '/index' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { id, url: templateUrl, name, creator } = body;

        if (!id || !templateUrl || !name) {
          return new Response(JSON.stringify({
            error: 'Missing required fields: id, url, name'
          }), { status: 400 });
        }

        const success = await indexTemplate(
          id,
          templateUrl,
          { name, creator: creator || 'Unknown', url: templateUrl },
          env
        );

        return new Response(JSON.stringify({
          success,
          message: success ? `Template ${id} indexed successfully` : `Failed to index ${id}`
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Vector compare endpoint: Compare two templates directly
    if (url.pathname === '/api/compare' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { originalUrl, allegedCopyUrl } = body;

        if (!originalUrl || !allegedCopyUrl) {
          return new Response(JSON.stringify({
            error: 'Missing required fields: originalUrl, allegedCopyUrl'
          }), { status: 400 });
        }

        console.log(`[API] Comparing ${originalUrl} vs ${allegedCopyUrl}`);

        // Use vector similarity analysis
        const vectorSimilarity = await analyzeVectorSimilarity(
          originalUrl,
          allegedCopyUrl,
          env.OPENAI_API_KEY
        );

        return new Response(JSON.stringify({
          originalUrl,
          allegedCopyUrl,
          vectorSimilarity,
          timestamp: Date.now()
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      } catch (error: any) {
        console.error('[API] Compare error:', error);
        return new Response(JSON.stringify({
          error: error.message,
          details: error.stack
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Vector query endpoint: Find similar templates
    if (url.pathname === '/query' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { url: queryUrl, topK = 10 } = body;

        if (!queryUrl) {
          return new Response(JSON.stringify({
            error: 'Missing required field: url'
          }), { status: 400 });
        }

        const results = await findSimilarTemplates(queryUrl, env, topK);

        return new Response(JSON.stringify({
          query_url: queryUrl,
          results,
          count: results.length
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Vector stats endpoint: Get index statistics
    if (url.pathname === '/stats' && request.method === 'GET') {
      try {
        const stats = await getIndexStats(env);

        return new Response(JSON.stringify(stats), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // ==========================================================================
    // MINHASH ENDPOINTS - Full file comparison without token limits
    // ==========================================================================

    // MinHash compare: Compare two templates using MinHash (full files)
    if (url.pathname === '/minhash/compare' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { url1, url2 } = body;

        if (!url1 || !url2) {
          return new Response(JSON.stringify({
            error: 'Missing required fields: url1, url2'
          }), { status: 400 });
        }

        console.log(`[MinHash] Comparing ${url1} vs ${url2}`);

        // Fetch CSS from both URLs
        const [content1, content2] = await Promise.all([
          fetchTemplateContent(url1),
          fetchTemplateContent(url2)
        ]);

        if (!content1.css && !content1.html) {
          return new Response(JSON.stringify({
            error: `Failed to fetch content from ${url1}`
          }), { status: 400 });
        }

        if (!content2.css && !content2.html) {
          return new Response(JSON.stringify({
            error: `Failed to fetch content from ${url2}`
          }), { status: 400 });
        }

        // Compute MinHash signatures
        const sig1 = computeCombinedMinHash(content1.html, content1.css, content1.js);
        const sig2 = computeCombinedMinHash(content2.html, content2.css, content2.js);

        // Also compute separate CSS similarity for comparison
        const cssSig1 = computeCssMinHash(content1.css);
        const cssSig2 = computeCssMinHash(content2.css);

        const combinedSimilarity = estimateSimilarity(sig1, sig2);
        const cssSimilarity = estimateSimilarity(cssSig1, cssSig2);
        
        // Token-only comparison (custom classes only, no Webflow boilerplate)
        const customClassComparison = compareCustomClasses(content1.css, content2.css);
        
        // Property-based comparison (catches renamed classes with same styles)
        const propertyComparison = compareProperties(content1.css, content2.css);

        return new Response(JSON.stringify({
          url1,
          url2,
          // RECOMMENDED: Custom class comparison (filters out Webflow framework)
          customClasses: {
            jaccardSimilarity: customClassComparison.jaccardEstimate,
            confidence: customClassComparison.confidence,
            sharedCount: customClassComparison.shingleOverlapEstimate,
            shared: customClassComparison.shared,
            uniqueToUrl1: customClassComparison.uniqueToFirst,
            uniqueToUrl2: customClassComparison.uniqueToSecond
          },
          // NEW: Property-based comparison (catches renamed classes)
          properties: {
            declarationSimilarity: propertyComparison.declarationSimilarity,
            fingerprintSimilarity: propertyComparison.fingerprintSimilarity,
            patternMatches: propertyComparison.patternMatches,
            sharedDeclarations: propertyComparison.sharedDeclarations.slice(0, 5),
            sharedFingerprints: propertyComparison.sharedFingerprints.slice(0, 5)
          },
          // Full MinHash (includes character shingles - may have false positives)
          combined: {
            jaccardSimilarity: combinedSimilarity.jaccardEstimate,
            confidence: combinedSimilarity.confidence,
            shingleOverlap: combinedSimilarity.shingleOverlapEstimate,
            totalShingles: { url1: sig1.numShingles, url2: sig2.numShingles }
          },
          css: {
            jaccardSimilarity: cssSimilarity.jaccardEstimate,
            confidence: cssSimilarity.confidence,
            shingleOverlap: cssSimilarity.shingleOverlapEstimate,
            totalShingles: { url1: cssSig1.numShingles, url2: cssSig2.numShingles }
          },
          fileSizes: {
            url1: { css: content1.css.length, html: content1.html.length },
            url2: { css: content2.css.length, html: content2.html.length }
          },
          // Combined interpretation using multiple signals
          interpretation: interpretCombinedSimilarity(
            customClassComparison.jaccardEstimate,
            propertyComparison.declarationSimilarity,
            propertyComparison.patternMatches
          )
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error: any) {
        console.error('[MinHash] Compare error:', error);
        return new Response(JSON.stringify({
          error: error.message,
          stack: error.stack
        }), { status: 500 });
      }
    }

    // MinHash index: Store a template's MinHash signature
    if (url.pathname === '/minhash/index' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { id, url: templateUrl, name, creator } = body;

        if (!id || !templateUrl) {
          return new Response(JSON.stringify({
            error: 'Missing required fields: id, url'
          }), { status: 400 });
        }

        console.log(`[MinHash] Indexing ${id}: ${templateUrl}`);

        // Fetch content
        const content = await fetchTemplateContent(templateUrl);

        if (!content.css && !content.html) {
          return new Response(JSON.stringify({
            error: `Failed to fetch content from ${templateUrl}`
          }), { status: 400 });
        }

        // Compute signatures
        const cssSig = computeCssMinHash(content.css);
        const htmlSig = computeHtmlMinHash(content.html);
        const combinedSig = computeCombinedMinHash(content.html, content.css, content.js);
        
        // Compute LSH band hashes for O(1) candidate lookup
        const lshBands = computeLSHBandHashes(combinedSig.signature);

        // Store in D1
        await env.DB.prepare(`
          INSERT OR REPLACE INTO template_minhash (
            id, name, url, creator,
            css_signature, html_signature, combined_signature,
            lsh_bands,
            css_shingles, html_shingles, combined_shingles,
            css_size_bytes, html_size_bytes,
            indexed_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          name || id,
          templateUrl,
          creator || null,
          serializeSignatureCompact(cssSig),
          serializeSignatureCompact(htmlSig),
          serializeSignatureCompact(combinedSig),
          serializeLSHBands(lshBands),
          cssSig.numShingles,
          htmlSig.numShingles,
          combinedSig.numShingles,
          content.css.length,
          content.html.length,
          Date.now(),
          Date.now()
        ).run();
        
        // Store LSH bands for fast lookup
        // Delete old bands first (for re-indexing)
        await env.DB.prepare(
          'DELETE FROM minhash_lsh_bands WHERE template_id = ?'
        ).bind(id).run();
        
        // Insert new bands
        for (let bandIndex = 0; bandIndex < lshBands.length; bandIndex++) {
          await env.DB.prepare(
            'INSERT INTO minhash_lsh_bands (band_id, hash_value, template_id) VALUES (?, ?, ?)'
          ).bind(`band_${bandIndex}`, lshBands[bandIndex], id).run();
        }

        console.log(`[MinHash] ✅ Indexed ${id} (${cssSig.numShingles} CSS shingles, ${lshBands.length} LSH bands)`);

        return new Response(JSON.stringify({
          success: true,
          id,
          url: templateUrl,
          shingles: {
            css: cssSig.numShingles,
            html: htmlSig.numShingles,
            combined: combinedSig.numShingles
          },
          fileSizes: {
            css: content.css.length,
            html: content.html.length
          }
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('[MinHash] Index error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // MinHash find similar: Find templates similar to a given one
    if (url.pathname.startsWith('/minhash/similar/') && request.method === 'GET') {
      try {
        const templateId = url.pathname.split('/').pop();
        const threshold = parseFloat(url.searchParams.get('threshold') || '0.3');

        // Get the query template's signature
        const queryResult = await env.DB.prepare(
          'SELECT * FROM template_minhash WHERE id = ?'
        ).bind(templateId).first();

        if (!queryResult) {
          return new Response(JSON.stringify({
            error: `Template ${templateId} not found in index`
          }), { status: 404 });
        }

        // Get all other templates
        const allTemplates = await env.DB.prepare(
          'SELECT * FROM template_minhash WHERE id != ?'
        ).bind(templateId).all();

        // Deserialize query signature
        const querySig = deserializeSignatureCompact(
          queryResult.combined_signature as string,
          queryResult.combined_shingles as number,
          'combined'
        );

        // Compare against all templates
        const similarities: Array<{
          id: string;
          name: string;
          url: string;
          creator: string | null;
          similarity: number;
          confidence: string;
        }> = [];

        for (const template of allTemplates.results) {
          const candidateSig = deserializeSignatureCompact(
            template.combined_signature as string,
            template.combined_shingles as number,
            'combined'
          );

          const similarity = estimateSimilarity(querySig, candidateSig);

          if (similarity.jaccardEstimate >= threshold) {
            similarities.push({
              id: template.id as string,
              name: template.name as string,
              url: template.url as string,
              creator: template.creator as string | null,
              similarity: similarity.jaccardEstimate,
              confidence: similarity.confidence
            });
          }
        }

        // Sort by similarity descending
        similarities.sort((a, b) => b.similarity - a.similarity);

        return new Response(JSON.stringify({
          query: {
            id: queryResult.id,
            name: queryResult.name,
            url: queryResult.url
          },
          threshold,
          matches: similarities,
          totalIndexed: allTemplates.results.length + 1
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('[MinHash] Similar error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // MinHash backfill: Populate LSH bands for existing templates
    if (url.pathname === '/minhash/backfill-lsh' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const limit = Math.min(body.limit || 5, 10); // Small batches to avoid SQLite limits
        
        // Get templates that need LSH band population
        const templates = await env.DB.prepare(`
          SELECT id, combined_signature 
          FROM template_minhash 
          WHERE id NOT IN (SELECT DISTINCT template_id FROM minhash_lsh_bands)
          ORDER BY indexed_at 
          LIMIT ?
        `).bind(limit).all();
        
        if (!templates.results || templates.results.length === 0) {
          const totalBands = await env.DB.prepare('SELECT COUNT(*) as count FROM minhash_lsh_bands').first();
          return new Response(JSON.stringify({
            success: true,
            message: 'All templates have LSH bands',
            processed: 0,
            totalBands: totalBands?.count || 0
          }), { headers: { 'Content-Type': 'application/json' } });
        }
        
        let bandsInserted = 0;
        
        // Process each template individually but use batch for bands within a template
        for (const row of templates.results as any[]) {
          try {
            const sig = deserializeSignatureCompact(row.combined_signature);
            const lshBands = computeLSHBandHashes(sig);
            
            // Build batch insert for 16 bands of this template
            const values = lshBands.map((_, i) => '(?, ?, ?)').join(',');
            const params: any[] = [];
            for (let i = 0; i < lshBands.length; i++) {
              params.push(`band_${i}`, lshBands[i], row.id);
            }
            
            await env.DB.prepare(
              `INSERT OR IGNORE INTO minhash_lsh_bands (band_id, hash_value, template_id) VALUES ${values}`
            ).bind(...params).run();
            
            bandsInserted += lshBands.length;
          } catch (e) {
            console.log(`[Backfill] Failed for ${row.id}:`, e);
          }
        }
        
        const remaining = await env.DB.prepare(`
          SELECT COUNT(*) as count FROM template_minhash 
          WHERE id NOT IN (SELECT DISTINCT template_id FROM minhash_lsh_bands)
        `).first();
        
        return new Response(JSON.stringify({
          success: true,
          processed: templates.results.length,
          bandsInserted,
          remaining: remaining?.count || 0
        }), { headers: { 'Content-Type': 'application/json' } });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // MinHash stats: Get index statistics
    if (url.pathname === '/minhash/stats' && request.method === 'GET') {
      try {
        const countResult = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM template_minhash'
        ).first();

        const sampleResult = await env.DB.prepare(
          'SELECT id, name, url, creator, css_shingles, html_shingles FROM template_minhash ORDER BY indexed_at DESC LIMIT 10'
        ).all();

        return new Response(JSON.stringify({
          totalIndexed: countResult?.count || 0,
          recentTemplates: sampleResult.results
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // ==========================================================================
    // PLAGIARISM SCAN: Find suspicious template pairs
    // ==========================================================================
    if (url.pathname === '/scan/suspicious' && request.method === 'GET') {
      try {
        const threshold = parseFloat(url.searchParams.get('threshold') || '0.4');
        const limit = parseInt(url.searchParams.get('limit') || '100');
        
        const suspiciousPairs = await findSuspiciousPairs(env, threshold, limit);
        
        return new Response(JSON.stringify({
          threshold,
          count: suspiciousPairs.length,
          pairs: suspiciousPairs
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Scan a specific template against the index
    if (url.pathname === '/scan/template' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { url: templateUrl, threshold = 0.35 } = body;
        
        if (!templateUrl) {
          return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400 });
        }
        
        const results = await scanTemplateForPlagiarism(templateUrl, threshold, env);
        
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // ==========================================================================
    // DASHBOARD: Visual cluster analysis
    // ==========================================================================
    if (url.pathname === '/dashboard' && request.method === 'GET') {
      return serveDashboard(env);
    }

    if (url.pathname === '/dashboard/clusters' && request.method === 'GET') {
      try {
        const clusters = await findSimilarityClusters(env);
        return new Response(JSON.stringify(clusters), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    if (url.pathname === '/dashboard/stats' && request.method === 'GET') {
      try {
        const stats = await getDashboardStats(env);
        return new Response(JSON.stringify(stats), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    return new Response('Plagiarism Agent Ready', { status: 200 });
  },

  // Queue consumer
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { caseId, tier } = message.body as { caseId: string; tier: number };

      try {
        const result = await env.DB.prepare(
          'SELECT * FROM plagiarism_cases WHERE id = ?'
        ).bind(caseId).first();

        if (!result) {
          console.error(`[Queue] Case not found: ${caseId}`);
          message.ack();
          continue;
        }

        const plagiarismCase: PlagiarismCase = {
          id: result.id as string,
          airtableRecordId: result.airtable_record_id as string,
          reporterEmail: result.reporter_email as string,
          originalUrl: result.original_url as string,
          allegedCopyUrl: result.alleged_copy_url as string,
          complaintText: result.complaint_text as string,
          allegedCreator: result.alleged_creator as string,
          status: result.status as any,
          createdAt: result.created_at as number
        };

        if (tier === 1) {
          await runTier1Screening(plagiarismCase, env);
        } else if (tier === 2) {
          await runTier2Analysis(plagiarismCase, env);
        } else if (tier === 3) {
          const tier2Result = JSON.parse(result.tier2_report as string);
          await runTier3Judgment(plagiarismCase, tier2Result, env);
        }

        message.ack();
      } catch (error) {
        console.error(`[Queue] Error processing ${caseId}:`, error);
        message.retry({ delaySeconds: 60 });
      }
    }
  }
};

// =============================================================================
// AIRTABLE SCREENSHOT PROCESSING
// =============================================================================

/**
 * Download and store screenshots provided by the submitter in Airtable.
 * Airtable attachment format: [{ url, filename, size, type }, ...]
 */
async function processProvidedScreenshots(
  caseId: string,
  screenshots: any[],
  env: Env
): Promise<void> {
  try {
    // Airtable provides attachments as array - use first two as original/copy
    const [screenshot1, screenshot2] = screenshots;

    if (!screenshot1?.url || !screenshot2?.url) {
      console.log('[Screenshots] Provided screenshots missing URLs, will fall back to Browser Rendering');
      return;
    }

    console.log(`[Screenshots] Downloading provided screenshots: ${screenshot1.filename}, ${screenshot2.filename}`);

    // Download both screenshots in parallel
    const [img1Response, img2Response] = await Promise.all([
      fetch(screenshot1.url),
      fetch(screenshot2.url)
    ]);

    if (!img1Response.ok || !img2Response.ok) {
      console.error('[Screenshots] Failed to download provided screenshots');
      return;
    }

    const [img1Buffer, img2Buffer] = await Promise.all([
      img1Response.arrayBuffer(),
      img2Response.arrayBuffer()
    ]);

    // Store in R2 with same naming convention as Browser Rendering
    const originalKey = `${caseId}/original.jpg`;
    const copyKey = `${caseId}/copy.jpg`;

    await Promise.all([
      env.SCREENSHOTS.put(originalKey, img1Buffer),
      env.SCREENSHOTS.put(copyKey, img2Buffer)
    ]);

    console.log(`[Screenshots] Stored provided screenshots: ${originalKey} (${img1Buffer.byteLength} bytes), ${copyKey} (${img2Buffer.byteLength} bytes)`);
  } catch (error: any) {
    console.error('[Screenshots] Error processing provided screenshots:', {
      message: error?.message || String(error),
      name: error?.name
    });
  }
}

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

function safeFieldToString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    // Prefer human-friendly names if present on objects; otherwise join stringified values
    const parts = value.map((entry) => {
      if (entry && typeof entry === 'object') {
        return entry.name ?? entry.title ?? entry.email ?? JSON.stringify(entry);
      }
      if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
        return String(entry);
      }
      return '';
    }).filter(Boolean);

    return parts.join(', ');
  }

  if (typeof value === 'object') {
    return value.name ?? value.title ?? value.email ?? JSON.stringify(value);
  }

  return '';
}

async function resetCaseForRerun(caseId: string, env: Env): Promise<void> {
  await env.DB.prepare(`
    UPDATE plagiarism_cases
    SET
      status = 'pending',
      completed_at = NULL,
      tier1_decision = NULL,
      tier1_reasoning = NULL,
      tier2_decision = NULL,
      tier2_report = NULL,
      tier2_screenshot_ids = NULL,
      tier3_decision = NULL,
      tier3_reasoning = NULL,
      tier3_confidence = NULL,
      final_decision = NULL,
      cost_usd = 0.0
    WHERE id = ?
  `).bind(caseId).run();
}

async function findExistingCaseIdByAirtableRecordId(
  airtableRecordId: string,
  env: Env
): Promise<string | null> {
  const row = await env.DB.prepare(
    `SELECT id FROM plagiarism_cases WHERE airtable_record_id = ?`
  ).bind(airtableRecordId).first();
  return (row?.id as string | undefined) ?? null;
}

async function handleAirtableWebhook(request: Request, env: Env): Promise<Response> {
  const payload = await request.json() as any;

  const caseId = `case_${generateId()}`;
  const now = Date.now();

  // Extract fields with defaults for missing values
  const fields = payload.fields || {};
  const reporterEmail = safeFieldToString(fields['Submitter\'s Email']) || 'unknown@example.com';
  const originalUrlRaw = safeFieldToString(fields['Preview URL of Offended Template']);
  const allegedCopyUrlRaw = safeFieldToString(fields['Preview URL of Offending Template']);
  const complaintText = safeFieldToString(fields['Offense']) || 'No complaint text provided';
  const allegedCreator = safeFieldToString(fields['Violating creator']) || 'Unknown';

  // Normalize URLs (convert preview URLs to published URLs)
  const originalUrls = extractUrls(originalUrlRaw);
  const originalUrl = originalUrls[0] || originalUrlRaw; // Use first URL for primary comparison
  const allegedCopyUrl = normalizeWebflowUrl(allegedCopyUrlRaw);

  console.log(`[Webhook] Normalized URLs: ${originalUrl} vs ${allegedCopyUrl}`);

  await env.DB.prepare(`
    INSERT INTO plagiarism_cases (
      id, airtable_record_id, reporter_email,
      original_url, alleged_copy_url, complaint_text,
      alleged_creator, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).bind(
    caseId,
    payload.recordId,
    reporterEmail,
    originalUrl,
    allegedCopyUrl,
    complaintText,
    allegedCreator,
    now
  ).run();

  // Check if submitter provided screenshots
  const screenshots = fields['Screenshots'] || [];
  if (screenshots.length >= 2) {
    // Use submitter's screenshots instead of capturing new ones
    console.log(`[Webhook] Processing ${screenshots.length} provided screenshots`);
    await processProvidedScreenshots(caseId, screenshots, env);
  }

  // Queue for Tier 1 processing
  await env.CASE_QUEUE.send({ caseId, tier: 1 });

  console.log(`[Webhook] Created case ${caseId}`);

  return Response.json({
    caseId,
    status: 'queued',
    estimatedTime: '1-2 minutes'
  });
}

async function getCaseStatus(caseId: string, env: Env): Promise<Response> {
  const result = await env.DB.prepare(`
    SELECT id, status, final_decision, cost_usd, completed_at
    FROM plagiarism_cases WHERE id = ?
  `).bind(caseId).first();

  if (!result) {
    return Response.json({ error: 'Case not found' }, { status: 404 });
  }

  return Response.json(result);
}

async function testRecordWebhook(recordId: string, env: Env): Promise<Response> {
  try {
    // Fetch the Airtable record
    const response = await fetch(
      `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_TABLE_ID}/${recordId}`,
      {
        headers: {
          'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`
        }
      }
    );

    if (!response.ok) {
      return Response.json({ error: `Airtable API error: ${response.status}` }, { status: 500 });
    }

    const record = await response.json() as any;
    const screenshots = record.fields['Screenshots'] || [];

    console.log(`[Test] Fetched record ${recordId} with ${screenshots.length} screenshots`);

    // Create webhook payload
    const webhookPayload = {
      recordId: record.id,
      fields: {
        "Submitter's Email": record.fields["Submitter's Email"],
        "Preview URL of Offended Template": record.fields["Preview URL of Offended Template"],
        "Preview URL of Offending Template": record.fields["Preview URL of Offending Template"],
        "Offense": record.fields["Offense"],
        "Violating creator": record.fields["Violating creator"],
        "Screenshots": screenshots
      }
    };

    // If we've already processed this Airtable record, reuse the same case id and re-queue it
    // (airtable_record_id is UNIQUE in D1)
    const existingCaseId = await findExistingCaseIdByAirtableRecordId(record.id, env);
    if (existingCaseId) {
      console.log(`[Test] Record already exists in D1 as ${existingCaseId}; resetting + re-queuing`);

      await resetCaseForRerun(existingCaseId, env);

      if (screenshots.length >= 2) {
        await processProvidedScreenshots(existingCaseId, screenshots, env);
      }

      await env.CASE_QUEUE.send({ caseId: existingCaseId, tier: 1 });

      return Response.json({
        airtableRecord: {
          id: record.id,
          screenshotCount: screenshots.length,
          screenshotFilenames: screenshots.map((s: any) => s.filename)
        },
        webhookResult: {
          caseId: existingCaseId,
          status: 'requeued',
          estimatedTime: '1-2 minutes'
        }
      });
    }

    // Trigger webhook handler directly (first-time processing)
    const webhookResponse = await handleAirtableWebhook(
      new Request('http://localhost/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      }),
      env
    );

    const webhookResult = await webhookResponse.json();

    return Response.json({
      airtableRecord: {
        id: record.id,
        screenshotCount: screenshots.length,
        screenshotFilenames: screenshots.map((s: any) => s.filename)
      },
      webhookResult
    });
  } catch (error: any) {
    console.error('[Test] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// =============================================================================
// AGENT MODE (Content Policy Expansion)
// =============================================================================

/**
 * Run agentic investigation for content policy violations.
 * Uses Claude Agent SDK with iterative evidence gathering.
 *
 * This is for expansion beyond plagiarism: harassment, hate speech, DMCA, etc.
 */
async function runAgentMode(
  caseId: string,
  env: Env,
  options?: { dryRun?: boolean }
): Promise<Response> {
  try {
    console.log(`[Agent Mode] Starting investigation for case ${caseId}`);

    // Fetch case from database
    const result = await env.DB.prepare(
      'SELECT * FROM plagiarism_cases WHERE id = ?'
    ).bind(caseId).first();

    if (!result) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Convert to ContentPolicyCase format
    const contentCase = {
      id: result.id as string,
      policyType: 'plagiarism' as const, // For now, only plagiarism supported
      reporterEmail: result.reporter_email as string,
      targetUrl: result.alleged_copy_url as string,
      complaintText: result.complaint_text as string,
      context: result.original_url as string, // Original work URL as context
      createdAt: result.created_at as number
    };

    // Run agent investigation
    const startTime = Date.now();
    const violation = await runAgentInvestigation(contentCase, env, 10);
    const duration = Date.now() - startTime;

    console.log(`[Agent Mode] Investigation completed in ${duration}ms`, violation);

    if (!options?.dryRun) {
      // Update case with results (use existing schema fields)
    await env.DB.prepare(`
      UPDATE plagiarism_cases
      SET
        tier3_decision = ?,
        tier3_confidence = ?,
        tier3_reasoning = ?,
          final_decision = ?,
          status = 'completed',
          completed_at = ?
      WHERE id = ?
    `).bind(
      violation.decision,
      violation.confidence,
      violation.reasoning,
        violation.decision,
        Date.now(),
      caseId
    ).run();

    // Update Airtable with decision
    const airtableFields: Record<string, string> = {
      [AIRTABLE_FIELDS.DECISION]: DECISION_TO_AIRTABLE[violation.decision],
      [AIRTABLE_FIELDS.OUTCOME]: DECISION_TO_OUTCOME[violation.decision]
    };

    await updateAirtable(env, result.airtable_record_id as string, airtableFields);
    }

    return Response.json({
      caseId,
      decision: violation.decision,
      confidence: violation.confidence,
      reasoning: violation.reasoning,
      recommendedAction: violation.recommendedAction,
      evidenceSummary: violation.evidenceSummary,
      duration: `${(duration / 1000).toFixed(2)}s`,
      dryRun: Boolean(options?.dryRun)
    });
  } catch (error: any) {
    console.error('[Agent Mode] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// =============================================================================
// SCREENSHOT CAPTURE
// =============================================================================

async function captureScreenshot(url: string, env: Env): Promise<ArrayBuffer | null> {
  let browser;
  try {
    console.log(`[Screenshot] Starting capture for ${url}`);

    // Launch browser using Cloudflare Browser Rendering
    console.log('[Screenshot] Launching browser...');
    browser = await puppeteer.launch(env.BROWSER);
    console.log('[Screenshot] Browser launched successfully');

    const page = await browser.newPage();
    console.log('[Screenshot] New page created');

    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1280, height: 720 });
    console.log('[Screenshot] Viewport set');

    // Navigate to URL with timeout
    console.log(`[Screenshot] Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: 'load',  // Changed from 'networkidle0' - more lenient
      timeout: 60000      // Increased from 30s to 60s
    });
    console.log('[Screenshot] Page loaded');

    // Capture screenshot as JPEG
    // For vision analysis, we capture above-the-fold content (first ~3 viewports)
    // to stay within the 128K token context limit while capturing key design elements
    console.log('[Screenshot] Capturing screenshot...');
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 60,      // Reduced from 85 to save tokens
      fullPage: false,  // Viewport only to stay under token limit
      clip: {
        x: 0,
        y: 0,
        width: 1280,
        height: 2160    // 3 viewports worth (720 * 3)
      }
    });

    console.log(`[Screenshot] SUCCESS: Captured ${url} (${screenshot.byteLength} bytes)`);

    return screenshot.buffer;
  } catch (error: any) {
    console.error(`[Screenshot] FAILED for ${url}:`, {
      message: error?.message || String(error),
      stack: error?.stack,
      name: error?.name
    });
    return null;
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('[Screenshot] Browser closed');
      } catch (e) {
        console.error('[Screenshot] Error closing browser:', e);
      }
    }
  }
}

async function captureAndStoreScreenshots(
  caseId: string,
  originalUrl: string,
  allegedCopyUrl: string,
  env: Env
): Promise<{ originalKey: string | null; copyKey: string | null }> {
  const [originalScreenshot, copyScreenshot] = await Promise.all([
    captureScreenshot(originalUrl, env),
    captureScreenshot(allegedCopyUrl, env)
  ]);

  let originalKey: string | null = null;
  let copyKey: string | null = null;

  if (originalScreenshot) {
    originalKey = `${caseId}/original.jpg`;
    await env.SCREENSHOTS.put(originalKey, originalScreenshot);
    console.log(`[Screenshot] Stored original: ${originalKey}`);
  }

  if (copyScreenshot) {
    copyKey = `${caseId}/copy.jpg`;
    await env.SCREENSHOTS.put(copyKey, copyScreenshot);
    console.log(`[Screenshot] Stored copy: ${copyKey}`);
  }

  return { originalKey, copyKey };
}

/**
 * Get vision analysis if screenshots are available in R2.
 * Returns null if screenshots don't exist, allowing graceful degradation.
 */
async function getVisionAnalysis(
  caseId: string,
  env: Env
): Promise<string | null> {
  try {
    const [originalImg, copyImg] = await Promise.all([
      env.SCREENSHOTS.get(`${caseId}/original.jpg`),
      env.SCREENSHOTS.get(`${caseId}/copy.jpg`)
    ]);

    if (!originalImg || !copyImg) {
      return null;
    }

    // Convert R2 objects to byte arrays for Workers AI
    const originalBytes = new Uint8Array(await originalImg.arrayBuffer());
    const copyBytes = new Uint8Array(await copyImg.arrayBuffer());

    console.log(`[Vision] Analyzing screenshots (${originalBytes.length} bytes, ${copyBytes.length} bytes)`);

    // Use Cloudflare's vision model to analyze both screenshots
    // The model expects images as arrays of numbers
    const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      prompt: 'Compare these two website screenshots for plagiarism. Analyze layout, design elements, typography, color schemes, spacing, and component structure. Describe specific similarities and differences.',
      image: [Array.from(originalBytes), Array.from(copyBytes)]
    });

    console.log('[Vision] Analysis complete');
    return response.response || null;
  } catch (error: any) {
    console.error('[Vision] Analysis failed:', {
      message: error?.message || String(error),
      name: error?.name
    });
    return null;
  }
}

/**
 * Convert Uint8Array to base64 without causing stack overflow.
 * Standard btoa(String.fromCharCode(...array)) fails on large images.
 */
function arrayBufferToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000; // 32KB chunks
  let binary = '';

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

// =============================================================================
// MINHASH PRE-SCREENING
// =============================================================================

interface MinHashPreScreenResult {
  cssSimilarity: number;
  classOverlap: number;
  propertySimilarity: number;
  similarCount: number;
  verdict: string;
  topMatches: Array<{ id: string; name: string; similarity: number }>;
}

async function runMinHashPreScreening(
  plagiarismCase: PlagiarismCase,
  env: Env
): Promise<MinHashPreScreenResult | null> {
  try {
    console.log(`[MinHash] Pre-screening: ${plagiarismCase.originalUrl} vs ${plagiarismCase.allegedCopyUrl}`);

    // Fetch content from both URLs
    const [content1, content2] = await Promise.all([
      fetchPublishedContent(plagiarismCase.originalUrl),
      fetchPublishedContent(plagiarismCase.allegedCopyUrl)
    ]);

    if (!content1 || !content2) {
      console.log('[MinHash] Could not fetch content from one or both URLs');
      return null;
    }

    // Compute MinHash signatures
    const cssMinHash1 = computeCssMinHash(content1.css);
    const cssMinHash2 = computeCssMinHash(content2.css);
    const cssSimilarity = estimateSimilarity(cssMinHash1, cssMinHash2);

    // Compare custom classes
    const classes1 = extractCustomClasses(content1.css);
    const classes2 = extractCustomClasses(content2.css);
    const sharedClasses = classes1.filter(c => classes2.includes(c));
    const classOverlap = sharedClasses.length / Math.max(classes1.length, classes2.length, 1);

    // Compare CSS properties
    const propertyComparison = compareProperties(content1.css, content2.css);
    const propertySimilarity = propertyComparison.declarationSimilarity;

    // Check if alleged copy exists in index and find similar templates
    let similarCount = 0;
    let topMatches: Array<{ id: string; name: string; similarity: number }> = [];
    
    try {
      // Search for templates similar to the alleged copy
      const htmlMinHash = computeHtmlMinHash(content2.html);
      const combinedMinHash = computeCombinedMinHash(content2.html, content2.css, content2.javascript);
      
      // Query the LSH index for similar templates
      const lshBands = computeLSHBandHashes(combinedMinHash);
      const bandConditions = lshBands.map((_, i) => `(band_id = 'band_${i}' AND hash_value = ?)`).join(' OR ');
      
      const candidateRows = await env.DB.prepare(`
        SELECT DISTINCT template_id FROM minhash_lsh_bands 
        WHERE ${bandConditions}
      `).bind(...lshBands).all();
      
      if (candidateRows.results && candidateRows.results.length > 0) {
        const candidateIds = candidateRows.results.map((r: any) => r.template_id);
        
        // Get signatures for candidates
        const placeholders = candidateIds.map(() => '?').join(',');
        const signatureRows = await env.DB.prepare(`
          SELECT id, name, combined_signature FROM template_minhash 
          WHERE id IN (${placeholders})
        `).bind(...candidateIds).all();
        
        if (signatureRows.results) {
          const matches = signatureRows.results
            .map((row: any) => {
              const sig = deserializeSignatureCompact(row.combined_signature);
              const similarity = estimateSimilarity(combinedMinHash, sig);
              return { id: row.id, name: row.name, similarity };
            })
            .filter(m => m.similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity);
          
          similarCount = matches.length;
          topMatches = matches.slice(0, 5);
        }
      }
    } catch (error) {
      console.log('[MinHash] Error querying index (non-fatal):', error);
    }

    // Determine verdict based on MinHash signals
    let verdict = 'inconclusive';
    if (cssSimilarity > 0.35 && classOverlap < 0.1) {
      verdict = 'likely_plagiarism'; // High CSS similarity but different class names = renamed
    } else if (cssSimilarity > 0.35 && classOverlap > 0.25) {
      verdict = 'same_creator_or_clone'; // High similarity with shared classes = same creator
    } else if (cssSimilarity < 0.25 && classOverlap < 0.05) {
      verdict = 'likely_unrelated'; // Low similarity on all metrics
    } else if (propertySimilarity > 0.25) {
      verdict = 'suspicious_patterns'; // Similar CSS properties even if classes differ
    }

    const result: MinHashPreScreenResult = {
      cssSimilarity,
      classOverlap,
      propertySimilarity,
      similarCount,
      verdict,
      topMatches
    };

    // Store as evidence
    await storeEvidence(env, plagiarismCase.id, 'minhash_prescreen', result);

    console.log(`[MinHash] Pre-screen: CSS=${(cssSimilarity*100).toFixed(1)}%, Classes=${(classOverlap*100).toFixed(1)}%, Verdict=${verdict}`);

    return result;
  } catch (error) {
    console.log('[MinHash] Pre-screening failed (non-fatal):', error);
    return null;
  }
}

// =============================================================================
// TIER 1: Workers AI Screening (with optional vision + MinHash)
// =============================================================================

async function runTier1Screening(
  plagiarismCase: PlagiarismCase,
  env: Env
): Promise<void> {
  // --- STEP 1: MinHash Pre-Screening (runs in parallel with screenshots) ---
  const minhashPromise = runMinHashPreScreening(plagiarismCase, env);

  // Check if screenshots already exist in R2 (from Airtable submission)
  const existingScreenshots = await Promise.all([
    env.SCREENSHOTS.head(`${plagiarismCase.id}/original.jpg`),
    env.SCREENSHOTS.head(`${plagiarismCase.id}/copy.jpg`)
  ]);

  const hasProvidedScreenshots = existingScreenshots[0] && existingScreenshots[1];

  // Only capture new screenshots if submitter didn't provide them
  if (!hasProvidedScreenshots) {
    console.log('[Tier 1] No provided screenshots found, capturing via Browser Rendering');
    const screenshotPromise = captureAndStoreScreenshots(
      plagiarismCase.id,
      plagiarismCase.originalUrl,
      plagiarismCase.allegedCopyUrl,
      env
    );
    await screenshotPromise;
  } else {
    console.log('[Tier 1] Using submitter-provided screenshots');
  }

  // Wait for MinHash results
  const minhashResults = await minhashPromise;
  const minhashSummary = minhashResults 
    ? `\nMinHash Code Analysis:\n- CSS Similarity: ${(minhashResults.cssSimilarity * 100).toFixed(1)}%\n- Class Overlap: ${(minhashResults.classOverlap * 100).toFixed(1)}%\n- Property Similarity: ${(minhashResults.propertySimilarity * 100).toFixed(1)}%\n- Similar Templates Found: ${minhashResults.similarCount}\n- Verdict: ${minhashResults.verdict}`
    : '';

  // Get vision analysis if screenshots available
  let visionAnalysis: string | null = null;
  try {
    visionAnalysis = await getVisionAnalysis(plagiarismCase.id, env);
    if (visionAnalysis) {
      console.log(`[Tier 1] Vision analysis: ${visionAnalysis.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log('[Tier 1] Proceeding without vision analysis:', error);
  }

  const prompt = `Analyze this plagiarism complaint:

Reporter: ${plagiarismCase.reporterEmail}
Original: ${plagiarismCase.originalUrl}
Alleged copy: ${plagiarismCase.allegedCopyUrl}
Complaint: ${plagiarismCase.complaintText}

${visionAnalysis ? `\nVisual Analysis:\n${visionAnalysis}\n` : ''}
${minhashSummary}

Decide:
- "obvious_not": Clearly not plagiarism (MinHash shows low similarity, no shared patterns)
- "obvious_yes": Clear plagiarism (MinHash shows high CSS similarity with low class overlap - indicates renamed classes)
- "needs_analysis": Requires detailed review

IMPORTANT: Return ONLY valid JSON, nothing else. No markdown, no formatting, no explanatory text.
Format: {"decision": "...", "reasoning": "..."}`;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }]
  });

  const result = extractJSON(response.response);

  await env.DB.prepare(`
    UPDATE plagiarism_cases
    SET tier1_decision = ?, tier1_reasoning = ?, status = 'processing'
    WHERE id = ?
  `).bind(result.decision, result.reasoning, plagiarismCase.id).run();

  // ALWAYS escalate to Tier 2 for proper analysis, even for "obvious" cases
  // Tier 1 is just a quick visual screening - all cases need code validation
  await env.CASE_QUEUE.send({ caseId: plagiarismCase.id, tier: 2 });

  console.log(`[Tier 1] ${plagiarismCase.id}: ${result.decision} (escalating to Tier 2)`);
}

// =============================================================================
// TIER 2: Claude Haiku Analysis
// =============================================================================

async function runTier2Analysis(
  plagiarismCase: PlagiarismCase,
  env: Env
): Promise<void> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  // Get vision analysis if screenshots available
  const visionAnalysis = await getVisionAnalysis(plagiarismCase.id, env);
  if (visionAnalysis) {
    console.log(`[Tier 2] Using vision analysis`);
  } else {
    console.log('[Tier 2] No screenshots available, using text-only analysis');
  }

  const prompt = `Analyze plagiarism between templates:

Original: ${plagiarismCase.originalUrl}
Alleged copy: ${plagiarismCase.allegedCopyUrl}
Complaint: ${plagiarismCase.complaintText}

${visionAnalysis ? `\nVisual Comparison Analysis:\n${visionAnalysis}\n` : ''}

Provide editorial scores:
- extent: minimal | moderate | substantial | extensive
- transformation: none | low | minimal | moderate | high
- importance: peripheral | minor | significant | major
- impact: little/no harm | moderate harm | significant harm

IMPORTANT: Return ONLY valid JSON, nothing else.
{
  "decision": "no_violation" | "minor" | "major" | "unclear",
  "confidence": 0.0-1.0,
  "extent": "...",
  "transformation": "...",
  "importance": "...",
  "impact": "..."
}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    temperature: 0,
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  const result = extractJSON(response.content[0].text);

  await env.DB.prepare(`
    UPDATE plagiarism_cases
    SET tier2_decision = ?, tier2_report = ?, tier2_screenshot_ids = ?, cost_usd = ?
    WHERE id = ?
  `).bind(
    result.decision,
    JSON.stringify(result),
    visionAnalysis ? JSON.stringify([`${plagiarismCase.id}/original.jpg`, `${plagiarismCase.id}/copy.jpg`]) : null,
    TIER_COSTS.TIER2,
    plagiarismCase.id
  ).run();

  // ALWAYS escalate to Tier 3 for code-level validation
  // Visual analysis alone can be misleading - screenshots can be manipulated
  // Code patterns reveal the truth: animations, layouts, structural similarities
  console.log(`[Tier 2] Escalating to Tier 3 for mandatory code analysis (confidence: ${result.confidence})`);
  await env.CASE_QUEUE.send({ caseId: plagiarismCase.id, tier: 3 });

  console.log(`[Tier 2] ${plagiarismCase.id}: ${result.decision} ($${TIER_COSTS.TIER2})`);
}

// =============================================================================
// TIER 3: Claude Sonnet Judgment
// =============================================================================

/**
 * Fetch and compare HTML/CSS/JS from both URLs using Puppeteer for full rendering.
 * Detects CSS animations, JavaScript animations, and Webflow-specific patterns.
 */
async function fetchCodeComparison(
  originalUrls: string[],
  copyUrl: string,
  browser?: any
): Promise<string | null> {
  try {
    console.log(`[Code Analysis] Comparing ${copyUrl} against ${originalUrls.length} original URL(s)`);

    // Extract comprehensive patterns including JavaScript animations
    const extractPatterns = async (html: string, url: string) => {
      // CSS animations and transitions
      const cssAnimations = html.match(/@keyframes\s+[\w-]+\s*{[^}]+}/g) || [];
      const cssTransitions = html.match(/transition:\s*[^;]+;/g) || [];

      // Layout structure
      const gridLayouts = html.match(/display:\s*grid[^}]*}/g) || [];
      const flexLayouts = html.match(/display:\s*flex[^}]*}/g) || [];

      // Sections and structure
      const sections = html.match(/<section[^>]*>/g)?.length || 0;
      const headers = html.match(/<header[^>]*>/g)?.length || 0;
      const navs = html.match(/<nav[^>]*>/g)?.length || 0;

      // JavaScript animation library detection
      const jsLibraries: string[] = [];
      if (html.includes('gsap') || html.includes('GreenSock')) jsLibraries.push('GSAP');
      if (html.includes('framer-motion') || html.includes('motion.')) jsLibraries.push('Framer Motion');
      if (html.includes('anime.min.js') || html.includes('anime(')) jsLibraries.push('Anime.js');
      if (html.includes('aos.js') || html.includes('data-aos')) jsLibraries.push('AOS (Animate On Scroll)');
      if (html.includes('scroll-trigger') || html.includes('ScrollTrigger')) jsLibraries.push('ScrollTrigger');
      if (html.includes('lottie') || html.includes('bodymovin')) jsLibraries.push('Lottie');

      // Webflow-specific patterns
      const webflowPatterns = {
        interactions: (html.match(/data-w-id="[^"]+"/g) || []).length,
        ixData: html.includes('window.Webflow && window.Webflow.require("ix2")'),
        animations: (html.match(/data-animation="[^"]+"/g) || []).length,
        triggers: (html.match(/data-w-trigger="[^"]+"/g) || []).length
      };

      // Extract inline script content for animation patterns
      const scriptTags = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
      let animationCalls = 0;
      for (const script of scriptTags) {
        // Count animation-related function calls
        if (script.match(/\.animate\(|\.transition\(|\.to\(|\.from\(|requestAnimationFrame/)) {
          animationCalls++;
        }
      }

      return {
        // CSS-based
        cssAnimations: cssAnimations.length,
        cssTransitions: cssTransitions.length,
        cssAnimationSamples: cssAnimations.slice(0, 2),

        // Layout
        gridLayouts: gridLayouts.length,
        flexLayouts: flexLayouts.length,

        // Structure
        sections,
        headers,
        navs,

        // JavaScript animations
        jsLibraries,
        animationCalls,

        // Webflow
        webflowPatterns,
        isWebflow: html.includes('Webflow') || html.includes('webflow')
      };
    };

    // Helper: Fetch HTML with fallback (try Puppeteer first if available, then plain fetch)
    const fetchHtml = async (url: string): Promise<string> => {
      // Try plain fetch first (faster, works for most sites)
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.ok) {
          return await response.text();
        }
      } catch (error) {
        console.log(`[Code Analysis] Plain fetch failed for ${url}, will try Puppeteer if available`);
      }

      // Fallback: Try Puppeteer if browser is available (renders JavaScript)
      if (browser) {
        try {
          console.log(`[Code Analysis] Using Puppeteer to render ${url}`);
          const page = await browser.newPage();
          await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
          const html = await page.content();
          await page.close();
          return html;
        } catch (error: any) {
          console.error(`[Code Analysis] Puppeteer failed:`, error.message);
        }
      }

      throw new Error(`Failed to fetch ${url} with both fetch and Puppeteer`);
    };

    // Fetch copy URL
    console.log('[Code Analysis] Fetching copy URL...');
    const copyHtml = await fetchHtml(copyUrl);
    const copyPatterns = await extractPatterns(copyHtml, copyUrl);

    // Persist tangible metrics for the copy page
    // (do not store full HTML; store counts + small samples only)
    // Note: caseId isn't available here; Tier 3 stores the aggregate structure.

    // Fetch and analyze each original URL
    const comparisons: string[] = [];
    const originalsMetrics: any[] = [];

    for (let i = 0; i < originalUrls.length; i++) {
      const originalUrl = originalUrls[i];
      console.log(`[Code Analysis] Fetching original ${i + 1}/${originalUrls.length}: ${originalUrl}`);

      try {
        const originalHtml = await fetchHtml(originalUrl);
        const originalPatterns = await extractPatterns(originalHtml, originalUrl);

        // Calculate similarity scores
        const cssAnimSimilarity = Math.abs(originalPatterns.cssAnimations - copyPatterns.cssAnimations) <= 2;
        const sectionSimilarity = Math.abs(originalPatterns.sections - copyPatterns.sections) <= 1;
        const layoutSimilarity = Math.abs(originalPatterns.gridLayouts - copyPatterns.gridLayouts) <= 2;

        // Check for shared JavaScript libraries
        const sharedLibraries = originalPatterns.jsLibraries.filter(lib =>
          copyPatterns.jsLibraries.includes(lib)
        );

        originalsMetrics.push({
          originalUrl,
          originalPatterns,
          deltas: {
            cssAnimationsDiff: Math.abs(originalPatterns.cssAnimations - copyPatterns.cssAnimations),
            sectionsDiff: Math.abs(originalPatterns.sections - copyPatterns.sections),
            gridLayoutsDiff: Math.abs(originalPatterns.gridLayouts - copyPatterns.gridLayouts),
            sharedLibraries
          }
        });

        const comparison = `
--- Original URL ${i + 1}: ${originalUrl} ---

Original Patterns:
- CSS Animations: ${originalPatterns.cssAnimations} keyframe definitions
- CSS Transitions: ${originalPatterns.cssTransitions} transitions
- JavaScript Libraries: ${originalPatterns.jsLibraries.join(', ') || 'None detected'}
- Animation Calls: ${originalPatterns.animationCalls} detected
- Grid layouts: ${originalPatterns.gridLayouts}
- Flex layouts: ${originalPatterns.flexLayouts}
- Sections: ${originalPatterns.sections}
${originalPatterns.isWebflow ? `- Webflow Site: YES
  - Interactions: ${originalPatterns.webflowPatterns.interactions}
  - IX2 Animations: ${originalPatterns.webflowPatterns.ixData ? 'YES' : 'NO'}` : ''}

CSS Animation Samples (first 2):
${originalPatterns.cssAnimationSamples.join('\n\n') || 'None'}

Similarity to Copy:
- Similar CSS animation count: ${cssAnimSimilarity ? 'YES' : 'NO'} (${Math.abs(originalPatterns.cssAnimations - copyPatterns.cssAnimations)} difference)
- Similar section count: ${sectionSimilarity ? 'YES' : 'NO'} (${Math.abs(originalPatterns.sections - copyPatterns.sections)} difference)
- Similar layout patterns: ${layoutSimilarity ? 'YES' : 'NO'} (${Math.abs(originalPatterns.gridLayouts - copyPatterns.gridLayouts)} grid difference)
- Shared JS Libraries: ${sharedLibraries.length > 0 ? sharedLibraries.join(', ') : 'None'}
${(originalPatterns.isWebflow && copyPatterns.isWebflow) ? `- Both are Webflow sites with similar interaction counts` : ''}
`;

        comparisons.push(comparison);
      } catch (error: any) {
        console.error(`[Code Analysis] Error fetching ${originalUrl}:`, error.message);
        comparisons.push(`\n--- Original URL ${i + 1}: ${originalUrl} ---\nError: ${error.message}\n`);
      }
    }

    // Build final summary
    const summary = `
CODE ANALYSIS (${originalUrls.length} Original URL${originalUrls.length > 1 ? 's' : ''} vs Copy):

Copy URL: ${copyUrl}
- CSS Animations: ${copyPatterns.cssAnimations} keyframe definitions
- CSS Transitions: ${copyPatterns.cssTransitions} transitions
- JavaScript Libraries: ${copyPatterns.jsLibraries.join(', ') || 'None detected'}
- Animation Calls: ${copyPatterns.animationCalls} detected
- Grid layouts: ${copyPatterns.gridLayouts}
- Flex layouts: ${copyPatterns.flexLayouts}
- Sections: ${copyPatterns.sections}
${copyPatterns.isWebflow ? `- Webflow Site: YES
  - Interactions: ${copyPatterns.webflowPatterns.interactions}
  - IX2 Animations: ${copyPatterns.webflowPatterns.ixData ? 'YES' : 'NO'}` : ''}

CSS Animation Samples (first 2):
${copyPatterns.cssAnimationSamples.join('\n\n') || 'None'}

${comparisons.join('\n')}
`;

    // Attach structured metrics to the returned string (delimited JSON)
    // Tier 3 will parse this out and persist it in D1 evidence.
    const structured = {
      copyUrl,
      copyPatterns,
      originals: originalsMetrics
    };

    return `${summary}\n\n--- STRUCTURED_CODE_METRICS_JSON ---\n${JSON.stringify(structured)}`;
  } catch (error: any) {
    console.error('[Code Analysis] Error:', {
      message: error?.message || String(error),
      name: error?.name
    });
    return null;
  }
}

async function runTier3Judgment(
  plagiarismCase: PlagiarismCase,
  tier2Result: any,
  env: Env
): Promise<void> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  // ALWAYS fetch code comparison - visual analysis alone can be manipulated
  // Someone could submit convincing screenshots but have identical underlying code
  console.log('[Tier 3] Fetching HTML/CSS/JS for code-level validation');

  // Extract all URLs from Airtable fields (may contain multiple URLs)
  const originalUrls = extractAllUrls(plagiarismCase.originalUrl);
  const copyUrls = extractAllUrls(plagiarismCase.allegedCopyUrl);

  // If extraction failed, fall back to sanitizing single URL
  const cleanOriginalUrls = originalUrls.length > 0
    ? originalUrls
    : [sanitizeUrl(plagiarismCase.originalUrl)];
  const cleanCopyUrl = copyUrls.length > 0
    ? copyUrls[0]  // Copy URL should be single
    : sanitizeUrl(plagiarismCase.allegedCopyUrl);

  console.log(`[Code Analysis] Found ${cleanOriginalUrls.length} original URL(s), comparing against: ${cleanCopyUrl}`);

  // Launch Puppeteer browser for JavaScript rendering (fallback if plain fetch fails)
  let browser;
  try {
    browser = await puppeteer.launch(env.BROWSER);
    console.log('[Code Analysis] Puppeteer browser launched successfully');
  } catch (error: any) {
    console.log('[Code Analysis] Puppeteer unavailable, will use plain fetch only:', error.message);
  }

  let codeAnalysis: string | null = null;
  try {
    codeAnalysis = await fetchCodeComparison(
      cleanOriginalUrls,
      cleanCopyUrl,
      browser
    );
  } finally {
    // Always close browser to free resources
    if (browser) {
      await browser.close();
      console.log('[Code Analysis] Puppeteer browser closed');
    }
  }

  // Persist structured code metrics (if present)
  if (codeAnalysis && codeAnalysis.includes('--- STRUCTURED_CODE_METRICS_JSON ---')) {
    try {
      const parts = codeAnalysis.split('--- STRUCTURED_CODE_METRICS_JSON ---');
      const json = parts[1]?.trim();
      if (json) {
        const structured = JSON.parse(json);
        await storeEvidence(env, plagiarismCase.id, 'tier3_code_metrics', structured);
      }
    } catch (error: any) {
      console.log('[Evidence] Failed to parse/store structured code metrics:', error?.message || String(error));
    }
  }

  // NEW: Vector Similarity Analysis
  let vectorAnalysis: VectorSimilarity | null = null;
  if (env.OPENAI_API_KEY) {
    console.log('[Vector] Computing vector similarity...');
    try {
      vectorAnalysis = await analyzeVectorSimilarity(
        cleanOriginalUrls[0],
        cleanCopyUrl,
        env.OPENAI_API_KEY
      );
      console.log('[Vector] Similarity computed:', vectorAnalysis);
    } catch (error: any) {
      console.log('[Vector] Error computing similarity:', error.message);
    }
  } else {
    console.log('[Vector] Skipping vector analysis (no OPENAI_API_KEY configured)');
  }

  if (vectorAnalysis) {
    await storeEvidence(env, plagiarismCase.id, 'tier3_vector_similarity', vectorAnalysis);
  }

  // NEW: Vectorize nearest neighbors (tangible list of similar templates)
  try {
    if (env.OPENAI_API_KEY && env.VECTORIZE) {
      const neighbors = await findSimilarTemplates(cleanCopyUrl, env, 10);
      await storeEvidence(env, plagiarismCase.id, 'tier3_vectorize_neighbors', {
        queryUrl: cleanCopyUrl,
        topK: 10,
        neighbors
      });
    }
  } catch (error: any) {
    console.log('[Vectorize] Neighbor query failed (non-fatal):', error?.message || String(error));
  }

  const prompt = `Make final judgment on plagiarism case:

Original: ${plagiarismCase.originalUrl}
Alleged copy: ${plagiarismCase.allegedCopyUrl}
Complaint: ${plagiarismCase.complaintText}

Tier 2 Visual Analysis: ${JSON.stringify(tier2Result)}

HTML/CSS/JS Code Analysis:
${codeAnalysis || 'Code analysis failed - URLs may be inaccessible'}

${vectorAnalysis ? `
Vector Similarity Analysis (Semantic Code Comparison):
- HTML Structure Similarity: ${(vectorAnalysis.html_similarity * 100).toFixed(1)}%
- CSS Pattern Similarity: ${(vectorAnalysis.css_similarity * 100).toFixed(1)}%
- JavaScript Logic Similarity: ${(vectorAnalysis.js_similarity * 100).toFixed(1)}%
- Webflow Interaction Similarity: ${(vectorAnalysis.webflow_similarity * 100).toFixed(1)}%
- DOM Hierarchy Similarity: ${(vectorAnalysis.dom_similarity * 100).toFixed(1)}%
- Overall Semantic Similarity: ${(vectorAnalysis.overall * 100).toFixed(1)}%
- Verdict: ${vectorAnalysis.verdict}

INTERPRETATION:
- High similarity (>85%): Strong evidence of copying, even if code is refactored/renamed
- Moderate similarity (70-85%): Significant structural overlap, investigate further
- Low similarity (<70%): Different implementations, likely independent work

Vector analysis uses embeddings to detect semantic similarity that pattern matching might miss.
This catches renamed classes, refactored code, and structural copying.
` : 'Vector analysis not available'}

CRITICAL: Visual similarity can be misleading. The code and vector analyses reveal the truth:

1. CSS Animations/Transitions: Direct evidence of copied keyframes and timing
2. JavaScript Libraries: GSAP, Framer Motion, Anime.js usage indicates implementation approach
3. Webflow Patterns: IX2 interactions, data-w-id attributes show Webflow-specific copying
4. Layout Patterns: Grid/flex structures reveal design system similarities
5. Animation Calls: JavaScript animation function usage shows implementation details

If both sites use the same JavaScript animation library with similar counts, this is STRONG evidence.
If both are Webflow sites with similar interaction counts, this is STRONG evidence.
CSS keyframe matches are DEFINITIVE proof of copying.

Use both visual and code evidence to make your final determination.

Provide final decision with detailed reasoning and confidence level.

IMPORTANT: Return ONLY valid JSON, nothing else.
{
  "decision": "no_violation" | "minor" | "major",
  "reasoning": "Detailed explanation",
  "confidence": 0.0-1.0
}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-7-sonnet-20250219',
    temperature: 0,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  const result = extractJSON(response.content[0].text);

  await env.DB.prepare(`
    UPDATE plagiarism_cases
    SET tier3_decision = ?, tier3_reasoning = ?, cost_usd = cost_usd + ?
    WHERE id = ?
  `).bind(result.decision, result.reasoning, TIER_COSTS.TIER3, plagiarismCase.id).run();

  await closeCase(plagiarismCase, result.decision as FinalDecision, result, env);

  console.log(`[Tier 3] ${plagiarismCase.id}: ${result.decision} ($${TIER_COSTS.TIER3}) (code analysis: ${codeAnalysis ? 'success' : 'failed'})`);
}

// =============================================================================
// CASE CLOSURE & AIRTABLE UPDATE
// =============================================================================

/**
 * Unified case closure function with confidence threshold for major violations.
 *
 * For major violations with confidence < 0.9, flags for human review instead
 * of auto-delisting. This prevents Enframing (automation replacing judgment).
 */
async function closeCase(
  plagiarismCase: PlagiarismCase,
  decision: FinalDecision,
  result: any,
  env: Env
) {
  // Update database with final decision
  await env.DB.prepare(`
    UPDATE plagiarism_cases
    SET final_decision = ?, status = 'completed', completed_at = ?
    WHERE id = ?
  `).bind(decision, Date.now(), plagiarismCase.id).run();

  // Prepare Airtable fields
  const fields: Record<string, string> = {
    [AIRTABLE_FIELDS.DECISION]: DECISION_TO_AIRTABLE[decision]
  };

  // Check confidence threshold for major violations
  const confidence = result?.confidence ?? 1.0;
  const requiresHumanReview = decision === 'major' && confidence < MAJOR_VIOLATION_CONFIDENCE_THRESHOLD;

  if (requiresHumanReview) {
    // Flag for human review instead of auto-delisting
    fields[AIRTABLE_FIELDS.OUTCOME] = `Flagged for review (confidence: ${(confidence * 100).toFixed(0)}%)`;
    console.log(`[Case Closure] ${plagiarismCase.id}: Major violation flagged for human review (confidence: ${confidence})`);
  } else {
    // High confidence or non-major decision: auto-action
    const outcome = DECISION_TO_OUTCOME[decision];
    // Only set outcome if not empty (Airtable rejects empty select options)
    if (outcome) {
      fields[AIRTABLE_FIELDS.OUTCOME] = outcome;
    }
  }

  // Add editorial scores if available (Tier 2 results)
  if (result?.extent) {
    fields[AIRTABLE_FIELDS.EXTENT] = capitalizeFirst(result.extent);
  }
  if (result?.transformation) {
    fields[AIRTABLE_FIELDS.TRANSFORMATION] = capitalizeFirst(result.transformation);
  }
  if (result?.importance) {
    fields[AIRTABLE_FIELDS.IMPORTANCE] = capitalizeFirst(result.importance);
  }
  if (result?.impact) {
    fields[AIRTABLE_FIELDS.IMPACT] = capitalizeFirst(result.impact);
  }

  await updateAirtable(env, plagiarismCase.airtableRecordId, fields);

  console.log(`[Case Closure] ${plagiarismCase.id}: ${decision} (confidence: ${confidence})`);
}

async function updateAirtable(
  env: Env,
  recordId: string,
  fields: Record<string, string>
) {
  const response = await fetch(
    `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_TABLE_ID}/${recordId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    }
  );

  if (!response.ok) {
    console.error(`[Airtable] Update failed: ${await response.text()}`);
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Sanitize URL from Airtable field that may contain:
 * - Markdown/HTML angle brackets: <https://example.com>
 * - Multiple URLs separated by newlines
 * - Extra whitespace
 *
 * Returns the first valid URL found, or the original string if no URL pattern detected.
 */
function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;

  // Remove angle brackets and trim
  let cleaned = rawUrl
    .replace(/^</, '')  // Remove leading <
    .replace(/>$/, '')  // Remove trailing >
    .trim();

  // If multiple URLs (separated by newlines), take the first one
  const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length > 0) {
    cleaned = lines[0];
  }

  // Remove any remaining angle brackets
  cleaned = cleaned.replace(/[<>]/g, '');

  return cleaned;
}

/**
 * Extract ALL URLs from Airtable field.
 * Handles markdown/HTML angle brackets and newline separation.
 *
 * Returns array of clean URLs.
 */
function extractAllUrls(rawUrl: string): string[] {
  if (!rawUrl) return [];

  // Split by newlines and process each line
  const lines = rawUrl
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const urls: string[] = [];

  for (const line of lines) {
    // Remove angle brackets
    let cleaned = line
      .replace(/^</, '')
      .replace(/>$/, '')
      .replace(/[<>]/g, '')
      .trim();

    // Handle labels before URLs (e.g., "Hollow template: https://...")
    // Extract URL starting from http:// or https://
    const urlMatch = cleaned.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      urls.push(urlMatch[1]);
    }
  }

  return urls;
}

function extractJSON(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Try to find JSON object in text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    throw new Error(`Could not extract JSON from response: ${text.substring(0, 100)}`);
  }
}

// =============================================================================
// PLAGIARISM SCANNING
// =============================================================================

interface SuspiciousPair {
  template1: { id: string; name: string; url: string; creator: string | null };
  template2: { id: string; name: string; url: string; creator: string | null };
  similarity: number;
  verdict: string;
}

async function findSuspiciousPairs(
  env: Env,
  threshold: number,
  limit: number
): Promise<SuspiciousPair[]> {
  const suspicious: SuspiciousPair[] = [];
  
  // Get all templates with their signatures
  const templates = await env.DB.prepare(`
    SELECT id, name, url, creator, combined_signature 
    FROM template_minhash 
    ORDER BY indexed_at DESC 
    LIMIT 500
  `).all();
  
  if (!templates.results || templates.results.length < 2) {
    return [];
  }
  
  // Compare each template with others using LSH bands to find candidates
  const templatesArray = templates.results as any[];
  
  for (let i = 0; i < Math.min(templatesArray.length, 100); i++) {
    const t1 = templatesArray[i];
    const sig1 = deserializeSignatureCompact(t1.combined_signature);
    
    for (let j = i + 1; j < templatesArray.length; j++) {
      const t2 = templatesArray[j];
      
      // Skip same creator (legitimate similarity)
      if (t1.creator && t2.creator && t1.creator === t2.creator) {
        continue;
      }
      
      const sig2 = deserializeSignatureCompact(t2.combined_signature);
      const similarity = estimateSimilarity(sig1, sig2);
      
      if (similarity >= threshold) {
        // Determine if this looks like plagiarism vs legitimate
        let verdict = 'needs_review';
        if (similarity > 0.8) {
          verdict = 'high_similarity_different_creators';
        } else if (similarity > 0.5) {
          verdict = 'moderate_similarity';
        }
        
        suspicious.push({
          template1: { id: t1.id, name: t1.name, url: t1.url, creator: t1.creator },
          template2: { id: t2.id, name: t2.name, url: t2.url, creator: t2.creator },
          similarity,
          verdict
        });
        
        if (suspicious.length >= limit) {
          return suspicious.sort((a, b) => b.similarity - a.similarity);
        }
      }
    }
  }
  
  return suspicious.sort((a, b) => b.similarity - a.similarity);
}

interface ScanResult {
  url: string;
  indexed: boolean;
  matches: Array<{
    id: string;
    name: string;
    url: string;
    similarity: number;
    verdict: string;
  }>;
  recommendation: string;
}

async function scanTemplateForPlagiarism(
  templateUrl: string,
  threshold: number,
  env: Env
): Promise<ScanResult> {
  const content = await fetchPublishedContent(templateUrl);
  
  if (!content) {
    return {
      url: templateUrl,
      indexed: false,
      matches: [],
      recommendation: 'Could not fetch template content'
    };
  }
  
  // Compute MinHash signature
  const combinedMinHash = computeCombinedMinHash(content.html, content.css, content.javascript);
  const lshBands = computeLSHBandHashes(combinedMinHash);
  
  // Query for similar templates
  const bandConditions = lshBands.map((_, i) => `(band_id = 'band_${i}' AND hash_value = ?)`).join(' OR ');
  
  const candidateRows = await env.DB.prepare(`
    SELECT DISTINCT template_id FROM minhash_lsh_bands 
    WHERE ${bandConditions}
    LIMIT 100
  `).bind(...lshBands).all();
  
  const matches: ScanResult['matches'] = [];
  
  if (candidateRows.results && candidateRows.results.length > 0) {
    const candidateIds = candidateRows.results.map((r: any) => r.template_id);
    const placeholders = candidateIds.map(() => '?').join(',');
    
    const signatureRows = await env.DB.prepare(`
      SELECT id, name, url, creator, combined_signature 
      FROM template_minhash 
      WHERE id IN (${placeholders})
    `).bind(...candidateIds).all();
    
    if (signatureRows.results) {
      for (const row of signatureRows.results as any[]) {
        const sig = deserializeSignatureCompact(row.combined_signature);
        const similarity = estimateSimilarity(combinedMinHash, sig);
        
        if (similarity >= threshold) {
          let verdict = 'low_concern';
          if (similarity > 0.7) {
            verdict = 'high_similarity';
          } else if (similarity > 0.5) {
            verdict = 'moderate_similarity';
          }
          
          matches.push({
            id: row.id,
            name: row.name,
            url: row.url,
            similarity,
            verdict
          });
        }
      }
    }
  }
  
  // Sort by similarity
  matches.sort((a, b) => b.similarity - a.similarity);
  
  // Generate recommendation
  let recommendation = 'No significant matches found - template appears original';
  if (matches.length > 0) {
    const topMatch = matches[0];
    if (topMatch.similarity > 0.7) {
      recommendation = `HIGH CONCERN: ${(topMatch.similarity * 100).toFixed(0)}% match with "${topMatch.name}" - recommend detailed review`;
    } else if (topMatch.similarity > 0.5) {
      recommendation = `MODERATE CONCERN: ${(topMatch.similarity * 100).toFixed(0)}% match with "${topMatch.name}" - may warrant review`;
    } else {
      recommendation = `LOW CONCERN: Closest match is ${(topMatch.similarity * 100).toFixed(0)}% with "${topMatch.name}"`;
    }
  }
  
  return {
    url: templateUrl,
    indexed: true,
    matches: matches.slice(0, 20),
    recommendation
  };
}

// =============================================================================
// DASHBOARD
// =============================================================================

interface Cluster {
  id: string;
  templates: Array<{ id: string; name: string; url: string }>;
  avgSimilarity: number;
  suspicionLevel: string;
}

async function findSimilarityClusters(env: Env): Promise<Cluster[]> {
  // Find hash values that appear in multiple templates (potential clusters)
  // This is more memory-efficient than a self-join
  const sharedHashes = await env.DB.prepare(`
    SELECT hash_value, COUNT(DISTINCT template_id) as template_count
    FROM minhash_lsh_bands
    GROUP BY hash_value
    HAVING template_count >= 2 AND template_count <= 10
    ORDER BY template_count DESC
    LIMIT 20
  `).all();
  
  if (!sharedHashes.results || sharedHashes.results.length === 0) {
    return [];
  }
  
  // Get templates for each shared hash (these form potential clusters)
  const clusters: Cluster[] = [];
  const seenTemplates = new Set<string>();
  
  for (const row of sharedHashes.results as any[]) {
    const hashValue = row.hash_value;
    
    // Get templates sharing this hash
    const templates = await env.DB.prepare(`
      SELECT DISTINCT t.id, t.name, t.url
      FROM minhash_lsh_bands b
      JOIN template_minhash t ON b.template_id = t.id
      WHERE b.hash_value = ?
      LIMIT 10
    `).bind(hashValue).all();
    
    if (templates.results && templates.results.length >= 2) {
      // Check if we've already seen these templates in another cluster
      const newTemplates = (templates.results as any[]).filter(t => !seenTemplates.has(t.id));
      if (newTemplates.length >= 2) {
        for (const t of templates.results as any[]) {
          seenTemplates.add(t.id);
        }
        
        clusters.push({
          id: hashValue.substring(0, 8),
          templates: templates.results as any[],
          avgSimilarity: 0.5 + (row.template_count / 20), // Estimate
          suspicionLevel: row.template_count > 5 ? 'high' : row.template_count > 3 ? 'medium' : 'low'
        });
        
        if (clusters.length >= 10) break;
      }
    }
  }
  
  return clusters;
  
  for (const [root, memberIds] of Object.entries(clusterMap)) {
    if (memberIds.length < 2) continue;
    
    const placeholders = memberIds.map(() => '?').join(',');
    const members = await env.DB.prepare(`
      SELECT id, name, url FROM template_minhash WHERE id IN (${placeholders})
    `).bind(...memberIds).all();
    
    if (members.results && members.results.length >= 2) {
      clusters.push({
        id: root,
        templates: members.results as any[],
        avgSimilarity: 0.6, // Approximate - would need to compute exactly
        suspicionLevel: memberIds.length > 5 ? 'high' : memberIds.length > 3 ? 'medium' : 'low'
      });
    }
  }
  
  return clusters.sort((a, b) => b.templates.length - a.templates.length);
}

async function getDashboardStats(env: Env): Promise<any> {
  const [totalCount, caseCount, recentCases] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as count FROM template_minhash').first(),
    env.DB.prepare('SELECT COUNT(*) as count FROM plagiarism_cases').first(),
    env.DB.prepare(`
      SELECT id, original_url, alleged_copy_url, final_decision, created_at 
      FROM plagiarism_cases 
      ORDER BY created_at DESC 
      LIMIT 10
    `).all()
  ]);
  
  return {
    totalTemplatesIndexed: totalCount?.count || 0,
    totalCasesProcessed: caseCount?.count || 0,
    recentCases: recentCases.results || [],
    lastUpdated: new Date().toISOString()
  };
}

function serveDashboard(env: Env): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plagiarism Detection Dashboard</title>
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #12121a;
      --border: #1e1e2e;
      --text: #e4e4e7;
      --muted: #71717a;
      --accent: #8b5cf6;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .subtitle { color: var(--muted); margin-bottom: 2rem; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
    }
    .stat-value { font-size: 2.5rem; font-weight: 700; color: var(--accent); }
    .stat-label { color: var(--muted); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .section { margin-bottom: 2rem; }
    .section-title { font-size: 1.25rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-weight: 500;
    }
    .badge-high { background: rgba(239,68,68,0.2); color: var(--danger); }
    .badge-medium { background: rgba(245,158,11,0.2); color: var(--warning); }
    .badge-low { background: rgba(34,197,94,0.2); color: var(--success); }
    .table-container {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--border); }
    th { background: rgba(255,255,255,0.02); color: var(--muted); font-weight: 500; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: rgba(255,255,255,0.02); }
    .similarity-bar {
      width: 100px;
      height: 8px;
      background: var(--border);
      border-radius: 4px;
      overflow: hidden;
    }
    .similarity-fill {
      height: 100%;
      border-radius: 4px;
    }
    .cluster-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .cluster-templates {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .template-pill {
      background: var(--border);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
    }
    .scan-form {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .form-row { display: flex; gap: 1rem; }
    input[type="text"] {
      flex: 1;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: var(--text);
      font-size: 1rem;
    }
    input[type="text"]:focus { outline: none; border-color: var(--accent); }
    button {
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .loading { animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    #scan-results { margin-top: 1rem; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Plagiarism Detection Dashboard</h1>
    <p class="subtitle">MinHash LSH Index with 9,500+ templates</p>
    
    <div class="stats-grid" id="stats">
      <div class="stat-card">
        <div class="stat-value loading">-</div>
        <div class="stat-label">Templates Indexed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value loading">-</div>
        <div class="stat-label">Cases Processed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value loading">-</div>
        <div class="stat-label">Suspicious Clusters</div>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">🔎 Scan Template</h2>
      <div class="scan-form">
        <div class="form-row">
          <input type="text" id="scan-url" placeholder="Enter template URL (e.g., https://example.webflow.io/)">
          <button onclick="scanTemplate()">Scan for Plagiarism</button>
        </div>
        <div id="scan-results"></div>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">⚠️ Suspicious Pairs</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Template 1</th>
              <th>Template 2</th>
              <th>Similarity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="suspicious-pairs">
            <tr><td colspan="4" class="loading">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">🔗 Similarity Clusters</h2>
      <div id="clusters">
        <div class="cluster-card loading">Loading clusters...</div>
      </div>
    </div>
  </div>
  
  <script>
    async function loadStats() {
      try {
        const statsRes = await fetch('/dashboard/stats');
        const stats = statsRes.ok ? await statsRes.json() : { totalTemplatesIndexed: 0, totalCasesProcessed: 0 };
        
        let clusterCount = 0;
        try {
          const clustersRes = await fetch('/dashboard/clusters');
          if (clustersRes.ok) {
            const clusters = await clustersRes.json();
            clusterCount = Array.isArray(clusters) ? clusters.length : 0;
          }
        } catch (e) {
          console.log('Clusters not available yet');
        }
        
        const statsEl = document.getElementById('stats');
        statsEl.innerHTML = \`
          <div class="stat-card">
            <div class="stat-value">\${(stats.totalTemplatesIndexed || 0).toLocaleString()}</div>
            <div class="stat-label">Templates Indexed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">\${stats.totalCasesProcessed || 0}</div>
            <div class="stat-label">Cases Processed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">\${clusterCount}</div>
            <div class="stat-label">Similarity Clusters</div>
          </div>
        \`;
      } catch (e) {
        console.error('Failed to load stats:', e);
        document.getElementById('stats').innerHTML = '<div class="stat-card"><div class="stat-value">Error</div><div class="stat-label">Loading failed</div></div>';
      }
    }
    
    async function loadSuspiciousPairs() {
      try {
        const res = await fetch('/scan/suspicious?threshold=0.4&limit=20');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const tbody = document.getElementById('suspicious-pairs');
        
        if (!data.pairs || data.pairs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4">No suspicious pairs found above 40% threshold. LSH backfill may still be in progress.</td></tr>';
          return;
        }
        
        tbody.innerHTML = data.pairs.map(p => \`
          <tr>
            <td><a href="\${p.template1.url}" target="_blank">\${p.template1.name}</a></td>
            <td><a href="\${p.template2.url}" target="_blank">\${p.template2.name}</a></td>
            <td>
              <div class="similarity-bar">
                <div class="similarity-fill" style="width: \${p.similarity * 100}%; background: \${p.similarity > 0.7 ? 'var(--danger)' : p.similarity > 0.5 ? 'var(--warning)' : 'var(--success)'}"></div>
              </div>
              \${(p.similarity * 100).toFixed(0)}%
            </td>
            <td><span class="badge \${p.similarity > 0.7 ? 'badge-high' : p.similarity > 0.5 ? 'badge-medium' : 'badge-low'}">\${p.verdict}</span></td>
          </tr>
        \`).join('');
      } catch (e) {
        console.error('Failed to load suspicious pairs:', e);
      }
    }
    
    async function loadClusters() {
      const el = document.getElementById('clusters');
      try {
        const res = await fetch('/dashboard/clusters');
        if (!res.ok) throw new Error('API error');
        const clusters = await res.json();
        
        if (!Array.isArray(clusters) || clusters.length === 0) {
          el.innerHTML = '<div class="cluster-card">No similarity clusters detected yet. LSH backfill may still be in progress.</div>';
          return;
        }
        
        el.innerHTML = clusters.slice(0, 10).map(c => \`
          <div class="cluster-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>\${c.templates?.length || 0} templates</strong>
              <span class="badge \${c.suspicionLevel === 'high' ? 'badge-high' : c.suspicionLevel === 'medium' ? 'badge-medium' : 'badge-low'}">\${c.suspicionLevel || 'unknown'} suspicion</span>
            </div>
            <div class="cluster-templates">
              \${(c.templates || []).map(t => \`<a href="\${t.url}" target="_blank" class="template-pill">\${t.name}</a>\`).join('')}
            </div>
          </div>
        \`).join('');
      } catch (e) {
        console.error('Failed to load clusters:', e);
        el.innerHTML = '<div class="cluster-card">Clusters loading... (LSH backfill in progress)</div>';
      }
    }
    
    async function scanTemplate() {
      const url = document.getElementById('scan-url').value.trim();
      if (!url) return alert('Please enter a URL');
      
      const resultsEl = document.getElementById('scan-results');
      resultsEl.innerHTML = '<div class="loading">Scanning...</div>';
      
      try {
        const data = await fetch('/scan/template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, threshold: 0.3 })
        }).then(r => r.json());
        
        if (data.error) {
          resultsEl.innerHTML = \`<div style="color: var(--danger)">Error: \${data.error}</div>\`;
          return;
        }
        
        resultsEl.innerHTML = \`
          <div style="margin-top: 1rem; padding: 1rem; background: var(--bg); border-radius: 8px;">
            <strong>\${data.recommendation}</strong>
            \${data.matches.length > 0 ? \`
              <table style="margin-top: 1rem; width: 100%;">
                <thead><tr><th>Template</th><th>Similarity</th></tr></thead>
                <tbody>
                  \${data.matches.slice(0, 10).map(m => \`
                    <tr>
                      <td><a href="\${m.url}" target="_blank">\${m.name}</a></td>
                      <td>\${(m.similarity * 100).toFixed(0)}%</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            \` : ''}
          </div>
        \`;
      } catch (e) {
        resultsEl.innerHTML = \`<div style="color: var(--danger)">Failed to scan: \${e.message}</div>\`;
      }
    }
    
    // Load everything on page load
    loadStats();
    loadSuspiciousPairs();
    loadClusters();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
