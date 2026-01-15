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
  extractCSSPatterns,
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

    // ==========================================================================
    // TF-IDF KEYWORD EXTRACTION - What makes this template unique?
    // ==========================================================================
    if (url.pathname === '/keywords' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { url: templateUrl } = body;
        
        if (!templateUrl) {
          return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400 });
        }
        
        const keywords = await extractKeywords(templateUrl, env);
        
        return new Response(JSON.stringify(keywords), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Health check endpoint for monitoring
    if (url.pathname === '/health' && request.method === 'GET') {
      try {
        const [templateCount, caseCount, lshBandCount] = await Promise.all([
          env.DB.prepare('SELECT COUNT(*) as count FROM template_minhash').first(),
          env.DB.prepare('SELECT COUNT(*) as count FROM plagiarism_cases').first(),
          env.DB.prepare('SELECT COUNT(*) as count FROM minhash_lsh_bands').first()
        ]);
        
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: Date.now(),
          stats: {
            templatesIndexed: templateCount?.count || 0,
            casesProcessed: caseCount?.count || 0,
            lshBands: lshBandCount?.count || 0
          },
          version: '2.0.0'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({
          status: 'unhealthy',
          error: error.message,
          timestamp: Date.now()
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
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
        const { url: templateUrl, threshold = 0.35, debug = false } = body;
        
        if (!templateUrl) {
          return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400 });
        }
        
        const results = await scanTemplateForPlagiarism(templateUrl, threshold, env, debug);
        
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // ==========================================================================
    // DETAILED COMPARISON: Tufte-style evidence view
    // ==========================================================================
    if (url.pathname === '/compare' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { url1, url2, id1, id2 } = body;
        
        const comparison = await generateDetailedComparison(url1 || id1, url2 || id2, env);
        
        return new Response(JSON.stringify(comparison), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Comparison UI
    if (url.pathname.startsWith('/compare/') && request.method === 'GET') {
      const parts = url.pathname.split('/');
      if (parts.length >= 4) {
        const id1 = parts[2];
        const id2 = parts[3];
        return serveComparisonPage(id1, id2, env);
      }
    }

    // ==========================================================================
    // RESCAN: Drift tracking for compliance monitoring
    // ==========================================================================
    if (url.pathname.match(/^\/case\/[^/]+\/rescan$/) && request.method === 'POST') {
      const caseId = url.pathname.split('/')[2];
      try {
        const result = await performRescan(caseId, env);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }
    
    // Rescan UI page
    if (url.pathname.match(/^\/case\/[^/]+\/rescan$/) && request.method === 'GET') {
      const caseId = url.pathname.split('/')[2];
      return serveRescanPage(caseId, env);
    }
    
    // Get case details with rescan history
    if (url.pathname.match(/^\/case\/[^/]+$/) && request.method === 'GET') {
      const caseId = url.pathname.split('/')[2];
      try {
        const caseData = await getCaseWithRescans(caseId, env);
        return new Response(JSON.stringify(caseData), {
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

  // Compute MinHash signature of alleged copy for drift tracking
  let originalCopySignature: string | null = null;
  let originalSimilarity: number | null = null;
  
  try {
    const copyContent = await fetchTemplateContent(allegedCopyUrl);
    if (copyContent.css || copyContent.html) {
      const copySig = computeCombinedMinHash(copyContent.html, copyContent.css, copyContent.js);
      originalCopySignature = serializeSignatureCompact(copySig.signature);
      
      // Also compute initial similarity to the original template
      const originalContent = await fetchTemplateContent(originalUrl);
      if (originalContent.css || originalContent.html) {
        const origSig = computeCombinedMinHash(originalContent.html, originalContent.css, originalContent.js);
        const simResult = estimateSimilarity(copySig, origSig);
        originalSimilarity = simResult.jaccardEstimate;
      }
      console.log(`[Webhook] Captured MinHash signature for drift tracking (initial similarity: ${(originalSimilarity || 0) * 100}%)`);
    }
  } catch (e) {
    console.log(`[Webhook] Failed to capture MinHash signature: ${e}`);
  }

  await env.DB.prepare(`
    INSERT INTO plagiarism_cases (
      id, airtable_record_id, reporter_email,
      original_url, alleged_copy_url, complaint_text,
      alleged_creator, status, created_at,
      original_copy_signature, original_similarity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).bind(
    caseId,
    payload.recordId,
    reporterEmail,
    originalUrl,
    allegedCopyUrl,
    complaintText,
    allegedCreator,
    now,
    originalCopySignature,
    originalSimilarity
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
  env: Env,
  debug = false
): Promise<ScanResult & { debug?: any }> {
  // Normalize URL for lookup
  const normalizedUrl = templateUrl.replace(/\/$/, '') + '/';
  const urlWithoutSlash = templateUrl.replace(/\/$/, '');
  
  console.log(`[Scan] Looking for URL: ${normalizedUrl} or ${urlWithoutSlash}`);
  
  // First, check if this template is already indexed
  const existingTemplate = await env.DB.prepare(
    'SELECT id, name, combined_signature, combined_shingles FROM template_minhash WHERE url = ? OR url = ?'
  ).bind(normalizedUrl, urlWithoutSlash).first();
  
  console.log(`[Scan] Found existing template: ${existingTemplate ? existingTemplate.id : 'none'}`);
  
  let querySig: number[];
  let templateId: string | null = null;
  let isIndexed = false;
  
  if (existingTemplate) {
    // Use stored signature
    isIndexed = true;
    templateId = existingTemplate.id as string;
    querySig = deserializeSignatureCompact(
      existingTemplate.combined_signature as string,
      existingTemplate.combined_shingles as number,
      'combined'
    );
  } else {
    // Fetch and compute fresh
    const content = await fetchPublishedContent(templateUrl);
    
    if (!content) {
      return {
        url: templateUrl,
        indexed: false,
        matches: [],
        recommendation: 'Could not fetch template content'
      };
    }
    
    querySig = computeCombinedMinHash(content.html, content.css, content.javascript);
  }
  
  // Compare against all other templates (exclude self if indexed)
  const allTemplates = templateId 
    ? await env.DB.prepare('SELECT * FROM template_minhash WHERE id != ?').bind(templateId).all()
    : await env.DB.prepare('SELECT * FROM template_minhash').all();
  
  console.log(`[Scan] Comparing against ${allTemplates.results?.length || 0} templates, threshold=${threshold}`);
  
  const matches: ScanResult['matches'] = [];
  let highestSim = 0;
  let highestMatch = '';
  
  if (allTemplates.results) {
    for (const row of allTemplates.results as any[]) {
      const candidateSig = deserializeSignatureCompact(
        row.combined_signature,
        row.combined_shingles,
        'combined'
      );
      const simResult = estimateSimilarity(querySig, candidateSig);
      const similarity = simResult.jaccardEstimate;
      
      if (similarity > highestSim) {
        highestSim = similarity;
        highestMatch = row.id;
      }
      
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
  
  console.log(`[Scan] Found ${matches.length} matches above threshold. Highest sim: ${highestSim} (${highestMatch})`);
  
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
  
  const result: ScanResult & { debug?: any } = {
    url: templateUrl,
    indexed: isIndexed,
    matches: matches.slice(0, 20),
    recommendation
  };
  
  if (debug) {
    result.debug = {
      templateId,
      threshold,
      totalCompared: allTemplates.results?.length || 0,
      matchesFound: matches.length,
      highestSimilarity: highestSim,
      highestMatchId: highestMatch,
      querySigLength: querySig?.signature?.length,
      querySigNumShingles: querySig?.numShingles
    };
  }
  
  return result;
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

// =============================================================================
// DETAILED COMPARISON - Tufte-style evidence analysis
// =============================================================================

interface PatternMatch {
  type: 'class' | 'property' | 'animation' | 'color' | 'gradient' | 'variable' | 'structure';
  value: string;
  context?: string;
}

interface IdenticalRule {
  selector: string;
  properties: string[];
  similarity: number; // 1.0 = exact match
  depth?: number; // Nesting depth (lower = more significant)
  scope?: 'page' | 'section' | 'component' | 'element';
}

interface StructuralMatch {
  level: 'page' | 'section' | 'component' | 'element';
  tag: string;
  depth: number;
  childSignature: string; // Simplified child structure
  weight: number; // Higher = more significant
}

interface VisualEvidence {
  selector: string;
  css: string;
  html1: string;
  html2: string;
  properties: string[];
}

interface ComparisonResult {
  template1: { id: string; name: string; url: string };
  template2: { id: string; name: string; url: string };
  overallSimilarity: number;
  // SMOKING GUN: Same class name + same properties = copy/paste
  identicalRules: IdenticalRule[];
  // Property combinations (3+ props together = fingerprint)
  propertyCombinations: Array<{ selector: string; props: string[]; weight: number }>;
  // Visual evidence: HTML + CSS for rendering side-by-side previews
  visualEvidence: VisualEvidence[];
  // Structural matches weighted by depth (shallower = more significant)
  structuralMatches: {
    score: number;
    matches: Array<{ pattern: string; level: string; weight: number; count: number }>;
  };
  breakdown: {
    cssClasses: { similarity: number; shared: string[]; unique1: string[]; unique2: string[] };
    cssProperties: { similarity: number; shared: PatternMatch[]; };
    animations: { similarity: number; shared: string[]; };
    colors: { similarity: number; shared: string[]; };
    structure: { similarity: number; patterns: string[]; };
  };
  evidence: {
    matchingPatterns: PatternMatch[];
    codeExcerpts: Array<{ label: string; code1: string; code2: string; similarity: number }>;
  };
}

async function generateDetailedComparison(
  ref1: string,
  ref2: string,
  env: Env
): Promise<ComparisonResult> {
  // Get template data - ref can be id, url, or partial match
  // Try exact match first, then fuzzy match for cases like "avignon-template" → "avignon"
  let t1 = await env.DB.prepare(
    'SELECT * FROM template_minhash WHERE id = ? OR url = ? OR url = ?'
  ).bind(ref1, ref1, ref1.replace(/\/$/, '') + '/').first();
  
  // Fuzzy fallback: strip common suffixes like "-template", "-webflow", etc.
  if (!t1) {
    const cleanRef1 = ref1.replace(/[-_](template|webflow|wbs|business)$/i, '');
    t1 = await env.DB.prepare(
      'SELECT * FROM template_minhash WHERE id = ? OR id LIKE ? OR url LIKE ?'
    ).bind(cleanRef1, `${cleanRef1}%`, `%${cleanRef1}%`).first();
  }
  
  let t2 = await env.DB.prepare(
    'SELECT * FROM template_minhash WHERE id = ? OR url = ? OR url = ?'
  ).bind(ref2, ref2, ref2.replace(/\/$/, '') + '/').first();
  
  if (!t2) {
    const cleanRef2 = ref2.replace(/[-_](template|webflow|wbs|business)$/i, '');
    t2 = await env.DB.prepare(
      'SELECT * FROM template_minhash WHERE id = ? OR id LIKE ? OR url LIKE ?'
    ).bind(cleanRef2, `${cleanRef2}%`, `%${cleanRef2}%`).first();
  }
  
  if (!t1 || !t2) {
    throw new Error(`Template not found: ${!t1 ? ref1 : ref2}`);
  }
  
  // Fetch fresh content for detailed analysis
  const [content1, content2] = await Promise.all([
    fetchPublishedContent(t1.url as string),
    fetchPublishedContent(t2.url as string)
  ]);
  
  if (!content1 || !content2) {
    throw new Error('Could not fetch template content');
  }
  
  // Extract detailed patterns
  const classes1 = extractAllClasses(content1.css, content1.html);
  const classes2 = extractAllClasses(content2.css, content2.html);
  
  const props1 = extractDetailedCssProperties(content1.css);
  const props2 = extractDetailedCssProperties(content2.css);
  
  const animations1 = extractAnimations(content1.css);
  const animations2 = extractAnimations(content2.css);
  
  const colors1 = extractColors(content1.css);
  const colors2 = extractColors(content2.css);
  
  // Calculate shared elements
  const sharedClasses = classes1.filter(c => classes2.includes(c));
  const sharedAnimations = animations1.filter(a => animations2.includes(a));
  const sharedColors = colors1.filter(c => colors2.includes(c));
  
  // SMOKING GUN: Find identical CSS rules (same selector + same properties)
  const identicalRules = findIdenticalRules(content1.css, content2.css);
  
  // Structural analysis: Find matching HTML patterns weighted by depth
  // Shallower matches (sections, pages) are more significant than deep matches (buttons, spans)
  const structuralMatches = findStructuralMatches(content1.html, content2.html);
  
  // Find matching property patterns
  // Single properties are noise - we need COMBINATIONS to be meaningful
  const sharedProps: PatternMatch[] = [];
  const propSet1 = new Set(props1.map(p => `${p.type}:${p.value}`));
  const propSet2 = new Set(props2.map(p => `${p.type}:${p.value}`));
  
  for (const p1 of props1) {
    const key = `${p1.type}:${p1.value}`;
    if (propSet2.has(key)) {
      sharedProps.push(p1);
    }
  }
  
  // Also find property COMBINATIONS from identical rules
  // These are much more significant than individual property matches
  const propCombinations: Array<{ selector: string; props: string[]; weight: number }> = [];
  for (const rule of identicalRules) {
    if (rule.properties.length >= 3) {
      propCombinations.push({
        selector: rule.selector,
        props: rule.properties,
        weight: rule.properties.length * rule.similarity
      });
    }
  }
  
  // Calculate similarity from stored signatures
  const sig1 = deserializeSignatureCompact(t1.combined_signature as string, t1.combined_shingles as number, 'combined');
  const sig2 = deserializeSignatureCompact(t2.combined_signature as string, t2.combined_shingles as number, 'combined');
  const simResult = estimateSimilarity(sig1, sig2);
  
  // Extract code excerpts for visual comparison - prioritize identical rules
  // Filter out selectors with brackets/special chars that would break regex
  const excerptSelectors = identicalRules.length > 0 
    ? identicalRules
        .filter(r => !r.selector.includes('[') && !r.selector.includes('('))
        .slice(0, 5)
        .map(r => r.selector.replace(/^\./, ''))
    : sharedClasses.filter(c => !c.includes('[') && !c.includes('(')).slice(0, 5);
  const codeExcerpts = extractMatchingCodeExcerpts(content1, content2, excerptSelectors);
  
  // Generate visual evidence for the top identical rules
  const visualEvidence = generateVisualEvidence(
    identicalRules,
    content1.css,
    content2.css,
    content1.html,
    content2.html
  );

  return {
    template1: { id: t1.id as string, name: t1.name as string, url: t1.url as string },
    template2: { id: t2.id as string, name: t2.name as string, url: t2.url as string },
    overallSimilarity: simResult.jaccardEstimate,
    identicalRules,
    propertyCombinations: propCombinations.sort((a, b) => b.weight - a.weight).slice(0, 10),
    visualEvidence,
    structuralMatches,
    breakdown: {
      cssClasses: {
        similarity: sharedClasses.length / Math.max(classes1.length, classes2.length, 1),
        shared: sharedClasses.slice(0, 30),
        unique1: classes1.filter(c => !classes2.includes(c)).slice(0, 15),
        unique2: classes2.filter(c => !classes1.includes(c)).slice(0, 15)
      },
      cssProperties: {
        similarity: sharedProps.length / Math.max(props1.length, props2.length, 1),
        shared: sharedProps.slice(0, 20)
      },
      animations: {
        similarity: sharedAnimations.length / Math.max(animations1.length, animations2.length, 1),
        shared: sharedAnimations
      },
      colors: {
        similarity: sharedColors.length / Math.max(colors1.length, colors2.length, 1),
        shared: sharedColors.slice(0, 20)
      },
      structure: {
        similarity: 0, // Placeholder for HTML structure comparison
        patterns: []
      }
    },
    evidence: {
      matchingPatterns: [...sharedProps.slice(0, 10), ...sharedAnimations.map(a => ({ type: 'animation' as const, value: a }))],
      codeExcerpts
    }
  };
}

/**
 * Extract HTML elements that match a CSS selector for visual preview
 */
function extractElementBySelector(html: string, selector: string): string {
  let searchPattern = '';
  let placeholderElement = '';
  
  // Handle different selector types
  if (selector.startsWith('.')) {
    // Class selector: .container or compound .class1.class2
    const classes = selector.slice(1).split('.').filter(c => c.length > 0);
    const firstClass = classes[0].replace(/[:\[\]]/g, '');
    searchPattern = `class="[^"]*\\b${firstClass}\\b[^"]*"`;
    placeholderElement = `<div class="${classes.join(' ')}">Sample content</div>`;
  } else if (selector.startsWith('[')) {
    // Attribute selector: [data-nav-menu-open]
    const attrMatch = selector.match(/\[([^\]=]+)(?:=["']?([^"'\]]+))?/);
    if (attrMatch) {
      const attrName = attrMatch[1];
      const attrValue = attrMatch[2];
      if (attrValue) {
        searchPattern = `${attrName}="${attrValue}"`;
      } else {
        searchPattern = `${attrName}(?:="[^"]*")?`;
      }
      placeholderElement = `<div ${attrName}${attrValue ? `="${attrValue}"` : ''}>Sample content</div>`;
    }
  } else if (selector.startsWith('#')) {
    // ID selector
    const id = selector.slice(1);
    searchPattern = `id="${id}"`;
    placeholderElement = `<div id="${id}">Sample content</div>`;
  } else {
    // Element selector or complex selector - create placeholder
    placeholderElement = `<${selector}>Sample content</${selector}>`;
  }
  
  if (searchPattern) {
    // Try to find full element with content
    const fullRegex = new RegExp(
      `<([a-z][a-z0-9]*)\\s+[^>]*${searchPattern}[^>]*>([\\s\\S]*?)<\\/\\1>`,
      'gi'
    );
    const fullMatch = html.match(fullRegex);
    if (fullMatch && fullMatch[0]) {
      let element = fullMatch[0];
      if (element.length > 2000) {
        element = element.substring(0, 2000) + '<!-- truncated -->';
      }
      return element;
    }
    
    // Try self-closing element
    const selfClosingRegex = new RegExp(
      `<[a-z][a-z0-9]*\\s+[^>]*${searchPattern}[^>]*\\/?>`,
      'gi'
    );
    const selfClosingMatch = html.match(selfClosingRegex);
    if (selfClosingMatch && selfClosingMatch[0]) {
      return selfClosingMatch[0];
    }
  }
  
  return placeholderElement;
}

/**
 * Check if a rule has meaningful visual properties (not just layout)
 * We want to show UI components, not generic containers
 */
function hasVisualProperties(properties: string[]): boolean {
  const visualPatterns = [
    /background(-color|-image|-gradient)?:/i,
    /border(-radius|-color|-width)?:/i,
    /box-shadow:/i,
    /color:/i,
    /font-(family|weight|size):/i,
    /text-(shadow|decoration|transform):/i,
    /transform:/i,
    /opacity:/i,
    /filter:/i,
    /animation:/i,
    /transition:/i,
    /gradient/i,
  ];
  
  // Must have at least 2 visual properties
  let visualCount = 0;
  for (const prop of properties) {
    if (visualPatterns.some(pattern => pattern.test(prop))) {
      visualCount++;
    }
  }
  return visualCount >= 2;
}

/**
 * Check if selector is a generic layout/utility class
 */
function isGenericSelector(selector: string): boolean {
  const genericPatterns = [
    /^\.(container|wrapper|row|col|column|grid|flex)/i,
    /^\.(section|main|header|footer|nav|aside)/i,
    /^\.(loader|loading|spinner)/i,
    /^\.(hidden|visible|show|hide)/i,
    /^\.(w-|wf-)/i, // Webflow framework
    /^\[data-/i, // Data attributes (often state-based)
    /^\.is-/i, // State classes
  ];
  return genericPatterns.some(pattern => pattern.test(selector));
}

/**
 * Generate visual evidence for the top identical rules
 * Only includes meaningful UI components, not generic layout
 */
function generateVisualEvidence(
  identicalRules: IdenticalRule[],
  css1: string,
  css2: string,
  html1: string,
  html2: string
): VisualEvidence[] {
  const evidence: VisualEvidence[] = [];
  
  // Filter for meaningful UI components
  const meaningfulRules = identicalRules
    .filter(r => r.properties.length >= 3) // 3+ properties
    .filter(r => !isGenericSelector(r.selector)) // Not generic layout
    .filter(r => hasVisualProperties(r.properties)) // Has visual styling
    .sort((a, b) => b.properties.length - a.properties.length)
    .slice(0, 5);
  
  for (const rule of meaningfulRules) {
    const cssBlock = `${rule.selector} {\n  ${rule.properties.join(';\n  ')};\n}`;
    
    evidence.push({
      selector: rule.selector,
      css: cssBlock,
      html1: extractElementBySelector(html1, rule.selector),
      html2: extractElementBySelector(html2, rule.selector),
      properties: rule.properties
    });
  }
  
  return evidence;
}

/**
 * SMOKING GUN: Find CSS rules with same selector AND same properties
 * This is the strongest evidence of copy/paste plagiarism
 */
function findIdenticalRules(css1: string, css2: string): IdenticalRule[] {
  const rules1 = extractCssRules(css1);
  const rules2 = extractCssRules(css2);
  
  const identicalRules: IdenticalRule[] = [];
  
  // Common reset/normalize selectors to ignore (these are standard styling, not plagiarism)
  const resetSelectors = new Set([
    '*', 'html', 'body', 'a', 'img', 'button', 'input', 'textarea', 'select',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li',
    'audio', 'video', 'canvas', 'svg', 'iframe',
    'audio:not([controls])', 'img[src]', '[hidden]', 'template',
    '::before', '::after', '*::before', '*::after',
    ':root', ':focus', '::-webkit-input-placeholder', '::-moz-placeholder',
    'abbr[title]', 'b', 'strong', 'code', 'kbd', 'pre', 'samp', 'mark',
    'small', 'sub', 'sup', 'table', 'td', 'th', 'figure', 'figcaption',
    'fieldset', 'legend', 'progress', 'details', 'summary', 'main',
    'hr', 'address', 'dl', 'dt', 'dd', 'cite', 'dfn', 'em', 'i', 'q', 'var'
  ]);
  
  for (const [selector, props1] of Object.entries(rules1)) {
    // Skip Webflow framework classes
    if (selector.startsWith('.w-') || selector.startsWith('.wf-')) continue;
    
    // Skip common reset/normalize rules
    if (resetSelectors.has(selector)) continue;
    if (selector.includes('[type=') || selector.includes('::-webkit-') || selector.includes('::-moz-')) continue;
    
    if (rules2[selector]) {
      const props2 = rules2[selector];
      
      // Compare property sets
      const set1 = new Set(props1.map(p => normalizeProperty(p)));
      const set2 = new Set(props2.map(p => normalizeProperty(p)));
      
      // Find matching properties
      const matching = [...set1].filter(p => set2.has(p));
      
      if (matching.length >= 2) { // At least 2 matching properties
        const similarity = matching.length / Math.max(set1.size, set2.size);
        
        if (similarity >= 0.5) { // At least 50% property overlap
          identicalRules.push({
            selector,
            properties: matching.slice(0, 10), // Top 10 matching properties
            similarity
          });
        }
      }
    }
  }
  
  // Sort by similarity (highest first)
  identicalRules.sort((a, b) => b.similarity - a.similarity);
  
  return identicalRules.slice(0, 30); // Top 30 matches
}

/**
 * Extract CSS rules as a map of selector -> properties
 */
function extractCssRules(css: string): Record<string, string[]> {
  const rules: Record<string, string[]> = {};
  
  // Normalize CSS
  const normalized = css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ')
    .trim();
  
  // Match CSS rules: selector { properties }
  const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
  let match;
  
  while ((match = ruleRegex.exec(normalized)) !== null) {
    const selector = match[1].trim();
    const propsBlock = match[2].trim();
    
    // Skip @rules and complex selectors for now
    if (selector.startsWith('@') || selector.includes(',')) continue;
    
    // Extract individual properties
    const props = propsBlock
      .split(';')
      .map(p => p.trim())
      .filter(p => p.length > 0 && p.includes(':'));
    
    if (props.length > 0) {
      rules[selector] = props;
    }
  }
  
  return rules;
}

/**
 * Normalize a CSS property for comparison
 * Removes vendor prefixes, normalizes whitespace
 */
function normalizeProperty(prop: string): string {
  return prop
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/-webkit-|-moz-|-ms-|-o-/g, '')
    .trim();
}

/**
 * Analyze HTML structure and extract depth-weighted patterns
 * Shallower (higher in DOM) = more significant
 */
function analyzeHtmlStructure(html: string): StructuralMatch[] {
  const matches: StructuralMatch[] = [];
  
  // Define structural levels by tag
  const levelMap: Record<string, 'page' | 'section' | 'component' | 'element'> = {
    'body': 'page', 'main': 'page',
    'header': 'section', 'footer': 'section', 'nav': 'section', 
    'section': 'section', 'article': 'section', 'aside': 'section',
    'div': 'component', 'form': 'component', 'ul': 'component', 'ol': 'component',
    'table': 'component', 'figure': 'component',
    'p': 'element', 'span': 'element', 'a': 'element', 'button': 'element',
    'input': 'element', 'img': 'element', 'h1': 'element', 'h2': 'element',
    'h3': 'element', 'h4': 'element', 'h5': 'element', 'h6': 'element'
  };
  
  // Weight by level (higher = more significant copy)
  const weightMap: Record<string, number> = {
    'page': 10,
    'section': 7,
    'component': 4,
    'element': 1
  };
  
  // Parse and analyze structure
  let depth = 0;
  const tagStack: string[] = [];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = fullTag.startsWith('</');
    const isSelfClosing = fullTag.endsWith('/>') || ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tagName);
    
    if (isClosing) {
      depth = Math.max(0, depth - 1);
      tagStack.pop();
    } else {
      const level = levelMap[tagName] || 'element';
      const weight = weightMap[level] * (1 / Math.max(depth, 1)); // Depth penalty
      
      // Extract child structure signature for this element
      const childSignature = extractChildSignature(html, match.index);
      
      matches.push({
        level,
        tag: tagName,
        depth,
        childSignature,
        weight
      });
      
      if (!isSelfClosing) {
        depth++;
        tagStack.push(tagName);
      }
    }
  }
  
  return matches;
}

/**
 * Extract a simplified signature of immediate children
 */
function extractChildSignature(html: string, startIndex: number): string {
  // Find the closing tag and extract content between
  const openTagEnd = html.indexOf('>', startIndex) + 1;
  const tagMatch = html.slice(startIndex).match(/<([a-zA-Z][a-zA-Z0-9]*)/);
  if (!tagMatch) return '';
  
  const tagName = tagMatch[1].toLowerCase();
  const closeTagRegex = new RegExp(`</${tagName}>`, 'i');
  const closeMatch = html.slice(openTagEnd).match(closeTagRegex);
  
  if (!closeMatch) return '';
  
  const content = html.slice(openTagEnd, openTagEnd + closeMatch.index!);
  
  // Extract immediate child tags only (not grandchildren)
  const childTags: string[] = [];
  let depth = 0;
  const childRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  let match;
  
  while ((match = childRegex.exec(content)) !== null) {
    const isClosing = match[0].startsWith('</');
    const isSelfClosing = match[0].endsWith('/>');
    
    if (isClosing) {
      depth--;
    } else {
      if (depth === 0) {
        childTags.push(match[1].toLowerCase());
      }
      if (!isSelfClosing) {
        depth++;
      }
    }
  }
  
  return childTags.slice(0, 10).join(',');
}

/**
 * Compare HTML structures and find matching patterns
 * IMPORTANT: Generic patterns like div[div] are filtered out as noise
 * Only specific/unique patterns are considered meaningful
 */
function findStructuralMatches(html1: string, html2: string): {
  matches: Array<{ pattern: string; level: string; weight: number; count: number }>;
  score: number;
} {
  const struct1 = analyzeHtmlStructure(html1);
  const struct2 = analyzeHtmlStructure(html2);
  
  // Generic patterns that are too common to be meaningful
  const genericPatterns = new Set([
    'div[div]', 'div[a]', 'div[p]', 'div[span]', 'div[img]',
    'div[div,div]', 'div[div,div,div]', 'div[a,a]', 'div[a,a,a]',
    'section[div]', 'article[div]', 'main[div]', 'footer[div]', 'header[div]',
    'nav[div]', 'nav[a]', 'nav[a,a]', 'nav[a,a,a]', 'nav[a,a,a,a]',
    'ul[li]', 'ul[li,li]', 'ul[li,li,li]', 'ol[li]',
    'html[head,body]', 'head[meta]', 'body[div]', 'body[header,main,footer]'
  ]);
  
  // Create signatures from structure (filtering generic patterns)
  const sigs1 = new Map<string, { level: string; weight: number; count: number }>();
  const sigs2 = new Map<string, { level: string; weight: number; count: number }>();
  
  for (const s of struct1) {
    if (s.childSignature) {
      const key = `${s.tag}[${s.childSignature}]`;
      
      // Skip generic patterns
      if (genericPatterns.has(key)) continue;
      
      // Require at least 3 children or specific semantic elements to be meaningful
      const childCount = s.childSignature.split(',').length;
      const hasSemanticChildren = /h[1-6]|nav|header|footer|section|article|form/.test(s.childSignature);
      
      if (childCount < 3 && !hasSemanticChildren) continue;
      
      const existing = sigs1.get(key);
      if (existing) {
        existing.count++;
        existing.weight = Math.max(existing.weight, s.weight);
      } else {
        sigs1.set(key, { level: s.level, weight: s.weight, count: 1 });
      }
    }
  }
  
  for (const s of struct2) {
    if (s.childSignature) {
      const key = `${s.tag}[${s.childSignature}]`;
      
      if (genericPatterns.has(key)) continue;
      
      const childCount = s.childSignature.split(',').length;
      const hasSemanticChildren = /h[1-6]|nav|header|footer|section|article|form/.test(s.childSignature);
      
      if (childCount < 3 && !hasSemanticChildren) continue;
      
      const existing = sigs2.get(key);
      if (existing) {
        existing.count++;
        existing.weight = Math.max(existing.weight, s.weight);
      } else {
        sigs2.set(key, { level: s.level, weight: s.weight, count: 1 });
      }
    }
  }
  
  // Find matching structural patterns
  const matches: Array<{ pattern: string; level: string; weight: number; count: number }> = [];
  let totalWeight = 0;
  let matchedWeight = 0;
  
  for (const [pattern, data] of sigs1.entries()) {
    totalWeight += data.weight;
    
    if (sigs2.has(pattern)) {
      const data2 = sigs2.get(pattern)!;
      const matchWeight = Math.min(data.weight, data2.weight);
      matchedWeight += matchWeight;
      
      matches.push({
        pattern,
        level: data.level,
        weight: matchWeight,
        count: Math.min(data.count, data2.count)
      });
    }
  }
  
  // Sort by weight (most significant first)
  matches.sort((a, b) => b.weight - a.weight);
  
  return {
    matches: matches.slice(0, 20),
    score: totalWeight > 0 ? matchedWeight / totalWeight : 0
  };
}

function extractAllClasses(css: string, html: string): string[] {
  const classes = new Set<string>();
  
  // From CSS selectors
  const cssClassRegex = /\.([a-zA-Z_][\w-]*)/g;
  let match;
  while ((match = cssClassRegex.exec(css)) !== null) {
    const cls = match[1];
    // Filter out Webflow framework classes
    if (!cls.startsWith('w-') && !cls.startsWith('wf-') && !cls.startsWith('w_')) {
      classes.add(cls);
    }
  }
  
  // From HTML class attributes
  const htmlClassRegex = /class="([^"]+)"/g;
  while ((match = htmlClassRegex.exec(html)) !== null) {
    const classList = match[1].split(/\s+/);
    for (const cls of classList) {
      if (cls && !cls.startsWith('w-') && !cls.startsWith('wf-') && !cls.startsWith('w_')) {
        classes.add(cls);
      }
    }
  }
  
  return Array.from(classes).sort();
}

function extractDetailedCssProperties(css: string): PatternMatch[] {
  const props: PatternMatch[] = [];
  const seen = new Set<string>();
  
  // Normalize CSS
  const normalizedCss = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
  
  // HIGH PRIORITY: Design-defining properties
  const propertyPatterns: Array<{ regex: RegExp; type: PatternMatch['type']; label: string }> = [
    { regex: /transform:\s*([^;]+)/gi, type: 'property', label: 'transform' },
    { regex: /box-shadow:\s*([^;]+)/gi, type: 'property', label: 'box-shadow' },
    { regex: /text-shadow:\s*([^;]+)/gi, type: 'property', label: 'text-shadow' },
    { regex: /filter:\s*([^;]+)/gi, type: 'property', label: 'filter' },
    { regex: /backdrop-filter:\s*([^;]+)/gi, type: 'property', label: 'backdrop-filter' },
    { regex: /clip-path:\s*([^;]+)/gi, type: 'property', label: 'clip-path' },
    { regex: /border-radius:\s*([^;]+)/gi, type: 'property', label: 'border-radius' },
    { regex: /transition:\s*([^;]+)/gi, type: 'property', label: 'transition' },
    { regex: /animation:\s*([^;]+)/gi, type: 'animation', label: 'animation' },
    { regex: /background:\s*([^;]+gradient[^;]+)/gi, type: 'gradient', label: 'gradient' },
    { regex: /linear-gradient\([^)]+\)/gi, type: 'gradient', label: 'linear-gradient' },
    { regex: /radial-gradient\([^)]+\)/gi, type: 'gradient', label: 'radial-gradient' },
  ];
  
  for (const { regex, type, label } of propertyPatterns) {
    let match;
    while ((match = regex.exec(normalizedCss)) !== null) {
      const value = match[0].trim().slice(0, 100);
      const key = `${label}:${value}`;
      if (!seen.has(key)) {
        seen.add(key);
        props.push({ type, value, context: label });
      }
    }
  }
  
  // CSS variable definitions (design system fingerprint)
  const varRegex = /--[\w-]+:\s*([^;]+)/g;
  let match;
  while ((match = varRegex.exec(normalizedCss)) !== null) {
    const value = match[0].trim();
    if (!seen.has(value)) {
      seen.add(value);
      props.push({ type: 'variable', value });
    }
  }
  
  // Extract specific numeric values (design fingerprint)
  const numericProps: Array<{ regex: RegExp; name: string }> = [
    { regex: /padding:\s*([^;]+)/gi, name: 'padding' },
    { regex: /margin:\s*([^;]+)/gi, name: 'margin' },
    { regex: /gap:\s*([^;]+)/gi, name: 'gap' },
    { regex: /font-size:\s*([^;]+)/gi, name: 'font-size' },
    { regex: /line-height:\s*([^;]+)/gi, name: 'line-height' },
    { regex: /letter-spacing:\s*([^;]+)/gi, name: 'letter-spacing' },
    { regex: /max-width:\s*([^;]+)/gi, name: 'max-width' },
  ];
  
  for (const { regex, name } of numericProps) {
    let match;
    while ((match = regex.exec(normalizedCss)) !== null) {
      const value = match[1].trim();
      // Skip common/default values
      if (value !== '0' && value !== 'auto' && value !== 'inherit' && value !== 'normal') {
        const key = `${name}:${value}`;
        if (!seen.has(key)) {
          seen.add(key);
          props.push({ type: 'property', value: `${name}: ${value}`, context: 'numeric' });
        }
      }
    }
  }
  
  // Layout configurations (structural fingerprint)
  const layoutPatterns = normalizedCss.match(/display:\s*(flex|grid)[^;]*/gi) || [];
  layoutPatterns.forEach(l => {
    if (!seen.has(l)) {
      seen.add(l);
      props.push({ type: 'structure', value: l.trim(), context: 'layout' });
    }
  });
  
  // Flex/grid specific properties
  const flexGridProps = normalizedCss.match(/(flex-direction|justify-content|align-items|grid-template-columns|grid-template-rows|flex-wrap|align-content):\s*[^;]+/gi) || [];
  flexGridProps.forEach(p => {
    if (!seen.has(p)) {
      seen.add(p);
      props.push({ type: 'structure', value: p.trim(), context: 'layout' });
    }
  });
  
  return props;
}

function extractAnimations(css: string): string[] {
  const animations: string[] = [];
  
  // Extract @keyframes names
  const keyframesRegex = /@keyframes\s+([\w-]+)/g;
  let match;
  while ((match = keyframesRegex.exec(css)) !== null) {
    animations.push(match[1]);
  }
  
  return animations;
}

function extractColors(css: string): string[] {
  const colors = new Set<string>();
  
  // Hex colors
  const hexRegex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  let match;
  while ((match = hexRegex.exec(css)) !== null) {
    const hex = match[0].toLowerCase();
    // Filter out very common colors
    if (!['#fff', '#ffffff', '#000', '#000000', '#333', '#333333'].includes(hex)) {
      colors.add(hex);
    }
  }
  
  // RGB/RGBA colors
  const rgbRegex = /rgba?\([^)]+\)/g;
  while ((match = rgbRegex.exec(css)) !== null) {
    colors.add(match[0]);
  }
  
  // HSL colors
  const hslRegex = /hsla?\([^)]+\)/g;
  while ((match = hslRegex.exec(css)) !== null) {
    colors.add(match[0]);
  }
  
  return Array.from(colors).slice(0, 30);
}

