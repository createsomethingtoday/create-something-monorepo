/**
 * Webflow Apps Audit Agent
 * 
 * Demonstrates Cloudflare Workers AI for categorization and triage tasks.
 * Uses Llama 3.1 8B for app classification and pattern matching for issue detection.
 * 
 * Endpoints:
 * - POST /analyze - Full audit analysis (categorize + detect issues)
 * - POST /categorize - Categorize a single app
 * - GET /health - Health check
 * 
 * Canon: The infrastructure recedes; intelligence emerges.
 */

import type { 
  Env, 
  WebflowApp, 
  AuditData, 
  AuditReport, 
  CategorizedApp,
  AppCategory 
} from './types';
import { categorizeApp, categorizeApps, groupByCategory } from './categorizer';
import { analyzeApps, countIssuesByType, sortIssuesBySeverity } from './analyzer';

// =============================================================================
// CORS HEADERS
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * POST /analyze
 * Full audit analysis: categorize all apps and detect issues
 */
async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();
  
  let body: AuditData;
  try {
    body = await request.json() as AuditData;
  } catch {
    return errorResponse('Invalid JSON body');
  }
  
  if (!body.allApps || !Array.isArray(body.allApps)) {
    return errorResponse('Missing or invalid allApps array');
  }
  
  // For demo purposes, limit to first 50 apps (avoid timeout)
  const appsToProcess = body.allApps.slice(0, 50);
  const processingNote = body.allApps.length > 50 
    ? `Processing first 50 of ${body.allApps.length} apps for demo` 
    : `Processing all ${body.allApps.length} apps`;
  
  console.log(processingNote);
  
  // Categorize apps using Workers AI
  const categorizedApps = await categorizeApps(env, appsToProcess, 5, (completed, total) => {
    console.log(`Categorized ${completed}/${total} apps`);
  });
  
  // Group by category
  const categories = groupByCategory(categorizedApps);
  
  // Count by category
  const categoryCounts: Record<AppCategory, number> = {
    'integration': categories.integration.length,
    'analytics': categories.analytics.length,
    'forms-data': categories['forms-data'].length,
    'ai-automation': categories['ai-automation'].length,
    'developer-tools': categories['developer-tools'].length,
    'ecommerce': categories.ecommerce.length,
    'marketing': categories.marketing.length,
    'localization': categories.localization.length,
    'accessibility': categories.accessibility.length,
    'other': categories.other.length,
  };
  
  // Analyze for issues (use all apps for issue detection)
  const issues = analyzeApps(body.allApps, body.duplicateClientIds || []);
  const sortedIssues = sortIssuesBySeverity(issues);
  const issueCounts = countIssuesByType(sortedIssues);
  
  // Build report
  const report: AuditReport = {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    inputSummary: {
      totalApps: body.allApps.length,
      duplicateGroups: body.duplicateClientIds?.length || 0,
    },
    categories,
    categoryCounts,
    issues: sortedIssues,
    issueCounts,
    processingTimeMs: Date.now() - startTime,
  };
  
  return jsonResponse({
    success: true,
    note: processingNote,
    report,
  });
}

/**
 * POST /categorize
 * Categorize a single app
 */
async function handleCategorize(request: Request, env: Env): Promise<Response> {
  let body: WebflowApp;
  try {
    body = await request.json() as WebflowApp;
  } catch {
    return errorResponse('Invalid JSON body');
  }
  
  if (!body.name || !body.slug) {
    return errorResponse('Missing required fields: name, slug');
  }
  
  const result = await categorizeApp(env, body);
  
  return jsonResponse({
    success: true,
    result,
  });
}

/**
 * GET /health
 * Health check endpoint
 */
function handleHealth(): Response {
  return jsonResponse({
    status: 'ok',
    service: 'webflow-apps-audit-agent',
    version: '0.1.0',
    capabilities: [
      'app-categorization',
      'issue-detection',
      'duplicate-client-id-analysis'
    ],
    model: '@cf/meta/llama-3.1-8b-instruct'
  });
}

/**
 * GET /
 * Root endpoint with API documentation
 */
function handleRoot(): Response {
  return jsonResponse({
    service: 'Webflow Apps Audit Agent',
    description: 'Cloudflare Workers AI demo for app categorization and issue detection',
    endpoints: {
      'GET /': 'This documentation',
      'GET /health': 'Health check',
      'POST /analyze': 'Full audit analysis (accepts audit JSON)',
      'POST /categorize': 'Categorize a single app'
    },
    example: {
      categorize: {
        method: 'POST',
        url: '/categorize',
        body: {
          name: 'Figma to Webflow',
          slug: 'figma-to-webflow',
          clientId: 'abc123',
          workspaceId: 'ws123',
          error: null,
          editUrl: 'https://webflow.com/apps/detail/figma-to-webflow/edit'
        }
      }
    }
  });
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Route requests
      if (url.pathname === '/' && method === 'GET') {
        return handleRoot();
      }
      
      if (url.pathname === '/health' && method === 'GET') {
        return handleHealth();
      }
      
      if (url.pathname === '/analyze' && method === 'POST') {
        return await handleAnalyze(request, env);
      }
      
      if (url.pathname === '/categorize' && method === 'POST') {
        return await handleCategorize(request, env);
      }
      
      // 404 for unknown routes
      return errorResponse('Not found', 404);
      
    } catch (error) {
      console.error('Unhandled error:', error);
      return errorResponse(
        `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  },
};
