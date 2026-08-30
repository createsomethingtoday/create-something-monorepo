import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import { misconfiguredResponse } from '../src/auth.js';
import { AirtableClient } from '../src/airtable.js';
import {
  cloudflareAccessServePath,
  isCloudflareAccessMcpPath,
  resolveCloudflareAccessRequest,
} from '../src/cloudflare-access.js';
import { DEFAULT_AIRTABLE_BASE_ID, TABLE_IDS } from '../src/schema.js';
import {
  buildProtectedResourceMetadata,
  parseAllowedEmails,
  resolveIdentityOAuthRequest,
} from '../src/oauth-access.js';
import { registerPrompts, SERVER_INSTRUCTIONS } from '../src/prompts.js';
import { registerResources } from '../src/resources.js';
import { parseBooleanFlag, resolveRuntimePolicy } from '../src/runtime-policy.js';
import {
  applyReviewerAuthEmailAliases,
  parseReviewerDirectory,
  getReviewerProfileForAccount,
  getReviewerProfileForEmail,
} from '../src/reviewer-directory.js';
import { registerTools } from '../src/tools.js';
import { handleThumbnailProxyRequest, THUMBNAIL_PROXY_PATH } from '../src/thumbnail-proxy.js';
import {
  buildScreenshotViewUrl,
  handleScreenshotViewRequest,
  SCREENSHOT_VIEW_PATH,
  SCREENSHOT_VIEW_TTL_SECONDS,
} from '../src/screenshot-view.js';
import {
  buildScreenshotGalleryUrl,
  handleScreenshotGalleryRequest,
  SCREENSHOT_GALLERY_PATH,
  type ScreenshotGalleryManifest,
} from '../src/screenshot-gallery.js';
import type { CapturedScreenshot, PublishedScreenshotRef } from '../src/published-site-screenshots.js';
import { createBrowserRenderingScreenshotExecutor } from './screenshot-capture.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  BROWSER?: Fetcher;
  SCREENSHOTS_KV?: KVNamespace;
  TELEMETRY_DB?: D1Database;
  MCP_ACCOUNT_ID?: string;
  MCP_API_KEY?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  REVIEWER_DIRECTORY_JSON?: string;
  REVIEWER_AUTH_EMAIL_ALIASES_JSON?: string;
  CS_IDENTITY_ISSUER?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  OAUTH_ALLOWED_EMAIL_DOMAIN?: string;
  OAUTH_ALLOWED_EMAILS?: string;
  OAUTH_ADDITIONAL_RESOURCES?: string;
  WEBFLOW_TEMPLATE_VALIDATION_WORKER_URL?: string;
  GSAP_VALIDATION_WORKER_URL?: string;
  TEMPLATE_REVIEW_VALIDATION_TIMEOUT_MS?: string;
  E2B_API_KEY?: string;
  E2B_BROWSER_TEMPLATE?: string;
  TEMPLATE_REVIEW_ENVIRONMENT?: string;
  TEMPLATE_REVIEW_FORCE_READ_ONLY?: string;
  WORKER_PUBLIC_ORIGIN?: string;
  MARKETPLACE_ADMIN_API_KEY?: string;
}

type RequestProps = {
  accountId?: string;
  email?: string;
  name?: string | null;
  scopes?: string[];
  authMode?: 'legacy' | 'oauth';
};

export class WebflowTemplateReviewMCP extends McpAgent<Env, unknown, RequestProps> {
  server = new McpServer(
    {
      name: 'webflow-template-review-mcp',
      version: '1.0.0',
    },
    { instructions: SERVER_INSTRUCTIONS },
  );

  async init() {
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(
        this.server,
        this.env.TELEMETRY_DB as unknown as Parameters<typeof enableTelemetry>[1],
        'webflow-template-review-mcp',
        () => this.props?.accountId ?? this.env.MCP_ACCOUNT_ID?.trim() ?? 'operator',
      );
    }

    const getClient = () => {
      if (!this.env.AIRTABLE_API_KEY) {
        throw new Error('Missing AIRTABLE_API_KEY environment variable.');
      }
      return new AirtableClient({
        apiKey: this.env.AIRTABLE_API_KEY,
        baseId: this.env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID,
      });
    };

