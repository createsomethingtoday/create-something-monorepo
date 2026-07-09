import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { createClerkClient } from '@clerk/backend';
import { enableTelemetry } from '@create-something/mcp-core';

import { misconfiguredResponse } from '../src/auth.js';
import { AirtableClient } from '../src/airtable.js';
import { DEFAULT_AIRTABLE_BASE_ID, TABLE_IDS } from '../src/schema.js';
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
import { registerTools } from '../src/tools.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  MCP_ACCOUNT_ID?: string;
  MCP_API_KEY?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  REVIEWER_DIRECTORY_JSON?: string;
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
      { allowWrites },
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
