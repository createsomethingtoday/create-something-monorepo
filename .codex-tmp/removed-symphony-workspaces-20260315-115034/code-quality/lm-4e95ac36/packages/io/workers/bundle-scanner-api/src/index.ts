/**
 * Bundle Scanner API Worker
 * 
 * Auto-scans Webflow Marketplace bundle submissions for security/policy compliance.
 * 
 * Endpoints:
 *   POST /scan - Scan a bundle from URL
 *   GET  /health - Health check
 * 
 * Usage:
 *   Airtable automation triggers on new submission → calls /scan → worker returns report
 */

import {
  processZipFile,
  buildInventory,
  runScan,
  generateReport,
  defaultRuleset,
  defaultConfig,
  type ScanReport
} from '@create-something/bundle-scanner-core';

interface Env {
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
  AIRTABLE_API_KEY?: string;
  SCAN_WEBHOOK_SECRET?: string;
}

interface ScanRequest {
  /** URL to the bundle ZIP file */
  bundleUrl: string;
  /** Optional submission ID for tracking */
  submissionId?: string;
  /** Optional callback URL to POST results */
  callbackUrl?: string;
}

interface ScanResponse {
  success: boolean;
  submissionId?: string;
  report?: ScanReport;
  error?: string;
  duration_ms: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request, env);
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Route handling
    try {
      if (url.pathname === '/health' && request.method === 'GET') {
        return json({ status: 'ok', timestamp: new Date().toISOString() }, corsHeaders);
      }
      
      if (url.pathname === '/scan' && request.method === 'POST') {
        return await handleScan(request, env, corsHeaders);
      }
      
      return json({ error: 'Not found' }, corsHeaders, 404);
    } catch (err) {
      console.error('Worker error:', err);
      return json(
        { error: err instanceof Error ? err.message : 'Internal error' },
        corsHeaders,
        500
      );
    }
  }
};

async function handleScan(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const startTime = Date.now();
  
  // Parse request
  let body: ScanRequest;
  try {
    body = await request.json() as ScanRequest;
  } catch {
    return json({ success: false, error: 'Invalid JSON body', duration_ms: 0 }, corsHeaders, 400);
  }
  
  if (!body.bundleUrl) {
    return json({ success: false, error: 'Missing bundleUrl', duration_ms: 0 }, corsHeaders, 400);
  }
  
  // Validate URL
  let bundleUrl: URL;
  try {
    bundleUrl = new URL(body.bundleUrl);
  } catch {
    return json({ success: false, error: 'Invalid bundleUrl', duration_ms: 0 }, corsHeaders, 400);
  }
  
  console.log(`Scanning bundle: ${bundleUrl.href} (submission: ${body.submissionId || 'n/a'})`);
  
  try {
    // Fetch the bundle
    const bundleResponse = await fetch(bundleUrl.href);
    if (!bundleResponse.ok) {
      return json({
        success: false,
        submissionId: body.submissionId,
        error: `Failed to fetch bundle: ${bundleResponse.status}`,
        duration_ms: Date.now() - startTime
      }, corsHeaders, 400);
    }
    
    // Get blob for processing
    const blob = await bundleResponse.blob();
    
    // Process ZIP
    const files = await processZipFile(
      blob,
      defaultConfig,
      (msg) => console.log(`[ZIP] ${msg}`)
    );
    
    // Build inventory
    const inventory = buildInventory(files, defaultConfig);
    
    // Run scan
    const findings = runScan(
      inventory,
      defaultRuleset,
      defaultConfig,
      (msg) => console.log(`[SCAN] ${msg}`)
    );
    
    // Generate report
    const report = generateReport(findings, inventory, defaultRuleset, defaultConfig);
    
    const response: ScanResponse = {
      success: true,
      submissionId: body.submissionId,
      report,
      duration_ms: Date.now() - startTime
    };
    
    console.log(`Scan complete: ${report.verdict} (${report.findings.length} findings, ${response.duration_ms}ms)`);
    
    // Optional: POST to callback URL
    if (body.callbackUrl) {
      try {
        await fetch(body.callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response)
        });
      } catch (err) {
        console.error('Callback failed:', err);
      }
    }
    
    return json(response, corsHeaders);
  } catch (err) {
    console.error('Scan failed:', err);
    return json({
      success: false,
      submissionId: body.submissionId,
      error: err instanceof Error ? err.message : 'Scan failed',
      duration_ms: Date.now() - startTime
    }, corsHeaders, 500);
  }
}

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || [];
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  if (allowedOrigins.includes(origin) || env.ENVIRONMENT !== 'production') {
    headers['Access-Control-Allow-Origin'] = origin || '*';
  }
  
  return headers;
}

function json(
  data: unknown,
  corsHeaders: Record<string, string>,
  status = 200
): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
