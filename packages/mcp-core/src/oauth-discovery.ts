export interface OAuthDiscoveryOptions {
  issuer: string;
  resourcePath?: string;
  scopesSupported?: string[];
  responseTypesSupported?: string[];
  grantTypesSupported?: string[];
  tokenEndpointAuthMethodsSupported?: string[];
  codeChallengeMethodsSupported?: string[];
}

const DEFAULT_RESOURCE_PATH = '/mcp';
const DEFAULT_SCOPES = ['openid', 'profile', 'email', 'mcp', 'offline_access'];
const DEFAULT_RESPONSE_TYPES = ['code'];
const DEFAULT_GRANT_TYPES = ['authorization_code', 'refresh_token'];
const DEFAULT_AUTH_METHODS = ['none', 'client_secret_post'];
const DEFAULT_CODE_CHALLENGE_METHODS = ['S256', 'plain'];

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, '');
}

function normalizePath(path: string): string {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/';
}

export function isOAuthAuthorizationServerPath(pathname: string): boolean {
  return (
    pathname === '/.well-known/oauth-authorization-server'
    || pathname === '/.well-known/oauth-authorization-server/mcp'
    || pathname === '/mcp/.well-known/oauth-authorization-server'
    || pathname === '/mcp/.well-known/oauth-authorization-server/mcp'
  );
}

export function isOAuthProtectedResourcePath(pathname: string): boolean {
  return (
    pathname === '/.well-known/oauth-protected-resource'
    || pathname === '/.well-known/oauth-protected-resource/mcp'
    || pathname === '/mcp/.well-known/oauth-protected-resource'
    || pathname === '/mcp/.well-known/oauth-protected-resource/mcp'
  );
}

export function buildOAuthAuthorizationServerMetadata(
  origin: string,
  options: OAuthDiscoveryOptions,
): Record<string, unknown> {
  const issuer = normalizeOrigin(options.issuer);
  const resourcePath = normalizePath(options.resourcePath ?? DEFAULT_RESOURCE_PATH);
  const resource = `${normalizeOrigin(origin)}${resourcePath}`;

  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    userinfo_endpoint: `${issuer}/oauth/userinfo`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    scopes_supported: options.scopesSupported ?? DEFAULT_SCOPES,
    response_types_supported: options.responseTypesSupported ?? DEFAULT_RESPONSE_TYPES,
    grant_types_supported: options.grantTypesSupported ?? DEFAULT_GRANT_TYPES,
    token_endpoint_auth_methods_supported:
      options.tokenEndpointAuthMethodsSupported ?? DEFAULT_AUTH_METHODS,
    code_challenge_methods_supported:
      options.codeChallengeMethodsSupported ?? DEFAULT_CODE_CHALLENGE_METHODS,
    resource,
    mcp_resource: resource,
  };
}

export function buildOAuthProtectedResourceMetadata(
  origin: string,
  options: OAuthDiscoveryOptions,
): Record<string, unknown> {
  const issuer = normalizeOrigin(options.issuer);
  const resourcePath = normalizePath(options.resourcePath ?? DEFAULT_RESOURCE_PATH);
  const resource = `${normalizeOrigin(origin)}${resourcePath}`;

  return {
    resource,
    authorization_servers: [issuer],
    bearer_methods_supported: ['header'],
    scopes_supported: options.scopesSupported ?? DEFAULT_SCOPES,
  };
}
