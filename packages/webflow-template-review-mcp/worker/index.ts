import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { createClerkClient } from '@clerk/backend';
import puppeteer from '@cloudflare/puppeteer';
import { enableTelemetry } from '@create-something/mcp-core';
import { z } from 'zod';

import { misconfiguredResponse } from '../src/auth.js';
import { AirtableClient } from '../src/airtable.js';
import { DEFAULT_AIRTABLE_BASE_ID, TABLE_IDS } from '../src/schema.js';
import {
  SCREENSHOT_MAX_FULL_PAGE_HEIGHT,
  SCREENSHOT_NAVIGATION_TIMEOUT_MS,
  buildCaptureTarget,
  clampScreenshotQuality,
  resolveViewports,
} from '../src/published-site-screenshots.js';
import {
  SCOPE_READ,
  SCOPE_WRITE,
  buildProtectedResourceMetadata,
  clerkFrontendApiFromPublishableKey,
  parseAllowedEmails,
  resolveOAuthAccess,
} from '../src/oauth-access.js';
import { registerPrompts, SERVER_INSTRUCTIONS } from '../src/prompts.js';
import { registerResources } from '../src/resources.js';
import {
  parseReviewerDirectory,
  getReviewerProfileForAccount,
  getReviewerProfileForEmail,
} from '../src/reviewer-directory.js';
import { OAUTH_HIDDEN_TOOL_NAMES, registerTools } from '../src/tools.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  BROWSER?: Fetcher;
  TELEMETRY_DB?: D1Database;
  MCP_ACCOUNT_ID?: string;
  MCP_API_KEY?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  REVIEWER_DIRECTORY_JSON?: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_HOST?: string;
  LANGFUSE_PROJECT_NAME?: string;
  LANGFUSE_ENVIRONMENT?: string;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  OAUTH_ALLOWED_EMAIL_DOMAIN?: string;
  OAUTH_ALLOWED_EMAILS?: string;
  WEBFLOW_TEMPLATE_VALIDATION_WORKER_URL?: string;
  GSAP_VALIDATION_WORKER_URL?: string;
  TEMPLATE_REVIEW_VALIDATION_TIMEOUT_MS?: string;
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
    // Emit tool-call telemetry to D1 (cs-telemetry) and, when configured, to
    // Langfuse for tracing/evals. Traces are keyed by the resolved account
    // (OAuth reviewer email or legacy bridge accountId) so per-reviewer
    // activity is observable.
    const langfuseEnabled = Boolean(this.env.LANGFUSE_PUBLIC_KEY && this.env.LANGFUSE_SECRET_KEY);
    if (this.env.TELEMETRY_DB || langfuseEnabled) {
      enableTelemetry(
        this.server,
        this.env.TELEMETRY_DB as unknown as Parameters<typeof enableTelemetry>[1],
        'webflow-template-review-mcp',
        () => this.props?.accountId ?? this.env.MCP_ACCOUNT_ID?.trim() ?? 'operator',
        langfuseEnabled
          ? {
              publicKey: this.env.LANGFUSE_PUBLIC_KEY,
              secretKey: this.env.LANGFUSE_SECRET_KEY,
              host: this.env.LANGFUSE_HOST,
              projectName: this.env.LANGFUSE_PROJECT_NAME || 'CREATE SOMETHING',
              environment: this.env.LANGFUSE_ENVIRONMENT || 'production',
              // This worker runs as a short-lived subrequest behind the hub
              // proxy; await the flush so traces aren't dropped on suspend.
              awaitFlush: true,
            }
          : undefined,
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

    const reviewerDirectory = parseReviewerDirectory(this.env.REVIEWER_DIRECTORY_JSON);
    const getReviewer = () => {
      if (this.props?.authMode === 'oauth') {
        return getReviewerProfileForEmail(reviewerDirectory, this.props?.email ?? null);
      }
      return getReviewerProfileForAccount(reviewerDirectory, this.props?.accountId ?? null);
    };

    // Legacy (hub bridge) sessions keep the full tool surface. OAuth sessions
    // only see write tools when the grant carries the write scope, which is
    // issued to allowlisted reviewers at sign-in.
    const allowWrites =
      this.props?.authMode !== 'oauth' || (this.props?.scopes ?? []).includes(SCOPE_WRITE);

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
      },
      {
        allowWrites,
        // OAuth (Claude connector) sessions don't get the E2B bundle-prep
        // tool — they can't execute its output, and the Browser Rendering
        // screenshot tool supersedes it on that path.
        ...(this.props?.authMode === 'oauth' ? { hiddenTools: OAUTH_HIDDEN_TOOL_NAMES } : {}),
      },
    );
    registerPrompts(this.server);
    this.registerScreenshotTool();
  }

  /**
   * Visual evidence pass via Cloudflare Browser Rendering — supersedes the
   * Dify-era E2B sandbox execution. Read-only, same-origin by construction,
   * returns JPEG image content blocks the model can inspect directly for
   * layout, typography, and responsive behavior.
   */
  private registerScreenshotTool() {
    this.server.tool(
      'template_review_capture_published_site_screenshots',
      'Read-only visual evidence: capture screenshots of the published template site at desktop and/or mobile viewports using Cloudflare Browser Rendering. Accepts up to 3 site-relative paths per call (max 4 images total across paths x viewports). Use during comprehensive reviews to assess layout, typography, visual hierarchy, and responsive behavior. Same-origin only; findings from screenshots are Auto/Partial evidence, not a final visual-quality decision.',
      {
        published_url: z.string().url().describe('The published template site URL (https), e.g. from review context.'),
        path: z.string().optional().describe('Optional single site-relative path to capture (must start with "/"). Defaults to the published URL path.'),
        paths: z.array(z.string()).max(3).optional().describe('Up to 3 site-relative paths to capture in one call (each must start with "/"). Overrides `path`. Keep paths x viewports <= 4 images.'),
        viewports: z.array(z.enum(['desktop', 'mobile'])).optional().describe('Viewports to capture. Defaults to both desktop (1280x1600) and mobile (390x844).'),
        full_page: z.boolean().optional().describe('Capture the full page height (capped at 4000px) instead of the viewport. Defaults to false.'),
        quality: z.number().int().min(30).max(80).optional().describe('JPEG quality 30-80. Defaults to 60. Lower it if responses are too large.'),
      },
      async ({ published_url, path, paths, viewports, full_page, quality }) => {
        if (!this.env.BROWSER) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ ok: false, error: { code: 'BROWSER_RENDERING_UNAVAILABLE', message: 'Browser Rendering binding is not configured for this deployment.' } }) }],
            isError: true,
          };
        }

        const requestedPaths = paths && paths.length > 0 ? paths : [path];
        const targets: Array<{ path: string | undefined; url: string }> = [];
        for (const requestedPath of requestedPaths) {
          const target = buildCaptureTarget(published_url, requestedPath);
          if (!target.ok) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify({ ok: false, error: { code: 'INVALID_CAPTURE_TARGET', message: target.error } }) }],
              isError: true,
            };
          }
          targets.push({ path: requestedPath, url: target.url });
        }

        const jpegQuality = clampScreenshotQuality(quality);
        const resolvedViewports = resolveViewports(viewports);

        // Keep responses inspectable: cap the total images per call.
        if (targets.length * resolvedViewports.length > 4) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ ok: false, error: { code: 'TOO_MANY_CAPTURES', message: `Requested ${targets.length} paths x ${resolvedViewports.length} viewports = ${targets.length * resolvedViewports.length} images; the cap is 4 per call. Use fewer paths or a single viewport, or split into multiple calls.` } }) }],
            isError: true,
          };
        }

        const captures: Array<{ url: string; viewport: string; width: number; height: number; bytes: number; error?: string }> = [];
        const content: Array<
          | { type: 'text'; text: string }
          | { type: 'image'; data: string; mimeType: string }
        > = [];

        const browser = await puppeteer.launch(this.env.BROWSER as never);
        try {
          for (const target of targets) {
          for (const viewport of resolvedViewports) {
            try {
              const page = await browser.newPage();
              await page.setViewport({ width: viewport.width, height: viewport.height });
              await page.goto(target.url, {
                waitUntil: 'networkidle0',
                timeout: SCREENSHOT_NAVIGATION_TIMEOUT_MS,
              });

              // Prime reveal animations on every capture (Webflow IX2/GSAP
              // elements start at opacity 0 until load/scroll triggers fire):
              // step through the page so reveals run, then return to the top
              // and let entrance animations settle. Viewport captures use a
              // short pass; full-page captures walk the whole (capped) page.
              // String-form evaluate keeps the worker typecheckable without
              // the DOM lib — this code runs in the remote browser.
              await page.evaluate(`(async () => {
                const step = Math.max(window.innerHeight, 400);
                const max = Math.min(document.documentElement.scrollHeight, ${SCREENSHOT_MAX_FULL_PAGE_HEIGHT});
                const steps = Math.min(Math.ceil(max / step), ${full_page ? 16 : 3});
                for (let i = 1; i <= steps; i++) {
                  window.scrollTo(0, i * step);
                  await new Promise((r) => setTimeout(r, 250));
                }
                window.scrollTo(0, 0);
                await new Promise((r) => setTimeout(r, 700));
              })()`);

              let clip: { x: number; y: number; width: number; height: number } | undefined;
              if (full_page) {
                const pageHeight = await page.evaluate('document.documentElement.scrollHeight');
                clip = {
                  x: 0,
                  y: 0,
                  width: viewport.width,
                  height: Math.min(Number(pageHeight) || viewport.height, SCREENSHOT_MAX_FULL_PAGE_HEIGHT),
                };
              }

              const shot = (await page.screenshot({
                type: 'jpeg',
                quality: jpegQuality,
                ...(clip ? { clip, captureBeyondViewport: true } : {}),
              })) as Buffer;
              await page.close();

              const bytes = shot.byteLength;
              captures.push({ url: target.url, viewport: viewport.name, width: viewport.width, height: clip?.height ?? viewport.height, bytes });
              content.push({ type: 'image', data: shot.toString('base64'), mimeType: 'image/jpeg' });
            } catch (error) {
              captures.push({
                url: target.url,
                viewport: viewport.name,
                width: viewport.width,
                height: viewport.height,
                bytes: 0,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
          }
        } finally {
          await browser.close().catch(() => {});
        }

        const anySuccess = captures.some((c) => !c.error);
        content.unshift({
          type: 'text',
          text: JSON.stringify(
            {
              ok: anySuccess,
              data: {
                urls: targets.map((t) => t.url),
                jpegQuality,
                fullPage: Boolean(full_page),
                captures,
                evidenceLabel: 'Auto/Partial',
                note: 'Screenshots are review evidence for reviewer-supported visual assessment, not an official visual-quality decision.',
              },
            },
            null,
            2,
          ),
        });

        return { content, ...(anySuccess ? {} : { isError: true }) };
      },
    );
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

function unauthorized(origin: string, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code: 'UNAUTHORIZED', message } }), {
    status: 401,
    headers: {
      ...JSON_HEADERS,
      'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
    },
  });
}