    const reviewerDirectory = resolveReviewerDirectory(this.env);
    const getReviewer = () => {
      if (this.props?.authMode === 'oauth') {
        return getReviewerProfileForEmail(reviewerDirectory, this.props?.email ?? null);
      }
      return getReviewerProfileForAccount(reviewerDirectory, this.props?.accountId ?? null);
    };

    const runtimePolicy = resolveRuntimePolicy({
      authMode: this.props?.authMode,
      scopes: this.props?.scopes,
      forceReadOnly: parseBooleanFlag(this.env.TEMPLATE_REVIEW_FORCE_READ_ONLY),
    });

    registerResources(this.server, getClient, getReviewer);
    registerTools(
      this.server,
      getClient,
      getReviewer,
      {
        webflowValidationWorkerUrl: this.env.WEBFLOW_TEMPLATE_VALIDATION_WORKER_URL,
        gsapValidationWorkerUrl: this.env.GSAP_VALIDATION_WORKER_URL,
        timeoutMs: this.env.TEMPLATE_REVIEW_VALIDATION_TIMEOUT_MS
          ? Number(this.env.TEMPLATE_REVIEW_VALIDATION_TIMEOUT_MS)
          : undefined,
        sandboxExecution: {
          apiKey: this.env.E2B_API_KEY,
          template: this.env.E2B_BROWSER_TEMPLATE,
        },
        adminExecute: {
          publicOrigin: this.env.WORKER_PUBLIC_ORIGIN,
          thumbnailProxySecret: this.env.AIRTABLE_API_KEY,
        },
        marketplaceAdmin: {
          apiKey: this.env.MARKETPLACE_ADMIN_API_KEY,
        },
        ...(this.env.BROWSER
          ? {
              screenshotCapture: {
                executor: createBrowserRenderingScreenshotExecutor(
                  this.env.BROWSER as unknown as Parameters<typeof createBrowserRenderingScreenshotExecutor>[0],
                ),
                publishScreenshot: createScreenshotPublisher(this.env),
                publishGallery: createGalleryPublisher(this.env),
              },
            }
          : {}),
      },
      {
        allowWrites: runtimePolicy.allowWrites,
        ...(runtimePolicy.queueReadOnly ? { allowedToolNames: new Set(['template_review_list_queue']) } : {}),
      },
    );
    registerPrompts(this.server);
  }
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id',
};

const JSON_HEADERS = { 'Content-Type': 'application/json', ...CORS_HEADERS };

function isMcpPath(pathname: string): boolean {
  return (
    pathname === '/mcp' || pathname.startsWith('/mcp/') || pathname === '/sse' || pathname.startsWith('/sse/')
  );
}

function isLegacyBearer(request: Request, env: Env): boolean {
  if (!env.MCP_API_KEY) return false;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  return authHeader.slice('Bearer '.length).trim() === env.MCP_API_KEY;
}

function allowedDomain(env: Env): string {
  return (env.OAUTH_ALLOWED_EMAIL_DOMAIN ?? 'webflow.com').trim().toLowerCase();
}

function resolveReviewerDirectory(env: Pick<Env, 'REVIEWER_DIRECTORY_JSON' | 'REVIEWER_AUTH_EMAIL_ALIASES_JSON'>) {
  return applyReviewerAuthEmailAliases(
    parseReviewerDirectory(env.REVIEWER_DIRECTORY_JSON),
    env.REVIEWER_AUTH_EMAIL_ALIASES_JSON,
  );
}

/**
 * Stores a capture in KV and mints the signed link a reviewer can open in a
 * browser (claude.ai does not render MCP image content for the human).
 * Returns null when storage or signing prerequisites are absent so the tool
 * still works inline-only.
 */
