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
  processZipBuffer,
  buildInventory,
  runScan,
  generateReport,
  analyzeSourceMaps,
  defaultRuleset,
  defaultConfig,
  type ScanReport,
  type UnzippedFile
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
  /** Optional private source map ZIP or single .map URL for review-only analysis */
  sourceMapUrl?: string;
  /** Optional submission ID for tracking */
  submissionId?: string;
  /** Optional callback URL to POST results */
  callbackUrl?: string;
}

interface ArtifactMetadata {
  url: string;
  sha256: string;
  sizeBytes: number;
}

interface ScanResponse {
  success: boolean;
  submissionId?: string;
  report?: ScanReport;
  artifacts?: {
    bundle: ArtifactMetadata;
    sourceMap?: ArtifactMetadata;
  };
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
        const auth = authorize(request, env);
        if (!auth.ok) {
          return json({ success: false, error: auth.error, duration_ms: 0 }, corsHeaders, auth.status);
        }
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
    body = (await request.json()) as ScanRequest;
  } catch {
    return json({ success: false, error: 'Invalid JSON body', duration_ms: 0 }, corsHeaders, 400);
  }

  if (!body.bundleUrl) {
    return json({ success: false, error: 'Missing bundleUrl', duration_ms: 0 }, corsHeaders, 400);
  }

  // Validate URLs
  let bundleUrl: URL;
  let sourceMapUrl: URL | undefined;
  try {
    bundleUrl = new URL(body.bundleUrl);
    if (body.sourceMapUrl) {
      sourceMapUrl = new URL(body.sourceMapUrl);
    }
  } catch {
    return json(
      { success: false, error: 'Invalid artifact URL', duration_ms: 0 },
      corsHeaders,
      400
    );
  }

  if (!isHttpUrl(bundleUrl) || (sourceMapUrl && !isHttpUrl(sourceMapUrl))) {
    return json(
      { success: false, error: 'Artifact URLs must use http or https.', duration_ms: 0 },
      corsHeaders,
      400
    );
  }

  // SSRF guard: reject private, loopback, and link-local artifact hosts.
  for (const candidate of [bundleUrl, sourceMapUrl]) {
    if (candidate && !isPublicHostname(candidate.hostname)) {
      return json(
        { success: false, error: 'Artifact URLs must resolve to a public host.', duration_ms: 0 },
        corsHeaders,
        400
      );
    }
  }

  console.log(`Scanning bundle: ${bundleUrl.href} (submission: ${body.submissionId || 'n/a'})`);

  try {
    // Fetch the bundle
    const bundleArtifact = await fetchArtifact(bundleUrl, 'bundle');

    // Process ZIP
    const files = await processZipBuffer(bundleArtifact.buffer, defaultConfig, (msg) =>
      console.log(`[ZIP] ${msg}`)
    );

    // Build inventory
    const inventory = buildInventory(files, defaultConfig);

    // Run scan
    const findings = runScan(inventory, defaultRuleset, defaultConfig, (msg) =>
      console.log(`[SCAN] ${msg}`)
    );

    const sourceMapArtifact = sourceMapUrl ? await fetchSourceMapArtifact(sourceMapUrl) : undefined;
    const sourceMapSummary = analyzeSourceMaps(inventory, sourceMapArtifact?.files);

    // Generate report
    const report = generateReport(findings, defaultRuleset, defaultConfig, {
      fileCount: inventory.length,
      totalBytes: inventory.reduce((sum, file) => sum + file.sizeBytes, 0),
      textFilesScanned: inventory.filter((file) => file.isTextCandidate && !file.isIgnored).length,
      skippedFileCount: inventory.filter((file) => file.isIgnored || !file.isTextCandidate).length,
      sourceMapSummary
    });

    const response: ScanResponse = {
      success: true,
      submissionId: body.submissionId,
      report,
      artifacts: {
        bundle: bundleArtifact.metadata,
        ...(sourceMapArtifact ? { sourceMap: sourceMapArtifact.metadata } : {})
      },
      duration_ms: Date.now() - startTime
    };

    console.log(
      `Scan complete: ${report.verdict} (${countFindings(report)} findings, source maps: ${sourceMapSummary.status}, ${response.duration_ms}ms)`
    );

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
    return json(
      {
        success: false,
        submissionId: body.submissionId,
        error: err instanceof Error ? err.message : 'Scan failed',
        duration_ms: Date.now() - startTime
      },
      corsHeaders,
      500
    );
  }
}

