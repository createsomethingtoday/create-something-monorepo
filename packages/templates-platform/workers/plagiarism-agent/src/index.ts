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

// =============================================================================
// TYPES
// =============================================================================

interface Env {
  DB: D1Database;
  SCREENSHOTS: R2Bucket;
  CASE_QUEUE: Queue;
  AI: any;
  BROWSER: any;
  ANTHROPIC_API_KEY: string;
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
      return runAgentMode(caseId!, env);
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

async function handleAirtableWebhook(request: Request, env: Env): Promise<Response> {
  const payload = await request.json() as any;

  const caseId = `case_${generateId()}`;
  const now = Date.now();

  // Extract fields with defaults for missing values
  const fields = payload.fields || {};
  const reporterEmail = fields['Submitter\'s Email'] || 'unknown@example.com';
  const originalUrl = fields['Preview URL of Offended Template'] || '';
  const allegedCopyUrl = fields['Preview URL of Offending Template'] || '';
  const complaintText = fields['Offense'] || 'No complaint text provided';
  const allegedCreator = fields['Violating creator'] || 'Unknown';

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

    // Trigger webhook handler directly
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
async function runAgentMode(caseId: string, env: Env): Promise<Response> {
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

    // Update case with results
    await env.DB.prepare(`
      UPDATE plagiarism_cases
      SET
        status = 'completed',
        tier3_decision = ?,
        tier3_confidence = ?,
        tier3_reasoning = ?,
        tier3_cost = ?
      WHERE id = ?
    `).bind(
      violation.decision,
      violation.confidence,
      violation.reasoning,
      0.15, // Sonnet cost estimate (will be actual from agent usage)
      caseId
    ).run();

    // Update Airtable with decision
    const airtableFields: Record<string, string> = {
      [AIRTABLE_FIELDS.DECISION]: DECISION_TO_AIRTABLE[violation.decision],
      [AIRTABLE_FIELDS.OUTCOME]: DECISION_TO_OUTCOME[violation.decision]
    };

    await updateAirtable(env, result.airtable_record_id as string, airtableFields);

    return Response.json({
      caseId,
      decision: violation.decision,
      confidence: violation.confidence,
      reasoning: violation.reasoning,
      recommendedAction: violation.recommendedAction,
      evidenceSummary: violation.evidenceSummary,
      duration: `${(duration / 1000).toFixed(2)}s`
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

  if (result.decision === 'obvious_not') {
    await closeCase(plagiarismCase, 'no_violation', null, env);
  } else if (result.decision === 'obvious_yes') {
    // Tier 1 "obvious_yes" is treated as high confidence major violation
    await closeCase(plagiarismCase, 'major', { confidence: 1.0, reasoning: result.reasoning }, env);
  } else {
    await env.CASE_QUEUE.send({ caseId: plagiarismCase.id, tier: 2 });
  }

  console.log(`[Tier 1] ${plagiarismCase.id}: ${result.decision}`);
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
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  const result = extractJSON(response.content[0].text);

  await env.DB.prepare(`
    UPDATE plagiarism_cases
    SET tier2_decision = ?, tier2_report = ?, cost_usd = ?
    WHERE id = ?
  `).bind(
    result.decision,
    JSON.stringify(result),
    TIER_COSTS.TIER2,
    plagiarismCase.id
  ).run();

  // Escalate to Tier 3 for code analysis if:
  // 1. Decision is explicitly "unclear"
  // 2. Confidence is below threshold - visual evidence insufficient
  // 3. Decision is "minor" or "major" but confidence below threshold - needs more evidence
  const shouldEscalate =
    result.decision === 'unclear' ||
    result.confidence < TIER3_ESCALATION_THRESHOLD ||
    (result.decision !== 'no_violation' && result.confidence < TIER3_ESCALATION_THRESHOLD);

  if (shouldEscalate) {
    console.log(`[Tier 2] Escalating to Tier 3 for code analysis (confidence: ${result.confidence}, threshold: ${TIER3_ESCALATION_THRESHOLD})`);
    await env.CASE_QUEUE.send({ caseId: plagiarismCase.id, tier: 3 });
  } else {
    await closeCase(plagiarismCase, result.decision as FinalDecision, result, env);
  }

  console.log(`[Tier 2] ${plagiarismCase.id}: ${result.decision} ($${TIER_COSTS.TIER2})`);
}

// =============================================================================
// TIER 3: Claude Sonnet Judgment
// =============================================================================

/**
 * Fetch and compare HTML/CSS/JS from both URLs.
 * Used when vision analysis is inconclusive and we need code-level evidence.
 */
async function fetchCodeComparison(
  originalUrls: string[],
  copyUrl: string
): Promise<string | null> {
  try {
    console.log(`[Code Analysis] Comparing ${copyUrl} against ${originalUrls.length} original URL(s)`);

    // Extract key structural elements for comparison
    const extractPatterns = (html: string) => {
      return {
        // CSS animations and transitions
        animations: html.match(/@keyframes\s+[\w-]+\s*{[^}]+}/g) || [],
        transitions: html.match(/transition:\s*[^;]+;/g) || [],

        // Layout structure
        gridLayouts: html.match(/display:\s*grid[^}]*}/g) || [],
        flexLayouts: html.match(/display:\s*flex[^}]*}/g) || [],

        // Component patterns (classes and IDs)
        classNames: Array.from(new Set(html.match(/class="[^"]+"/g) || [])).slice(0, 50),

        // Sections and structure
        sections: html.match(/<section[^>]*>/g)?.length || 0,
        headers: html.match(/<header[^>]*>/g)?.length || 0,
        navs: html.match(/<nav[^>]*>/g)?.length || 0
      };
    };

    // Fetch copy URL
    const copyResponse = await fetch(copyUrl);
    if (!copyResponse.ok) {
      console.log('[Code Analysis] Failed to fetch copy URL');
      return null;
    }
    const copyHtml = await copyResponse.text();
    const copyPatterns = extractPatterns(copyHtml);

    // Fetch and analyze each original URL
    const comparisons: string[] = [];

    for (let i = 0; i < originalUrls.length; i++) {
      const originalUrl = originalUrls[i];
      console.log(`[Code Analysis] Fetching original ${i + 1}/${originalUrls.length}: ${originalUrl}`);

      try {
        const originalResponse = await fetch(originalUrl);
        if (!originalResponse.ok) {
          console.log(`[Code Analysis] Failed to fetch original URL: ${originalUrl}`);
          comparisons.push(`\n--- Original URL ${i + 1}: ${originalUrl} ---\nFailed to fetch (HTTP ${originalResponse.status})\n`);
          continue;
        }

        const originalHtml = await originalResponse.text();
        const originalPatterns = extractPatterns(originalHtml);

        // Calculate similarity scores
        const animationSimilarity = Math.abs(originalPatterns.animations.length - copyPatterns.animations.length) <= 2;
        const sectionSimilarity = Math.abs(originalPatterns.sections - copyPatterns.sections) <= 1;
        const layoutSimilarity = Math.abs(originalPatterns.gridLayouts.length - copyPatterns.gridLayouts.length) <= 2;

        const comparison = `
--- Original URL ${i + 1}: ${originalUrl} ---

Original Patterns:
- Animations: ${originalPatterns.animations.length} keyframe definitions
- Transitions: ${originalPatterns.transitions.length} transitions
- Grid layouts: ${originalPatterns.gridLayouts.length}
- Flex layouts: ${originalPatterns.flexLayouts.length}
- Sections: ${originalPatterns.sections}

Animation Samples (first 3):
${originalPatterns.animations.slice(0, 3).join('\n') || 'None'}

Similarity to Copy:
- Similar animation count: ${animationSimilarity ? 'YES' : 'NO'} (${Math.abs(originalPatterns.animations.length - copyPatterns.animations.length)} difference)
- Similar section count: ${sectionSimilarity ? 'YES' : 'NO'} (${Math.abs(originalPatterns.sections - copyPatterns.sections)} difference)
- Similar layout patterns: ${layoutSimilarity ? 'YES' : 'NO'} (${Math.abs(originalPatterns.gridLayouts.length - copyPatterns.gridLayouts.length)} grid difference)
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
- Animations: ${copyPatterns.animations.length} keyframe definitions
- Transitions: ${copyPatterns.transitions.length} transitions
- Grid layouts: ${copyPatterns.gridLayouts.length}
- Flex layouts: ${copyPatterns.flexLayouts.length}
- Sections: ${copyPatterns.sections}

Copy Animation Samples (first 3):
${copyPatterns.animations.slice(0, 3).join('\n') || 'None'}

${comparisons.join('\n')}
`;

    return summary;
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

  // Check if Tier 2 indicated need for more evidence
  const needsCodeAnalysis =
    tier2Result.confidence < 0.7 ||
    tier2Result.extent === 'moderate'; // Moderate extent is borderline

  let codeAnalysis: string | null = null;
  if (needsCodeAnalysis) {
    console.log('[Tier 3] Tier 2 was inconclusive - fetching HTML/CSS/JS for comparison');

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

    codeAnalysis = await fetchCodeComparison(
      cleanOriginalUrls,
      cleanCopyUrl
    );
  }

  const prompt = `Make final judgment on plagiarism case:

Original: ${plagiarismCase.originalUrl}
Alleged copy: ${plagiarismCase.allegedCopyUrl}
Complaint: ${plagiarismCase.complaintText}

Tier 2 Visual Analysis: ${JSON.stringify(tier2Result)}

${codeAnalysis ? `\nHTML/CSS/JS Code Analysis:\n${codeAnalysis}` : ''}

${codeAnalysis ?
  'The code analysis provides additional evidence about animations, layouts, and structural patterns that were not visible in screenshots.' :
  'No code analysis was performed as visual evidence was sufficient.'}

Provide final decision with detailed reasoning and confidence level.

IMPORTANT: Return ONLY valid JSON, nothing else.
{
  "decision": "no_violation" | "minor" | "major",
  "reasoning": "Detailed explanation",
  "confidence": 0.0-1.0
}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-7-sonnet-20250219',
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

  console.log(`[Tier 3] ${plagiarismCase.id}: ${result.decision} ($${TIER_COSTS.TIER3})${codeAnalysis ? ' (with code analysis)' : ''}`);
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

    // Basic URL validation
    if (cleaned && (cleaned.startsWith('http://') || cleaned.startsWith('https://'))) {
      urls.push(cleaned);
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
