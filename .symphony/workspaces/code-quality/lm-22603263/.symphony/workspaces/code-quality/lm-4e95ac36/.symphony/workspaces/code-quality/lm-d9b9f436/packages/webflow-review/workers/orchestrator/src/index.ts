// Orchestrator Worker - Main API entry point

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type {
  Env,
  ReviewPageRequest,
  ReviewPageResponse,
  ReviewProjectRequest,
  ReviewProjectResponse,
  ReviewStatusResponse,
  Finding,
  PolicyContext,
} from '../../../shared/types';
import { SEVERITY_WEIGHTS } from '../../../shared/constants';
import { checkSEO } from '../../seo-checker/src/index';
import { validateLinks } from '../../link-validator/src/index';
import { getWebflowPolicySnapshot } from '../../../../webflow-site-analyzer-mcp/src/policy/index';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for extension
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: Date.now(),
    version: '1.0.0',
  });
});

// Single page review (synchronous)
app.post('/api/review/page', async (c) => {
  const startTime = Date.now();
  const { url, checks = ['seo', 'links'], includePolicyContext = true } = await c.req.json<ReviewPageRequest>();

  if (!url) {
    return c.json({ error: 'URL is required' }, 400);
  }

  try {
    const findings: Finding[] = [];
    let policyContext: PolicyContext | undefined;

    // Knowledge gate: policy/rubric context is sourced from MCP policy ingestion.
    if (includePolicyContext) {
      const policy = await getWebflowPolicySnapshot(false);
      policyContext = {
        policyVersion: policy.policyVersion,
        generatedAt: policy.generatedAt,
        sources: policy.sources,
      };
    }

    // Run checks in parallel
    const checkPromises = [];

    if (checks.includes('seo')) {
      checkPromises.push(checkSEO(url, c.env));
    }

    if (checks.includes('links')) {
      checkPromises.push(validateLinks(url, c.env));
    }

    const results = await Promise.all(checkPromises);
    results.forEach(result => findings.push(...result));

    // Calculate score (100 - penalties)
    const score = calculateScore(findings);
    const duration = Date.now() - startTime;

    const response: ReviewPageResponse = {
      findings,
      score,
      duration,
      policy: policyContext,
    };

    // Track API usage
    await trackApiUsage(c.env, {
      projectId: 'single-page',
      endpoint: '/api/review/page',
      duration,
      statusCode: 200,
    });

    return c.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;

    await trackApiUsage(c.env, {
      projectId: 'single-page',
      endpoint: '/api/review/page',
      duration,
      statusCode: 500,
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json({
      error: 'Failed to review page',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// Policy context endpoint for extension/app bootstrapping.
app.get('/api/policy/webflow', async (c) => {
  try {
    const policy = await getWebflowPolicySnapshot(false);
    return c.json({
      policyVersion: policy.policyVersion,
      generatedAt: policy.generatedAt,
      sources: policy.sources,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch policy context',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// Full project review (async via queue)
app.post('/api/review/project', async (c) => {
  const { projectId, webhookUrl, pages = [] } = await c.req.json<ReviewProjectRequest>();

  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  try {
    const reviewId = crypto.randomUUID();

    // Store review in D1
    await c.env.DB.prepare(`
      INSERT INTO reviews (id, project_id, status, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(reviewId, projectId, 'queued', Date.now()).run();

    // Create review_pages entries
    for (const pageUrl of pages) {
      const pageId = crypto.randomUUID();
      await c.env.DB.prepare(`
        INSERT INTO review_pages (id, review_id, page_url, status)
        VALUES (?, ?, ?, ?)
      `).bind(pageId, reviewId, pageUrl, 'pending').run();
    }

    // Send to queue for background processing
    await c.env.QUEUE.send({
      reviewId,
      projectId,
      webhookUrl,
      pages,
    });

    const response: ReviewProjectResponse = {
      reviewId,
      statusUrl: `/api/review/${reviewId}/status`,
    };

    return c.json(response, 202); // Accepted
  } catch (error) {
    return c.json({
      error: 'Failed to queue project review',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// Check review status
app.get('/api/review/:reviewId/status', async (c) => {
  const reviewId = c.req.param('reviewId');

  try {
    const review = await c.env.DB.prepare(`
      SELECT status, overall_score, error, completed_at
      FROM reviews
      WHERE id = ?
    `).bind(reviewId).first();

    if (!review) {
      return c.json({ error: 'Review not found' }, 404);
    }

    // Calculate progress based on completed pages
    const pagesResult = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM review_pages
      WHERE review_id = ?
    `).bind(reviewId).first();

    const total = Number(pagesResult?.total || 0);
    const completed = Number(pagesResult?.completed || 0);
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    const response: ReviewStatusResponse = {
      status: review.status as any,
      progress,
      score: review.overall_score || undefined,
      error: review.error || undefined,
    };

    return c.json(response);
  } catch (error) {
    return c.json({
      error: 'Failed to get review status',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// Get full review report
app.get('/api/review/:reviewId/report', async (c) => {
  const reviewId = c.req.param('reviewId');

  try {
    const review = await c.env.DB.prepare(`
      SELECT * FROM reviews WHERE id = ?
    `).bind(reviewId).first();

    if (!review) {
      return c.json({ error: 'Review not found' }, 404);
    }

    // Get all findings
    const findingsResult = await c.env.DB.prepare(`
      SELECT * FROM findings
      WHERE review_id = ?
      ORDER BY severity DESC, created_at ASC
    `).bind(reviewId).all();

    const findings = findingsResult.results.map(f => ({
      ...f,
      evidence: f.evidence ? JSON.parse(f.evidence as string) : undefined,
    }));

    return c.json({
      review,
      findings,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to get review report',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// Helper: Calculate score from findings
function calculateScore(findings: Finding[]): number {
  let penalties = 0;

  for (const finding of findings) {
    penalties += SEVERITY_WEIGHTS[finding.severity];
  }

  // Start at 100, subtract penalties
  const score = Math.max(0, Math.min(100, 100 - penalties));
  return Math.round(score);
}

// Helper: Track API usage
async function trackApiUsage(
  env: Env,
  usage: {
    projectId: string;
    endpoint: string;
    duration: number;
    statusCode: number;
    error?: string;
  }
) {
  try {
    await env.DB.prepare(`
      INSERT INTO api_usage (id, project_id, endpoint, created_at, duration_ms, status_code, error)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      usage.projectId,
      usage.endpoint,
      Date.now(),
      usage.duration,
      usage.statusCode,
      usage.error || null
    ).run();
  } catch (error) {
    console.error('Failed to track API usage:', error);
    // Don't throw - tracking shouldn't break the request
  }
}

export default app;