function forbidden(message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code: 'FORBIDDEN', message } }), {
    status: 403,
    headers: JSON_HEADERS,
  });
}

// Per-isolate cache of Clerk userId → identity so steady-state MCP traffic
// does not call the Clerk Users API on every request.
const clerkUserCache = new Map<string, { email: string | null; name: string | null }>();

async function authenticateWithClerk(
  request: Request,
  env: Env,
  origin: string,
): Promise<{ props: RequestProps } | Response> {
  if (!env.CLERK_SECRET_KEY || !env.CLERK_PUBLISHABLE_KEY) {
    return misconfiguredResponse('Clerk is not configured (CLERK_SECRET_KEY / CLERK_PUBLISHABLE_KEY missing).');
  }

  const clerk = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  });

  const requestState = await clerk.authenticateRequest(request, { acceptsToken: 'oauth_token' });
  if (!requestState.isAuthenticated) {
    return unauthorized(origin, 'Missing or invalid OAuth access token.');
  }

  const auth = requestState.toAuth() as { userId: string | null };
  if (!auth.userId) {
    return unauthorized(origin, 'OAuth token is not associated with a user.');
  }

  let identity = clerkUserCache.get(auth.userId);
  if (!identity) {
    const user = await clerk.users.getUser(auth.userId);
    const primaryEmail =
      user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId) ?? user.emailAddresses[0];
    identity = {
      email: primaryEmail?.emailAddress ?? null,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
    };
    clerkUserCache.set(auth.userId, identity);
  }

  const access = resolveOAuthAccess({
    email: identity.email,
    allowedDomain: allowedDomain(env),
    allowedEmails: parseAllowedEmails(env.OAUTH_ALLOWED_EMAILS),
    directory: parseReviewerDirectory(env.REVIEWER_DIRECTORY_JSON),
  });

  if (!access.allowed) {
    const messages = {
      missing_email: 'Your account has no email address Clerk can share.',
      domain_not_allowed: `Template Review MCP is limited to @${allowedDomain(env)} accounts.`,
      email_not_allowlisted: 'You are not on the Template Review access list. Ask the review team lead to add you.',
    } as const;
    return forbidden(messages[access.reason]);
  }

  return {
    props: {
      authMode: 'oauth',
      accountId: access.reviewerProfile?.accountId ?? `oauth:${access.email}`,
      email: access.email,
      name: identity.name,
      scopes: access.scopes,
    },
  };
}

