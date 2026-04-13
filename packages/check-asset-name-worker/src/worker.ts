/**
 * Check Asset Name Worker
 *
 * Replaces check-asset-name.vercel.app with a Cloudflare Worker.
 * Provides name validation and creator lookup APIs for:
 * - Template submission form (client-side)
 * - Site analyzer MCP (server-side)
 * - Dashboard (server-side)
 *
 * Routes:
 *   POST /api/checkTemplatename  — Check if a template name is taken
 *   POST /api/checkTemplateuser  — Get creator submission stats
 *   POST /api/checkTemplateemail — Email-based creator lookup
 *   GET  /                       — Health/info
 */

interface Env {
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  AIRTABLE_TABLE_ID: string;
  AIRTABLE_VIEW_ID: string;
  ALLOWED_ORIGINS: string;
}

// =============================================================================
// CORS
// =============================================================================

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim());

  // Also allow the worker's own domain and localhost for dev
  const isAllowed = allowed.includes(origin)
    || origin.includes('localhost')
    || origin.includes('127.0.0.1');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// =============================================================================
// Airtable Client
// =============================================================================

async function airtableQuery(
  env: Env,
  formula: string,
  fields?: string[]
): Promise<Array<{ id: string; fields: Record<string, unknown> }>> {
  const params = new URLSearchParams();
  params.set('filterByFormula', formula);
  params.set('view', env.AIRTABLE_VIEW_ID);
  if (fields) {
    for (const field of fields) params.append('fields[]', field);
  }

  const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_TABLE_ID}?${params.toString()}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Airtable returned ${response.status}: ${await response.text()}`);
  }

  const data = await response.json() as { records: Array<{ id: string; fields: Record<string, unknown> }> };
  return data.records;
}

// =============================================================================
// Name exceptions (ported from Vercel function)
// =============================================================================

const NAME_EXCEPTIONS = new Set(['orizon', 'cycle', 'noda', 'sana', 'noday studio']);

// =============================================================================
// Route Handlers
// =============================================================================

async function handleCheckTemplatename(
  body: { templatename?: string },
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { templatename } = body;

  if (!templatename || typeof templatename !== 'string') {
    return json({ message: 'templatename is required' }, 400, corsHeaders);
  }

  // AI restriction (allow "Air" but block "AI")
  const aiPattern = /\bAI\b|\bai\b/i;
  const airPattern = /\bAir\b|\bair\b/i;
  if (aiPattern.test(templatename)) {
    const isAirOnly = airPattern.test(templatename)
      && !templatename.toLowerCase().includes('ai ')
      && !templatename.toLowerCase().includes(' ai');
    if (!isAirOnly) {
      return json({
        message: 'Template names containing "AI" are not allowed. Please use alternative naming.',
      }, 400, corsHeaders);
    }
  }

  // Hardcoded exceptions
  if (NAME_EXCEPTIONS.has(templatename.toLowerCase())) {
    return json({ taken: false }, 200, corsHeaders);
  }

  // Special "relay" logic — allow up to 2
  if (templatename.toLowerCase().includes('relay')) {
    const formula = `AND(FIND(LOWER('relay'), LOWER({Name})) > 0, NOT(FIND(LOWER('archived'), LOWER({Name})) > 0))`;
    const records = await airtableQuery(env, formula, ['Name']);
    if (records.length < 2) {
      return json({ taken: false }, 200, corsHeaders);
    }
  }

  // Airtable substring search (case-insensitive, exclude archived)
  const formula = `AND(FIND(LOWER('${templatename.replace(/'/g, "\\'")}'), LOWER({Name})) > 0, NOT(FIND(LOWER('archived'), LOWER({Name})) > 0))`;
  const records = await airtableQuery(env, formula, ['Name', '🚀Marketplace Status']);

  return json({ taken: records.length > 0 }, 200, corsHeaders);
}

async function handleCheckTemplateuser(
  body: { email?: string },
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { email } = body;

  if (!email || typeof email !== 'string') {
    return json({ hasError: true, message: 'Email is required', assetsSubmitted30: 0 }, 400, corsHeaders);
  }

  // Query Airtable for creator's submissions
  const formula = `LOWER({🎨📧Creator Email}) = LOWER('${email.replace(/'/g, "\\'")}')`;
  const records = await airtableQuery(env, formula, [
    'Name',
    '🚀Marketplace Status',
    '📅Submission Datetime',
  ]);

  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  let assetsSubmitted30 = 0;
  let publishedTemplates = 0;
  let submittedTemplates = records.length;

  for (const record of records) {
    const status = record.fields['🚀Marketplace Status'] as string || '';
    if (status.includes('Published')) publishedTemplates++;

    const submitted = record.fields['📅Submission Datetime'] as string;
    if (submitted && (now - new Date(submitted).getTime()) < thirtyDaysMs) {
      assetsSubmitted30++;
    }
  }

  return json({
    hasError: false,
    assetsSubmitted30,
    publishedTemplates,
    submittedTemplates,
    isWhitelisted: false,
  }, 200, corsHeaders);
}

async function handleCheckTemplateemail(
  body: { email?: string },
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { email } = body;

  if (!email || typeof email !== 'string') {
    return json({ message: 'email is required' }, 400, corsHeaders);
  }

  const formula = `LOWER({🎨📧Creator Email}) = LOWER('${email.replace(/'/g, "\\'")}')`;
  const records = await airtableQuery(env, formula, ['Name', '🎨📧Creator Email']);

  return json({
    found: records.length > 0,
    count: records.length,
  }, 200, corsHeaders);
}

// =============================================================================
// Worker Entry Point
// =============================================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request, env);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Health
    if (path === '/' || path === '/health') {
      return json({
        name: 'check-asset-name',
        version: '1.0.0',
        endpoints: [
          { path: '/api/checkTemplatename', method: 'POST' },
          { path: '/api/checkTemplateuser', method: 'POST' },
          { path: '/api/checkTemplateemail', method: 'POST' },
        ],
      }, 200, corsHeaders);
    }

    // Only POST for API routes
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return json({ error: 'Invalid JSON' }, 400, corsHeaders);
    }

    try {
      switch (path) {
        case '/api/checkTemplatename':
          return await handleCheckTemplatename(body as { templatename?: string }, env, corsHeaders);
        case '/api/checkTemplateuser':
          return await handleCheckTemplateuser(body as { email?: string }, env, corsHeaders);
        case '/api/checkTemplateemail':
          return await handleCheckTemplateemail(body as { email?: string }, env, corsHeaders);
        default:
          return json({ error: `Not found: ${path}` }, 404, corsHeaders);
      }
    } catch (error) {
      console.error(`[${path}]`, error);
      return json({
        error: error instanceof Error ? error.message : 'Internal error',
      }, 500, corsHeaders);
    }
  },
};
