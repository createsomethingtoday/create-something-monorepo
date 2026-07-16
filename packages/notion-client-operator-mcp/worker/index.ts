import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { NotionClientBindingService } from '../src/client-binding-service.js';
import { ComposioNotionGateway } from '../src/composio-gateway.js';
import {
  NotionClientBindingObject,
  DurableNotionBindingStore,
} from '../src/durable-binding-store.js';
import {
  authenticateOperatorRequest,
  buildNotionProtectedResourceMetadata,
  parseAllowedEmails,
} from '../src/operator-auth.js';
import { createNotionOperatorMcpServer } from '../src/server.js';

export { NotionClientBindingObject };

export interface Env {
  NOTION_BINDING: DurableObjectNamespace;
  COMPOSIO_API_KEY?: string;
  COMPOSIO_NOTION_AUTH_CONFIG_ID?: string;
  COMPOSIO_CLIENT_USER_ID?: string;
  CS_IDENTITY_ISSUER?: string;
  OAUTH_ALLOWED_EMAIL_DOMAIN?: string;
  OAUTH_ALLOWED_EMAILS?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version',
};

const worker = {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/.well-known/oauth-protected-resource') {
      const issuer = identityIssuer(env);
      if (!issuer) return json({ error: 'CS_IDENTITY_ISSUER is required.' }, 500);
      return json(buildNotionProtectedResourceMetadata({ origin: url.origin, issuer }));
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        name: 'notion-client-operator-mcp',
        version: '0.1.0',
        status: 'ok',
        auth: {
          claudeOAuthConfigured: Boolean(identityIssuer(env)),
          operatorAllowlistConfigured: Boolean(env.OAUTH_ALLOWED_EMAILS?.trim()),
        },
        downstream: {
          composioConfigured: Boolean(env.COMPOSIO_API_KEY?.trim()),
          clientIdentityConfigured: Boolean(env.COMPOSIO_CLIENT_USER_ID?.trim()),
          toolkit: 'notion',
        },
        endpoints: {
          mcp: '/mcp',
          discovery: '/.well-known/oauth-protected-resource',
        },
      });
    }

    if (url.pathname !== '/mcp') {
      return withCors(new Response('Not found', { status: 404 }));
    }

    const issuer = identityIssuer(env);
    if (!issuer) return json({ error: 'CS_IDENTITY_ISSUER is required.' }, 500);
    const auth = await authenticateOperatorRequest({
      request,
      issuer,
      expectedResource: `${url.origin}/mcp`,
      allowedDomain: env.OAUTH_ALLOWED_EMAIL_DOMAIN?.trim() || 'createsomething.io',
      allowedEmails: parseAllowedEmails(env.OAUTH_ALLOWED_EMAILS),
    });
    if (!auth.ok) {
      if (auth.status === 401) return unauthorized(url.origin, auth.message);
      return json({ error: { code: auth.code, message: auth.message } }, auth.status);
    }

    const apiKey = env.COMPOSIO_API_KEY?.trim();
    const composioUserId = env.COMPOSIO_CLIENT_USER_ID?.trim();
    if (!apiKey || !composioUserId || !env.NOTION_BINDING) {
      return json(
        {
          error: {
            code: 'misconfigured',
            message:
              'COMPOSIO_API_KEY, COMPOSIO_CLIENT_USER_ID, and NOTION_BINDING are required.',
          },
        },
        500,
      );
    }

    try {
      const objectId = env.NOTION_BINDING.idFromName(composioUserId);
      const store = new DurableNotionBindingStore(env.NOTION_BINDING.get(objectId));
      const gateway = new ComposioNotionGateway({
        apiKey,
        authConfigId: env.COMPOSIO_NOTION_AUTH_CONFIG_ID,
      });
      const service = new NotionClientBindingService({ store, gateway, composioUserId });
      const server = await createNotionOperatorMcpServer({
        service,
        gateway,
        composioUserId,
        operator: auth.operator,
      });
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      return withCors(await transport.handleRequest(request));
    } catch (error) {
      return json(
        {
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : String(error),
          },
        },
        500,
      );
    }
  },
};

export default worker;

function identityIssuer(env: Env): string {
  return env.CS_IDENTITY_ISSUER?.trim().replace(/\/+$/, '') ?? '';
}

function unauthorized(origin: string, message: string): Response {
  return withCors(
    new Response(JSON.stringify({ error: { code: 'unauthorized', message } }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate':
          `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
      },
    }),
  );
}

function json(value: unknown, status = 200): Response {
  return withCors(Response.json(value, { status }));
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}