function extractMatchingCodeExcerpts(
  content1: { html: string; css: string },
  content2: { html: string; css: string },
  sharedSelectors: string[]
): Array<{ label: string; code1: string; code2: string; similarity: number }> {
  const excerpts: Array<{ label: string; code1: string; code2: string; similarity: number }> = [];
  
  // Helper to escape regex special characters
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  for (const selector of sharedSelectors.slice(0, 5)) {
    // Skip selectors that would cause regex issues
    if (!selector || selector.includes('[') || selector.includes('(')) continue;
    
    // Find CSS rule for this selector in both files
    const escapedSelector = escapeRegex(selector);
    let cssRegex1;
    try {
      cssRegex1 = new RegExp(`\\.${escapedSelector}\\s*\\{[^}]*\\}`, 'g');
    } catch (e) {
      continue; // Skip if regex is invalid
    }
    
    const match1 = content1.css.match(cssRegex1);
    const match2 = content2.css.match(cssRegex1);
    
    if (match1 && match2) {
      const code1 = match1[0].slice(0, 300);
      const code2 = match2[0].slice(0, 300);
      
      // Simple similarity: count matching characters
      let matches = 0;
      const shorter = Math.min(code1.length, code2.length);
      for (let i = 0; i < shorter; i++) {
        if (code1[i] === code2[i]) matches++;
      }
      
      excerpts.push({
        label: `.${selector}`,
        code1,
        code2,
        similarity: matches / Math.max(code1.length, code2.length)
      });
    }
  }
  
  return excerpts;
}