function createScreenshotPublisher(
  env: Pick<Env, 'SCREENSHOTS_KV' | 'WORKER_PUBLIC_ORIGIN' | 'AIRTABLE_API_KEY'>,
): (screenshot: CapturedScreenshot) => Promise<PublishedScreenshotRef | null> {
  return async (screenshot) => {
    const kv = env.SCREENSHOTS_KV;
    const origin = env.WORKER_PUBLIC_ORIGIN?.trim();
    const secret = env.AIRTABLE_API_KEY;
    if (!kv || !origin || !secret) return null;
    const id = crypto.randomUUID();
    const bytes = Uint8Array.from(atob(screenshot.data), (char) => char.charCodeAt(0));
    await kv.put(`shot:${id}`, bytes.buffer as ArrayBuffer, {
      expirationTtl: SCREENSHOT_VIEW_TTL_SECONDS,
      metadata: { mimeType: screenshot.mime_type },
    });
    return { id, view_url: await buildScreenshotViewUrl({ origin, secret, id }) };
  };
}

/**
 * Stores the gallery manifest and mints the one signed link that renders
 * every capture on a single page. Same TTL as the screenshot bytes.
 */
function createGalleryPublisher(
  env: Pick<Env, 'SCREENSHOTS_KV' | 'WORKER_PUBLIC_ORIGIN' | 'AIRTABLE_API_KEY'>,
): (manifest: ScreenshotGalleryManifest) => Promise<string | null> {
  return async (manifest) => {
    const kv = env.SCREENSHOTS_KV;
    const origin = env.WORKER_PUBLIC_ORIGIN?.trim();
    const secret = env.AIRTABLE_API_KEY;
    if (!kv || !origin || !secret || manifest.screenshots.length === 0) return null;
    const id = crypto.randomUUID();
    await kv.put(`gallery:${id}`, JSON.stringify(manifest), {
      expirationTtl: SCREENSHOT_VIEW_TTL_SECONDS,
    });
    return buildScreenshotGalleryUrl({ origin, secret, id });
  };
}

function unauthorized(origin: string, message: string, resourcePath = '/mcp'): Response {
  const resourceMetadata = resourcePath === '/mcp'
    ? `${origin}/.well-known/oauth-protected-resource`
    : `${origin}/.well-known/oauth-protected-resource${resourcePath}`;
  return new Response(JSON.stringify({ ok: false, error: { code: 'UNAUTHORIZED', message } }), {
    status: 401,
    headers: {
      ...JSON_HEADERS,
      'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadata}"`,
    },
  });
}

function forbidden(message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code: 'FORBIDDEN', message } }), {
    status: 403,
    headers: JSON_HEADERS,
  });
}

function identityIssuer(env: Env): string {
  return env.CS_IDENTITY_ISSUER?.trim().replace(/\/+$/, '') ?? '';
}