function isHttpUrl(url: URL): boolean {
  return url.protocol === 'http:' || url.protocol === 'https:';
}

interface AuthResult {
  ok: boolean;
  status: number;
  error?: string;
}

/**
 * Authorize a /scan request against SCAN_WEBHOOK_SECRET.
 *
 * Accepts the secret via `Authorization: Bearer <secret>` or `X-Scan-Secret`.
 * Fails closed in production if no secret is configured; allows unauthenticated
 * access only in non-production environments (for local development).
 */
function authorize(request: Request, env: Env): AuthResult {
  const secret = env.SCAN_WEBHOOK_SECRET;

  if (!secret) {
    if (env.ENVIRONMENT === 'production') {
      return { ok: false, status: 500, error: 'Scanner auth is not configured.' };
    }
    return { ok: true, status: 200 };
  }

  const header = request.headers.get('Authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const provided = bearer || request.headers.get('X-Scan-Secret') || '';

  if (provided && constantTimeEqual(provided, secret)) {
    return { ok: true, status: 200 };
  }

  return { ok: false, status: 401, error: 'Unauthorized' };
}

/**
 * Constant-time string comparison to avoid leaking the secret via timing.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  // Compare against max length so mismatched lengths still take constant time.
  const length = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < length; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Reject hosts that could be used for SSRF: loopback, private, and link-local
 * ranges, plus obvious internal names. Public DNS names are allowed.
 */
function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, ''); // strip IPv6 brackets

  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (host.endsWith('.local') || host.endsWith('.internal')) return false;

  // IPv6 loopback / unique-local / link-local
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
    return false;
  }

  // IPv4 literal ranges
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127 || a === 10 || a === 0) return false; // loopback / private / this-host
    if (a === 192 && b === 168) return false; // private
    if (a === 169 && b === 254) return false; // link-local (incl. cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return false; // private
  }

  return true;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function fetchArtifact(
  url: URL,
  label: string
): Promise<{
  buffer: ArrayBuffer;
  contentType: string;
  metadata: ArtifactMetadata;
}> {
  const response = await fetch(url.href);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${label}: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return {
    buffer,
    contentType: response.headers.get('content-type') || '',
    metadata: {
      url: url.href,
      sha256: await sha256Hex(buffer),
      sizeBytes: buffer.byteLength
    }
  };
}

function sourceMapFilenameFromUrl(url: URL): string {
  const rawName = url.pathname.split('/').filter(Boolean).at(-1) || 'source-map.map';
  return decodeURIComponent(rawName).replace(/[^\w.+-]/g, '_');
}

async function fetchSourceMapArtifact(url: URL): Promise<{
  files: UnzippedFile[];
  metadata: ArtifactMetadata;
}> {
  const artifact = await fetchArtifact(url, 'source map artifact');
  try {
    return {
      files: await processZipBuffer(artifact.buffer, defaultConfig, (msg) =>
        console.log(`[SOURCE_MAP_ZIP] ${msg}`)
      ),
      metadata: artifact.metadata
    };
  } catch (error) {
    const singleMapFallback =
      sourceMapFilenameFromUrl(url).endsWith('.map') ||
      /json|source-?map/i.test(artifact.contentType);
    if (!singleMapFallback) throw error;

    return {
      files: [
        {
          path: sourceMapFilenameFromUrl(url),
          data: new Uint8Array(artifact.buffer)
        }
      ],
      metadata: artifact.metadata
    };
  }
}

function countFindings(report: ScanReport): number {
  return Object.values(report.findings).reduce((total, group) => total + group.count, 0);
}

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || [];

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };

  if (allowedOrigins.includes(origin) || env.ENVIRONMENT !== 'production') {
    headers['Access-Control-Allow-Origin'] = origin || '*';
  }

  return headers;
}

function json(data: unknown, corsHeaders: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
