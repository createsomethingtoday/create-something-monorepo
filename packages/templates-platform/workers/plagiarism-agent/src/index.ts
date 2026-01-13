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
  type VectorSimilarity 
} from './vector-similarity';
import {
  indexTemplate,
  findSimilarTemplates,
  getIndexStats,
  type TemplateMetadata
} from './indexer';

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
// TIER 1: Workers AI Screening (with optional vision)
// =============================================================================

async function runTier1Screening(
  plagiarismCase: PlagiarismCase,
  env: Env
): Promise<void> {
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

Decide:
- "obvious_not": Clearly not plagiarism
- "obvious_yes": Clear plagiarism
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