function additionalOAuthResources(env: Env): Set<string> {
  return new Set(
    (env.OAUTH_ADDITIONAL_RESOURCES ?? '')
      .split(',')
      .map((resource) => resource.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  );
}

async function authenticateWithIdentity(
  request: Request,
  env: Env,
  origin: string,
): Promise<{ props: RequestProps } | Response> {
  const issuer = identityIssuer(env);
  if (!issuer) {
    return misconfiguredResponse('CREATE SOMETHING Identity is not configured (CS_IDENTITY_ISSUER missing).');
  }

  const result = await resolveIdentityOAuthRequest({
    request,
    issuer,
    expectedResource: `${origin}/mcp`,
    additionalExpectedResources: additionalOAuthResources(env),
    allowedDomain: allowedDomain(env),
    allowedEmails: parseAllowedEmails(env.OAUTH_ALLOWED_EMAILS),
    directory: resolveReviewerDirectory(env),
    fetch,
  });
  if (result.ok === false) {
    if (result.status === 401) return unauthorized(origin, result.message);
    if (result.status === 403) return forbidden(result.message);
    return misconfiguredResponse(result.message);
  }

  return {
    props: {
      authMode: 'oauth',
      accountId: result.accountId,
      email: result.email,
      name: result.name,
      scopes: result.scopes,
    },
  };
}

async function authenticateWithCloudflareAccess(
  request: Request,
  env: Env,
  origin: string,
): Promise<{ props: RequestProps } | Response> {
  const result = await resolveCloudflareAccessRequest({
    request,
    teamDomain: env.CF_ACCESS_TEAM_DOMAIN ?? '',
    audience: env.CF_ACCESS_AUD ?? '',
    allowedDomain: allowedDomain(env),
    allowedEmails: parseAllowedEmails(env.OAUTH_ALLOWED_EMAILS),
    directory: resolveReviewerDirectory(env),
  });
  if (result.ok === false) {
    if (result.status === 401) return unauthorized(origin, result.message, '/access/mcp');
    if (result.status === 403) return forbidden(result.message);
    return misconfiguredResponse(result.message);
  }

  return {
    props: {
      authMode: 'oauth',
      accountId: result.accountId,
      email: result.email,
      name: result.name,
      scopes: result.scopes,
    },
  };
}

function protectedResourceResponse(env: Env, origin: string, resourcePath: string): Response {
  const authorizationServer = identityIssuer(env);
  if (!authorizationServer) {
    return misconfiguredResponse('CS_IDENTITY_ISSUER is missing; cannot advertise the authorization server.');
  }
  const runtimePolicy = resolveRuntimePolicy({
    forceReadOnly: parseBooleanFlag(env.TEMPLATE_REVIEW_FORCE_READ_ONLY),
  });
  return new Response(
    JSON.stringify(buildProtectedResourceMetadata({
      resourceOrigin: origin,
      resourcePath,
      authorizationServer,
      scopesSupported: runtimePolicy.scopesSupported,
    }), null, 2),
    { headers: JSON_HEADERS },
  );
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // RFC 9728 discovery for MCP clients (claude.ai fetches this after a 401).
    if (url.pathname === '/.well-known/oauth-protected-resource') {
      return protectedResourceResponse(env, url.origin, '/mcp');
    }
    if (url.pathname.startsWith('/.well-known/oauth-protected-resource/')) {
      const resourcePath = url.pathname.slice('/.well-known/oauth-protected-resource'.length);
      // Cloudflare Access owns discovery for the dedicated Managed OAuth
      // resource. Reaching this origin branch means the edge application is
      // absent or mis-scoped; never advertise the Identity server for it.
      if (isCloudflareAccessMcpPath(resourcePath)) {
        return new Response('Not found', { status: 404, headers: CORS_HEADERS });
      }
      return protectedResourceResponse(env, url.origin, resourcePath);
    }

    if (isCloudflareAccessMcpPath(url.pathname)) {
      const basePath = cloudflareAccessServePath(url.pathname);
      const serve = basePath === '/access/sse'
        ? WebflowTemplateReviewMCP.serveSSE('/access/sse')
        : WebflowTemplateReviewMCP.serve('/access/mcp');
      const result = await authenticateWithCloudflareAccess(request, env, url.origin);
      if (result instanceof Response) return result;
      return serve.fetch(request, env, { ...ctx, props: result.props });
    }

    if (isMcpPath(url.pathname)) {
      const basePath = url.pathname.startsWith('/sse') ? '/sse' : '/mcp';
      const serve = basePath === '/sse'
        ? WebflowTemplateReviewMCP.serveSSE('/sse')
        : WebflowTemplateReviewMCP.serve('/mcp');

      // Legacy hub-bridge path: shared MCP_API_KEY bearer with identity
      // supplied by the trusted bridge via x-mcp-account-id.
      if (isLegacyBearer(request, env)) {
        const accountId = request.headers.get('x-mcp-account-id') ?? request.headers.get('x-hub-account-id');
        return serve.fetch(request, env, {
          ...ctx,
          props: {
            authMode: 'legacy' as const,
            ...(accountId ? { accountId } : {}),
          },
        });
      }

      // Everyone else authenticates through CREATE SOMETHING Identity.
      const result = await authenticateWithIdentity(request, env, url.origin);
      if (result instanceof Response) return result;
      return serve.fetch(request, env, { ...ctx, props: result.props });
    }

    // Signed image proxy for Admin execute scripts: re-resolves Airtable
    // attachment bytes fresh (Airtable URLs expire ~2h) with permissive CORS
    // so scripts running on https://webflow.com can fetch them. HMAC-gated —
    // only URLs minted by the prepare tools verify. See src/thumbnail-proxy.ts.
    // Signed, short-lived screenshot links for human reviewers. HMAC-gated —
    // only URLs minted by the capture tool verify. See src/screenshot-view.ts.
    if (url.pathname === SCREENSHOT_VIEW_PATH) {
      if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
      }
      return handleScreenshotViewRequest(url, {
        secret: env.AIRTABLE_API_KEY,
        getScreenshot: async (id) => {
          const kv = env.SCREENSHOTS_KV;
          if (!kv) return null;
          const stored = await kv.getWithMetadata<{ mimeType?: string }>(`shot:${id}`, 'arrayBuffer');
          if (!stored.value) return null;
          return { bytes: stored.value, mimeType: stored.metadata?.mimeType ?? 'image/jpeg' };
        },
      });
    }

    // Single-page gallery over a set of stored captures. HMAC-gated — only
    // URLs minted by the capture tool verify. See src/screenshot-gallery.ts.
    if (url.pathname === SCREENSHOT_GALLERY_PATH) {
      if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
      }
      const secret = env.AIRTABLE_API_KEY;
      return handleScreenshotGalleryRequest(url, {
        secret,
        getManifest: async (id) => {
          const kv = env.SCREENSHOTS_KV;
          if (!kv) return null;
          const raw = await kv.get(`gallery:${id}`);
          if (!raw) return null;
          try {
            return JSON.parse(raw) as ScreenshotGalleryManifest;
          } catch {
            return null;
          }
        },
        buildImageUrl: (screenshotId) =>
          buildScreenshotViewUrl({
            origin: env.WORKER_PUBLIC_ORIGIN?.trim() || url.origin,
            secret: secret ?? '',
            id: screenshotId,
          }),
      });
    }

    if (url.pathname === THUMBNAIL_PROXY_PATH) {
      if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
      }
      const airtableApiKey = env.AIRTABLE_API_KEY;
      const client = airtableApiKey
        ? new AirtableClient({ apiKey: airtableApiKey, baseId: env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID })
        : null;
      return handleThumbnailProxyRequest(url, {
        secret: airtableApiKey,
        getThumbnails: (assetId) =>
          client ? client.getAssetThumbnails(assetId) : Promise.resolve(null),
      });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      const runtimePolicy = resolveRuntimePolicy({
        forceReadOnly: parseBooleanFlag(env.TEMPLATE_REVIEW_FORCE_READ_ONLY),
      });
      return new Response(
        JSON.stringify(
          {
            name: 'webflow-template-review-mcp',
            version: '1.0.0',
            description:
              'Webflow Template Review MCP — Airtable-scoped review workflows for template Assets + Asset Versions',
            environment: env.TEMPLATE_REVIEW_ENVIRONMENT?.trim() || 'production',
            readOnly: !runtimePolicy.allowWrites,
            auth: {
              modes: {
                oauth: {
                  flow: 'OAuth 2.1 + PKCE with Dynamic Client Registration (CREATE SOMETHING Identity)',
                  authorizationServer: identityIssuer(env) || null,
                  configured: Boolean(identityIssuer(env)),
                  discovery: '/.well-known/oauth-protected-resource',
                  scopes: runtimePolicy.scopesSupported,
                },
                cloudflareAccess: {
                  flow: 'Cloudflare Access Managed OAuth with a signed application assertion',
                  endpoint: '/access/mcp',
                  teamDomain: env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/\/+$/, '') || null,
                  audienceConfigured: Boolean(env.CF_ACCESS_AUD?.trim()),
                  configured: Boolean(env.CF_ACCESS_TEAM_DOMAIN?.trim() && env.CF_ACCESS_AUD?.trim()),
                  scopes: runtimePolicy.scopesSupported,
                },
                legacy: {
                  flow: 'Shared bearer token (hub bridges only)',
                  header: 'Authorization: Bearer <MCP_API_KEY>',
                  configured: Boolean(env.MCP_API_KEY),
                },
              },
            },
            endpoints: { mcp: '/mcp', sse: '/sse', managedOAuthMcp: '/access/mcp' },
            scope: 'templates-only',
            tables: TABLE_IDS,
          },
          null,
          2,
        ),
        { headers: JSON_HEADERS },
      );
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },
};
