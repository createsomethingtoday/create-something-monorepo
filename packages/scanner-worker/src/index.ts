/**
 * Scanner Worker
 *
 * Cloudflare Worker for Bundle Scanner P3-memory and P4-judge phases.
 * Provides AI verification and similarity search for scan findings.
 *
 * Canon: The infrastructure disappears; only the verdict remains.
 */

import type { Env, ErrorResponse, VerifyFindingsRequest, VerifyFindingsResponse, Finding } from './types';
import { runMemoryPhase } from './services/memory';
import { runJudgePhase } from './services/judge';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // CORS preflight
    if (method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }), request, env);
    }

    try {
      const response = await route(request, env, method, path);
      return cors(response, request, env);
    } catch (err) {
      console.error('Scanner Worker Error:', err);
      return cors(
        json({ error: 'internal_error', message: 'An unexpected error occurred', status: 500 }, 500),
        request,
        env
      );
    }
  },
};

// Router
async function route(request: Request, env: Env, method: string, path: string): Promise<Response> {
  // Health check
  if (path === '/' && method === 'GET') {
    return json({ service: 'scanner-worker', version: '0.1.0', status: 'healthy' });
  }

  if (path === '/health' && method === 'GET') {
    return json({ service: 'scanner-worker', version: '0.1.0', status: 'healthy' });
  }

  // Main verify endpoint
  if (path === '/v1/scan/verify' && method === 'POST') {
    return handleVerifyFindings(request, env);
  }

  // Mark finding as false positive (for RLHF)
  if (path.startsWith('/v1/findings/') && path.endsWith('/false-positive') && method === 'POST') {
    const findingId = path.replace('/v1/findings/', '').replace('/false-positive', '');
    return handleMarkFalsePositive(request, env, findingId);
  }

  return json({ error: 'not_found', message: 'Endpoint not found', status: 404 }, 404);
}

/**
 * POST /v1/scan/verify
 * Main endpoint: receives P2 findings, runs P3-memory + P4-judge, returns verified findings
 */
async function handleVerifyFindings(request: Request, env: Env): Promise<Response> {
  // Rate limiting
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateKey = `verify:${ip}`;
  const rateLimit = await checkRateLimit(env.RATE_LIMIT, rateKey, 30, 60); // 30 requests per minute
  if (!rateLimit.allowed) {
    return json({ error: 'rate_limited', message: 'Too many requests', status: 429 }, 429);
  }

  // Parse request
  const body = await parseJSON<VerifyFindingsRequest>(request);
  if (!body) {
    return json({ error: 'invalid_request', message: 'Invalid JSON', status: 400 }, 400);
  }

  const { findings, context, options = {} } = body;

  if (!findings || !Array.isArray(findings)) {
    return json({ error: 'invalid_request', message: 'findings array required', status: 400 }, 400);
  }

  const enableMemory = options.enableMemory !== false; // Default: true
  const enableAI = options.enableAI !== false; // Default: true
  const maxFindings = options.maxFindings || 100;

  // Limit findings to process
  const limitedFindings = findings.slice(0, maxFindings);

  let resolvedByMemory = 0;
  let verifiedByAI = 0;
  let p3TimeMs = 0;
  let p4TimeMs = 0;
  let cacheHits = 0;
  let llmCalls = 0;
  let tokensUsed = 0;

  // P3-Memory: Check for similar past findings
  let processedFindings = limitedFindings;
  if (enableMemory) {
    const p3Start = Date.now();
    const memoryResult = await runMemoryPhase(env.DB, limitedFindings);
    p3TimeMs = Date.now() - p3Start;
    
    processedFindings = memoryResult.findings;
    resolvedByMemory = memoryResult.resolvedCount;
    cacheHits = memoryResult.cacheHits;
  }

  // P4-Judge: AI verification for unresolved findings
  if (enableAI) {
    const unresolvedFindings = processedFindings.filter(f => f.verdict !== 'PASS');
    
    if (unresolvedFindings.length > 0) {
      const p4Start = Date.now();
      const judgeResult = await runJudgePhase(env, unresolvedFindings, context.appType);
      p4TimeMs = Date.now() - p4Start;
      
      // Merge AI verdicts back
      const judgeMap = new Map(judgeResult.findings.map(f => [f.fingerprint || f.id, f]));
      processedFindings = processedFindings.map(f => {
        const key = f.fingerprint || f.id;
        const judged = key ? judgeMap.get(key) : undefined;
        return judged || f;
      });
      
      verifiedByAI = judgeResult.verifiedCount;
      llmCalls = judgeResult.llmCalls;
      tokensUsed = judgeResult.tokensUsed;
    }
  }

  // Calculate summary counts
  const blockerCount = processedFindings.filter(f => f.tier === 'BLOCKER' && f.verdict === 'FAIL').length;
  const actionRequiredCount = processedFindings.filter(f => f.tier === 'ACTION_REQUIRED' && f.verdict !== 'PASS').length;
  const investigateCount = processedFindings.filter(f => f.tier === 'INVESTIGATE' && f.verdict !== 'PASS').length;

  const response: VerifyFindingsResponse = {
    findings: processedFindings,
    summary: {
      totalReceived: findings.length,
      resolvedByMemory,
      verifiedByAI,
      blockerCount,
      actionRequiredCount,
      investigateCount,
    },
    phases: {
      p3Memory: { timeMs: p3TimeMs, cacheHits },
      p4Judge: { timeMs: p4TimeMs, llmCalls, tokensUsed },
    },
  };

  return json(response);
}

/**
 * POST /v1/findings/:id/false-positive
 * Mark a finding as false positive (RLHF feedback)
 */
async function handleMarkFalsePositive(request: Request, env: Env, findingId: string): Promise<Response> {
  const body = await parseJSON<{ reason?: string; reviewedBy?: string }>(request);
  
  try {
    await env.DB.prepare(`
      INSERT INTO findings (id, fingerprint, rule_id, snippet, verdict, is_false_positive, reasoning, created_at, updated_at)
      VALUES (?, ?, '', '', 'PASS', 1, ?, datetime('now'), datetime('now'))
      ON CONFLICT(fingerprint) DO UPDATE SET
        is_false_positive = 1,
        reasoning = ?,
        updated_at = datetime('now')
    `).bind(findingId, findingId, body?.reason || 'Marked as false positive', body?.reason || 'Marked as false positive').run();

    return json({ success: true, message: 'Finding marked as false positive' });
  } catch (err) {
    console.error('Failed to mark false positive:', err);
    return json({ error: 'update_failed', message: 'Failed to update finding', status: 500 }, 500);
  }
}

// ============================================================================
// Utilities
// ============================================================================

async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return { allowed: true, remaining: maxRequests - count - 1 };
}

function cors(response: Response, request: Request, env: Env): Response {
  const origin = request.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS?.split(',') || []).concat(
    env.ENVIRONMENT !== 'production' ? ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3100'] : []
  );

  const headers = new Headers(response.headers);
  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Max-Age', '86400');
  }

  return new Response(response.body, { status: response.status, headers });
}

function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function parseJSON<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