function protectedResourceResponse(env: Env, origin: string, resourcePath: string): Response {
  const authorizationServer = clerkFrontendApiFromPublishableKey(env.CLERK_PUBLISHABLE_KEY);
  if (!authorizationServer) {
    return misconfiguredResponse('CLERK_PUBLISHABLE_KEY is missing or malformed; cannot advertise the authorization server.');
  }
  return new Response(
    JSON.stringify(buildProtectedResourceMetadata({ resourceOrigin: origin, resourcePath, authorizationServer }), null, 2),
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
      return protectedResourceResponse(env, url.origin, resourcePath);
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

      // Everyone else authenticates with a Clerk-issued OAuth token.
      const result = await authenticateWithClerk(request, env, url.origin);
      if (result instanceof Response) return result;
      return serve.fetch(request, env, { ...ctx, props: result.props });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify(
          {
            name: 'webflow-template-review-mcp',
            version: '1.0.0',
            description:
              'Webflow Template Review MCP — Airtable-scoped review workflows for template Assets + Asset Versions',
            auth: {
              modes: {
                oauth: {
                  flow: 'OAuth 2.1 + PKCE with Dynamic Client Registration (Clerk authorization server)',
                  authorizationServer: clerkFrontendApiFromPublishableKey(env.CLERK_PUBLISHABLE_KEY),
                  configured: Boolean(env.CLERK_SECRET_KEY && env.CLERK_PUBLISHABLE_KEY),
                  discovery: '/.well-known/oauth-protected-resource',
                  scopes: [SCOPE_READ, SCOPE_WRITE],
                },
                legacy: {
                  flow: 'Shared bearer token (hub bridges only)',
                  header: 'Authorization: Bearer <MCP_API_KEY>',
                  configured: Boolean(env.MCP_API_KEY),
                },
              },
            },
            endpoints: { mcp: '/mcp', sse: '/sse' },
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
