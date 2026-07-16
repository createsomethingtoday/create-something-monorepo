import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { CanvaClientBindingService } from '../src/client-binding-service.js';
import { ComposioCanvaGateway } from '../src/composio-gateway.js';
import {
  CanvaClientBindingObject,
  DurableCanvaBindingStore,
} from '../src/durable-binding-store.js';
import {
  authenticateOperatorRequest,
  buildCanvaProtectedResourceMetadata,
  parseAllowedEmails,
} from '../src/operator-auth.js';
import { createCanvaOperatorMcpServer } from '../src/server.js';

export { CanvaClientBindingObject };

export interface Env {
  CANVA_BINDING: DurableObjectNamespace;
  COMPOSIO_API_KEY?: string;
  COMPOSIO_CANVA_AUTH_CONFIG_ID?: string;
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
      return json(buildCanvaProtectedResourceMetadata({ origin: url.origin, issuer }));
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        name: 'canva-client-operator-mcp',
        version: '0.1.0',
        status: 'ok',
        auth: {
          claudeOAuthConfigured: Boolean(identityIssuer(env)),
          operatorAllowlistConfigured: Boolean(env.OAUTH_ALLOWED_EMAILS?.trim()),
        },
        downstream: {
          composioConfigured: Boolean(env.COMPOSIO_API_KEY?.trim()),
          clientIdentityConfigured: Boolean(env.COMPOSIO_CLIENT_USER_ID?.trim()),
          toolkit: 'canva',
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
    if (!apiKey || !composioUserId || !env.CANVA_BINDING) {
      return json(
        {
          error: {
            code: 'misconfigured',
            message:
              'COMPOSIO_API_KEY, COMPOSIO_CLIENT_USER_ID, and CANVA_BINDING are required.',
          },
        },
        500,
      );
    }

    try {
      const objectId = env.CANVA_BINDING.idFromName(composioUserId);
      const store = new DurableCanvaBindingStore(env.CANVA_BINDING.get(objectId));
      const gateway = new ComposioCanvaGateway({
        apiKey,
        authConfigId: env.COMPOSIO_CANVA_AUTH_CONFIG_ID,
      });
      const service = new CanvaClientBindingService({ store, gateway, composioUserId });
      const server = await createCanvaOperatorMcpServer({
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