// Tufte-style comparison page
function serveComparisonPage(id1: string, id2: string, env: Env): Response {
  // Inline SVG favicon as data URI
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#000000"/><path d="M 16 4 L 26.39 10 L 16 16 L 5.61 10 Z" fill="#FFFFFF" fill-opacity="1"/><path d="M 5.61 10 L 16 16 L 16 28 L 5.61 22 Z" fill="#FFFFFF" fill-opacity="0.6"/><path d="M 16 16 L 26.39 10 L 26.39 22 L 16 28 Z" fill="#FFFFFF" fill-opacity="0.3"/></svg>`;
  const faviconDataUri = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Template Comparison | Plagiarism Detection</title>
  <link rel="icon" type="image/svg+xml" href="${faviconDataUri}">
  <link rel="apple-touch-icon" href="${faviconDataUri}">
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #12121a;
      --border: #1e1e2e;
      --text: #e4e4e7;
      --muted: #71717a;
      --accent: #8b5cf6;
      --code-bg: #1a1a24;
      --match-high: #ef4444;
      --match-med: #f59e0b;
      --match-low: #22c55e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      font-size: 15px;
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    h1 { font-size: 2rem; font-weight: 600; margin-bottom: 0.5rem; }
    h2 { font-size: 1.25rem; font-weight: 500; margin: 2rem 0 1rem; color: var(--text); }
    h3 { font-size: 1rem; font-weight: 500; margin: 1.5rem 0 0.75rem; color: var(--muted); }
    
    .subtitle { color: var(--muted); margin-bottom: 2rem; }
    
    /* Header with similarity score */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
    .similarity-score {
      font-size: 3rem;
      font-weight: 700;
      line-height: 1;
    }
    .similarity-score.high { color: var(--match-high); }
    .similarity-score.medium { color: var(--match-med); }
    .similarity-score.low { color: var(--match-low); }
    .similarity-label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }
    
    /* Template info cards */
    .templates-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .template-info {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem 1.25rem;
    }
    .template-name { font-weight: 600; margin-bottom: 0.25rem; }
    .template-url { font-size: 0.875rem; color: var(--muted); word-break: break-all; }
    .template-url a { color: var(--accent); text-decoration: none; }
    .template-url a:hover { text-decoration: underline; }
    
    /* Breakdown sparklines */
    .breakdown-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin: 1.5rem 0;
    }
    .breakdown-item { 
      text-align: center;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem;
    }
    .breakdown-bar {
      height: 6px;
      background: var(--border);
      border-radius: 3px;
      overflow: hidden;
      margin: 0.5rem auto;
      max-width: 100px;
    }
    .breakdown-fill {
      height: 100%;
      border-radius: 3px;
    }
    .breakdown-value { font-size: 1.5rem; font-weight: 400; }
    .breakdown-label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    
    /* Evidence section - small multiples */
    .evidence-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border: 1px solid var(--border);
      margin: 1rem 0;
    }
    .evidence-cell {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      background: var(--code-bg);
      overflow-x: auto;
      white-space: pre;
    }
    .evidence-cell:nth-child(odd) { border-right: 1px solid var(--border); }
    .evidence-header {
      background: var(--bg);
      font-family: 'ET Book', serif;
      font-weight: 600;
      font-size: 0.875rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .evidence-sim {
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 3px;
      font-weight: 400;
    }
    
    /* Shared patterns list */
    .patterns-list {
      columns: 3;
      column-gap: 2rem;
      margin: 1rem 0;
    }
    .pattern-item {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      padding: 0.25rem 0;
      break-inside: avoid;
    }
    .pattern-type {
      display: inline-block;
      width: 60px;
      color: var(--muted);
      font-size: 0.7rem;
      text-transform: uppercase;
    }
    
    /* Color swatches - small multiples */
    .color-swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 1rem 0;
    }
    .color-swatch {
      width: 2rem;
      height: 2rem;
      border-radius: 2px;
      border: 1px solid var(--border);
      position: relative;
    }
    .color-swatch::after {
      content: attr(data-color);
      position: absolute;
      bottom: -1.5rem;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.6rem;
      font-family: 'JetBrains Mono', monospace;
      white-space: nowrap;
      color: var(--muted);
    }
    
    /* Classes comparison */
    .classes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1.5rem;
      margin: 1rem 0;
    }
    .classes-column h4 {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin-bottom: 0.5rem;
    }
    .classes-list {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      line-height: 1.8;
    }
    .classes-list .shared { color: var(--match-high); }
    .classes-list .unique { color: var(--muted); }
    
    /* Smoking Gun - Identical Rules */
    .smoking-gun {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--match-high);
      border-radius: 12px;
      padding: 1.5rem;
      margin: 2rem 0;
    }
    .smoking-gun-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .smoking-gun-header .icon { color: var(--match-high); }
    .smoking-gun-header h2 { color: var(--match-high); font-size: 1.3rem; }
    .smoking-gun-badge {
      background: var(--match-high);
      color: white;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-left: auto;
    }
    .smoking-gun-desc {
      color: var(--text);
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    .identical-rules {
      display: grid;
      gap: 0.75rem;
    }
    .identical-rule {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.75rem 1rem;
    }
    /* Visual Evidence - Side-by-side renders */
    .visual-evidence {
      margin: 2rem 0;
    }
    .visual-evidence h2 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--accent);
    }
    .visual-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg, 12px);
      margin: 1rem 0;
      overflow: hidden;
    }
    .visual-card-header {
      background: var(--code-bg);
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .visual-card-header code {
      font-family: 'JetBrains Mono', monospace;
      color: var(--accent);
      font-size: 0.9rem;
    }
    .visual-card-header .prop-count {
      font-size: 0.75rem;
      color: var(--muted);
      background: var(--border);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .visual-previews {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1px;
      background: var(--border);
    }
    .visual-preview {
      background: var(--bg);
      padding: 1rem;
    }
    .visual-preview-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin-bottom: 0.5rem;
    }
    .visual-preview-frame {
      background: white;
      border-radius: var(--radius-sm, 6px);
      min-height: 100px;
      max-height: 250px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .visual-preview-frame iframe {
      width: 100%;
      height: 150px;
      border: none;
      pointer-events: none;
    }
    .visual-css {
      padding: 1rem;
      background: var(--code-bg);
      border-top: 1px solid var(--border);
    }
    .visual-css code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--text);
      display: block;
      white-space: pre-wrap;
      line-height: 1.6;
    }
    
    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .rule-selector {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--match-high);
      background: rgba(196, 29, 29, 0.1);
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
    }
    .rule-similarity {
      font-size: 0.75rem;
      color: var(--muted);
    }
    .rule-properties {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .rule-prop {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      background: var(--code-bg);
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      color: var(--text);
    }
    .rule-more {
      font-size: 0.7rem;
      color: var(--muted);
      font-style: italic;
    }
    
    /* Property Groups */
    .properties-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    .property-group {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem;
    }
    .property-group-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      font-size: 0.9rem;
    }
    .property-group-header .icon { color: var(--accent); }
    .property-count {
      background: var(--border);
      padding: 0.1rem 0.4rem;
      border-radius: 3px;
      font-size: 0.7rem;
      margin-left: auto;
    }
    .property-items {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .property-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      background: var(--bg);
      border: 1px solid var(--border);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text);
    }
    .property-more {
      font-size: 0.7rem;
      color: var(--muted);
      font-style: italic;
    }
    
    /* Structural Matches - depth weighted */
    .structural-matches {
      display: grid;
      gap: 0.5rem;
      margin: 1rem 0;
    }
    .struct-match {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 3px solid var(--border);
      padding: 0.6rem 1rem;
      border-radius: 8px;
    }
    .struct-match.struct-page {
      border-left-color: var(--match-high);
      background: rgba(239, 68, 68, 0.1);
    }
    .struct-match.struct-section {
      border-left-color: var(--match-med);
      background: rgba(245, 158, 11, 0.1);
    }
    .struct-match.struct-component {
      border-left-color: var(--accent);
      background: rgba(139, 92, 246, 0.1);
    }
    .struct-match.struct-element {
      border-left-color: var(--muted);
    }
    .struct-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .struct-level {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
      font-weight: 600;
    }
    .struct-page .struct-level { background: rgba(239, 68, 68, 0.2); color: var(--match-high); }
    .struct-section .struct-level { background: rgba(245, 158, 11, 0.2); color: var(--match-med); }
    .struct-component .struct-level { background: rgba(139, 92, 246, 0.2); color: var(--accent); }
    .struct-element .struct-level { background: var(--border); color: var(--muted); }
    .struct-pattern {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      flex: 1;
    }
    .struct-weight {
      font-size: 0.7rem;
      color: var(--muted);
    }
    .struct-count {
      font-size: 0.7rem;
      color: var(--muted);
      margin-left: 2rem;
    }
    
    /* Property Combinations */
    .prop-combos {
      display: grid;
      gap: 0.75rem;
      margin: 1rem 0;
    }
    .prop-combo {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
    }
    .combo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .combo-selector {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--accent);
    }
    .combo-count {
      font-size: 0.75rem;
      color: var(--muted);
      background: var(--border);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .combo-props {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .combo-prop {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--text);
      background: var(--bg);
      padding: 0.3rem 0.5rem;
      border-radius: 4px;
      border-left: 2px solid var(--accent);
    }
    
    /* Sidenotes - Tufte style */
    .sidenote {
      float: right;
      clear: right;
      margin-right: -35%;
      width: 30%;
      font-size: 0.8rem;
      color: var(--muted);
      line-height: 1.4;
    }
    
    /* Loading state */
    .loading {
      text-align: center;
      padding: 4rem;
      color: var(--muted);
      font-style: italic;
    }
    
    .icon { display: inline-flex; align-items: center; vertical-align: middle; margin-right: 0.25rem; }
    .icon svg { width: 1em; height: 1em; }
    
    /* Back link */
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--muted);
      text-decoration: none;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    .back-link:hover { color: var(--accent); }
    
    @media (max-width: 1200px) {
      body { padding: 1.5rem; }
      .patterns-list { columns: 2; }
      .sidenote { display: none; }
    }
    @media (max-width: 768px) {
      .templates-row, .evidence-grid, .classes-grid { grid-template-columns: 1fr; }
      .breakdown-grid { grid-template-columns: repeat(2, 1fr); }
      .patterns-list { columns: 1; }
    }
  </style>
