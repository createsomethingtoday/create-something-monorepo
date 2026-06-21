import { AuthError, defaultPolicy } from '@create-something/mcp-core';
import type { AccountContext, AuthProvider, TokenProvider } from '@create-something/mcp-core';

import type { ZendeskAuthMode } from './services/api.js';

export interface ZendeskEnv {
  MCP_API_KEY?: string;
  ZENDESK_MCP_API_KEY?: string;
  MCP_ACCOUNT_ID?: string;
  ZENDESK_SUBDOMAIN?: string;
  WEBFLOW_ZENDESK_SUBDOMAIN?: string;
  ZENDESK_EMAIL?: string;
  WEBFLOW_ZENDESK_EMAIL?: string;
  ZENDESK_API_TOKEN?: string;
  WEBFLOW_ZENDESK_API_TOKEN?: string;
  ZENDESK_PASSWORD?: string;
  WEBFLOW_ZENDESK_PASSWORD?: string;
  ZENDESK_OAUTH_TOKEN?: string;
  WEBFLOW_ZENDESK_OAUTH_TOKEN?: string;
  ZENDESK_READ_ONLY?: string;
  MCP_TOOL_ACCESS_MODE?: string;
  ZENDESK_TIMEOUT_MS?: string;
}

export interface ZendeskAuthMetadata {
  subdomain: string;
  email?: string;
  authMode: ZendeskAuthMode;
  timeoutMs?: number;
}

export class ZendeskAuthProvider implements AuthProvider<ZendeskEnv> {
  async resolve(request: Request | null, env?: ZendeskEnv): Promise<AccountContext> {
    const source = new EnvSource(env);

    if (request) {
      validateTransportAuth(request, source);
    }

    const oauthToken = source.first('WEBFLOW_ZENDESK_OAUTH_TOKEN', 'ZENDESK_OAUTH_TOKEN');
    const apiToken = source.first('WEBFLOW_ZENDESK_API_TOKEN', 'ZENDESK_API_TOKEN');
    const password = source.first('WEBFLOW_ZENDESK_PASSWORD', 'ZENDESK_PASSWORD');
    const authMode: ZendeskAuthMode = oauthToken ? 'oauth' : apiToken ? 'api-token' : 'password';
    const token = oauthToken ?? apiToken ?? password;
    if (!token) {
      throw new AuthError(
        'Missing Zendesk credential. Set WEBFLOW_ZENDESK_API_TOKEN/ZENDESK_API_TOKEN, WEBFLOW_ZENDESK_OAUTH_TOKEN/ZENDESK_OAUTH_TOKEN, or WEBFLOW_ZENDESK_PASSWORD/ZENDESK_PASSWORD via Infisical or runtime env.',
      );
    }

    const subdomain = source.first('WEBFLOW_ZENDESK_SUBDOMAIN', 'ZENDESK_SUBDOMAIN') ?? 'webflow2579';
    const email = source.first('WEBFLOW_ZENDESK_EMAIL', 'ZENDESK_EMAIL');
    if ((authMode === 'api-token' || authMode === 'password') && !email) {
      throw new AuthError(
        'Missing Zendesk email. Basic Zendesk auth requires WEBFLOW_ZENDESK_EMAIL or ZENDESK_EMAIL.',
      );
    }

    const tokenProvider: TokenProvider = {
      getAccessToken: async () => token,
    };

    const readOnly = parseBoolean(source.first('ZENDESK_READ_ONLY')) ?? false;
    const toolAccessMode = source.first('MCP_TOOL_ACCESS_MODE');
    const timeoutMs = parsePositiveInt(source.first('ZENDESK_TIMEOUT_MS'));
    const metadata: ZendeskAuthMetadata = {
      subdomain,
      authMode,
      ...(email ? { email } : {}),
      ...(timeoutMs ? { timeoutMs } : {}),
    };

    return {
      accountId: source.first('MCP_ACCOUNT_ID') ?? 'webflow-zendesk',
      tokenProvider,
      metadata: metadata as unknown as Record<string, unknown>,
      policy: defaultPolicy({
        scopes: authMode === 'oauth' ? ['zendesk:oauth'] : [`zendesk:${authMode}`],
        readOnly,
        constraints: {
          ...(toolAccessMode ? { mcpToolAccessMode: toolAccessMode } : {}),
        },
      }),
    };
  }
}

class EnvSource {
  constructor(private readonly env?: ZendeskEnv) {}

  first(...names: Array<keyof ZendeskEnv>): string | undefined {
    for (const name of names) {
      const value = this.env?.[name] ?? process.env[name];
      if (value?.trim()) return value.trim();
    }
    return undefined;
  }
}

function validateTransportAuth(request: Request, source: EnvSource): void {
  const configured = source.first('ZENDESK_MCP_API_KEY', 'MCP_API_KEY');
  if (!configured) {
    throw new AuthError('MCP transport auth is not configured. Set ZENDESK_MCP_API_KEY or MCP_API_KEY.');
  }

  const provided = extractProvidedApiKey(request);
  if (!provided || provided !== configured) {
    throw new AuthError('Valid MCP API key required. Use Authorization: Bearer <token> or X-API-Key.');
  }
}

function extractProvidedApiKey(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return request.headers.get('x-api-key')?.trim() || null;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