</head>
<body>
  <a href="/dashboard" class="back-link"><span class="icon"><i data-lucide="arrow-left"></i></span> Back to Dashboard</a>
  
  <div id="content">
    <div class="loading">Loading comparison data...</div>
  </div>
  
  <script>
    lucide.createIcons();
    
    async function loadComparison() {
      try {
        const res = await fetch('/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id1: '${id1}', id2: '${id2}' })
        });
        
        if (!res.ok) throw new Error('Failed to load comparison');
        const data = await res.json();
        renderComparison(data);
      } catch (e) {
        document.getElementById('content').innerHTML = '<div class="loading">Error loading comparison: ' + e.message + '</div>';
      }
    }
    
    function renderComparison(data) {
      const simClass = data.overallSimilarity > 0.7 ? 'high' : data.overallSimilarity > 0.5 ? 'medium' : 'low';
      const simPercent = (data.overallSimilarity * 100).toFixed(0);
      
      document.getElementById('content').innerHTML = \`
        <div class="header">
          <div>
            <h1>Template Comparison</h1>
            <p class="subtitle">Detailed analysis of structural and stylistic similarities</p>
          </div>
          <div style="text-align: right;">
            <div class="similarity-label">Overall Similarity</div>
            <div class="similarity-score \${simClass}">\${simPercent}%</div>
          </div>
        </div>
        
        <div class="templates-row">
          <div class="template-info">
            <div class="template-name">\${data.template1.name}</div>
            <div class="template-url"><a href="\${data.template1.url}" target="_blank">\${data.template1.url}</a></div>
          </div>
          <div class="template-info">
            <div class="template-name">\${data.template2.name}</div>
            <div class="template-url"><a href="\${data.template2.url}" target="_blank">\${data.template2.url}</a></div>
          </div>
        </div>
        
        \${data.identicalRules && data.identicalRules.length > 0 ? \`
        <div class="smoking-gun">
          <div class="smoking-gun-header">
            <span class="icon"><i data-lucide="alert-octagon"></i></span>
            <h2 style="margin: 0; display: inline;">Identical CSS Rules Found</h2>
            <span class="smoking-gun-badge">\${data.identicalRules.length} matches</span>
          </div>
          <p class="smoking-gun-desc">
            <strong>Strongest evidence of copy/paste</strong> — Same class names with same property values. 
            This is not coincidence.
          </p>
          <div class="identical-rules">
            \${data.identicalRules.slice(0, 10).map(rule => \`
              <div class="identical-rule">
                <div class="rule-header">
                  <code class="rule-selector">\${rule.selector}</code>
                  <span class="rule-similarity">\${(rule.similarity * 100).toFixed(0)}% match</span>
                </div>
                <div class="rule-properties">
                  \${rule.properties.slice(0, 5).map(p => \`<code class="rule-prop">\${escapeHtml(p)}</code>\`).join('')}
                  \${rule.properties.length > 5 ? \`<span class="rule-more">+\${rule.properties.length - 5} more</span>\` : ''}
                </div>
              </div>
            \`).join('')}
          </div>
        </div>
        \` : ''}
        
        \${data.visualEvidence && data.visualEvidence.length > 0 ? \`
        <div class="visual-evidence">
          <h2>
            <i data-lucide="eye"></i>
            Visual Evidence
          </h2>
          <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 0.5rem;">
            Live preview of identical CSS rules with <strong>meaningful visual styling</strong> (colors, borders, shadows, fonts).
          </p>
          <p style="color: var(--muted); font-size: 0.75rem; margin-bottom: 1rem; opacity: 0.7;">
            <i data-lucide="info" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i>
            Generic layout classes (containers, grids, loaders) are excluded. Only UI components shown.
          </p>
          \${data.visualEvidence.map(evidence => \`
            <div class="visual-card">
              <div class="visual-card-header">
                <code>\${evidence.selector}</code>
                <span class="prop-count">\${evidence.properties.length} identical properties</span>
              </div>
              <div class="visual-previews">
                <div class="visual-preview">
                  <div class="visual-preview-label">\${data.template1.name}</div>
                  <div class="visual-preview-frame">
                    <iframe 
                      srcdoc="<!DOCTYPE html><html><head><style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { padding: 1rem; font-family: system-ui, sans-serif; background: #f5f5f5; min-height: 100vh; }
                        /* Make empty elements visible */
                        [class]:empty, div:empty { 
                          min-height: 40px; 
                          background: linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%), linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%);
                          background-size: 10px 10px;
                          background-position: 0 0, 5px 5px;
                          border: 2px dashed #999;
                          border-radius: 4px;
                        }
                        /* Highlight the target element and make it visible */
                        \${escapeHtml(evidence.selector)} {
                          outline: 3px solid #8b5cf6 !important;
                          outline-offset: 2px;
                          position: relative !important;
                          display: block !important;
                          visibility: visible !important;
                          opacity: 1 !important;
                          min-height: 40px !important;
                          min-width: 100px !important;
                          padding: 8px !important;
                        }
                        /* Apply styles but ensure visibility */
                        \${escapeHtml(evidence.css).replace(/display:\\s*none/gi, 'display: block').replace(/visibility:\\s*hidden/gi, 'visibility: visible')}
                      </style></head><body>\${escapeHtml(evidence.html1)}<div style='margin-top: 8px; font-size: 10px; color: #666; font-family: monospace;'>\${escapeHtml(evidence.selector)}</div></body></html>"
                      sandbox="allow-same-origin"
                      loading="lazy"
                    ></iframe>
                  </div>
                </div>
                <div class="visual-preview">
                  <div class="visual-preview-label">\${data.template2.name}</div>
                  <div class="visual-preview-frame">
                    <iframe 
                      srcdoc="<!DOCTYPE html><html><head><style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { padding: 1rem; font-family: system-ui, sans-serif; background: #f5f5f5; min-height: 100vh; }
                        /* Make empty elements visible */
                        [class]:empty, div:empty { 
                          min-height: 40px; 
                          background: linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%), linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%);
                          background-size: 10px 10px;
                          background-position: 0 0, 5px 5px;
                          border: 2px dashed #999;
                          border-radius: 4px;
                        }
                        /* Highlight the target element and make it visible */
                        \${escapeHtml(evidence.selector)} {
                          outline: 3px solid #8b5cf6 !important;
                          outline-offset: 2px;
                          position: relative !important;
                          display: block !important;
                          visibility: visible !important;
                          opacity: 1 !important;
                          min-height: 40px !important;
                          min-width: 100px !important;
                          padding: 8px !important;
                        }
                        /* Apply styles but ensure visibility */
                        \${escapeHtml(evidence.css).replace(/display:\\s*none/gi, 'display: block').replace(/visibility:\\s*hidden/gi, 'visibility: visible')}
                      </style></head><body>\${escapeHtml(evidence.html2)}<div style='margin-top: 8px; font-size: 10px; color: #666; font-family: monospace;'>\${escapeHtml(evidence.selector)}</div></body></html>"
                      sandbox="allow-same-origin"
                      loading="lazy"
                    ></iframe>
                  </div>
                </div>
              </div>
              <div class="visual-css">
                <code>\${escapeHtml(evidence.css)}</code>
              </div>
            </div>
          \`).join('')}
        </div>
        \` : ''}
        
        <h2>Similarity Breakdown</h2>
        <div class="breakdown-grid">
          \${renderBreakdownItem('Identical Rules', data.identicalRules ? Math.min(data.identicalRules.length / 10, 1) : 0)}
          \${renderBreakdownItem('Prop Combos', data.propertyCombinations ? Math.min(data.propertyCombinations.length / 5, 1) : 0)}
          \${renderBreakdownItem('Color Palette', data.breakdown.colors.similarity)}
          \${renderBreakdownItem('Unique Patterns', data.structuralMatches ? data.structuralMatches.score : 0)}
        </div>
        
        \${data.propertyCombinations && data.propertyCombinations.length > 0 ? \`
        <h2>Property Combinations</h2>
        <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem;">
          Rules with <strong>3+ matching properties</strong> are fingerprints. Single properties are common, 
          but specific combinations are unique design decisions.
        </p>
        <div class="prop-combos">
          \${data.propertyCombinations.map(combo => \`
            <div class="prop-combo">
              <div class="combo-header">
                <code class="combo-selector">\${combo.selector}</code>
                <span class="combo-count">\${combo.props.length} properties</span>
              </div>
              <div class="combo-props">
                \${combo.props.map(p => \`<code class="combo-prop">\${escapeHtml(p)}</code>\`).join('')}
              </div>
            </div>
          \`).join('')}
        </div>
        \` : ''}
        
        \${data.structuralMatches && data.structuralMatches.matches.length > 0 ? \`
        <h2>Unique Structural Patterns</h2>
        <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem;">
          Non-generic HTML patterns that appear in both templates. Common patterns like 
          <code style="background: var(--surface); padding: 0.1rem 0.3rem; border-radius: 3px;">div[div]</code> are filtered out.
          These become significant when <strong>combined with matching CSS properties</strong>.
        </p>
        <div class="structural-matches">
          \${data.structuralMatches.matches.map(m => \`
            <div class="struct-match struct-\${m.level}">
              <div class="struct-header">
                <span class="struct-level">\${m.level}</span>
                <code class="struct-pattern">\${escapeHtml(m.pattern)}</code>
                <span class="struct-weight" title="Higher = more significant">\${m.weight.toFixed(1)} weight</span>
              </div>
              \${m.count > 1 ? \`<span class="struct-count">×\${m.count} occurrences</span>\` : ''}
            </div>
          \`).join('')}
        </div>
        \` : ''}
        
        \${data.breakdown.cssProperties.shared.length > 0 ? \`
        <h2>Matching Property Values</h2>
        <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem;">
          Similar property values across different selectors — indicates shared design patterns.
        </p>
        <div class="properties-grid">
          \${groupPropertiesByType(data.breakdown.cssProperties.shared)}
        </div>
        \` : ''}
        
        \${data.breakdown.colors.shared.length > 0 ? \`
        <h2>Shared Color Palette</h2>
        <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem;">
          Matching color values suggest shared design decisions or copied styles.
        </p>
        <div class="color-swatches">
          \${data.breakdown.colors.shared.map(c => '<div class="color-swatch" style="background: ' + c + ';" data-color="' + c + '"></div>').join('')}
        </div>
        \` : ''}
        
        <h3 style="margin-top: 2rem; font-size: 0.9rem; color: var(--muted); font-weight: 400;">
          Class Names <span style="font-style: italic;">(low signal — easily renamed)</span>
        </h3>
        <details style="margin-top: 0.5rem;">
          <summary style="cursor: pointer; color: var(--muted); font-size: 0.85rem;">
            \${data.breakdown.cssClasses.shared.length} shared classes (click to expand)
          </summary>
          <div class="classes-grid" style="margin-top: 1rem;">
            <div class="classes-column">
              <h4>Shared</h4>
              <div class="classes-list">
                \${data.breakdown.cssClasses.shared.slice(0, 15).map(c => '<span class="shared">.' + c + '</span>').join('<br>')}
              </div>
            </div>
            <div class="classes-column">
              <h4>Only in \${data.template1.name}</h4>
              <div class="classes-list">
                \${data.breakdown.cssClasses.unique1.slice(0, 10).map(c => '<span class="unique">.' + c + '</span>').join('<br>')}
              </div>
            </div>
            <div class="classes-column">
              <h4>Only in \${data.template2.name}</h4>
              <div class="classes-list">
                \${data.breakdown.cssClasses.unique2.slice(0, 10).map(c => '<span class="unique">.' + c + '</span>').join('<br>')}
              </div>
            </div>
          </div>
        </details>
        
        \${data.breakdown.animations.shared.length > 0 ? \`
        <h2>Shared Animations</h2>
        <div class="patterns-list">
          \${data.breakdown.animations.shared.map(a => '<div class="pattern-item"><span class="pattern-type">keyframe</span>@' + a + '</div>').join('')}
        </div>
        \` : ''}
        
        \${data.evidence.codeExcerpts.length > 0 ? \`
        <h2>Code Comparison</h2>
        <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem;">
          Side-by-side CSS rules for shared classes
        </p>
        <div class="evidence-grid">
          \${data.evidence.codeExcerpts.map(e => \`
            <div class="evidence-cell evidence-header">
              \${e.label} <span class="evidence-sim" style="background: \${e.similarity > 0.8 ? 'rgba(196,29,29,0.15)' : e.similarity > 0.5 ? 'rgba(214,134,0,0.15)' : 'rgba(45,138,45,0.15)'}">\${(e.similarity * 100).toFixed(0)}% match</span>
            </div>
            <div class="evidence-cell evidence-header">
              \${e.label}
            </div>
            <div class="evidence-cell">\${escapeHtml(e.code1)}</div>
            <div class="evidence-cell">\${escapeHtml(e.code2)}</div>
          \`).join('')}
        </div>
        \` : ''}
        
        \${data.breakdown.cssProperties.shared.length > 0 ? \`
        <h2>Matching CSS Properties</h2>
        <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem;">
          Custom properties, transforms, transitions, and shadows that appear in both templates
        </p>
        <div class="patterns-list">
          \${data.breakdown.cssProperties.shared.map(p => '<div class="pattern-item"><span class="pattern-type">' + p.type + '</span>' + escapeHtml(p.value) + '</div>').join('')}
        </div>
        \` : ''}
      \`;
      
      lucide.createIcons();
    }
    
    function renderBreakdownItem(label, similarity) {
      const percent = (similarity * 100).toFixed(0);
      const color = similarity > 0.5 ? 'var(--match-high)' : similarity > 0.3 ? 'var(--match-med)' : 'var(--match-low)';
      return \`
        <div class="breakdown-item">
          <div class="breakdown-value">\${percent}%</div>
          <div class="breakdown-bar">
            <div class="breakdown-fill" style="width: \${percent}%; background: \${color};"></div>
          </div>
          <div class="breakdown-label">\${label}</div>
        </div>
      \`;
    }
    
    function groupPropertiesByType(properties) {
      const groups = {
        'Design Effects': [],
        'Layout': [],
        'Variables': [],
        'Gradients': [],
        'Animations': [],
        'Other': []
      };
      
      for (const prop of properties) {
        const value = prop.value || '';
        const context = prop.context || '';
        
        if (value.includes('gradient') || prop.type === 'gradient') {
          groups['Gradients'].push(prop);
        } else if (value.includes('transform') || value.includes('shadow') || value.includes('filter') || value.includes('clip-path')) {
          groups['Design Effects'].push(prop);
        } else if (context === 'layout' || prop.type === 'structure' || value.includes('flex') || value.includes('grid')) {
          groups['Layout'].push(prop);
        } else if (prop.type === 'variable' || value.startsWith('--')) {
          groups['Variables'].push(prop);
        } else if (prop.type === 'animation' || value.includes('animation') || value.includes('transition')) {
          groups['Animations'].push(prop);
        } else {
          groups['Other'].push(prop);
        }
      }
      
      let html = '';
      for (const [groupName, items] of Object.entries(groups)) {
        if (items.length === 0) continue;
        
        const icon = {
          'Design Effects': 'sparkles',
          'Layout': 'layout-grid',
          'Variables': 'variable',
          'Gradients': 'palette',
          'Animations': 'play',
          'Other': 'code'
        }[groupName] || 'code';
        
        html += \`
          <div class="property-group">
            <div class="property-group-header">
              <span class="icon"><i data-lucide="\${icon}"></i></span>
              <strong>\${groupName}</strong>
              <span class="property-count">\${items.length}</span>
            </div>
            <div class="property-items">
              \${items.slice(0, 8).map(p => \`<code class="property-value">\${escapeHtml(p.value)}</code>\`).join('')}
              \${items.length > 8 ? \`<span class="property-more">+\${items.length - 8} more</span>\` : ''}
            </div>
          </div>
        \`;
      }
      
      return html || '<p style="color: var(--muted);">No significant property matches found.</p>';
    }
    
    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    
    loadComparison();
  </script>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// =============================================================================
// RESCAN: Drift Tracking for Compliance
// =============================================================================

// =============================================================================
// TF-IDF KEYWORD EXTRACTION
// =============================================================================

// Common words to filter out (stopwords + common web terms)
const STOPWORDS = new Set([
  // English stopwords
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our',
  'you', 'your', 'he', 'she', 'him', 'her', 'his', 'i', 'me', 'my', 'not', 'no', 'yes',
  'all', 'any', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'when', 'where', 'why',
  'how', 'what', 'which', 'who', 'whom', 'whose', 'if', 'then', 'else', 'so', 'because',
  // Common web/Webflow terms (too generic to be distinctive)
  'div', 'span', 'section', 'container', 'wrapper', 'block', 'item', 'list', 'link',
  'button', 'text', 'image', 'icon', 'logo', 'nav', 'menu', 'header', 'footer', 'main',
  'content', 'page', 'home', 'about', 'contact', 'services', 'blog', 'news', 'faq',
  'class', 'style', 'width', 'height', 'color', 'background', 'padding', 'margin',
  'flex', 'grid', 'display', 'position', 'top', 'left', 'right', 'bottom', 'center',
  'auto', 'none', 'hidden', 'visible', 'scroll', 'fixed', 'absolute', 'relative',
  'px', 'em', 'rem', 'vh', 'vw', 'rgb', 'rgba', 'hex', 'url', 'http', 'https', 'www',
  'webflow', 'wf', 'work', 'our', 'single', 'details', 'description', 'title',
  'new', 'get', 'see', 'view', 'read', 'more', 'click', 'learn', 'start', 'join',
  'row', 'col', 'column', 'box', 'area', 'zone', 'inner', 'outer', 'small', 'large',
  'medium', 'big', 'full', 'half', 'third', 'quarter', 'first', 'last', 'next', 'prev'
]);

// IDF values for common template terms (pre-computed from corpus)
// Higher = more distinctive, Lower = more common
const IDF_BASELINE: Record<string, number> = {
  // Very common (low IDF)
  'hero': 0.5, 'cta': 0.6, 'card': 0.5, 'feature': 0.6, 'pricing': 0.7,
  'testimonial': 0.8, 'team': 0.7, 'portfolio': 0.8, 'gallery': 0.7,
  // Moderately common
  'dashboard': 1.2, 'saas': 1.3, 'startup': 1.1, 'agency': 1.0, 'creative': 1.0,
  'minimal': 1.1, 'modern': 0.9, 'dark': 1.2, 'light': 0.8, 'gradient': 1.3,
  // Distinctive (high IDF)
  'fintech': 2.0, 'crypto': 2.1, 'nft': 2.2, 'ai': 1.8, 'machine': 1.9,
  'healthcare': 2.0, 'medical': 1.9, 'legal': 2.1, 'law': 2.0, 'fitness': 1.8,
  'restaurant': 1.9, 'food': 1.7, 'recipe': 2.0, 'travel': 1.8, 'hotel': 2.0,
  'real-estate': 2.1, 'property': 1.9, 'architecture': 2.0, 'interior': 1.9,
  'fashion': 1.8, 'clothing': 1.9, 'ecommerce': 1.5, 'shop': 1.3, 'store': 1.2,
  'podcast': 2.0, 'music': 1.8, 'video': 1.5, 'streaming': 2.0, 'gaming': 2.1,
  'education': 1.7, 'course': 1.8, 'learning': 1.7, 'school': 1.9, 'university': 2.0,
  // Style keywords
  'glassmorphism': 2.5, 'neumorphism': 2.5, 'brutalist': 2.4, 'retro': 2.0,
  'neon': 2.2, 'cyberpunk': 2.5, 'vintage': 2.0, 'futuristic': 2.1,
  'parallax': 1.8, 'animated': 1.5, 'interactive': 1.6, '3d': 1.9, 'isometric': 2.3,
  // Color keywords
  'monochrome': 2.0, 'pastel': 1.9, 'vibrant': 1.8, 'muted': 1.7, 'earth': 1.9,
  'warm': 1.5, 'cool': 1.5, 'bold': 1.4, 'soft': 1.4, 'contrast': 1.6,
  // Additional industry keywords
  'payments': 2.0, 'payment': 1.9, 'banking': 2.1, 'finance': 1.8, 'insurance': 2.0,
  'consulting': 1.7, 'marketing': 1.5, 'photography': 1.8, 'film': 1.9,
  'freelance': 1.8, 'nonprofit': 2.0, 'charity': 2.0, 'church': 2.1, 
  'event': 1.6, 'wedding': 2.0, 'beauty': 1.8, 'salon': 2.0, 'spa': 2.0, 
  'wellness': 1.9, 'yoga': 2.1
};

interface KeywordResult {
  url: string;
  keywords: Array<{
    term: string;
    score: number;
    category: 'industry' | 'style' | 'feature' | 'color' | 'technical';
  }>;
  categories: {
    industry: string[];
    style: string[];
    features: string[];
    colors: string[];
  };
  summary: string;
}

async function extractKeywords(templateUrl: string, env: Env): Promise<KeywordResult> {
  // Fetch template content
  const content = await fetchTemplateContent(templateUrl);
  
  if (!content.html && !content.css) {
    throw new Error(`Failed to fetch content from ${templateUrl}`);
  }
  
  // Extract terms from different sources
  const terms: Map<string, { count: number; sources: Set<string> }> = new Map();
  
  // 1. Extract from HTML text content
  const textContent = extractTextContent(content.html);
  tokenize(textContent).forEach(term => {
    const existing = terms.get(term) || { count: 0, sources: new Set() };
    existing.count++;
    existing.sources.add('text');
    terms.set(term, existing);
  });
  
  // 2. Extract from CSS class names (custom only)
  const customClasses = extractCustomClasses(content.css);
  customClasses.forEach(cls => {
    // Remove leading dot and split class names like "hero-gradient-dark" into parts
    const cleanCls = cls.replace(/^\./, '').toLowerCase();
    const parts = cleanCls.split(/[-_]/);
    parts.forEach(part => {
      // Skip short parts, stopwords, and purely numeric
      if (part.length > 2 && !STOPWORDS.has(part) && !/^\d+$/.test(part)) {
        const existing = terms.get(part) || { count: 0, sources: new Set() };
        existing.count++;
        existing.sources.add('class');
        terms.set(part, existing);
      }
    });
  });
  
  // 3. Extract from CSS patterns
  const cssPatterns = extractCSSPatterns(content.css);
  
  // Color analysis
  cssPatterns.colors.forEach(color => {
    const colorName = identifyColorName(color);
    if (colorName) {
      const existing = terms.get(colorName) || { count: 0, sources: new Set() };
      existing.count++;
      existing.sources.add('color');
      terms.set(colorName, existing);
    }
  });
  
  // Animation/style indicators
  if (cssPatterns.gradients.length > 2) {
    const existing = terms.get('gradient') || { count: 0, sources: new Set() };
    existing.count += 3;
    existing.sources.add('style');
    terms.set('gradient', existing);
  }
  
  if (cssPatterns.animations.length > 0) {
    const existing = terms.get('animated') || { count: 0, sources: new Set() };
    existing.count += cssPatterns.animations.length;
    existing.sources.add('style');
    terms.set('animated', existing);
  }
  
  // 4. Extract from meta tags
  const metaKeywords = extractMetaTags(content.html);
  metaKeywords.forEach(term => {
    const existing = terms.get(term) || { count: 0, sources: new Set() };
    existing.count += 2; // Boost meta tags
    existing.sources.add('meta');
    terms.set(term, existing);
  });
  
  // Calculate TF-IDF scores
  const totalTerms = Array.from(terms.values()).reduce((sum, t) => sum + t.count, 0);
  const scoredTerms: Array<{ term: string; score: number; sources: string[] }> = [];
  
  terms.forEach((data, term) => {
    if (STOPWORDS.has(term) || term.length < 3) return;
    
    // TF = term frequency in this document
    const tf = data.count / totalTerms;
    
    // IDF = use baseline or default
    const idf = IDF_BASELINE[term] || 1.5; // Default IDF for unknown terms
    
    // Boost terms that appear in multiple sources
    const sourceBoost = Math.min(data.sources.size * 0.3, 1.0);
    
    const score = tf * idf * (1 + sourceBoost);
    
    if (score > 0.001) { // Minimum threshold
      scoredTerms.push({ 
        term, 
        score, 
        sources: Array.from(data.sources) 
      });
    }
  });
  
  // Sort by score and take top keywords
  scoredTerms.sort((a, b) => b.score - a.score);
  const topKeywords = scoredTerms.slice(0, 20);
  
  // Categorize keywords
  const categories = categorizeKeywords(topKeywords);
  
  // Generate summary
  const summary = generateKeywordSummary(categories);
  
  return {
    url: templateUrl,
    keywords: topKeywords.map(k => ({
      term: k.term,
      score: Math.round(k.score * 1000) / 1000,
      category: getKeywordCategory(k.term)
    })),
    categories,
    summary
  };
}

function extractTextContent(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Extract text from headings and paragraphs (higher weight)
  const headings = (text.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi) || [])
    .map(h => h.replace(/<[^>]+>/g, ''))
    .join(' ');
  
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Headings are more important
  return headings + ' ' + headings + ' ' + text;
}

function extractMetaTags(html: string): string[] {
  const keywords: string[] = [];
  
  // Meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch) {
    keywords.push(...tokenize(descMatch[1]));
  }
  
  // Meta keywords
  const kwMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
  if (kwMatch) {
    keywords.push(...kwMatch[1].split(',').map(k => k.trim().toLowerCase()));
  }
  
  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    keywords.push(...tokenize(titleMatch[1]));
  }
  
  // OG tags
  const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  if (ogMatch) {
    keywords.push(...tokenize(ogMatch[1]));
  }
  
  return keywords.filter(k => k.length > 2 && !STOPWORDS.has(k));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

function identifyColorName(colorValue: string): string | null {
  const color = colorValue.toLowerCase();
  
  // Check for named colors in the value
  const colorPatterns: Record<string, RegExp> = {
    'dark': /^#[0-3]/i,
    'purple': /purple|#[89a][0-5][8-f]|rgb\(1[2-6]\d,\s*[0-8]\d,\s*[12]\d{2}\)/i,
    'blue': /blue|#[0-4][0-8][a-f]|rgb\([0-8]\d,\s*[0-9]\d,\s*[12]\d{2}\)/i,
    'green': /green|#[0-4][a-f][0-4]|rgb\([0-8]\d,\s*[12]\d{2},\s*[0-8]\d\)/i,
    'red': /red|#[c-f][0-4][0-4]|rgb\([12]\d{2},\s*[0-8]\d,\s*[0-8]\d\)/i,
    'orange': /orange|#[ef][89a][0-4]/i,
    'yellow': /yellow|#[ef][ef][0-4]/i,
    'pink': /pink|#[ef][0-8][89a-f]/i,
    'teal': /teal|#[0-4][a-f][a-f]/i,
  };
  
  for (const [name, pattern] of Object.entries(colorPatterns)) {
    if (pattern.test(color)) {
      return name;
    }
  }
  
  return null;
}

function getKeywordCategory(term: string): 'industry' | 'style' | 'feature' | 'color' | 'technical' {
  const industries = ['fintech', 'crypto', 'nft', 'healthcare', 'medical', 'legal', 'law', 
    'fitness', 'restaurant', 'food', 'travel', 'hotel', 'real-estate', 'property', 
    'architecture', 'interior', 'fashion', 'clothing', 'ecommerce', 'education', 
    'course', 'learning', 'podcast', 'music', 'gaming', 'saas', 'startup', 'agency',
    'payments', 'payment', 'banking', 'finance', 'insurance', 'consulting', 'marketing',
    'photography', 'video', 'film', 'design', 'creative', 'portfolio', 'freelance',
    'nonprofit', 'charity', 'church', 'event', 'wedding', 'beauty', 'salon', 'spa'];
  
  const styles = ['minimal', 'modern', 'dark', 'light', 'gradient', 'glassmorphism', 
    'neumorphism', 'brutalist', 'retro', 'neon', 'cyberpunk', 'vintage', 'futuristic',
    'parallax', 'animated', 'interactive', '3d', 'isometric', 'bold', 'soft'];
  
  const colors = ['monochrome', 'pastel', 'vibrant', 'muted', 'warm', 'cool', 'earth',
    'purple', 'blue', 'green', 'red', 'orange', 'yellow', 'pink', 'teal', 'dark'];
  
  const features = ['hero', 'cta', 'card', 'pricing', 'testimonial', 'team', 'portfolio',
    'gallery', 'dashboard', 'form', 'slider', 'carousel', 'accordion', 'tabs', 'modal'];
  
  if (industries.includes(term)) return 'industry';
  if (styles.includes(term)) return 'style';
  if (colors.includes(term)) return 'color';
  if (features.includes(term)) return 'feature';
  return 'technical';
}

function categorizeKeywords(keywords: Array<{ term: string; score: number; sources: string[] }>): {
  industry: string[];
  style: string[];
  features: string[];
  colors: string[];
} {
  const result = { industry: [] as string[], style: [] as string[], features: [] as string[], colors: [] as string[] };
  
  keywords.forEach(k => {
    const cat = getKeywordCategory(k.term);
    if (cat === 'industry') result.industry.push(k.term);
    else if (cat === 'style') result.style.push(k.term);
    else if (cat === 'feature') result.features.push(k.term);
    else if (cat === 'color') result.colors.push(k.term);
  });
  
  return result;
}

function generateKeywordSummary(categories: { industry: string[]; style: string[]; features: string[]; colors: string[] }): string {
  const parts: string[] = [];
  
  if (categories.industry.length > 0) {
    parts.push(`${categories.industry[0]} template`);
  }
  
  if (categories.style.length > 0) {
    parts.push(`${categories.style.slice(0, 2).join(', ')} design`);
  }
  
  if (categories.colors.length > 0) {
    parts.push(`${categories.colors[0]} color scheme`);
  }
  
  if (categories.features.length > 0) {
    parts.push(`featuring ${categories.features.slice(0, 3).join(', ')}`);
  }
  
  return parts.length > 0 ? parts.join(' with ') : 'General purpose template';
}

interface RescanResult {
  caseId: string;
  originalUrl: string;
  allegedCopyUrl: string;
  
  // How much has the alleged copy changed since the report?
  driftFromOriginal: number;
  driftVerdict: string;
  
  // How similar is it to the victim template now?
  currentSimilarity: number;
  previousSimilarity: number;
  similarityChange: number;
  
  // Overall verdict
  verdict: 'resolved' | 'insufficient_changes' | 'still_similar' | 'no_baseline';
  verdictExplanation: string;
  
  // Detailed metrics
  metrics: {
    cssPropertyChanges: number;
    htmlStructureChanges: number;
    colorPaletteChanges: number;
  };
  
  // Timestamps
  scannedAt: number;
  originalReportedAt: number;
  rescanCount: number;
}

async function performRescan(caseId: string, env: Env): Promise<RescanResult> {
  // Get case details
  const caseData = await env.DB.prepare(`
    SELECT * FROM plagiarism_cases WHERE id = ?
  `).bind(caseId).first();
  
  if (!caseData) {
    throw new Error(`Case ${caseId} not found`);
  }
  
  // Get previous rescans to determine baseline
  const previousRescans = await env.DB.prepare(`
    SELECT * FROM plagiarism_rescans 
    WHERE case_id = ? 
    ORDER BY scanned_at DESC 
    LIMIT 1
  `).bind(caseId).all();
  
  const lastRescan = previousRescans.results?.[0];
  const previousSimilarity = lastRescan 
    ? (lastRescan.current_similarity as number)
    : (caseData.original_similarity as number | null) || 0;
  
  // Fetch current content from the alleged copy
  const allegedCopyUrl = caseData.alleged_copy_url as string;
  const originalUrl = caseData.original_url as string;
  
  console.log(`[Rescan] Fetching current content from ${allegedCopyUrl}`);
  const currentContent = await fetchTemplateContent(allegedCopyUrl);
  
  if (!currentContent.css && !currentContent.html) {
    throw new Error(`Failed to fetch content from ${allegedCopyUrl}`);
  }
  
  // Compute current MinHash signature
  const currentSig = computeCombinedMinHash(currentContent.html, currentContent.css, currentContent.js);
  
  // Calculate drift from original (if we have the baseline)
  let driftFromOriginal = 0;
  let driftVerdict = 'unknown';
  
  if (caseData.original_copy_signature) {
    const originalSig = deserializeSignatureCompact(
      caseData.original_copy_signature as string,
      256 // Default shingle count for signature comparison
    );
    const driftResult = estimateSimilarity(
      { signature: originalSig, numShingles: 256 },
      currentSig
    );
    // Drift = 1 - similarity (higher = more changes)
    driftFromOriginal = 1 - driftResult.jaccardEstimate;
    
    if (driftFromOriginal >= 0.4) {
      driftVerdict = 'significant_changes';
    } else if (driftFromOriginal >= 0.2) {
      driftVerdict = 'moderate_changes';
    } else if (driftFromOriginal >= 0.1) {
      driftVerdict = 'minor_changes';
    } else {
      driftVerdict = 'no_changes';
    }
  } else {
    driftVerdict = 'no_baseline';
  }
  
  // Calculate current similarity to the victim template
  console.log(`[Rescan] Fetching original template from ${originalUrl}`);
  const originalContent = await fetchTemplateContent(originalUrl);
  let currentSimilarity = 0;
  
  if (originalContent.css || originalContent.html) {
    const origSig = computeCombinedMinHash(originalContent.html, originalContent.css, originalContent.js);
    const simResult = estimateSimilarity(currentSig, origSig);
    currentSimilarity = simResult.jaccardEstimate;
  }
  
  const similarityChange = previousSimilarity - currentSimilarity;
  
  // Extract detailed metrics
  const cssProps1 = extractCSSPatterns(currentContent.css);
  const cssProps2 = extractCSSPatterns(originalContent.css);
  const cssPropertyChanges = Math.abs(cssProps1.colors.length - cssProps2.colors.length) +
                              Math.abs(cssProps1.gradients.length - cssProps2.gradients.length) +
                              Math.abs(cssProps1.customProperties.length - cssProps2.customProperties.length);
  
  // Determine overall verdict
  let verdict: RescanResult['verdict'] = 'still_similar';
  let verdictExplanation = '';
  
  if (!caseData.original_copy_signature) {
    verdict = 'no_baseline';
    verdictExplanation = 'No baseline signature was captured when this case was opened. Cannot measure drift.';
  } else if (currentSimilarity < 0.35 && driftFromOriginal >= 0.2) {
    verdict = 'resolved';
    verdictExplanation = `Template has been sufficiently modified. Similarity dropped to ${(currentSimilarity * 100).toFixed(0)}% and ${(driftFromOriginal * 100).toFixed(0)}% of the original content has changed.`;
  } else if (driftFromOriginal < 0.1) {
    verdict = 'insufficient_changes';
    verdictExplanation = `Only ${(driftFromOriginal * 100).toFixed(0)}% of the template has changed. More substantial modifications are needed.`;
  } else {
    verdict = 'still_similar';
    verdictExplanation = `Despite ${(driftFromOriginal * 100).toFixed(0)}% changes, similarity to the original is still ${(currentSimilarity * 100).toFixed(0)}%. Key distinguishing elements may need to be redesigned.`;
  }
  
  const now = Date.now();
  
  // Get rescan count
  const rescanCountResult = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM plagiarism_rescans WHERE case_id = ?
  `).bind(caseId).first();
  const rescanCount = ((rescanCountResult?.count as number) || 0) + 1;
  
  // Store rescan result
  // Calculate shared vs unique colors
  const colors1 = new Set(cssProps1.colors);
  const colors2 = new Set(cssProps2.colors);
  const sharedColors = [...colors1].filter(c => colors2.has(c)).length;
  const colorPaletteChanges = colors1.size + colors2.size - 2 * sharedColors;
  
  const metrics = {
    cssPropertyChanges,
    htmlStructureChanges: 0, // TODO: implement
    colorPaletteChanges
  };
  
  await env.DB.prepare(`
    INSERT INTO plagiarism_rescans (
      case_id, drift_from_original, current_similarity, previous_similarity,
      verdict, metrics_json, scanned_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    caseId,
    driftFromOriginal,
    currentSimilarity,
    previousSimilarity,
    verdict,
    JSON.stringify(metrics),
    now
  ).run();
  
  console.log(`[Rescan] Complete - Verdict: ${verdict}, Drift: ${(driftFromOriginal * 100).toFixed(1)}%, Similarity: ${(currentSimilarity * 100).toFixed(1)}%`);
  
  return {
    caseId,
    originalUrl,
    allegedCopyUrl,
    driftFromOriginal,
    driftVerdict,
    currentSimilarity,
    previousSimilarity,
    similarityChange,
    verdict,
    verdictExplanation,
    metrics,
    scannedAt: now,
    originalReportedAt: caseData.created_at as number,
    rescanCount
  };
}

async function getCaseWithRescans(caseId: string, env: Env): Promise<any> {
  const caseData = await env.DB.prepare(`
    SELECT * FROM plagiarism_cases WHERE id = ?
  `).bind(caseId).first();
  
  if (!caseData) {
    throw new Error(`Case ${caseId} not found`);
  }
  
  const rescans = await env.DB.prepare(`
    SELECT * FROM plagiarism_rescans 
    WHERE case_id = ? 
    ORDER BY scanned_at DESC
  `).bind(caseId).all();
  
  return {
    case: caseData,
    rescans: rescans.results || [],
    rescanCount: rescans.results?.length || 0,
    latestVerdict: rescans.results?.[0]?.verdict || null
  };
}

async function serveRescanPage(caseId: string, env: Env): Promise<Response> {
  const caseData = await getCaseWithRescans(caseId, env);
  
  if (!caseData.case) {
    return new Response('Case not found', { status: 404 });
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rescan: ${caseId}</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpolygon points='50,10 90,30 90,70 50,90 10,70 10,30' fill='%23fff' stroke='%23333' stroke-width='4'/%3E%3Cpolygon points='50,10 90,30 50,50 10,30' fill='%23e0e0e0' stroke='%23333' stroke-width='2'/%3E%3Cpolygon points='90,30 90,70 50,90 50,50' fill='%23aaa' stroke='%23333' stroke-width='2'/%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    :root {
      --bg: #0a0a0a;
      --surface: #141414;
      --border: #262626;
      --text: #fafafa;
      --muted: #737373;
      --accent: #3b82f6;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Space Grotesk', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }
    header {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .case-info {
      display: grid;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: var(--muted);
    }
    .case-info a {
      color: var(--accent);
      text-decoration: none;
    }
    .case-info a:hover {
      text-decoration: underline;
    }
    .actions {
      margin: 2rem 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .result {
      display: none;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin: 2rem 0;
    }
    .result.show {
      display: block;
    }
    .verdict-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 500;
      font-size: 0.9rem;
    }
    .verdict-resolved {
      background: rgba(34, 197, 94, 0.2);
      color: var(--success);
    }
    .verdict-insufficient_changes {
      background: rgba(245, 158, 11, 0.2);
      color: var(--warning);
    }
    .verdict-still_similar {
      background: rgba(239, 68, 68, 0.2);
      color: var(--danger);
    }
    .verdict-no_baseline {
      background: rgba(115, 115, 115, 0.2);
      color: var(--muted);
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin: 1.5rem 0;
    }
    .metric {
      background: var(--bg);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }
    .metric-value {
      font-size: 2rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    .metric-label {
      font-size: 0.8rem;
      color: var(--muted);
      margin-top: 0.25rem;
    }
    .metric-change {
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }
    .metric-change.positive { color: var(--success); }
    .metric-change.negative { color: var(--danger); }
    .explanation {
      background: var(--bg);
      border-left: 3px solid var(--accent);
      padding: 1rem;
      margin: 1rem 0;
      font-size: 0.95rem;
    }
    .history {
      margin-top: 2rem;
    }
    .history h2 {
      font-size: 1.1rem;
      font-weight: 500;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .history-item {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .history-date {
      font-size: 0.85rem;
      color: var(--muted);
    }
    .history-metrics {
      display: flex;
      gap: 1rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
    }
    .loading {
      display: none;
      align-items: center;
      gap: 0.5rem;
      color: var(--muted);
    }
    .loading.show {
      display: flex;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spinner {
      animation: spin 1s linear infinite;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>
        <i data-lucide="scan-search"></i>
        Compliance Rescan
      </h1>
      <div class="case-info">
        <div><strong>Case ID:</strong> ${caseId}</div>
        <div><strong>Original:</strong> <a href="${caseData.case.original_url}">${caseData.case.original_url}</a></div>
        <div><strong>Alleged Copy:</strong> <a href="${caseData.case.alleged_copy_url}">${caseData.case.alleged_copy_url}</a></div>
        <div><strong>Reported:</strong> ${new Date(caseData.case.created_at).toLocaleDateString()}</div>
        <div><strong>Initial Similarity:</strong> ${caseData.case.original_similarity ? (caseData.case.original_similarity * 100).toFixed(0) + '%' : 'Not captured'}</div>
      </div>
    </header>
    
    <div class="actions">
      <button class="btn" id="rescan-btn" onclick="performRescan()">
        <i data-lucide="refresh-cw"></i>
        Run Compliance Rescan
      </button>
      <div class="loading" id="loading">
        <i data-lucide="loader-2" class="spinner"></i>
        Analyzing current template...
      </div>
    </div>
    
    <div class="result" id="result">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <span class="verdict-badge" id="verdict-badge"></span>
        <span style="color: var(--muted); font-size: 0.85rem;" id="scan-time"></span>
      </div>
      
      <div class="metrics">
        <div class="metric">
          <div class="metric-value" id="drift-value">-</div>
          <div class="metric-label">Content Changed</div>
        </div>
        <div class="metric">
          <div class="metric-value" id="similarity-value">-</div>
          <div class="metric-label">Current Similarity</div>
          <div class="metric-change" id="similarity-change"></div>
        </div>
        <div class="metric">
          <div class="metric-value" id="rescan-count">-</div>
          <div class="metric-label">Rescans</div>
        </div>
      </div>
      
      <div class="explanation" id="explanation"></div>
    </div>
    
    ${caseData.rescans.length > 0 ? `
    <div class="history">
      <h2>
        <i data-lucide="history"></i>
        Rescan History
      </h2>
      ${caseData.rescans.map((r: any) => `
        <div class="history-item">
          <div>
            <span class="verdict-badge verdict-${r.verdict}">${r.verdict.replace(/_/g, ' ')}</span>
            <span class="history-date">${new Date(r.scanned_at).toLocaleString()}</span>
          </div>
          <div class="history-metrics">
            <span>Drift: ${(r.drift_from_original * 100).toFixed(0)}%</span>
            <span>Similarity: ${(r.current_similarity * 100).toFixed(0)}%</span>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
  
  <script>
    lucide.createIcons();
    
    async function performRescan() {
      const btn = document.getElementById('rescan-btn');
      const loading = document.getElementById('loading');
      const result = document.getElementById('result');
      
      btn.disabled = true;
      loading.classList.add('show');
      result.classList.remove('show');
      
      try {
        const res = await fetch('/case/${caseId}/rescan', { method: 'POST' });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        // Update UI
        document.getElementById('verdict-badge').textContent = data.verdict.replace(/_/g, ' ');
        document.getElementById('verdict-badge').className = 'verdict-badge verdict-' + data.verdict;
        document.getElementById('drift-value').textContent = (data.driftFromOriginal * 100).toFixed(0) + '%';
        document.getElementById('similarity-value').textContent = (data.currentSimilarity * 100).toFixed(0) + '%';
        document.getElementById('rescan-count').textContent = data.rescanCount;
        document.getElementById('explanation').textContent = data.verdictExplanation;
        document.getElementById('scan-time').textContent = 'Scanned ' + new Date(data.scannedAt).toLocaleString();
        
        const change = data.similarityChange;
        const changeEl = document.getElementById('similarity-change');
        if (change > 0) {
          changeEl.textContent = '↓ ' + (change * 100).toFixed(0) + '% from last';
          changeEl.className = 'metric-change positive';
        } else if (change < 0) {
          changeEl.textContent = '↑ ' + (Math.abs(change) * 100).toFixed(0) + '% from last';
          changeEl.className = 'metric-change negative';
        } else {
          changeEl.textContent = 'No change';
          changeEl.className = 'metric-change';
        }
        
        result.classList.add('show');
      } catch (e) {
        alert('Error: ' + e.message);
      } finally {
        btn.disabled = false;
        loading.classList.remove('show');
        lucide.createIcons();
      }
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
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
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#000000"/><path d="M 16 4 L 26.39 10 L 16 16 L 5.61 10 Z" fill="#FFFFFF" fill-opacity="1"/><path d="M 5.61 10 L 16 16 L 16 28 L 5.61 22 Z" fill="#FFFFFF" fill-opacity="0.6"/><path d="M 16 16 L 26.39 10 L 26.39 22 L 16 28 Z" fill="#FFFFFF" fill-opacity="0.3"/></svg>`;
  const faviconDataUri = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plagiarism Detection Dashboard</title>
  <link rel="icon" type="image/svg+xml" href="${faviconDataUri}">
  <link rel="apple-touch-icon" href="${faviconDataUri}">
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
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
    .icon { display: inline-flex; align-items: center; justify-content: center; }
    .icon svg { width: 1.25em; height: 1.25em; stroke-width: 2; }
    h1 .icon svg { width: 1.5em; height: 1.5em; }
    .section-title .icon { color: var(--accent); }
    .header-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-row">
      <span class="icon"><i data-lucide="scan-search"></i></span>
      <h1>Plagiarism Detection Dashboard</h1>
    </div>
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
      <h2 class="section-title"><span class="icon"><i data-lucide="search"></i></span> Scan Template</h2>
      <div class="scan-form">
        <div class="form-row">
          <input type="text" id="scan-url" placeholder="Enter template URL (e.g., https://example.webflow.io/)">
          <button onclick="scanTemplate()">Scan for Plagiarism</button>
        </div>
        <div id="scan-results"></div>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title"><span class="icon" style="color: var(--warning);"><i data-lucide="alert-triangle"></i></span> Suspicious Pairs</h2>
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
      <h2 class="section-title"><span class="icon"><i data-lucide="git-branch"></i></span> Similarity Clusters</h2>
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
        
        // Extract the scanned template's ID from the URL
        const scannedId = url.replace(/https?:\\/\\//, '').replace(/\\.webflow\\.io\\/?.*/, '').replace(/[^a-z0-9-]/gi, '-');
        
        resultsEl.innerHTML = \`
          <div style="margin-top: 1rem; padding: 1rem; background: var(--bg); border-radius: 8px;">
            <strong>\${data.recommendation}</strong>
            \${data.matches.length > 0 ? \`
              <table style="margin-top: 1rem; width: 100%;">
                <thead><tr><th>Template</th><th>Similarity</th><th>Details</th></tr></thead>
                <tbody>
                  \${data.matches.slice(0, 10).map(m => \`
                    <tr>
                      <td><a href="\${m.url}" target="_blank">\${m.name}</a></td>
                      <td>\${(m.similarity * 100).toFixed(0)}%</td>
                      <td><a href="/compare/\${scannedId}/\${m.id}" style="display: inline-flex; align-items: center; gap: 0.25rem;"><i data-lucide="git-compare" style="width: 14px; height: 14px;"></i> Compare</a></td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            \` : ''}
          </div>
        \`;
        lucide.createIcons();
      } catch (e) {
        resultsEl.innerHTML = \`<div style="color: var(--danger)">Failed to scan: \${e.message}</div>\`;
      }
    }
    
    // Initialize Lucide icons
    lucide.createIcons();
    
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
