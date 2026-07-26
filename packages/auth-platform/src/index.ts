export const AUTH_PLATFORM_SCHEMA = 'https://createsomething.agency/schemas/auth-platform/v1';
export const AUTH_PLATFORM_VERSION = '1.0.0';
export const PRODUCTION_IDENTITY_ORIGIN = 'https://id.createsomething.space';

export type AuthIntegrationInput = {
  environment: 'development' | 'preview' | 'production';
  issuer?: string;
  jwksUrl?: string;
  audiences?: string[];
  allowSubjects?: string[];
  allowEmails?: string[];
  allowEmailDomains?: string[];
  allowTenants?: string[];
  allowRoles?: string[];
  allowAnyAuthenticated?: boolean;
  preview?: boolean;
  hasSecretMaterial?: boolean;
};

export type AuthIntegrationValidation = {
  schema: typeof AUTH_PLATFORM_SCHEMA;
  version: typeof AUTH_PLATFORM_VERSION;
  status: 'ready' | 'blocked';
  errors: string[];
  warnings: string[];
  normalized: { issuer: string | null; jwksUrl: string | null; audiences: string[]; policyDimensions: string[]; preview: boolean };
  mutationPerformed: false;
};

const operation = (operationId: string, summary: string, security = false) => ({
  operationId,
  summary,
  ...(security ? { security: [{ bearerAuth: [] }] } : {}),
  responses: {
    '200': { description: 'Success' },
    '400': { description: 'Invalid request' },
    ...(security ? { '401': { description: 'Authentication required' } } : {}),
  },
});

export function createAuthPlatformContract(origin = PRODUCTION_IDENTITY_ORIGIN) {
  const issuer = normalizeOrigin(origin);
  return {
    schema: AUTH_PLATFORM_SCHEMA,
    version: AUTH_PLATFORM_VERSION,
    name: 'CREATE SOMETHING Auth Platform',
    architecture: 'ai-native-api-mcp-first',
    issuer,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    openapi_uri: `${issuer}/v1/auth/openapi.json`,
    endpoints: {
      signup: `${issuer}/v1/auth/signup`, login: `${issuer}/v1/auth/login`,
      player_login: `${issuer}/v1/auth/player-login`,
      refresh: `${issuer}/v1/auth/refresh`, logout: `${issuer}/v1/auth/logout`,
      me: `${issuer}/v1/users/me`,
    },
    jwt: { algorithms: ['ES256'], verification: ['signature', 'issuer', 'audience', 'expiration'] },
    policy_dimensions: ['subject', 'email', 'email_domain', 'tenant', 'role', 'allow_any_authenticated'],
    mcp: {
      resources: ['auth://platform/contract', 'auth://platform/openapi'],
      tools: ['auth_config_validate'],
      mutations: [],
    },
    reference_adapters: ['@create-something/canon/auth', '@create-something/canon/auth/server'],
    safety: {
      agent_can_issue_credentials: false, agent_can_grant_access: false,
      agent_can_rotate_secrets: false, secrets_accepted_by_validator: false,
      production_changes_require_approval: true,
    },
  } as const;
}

export function createAuthOpenApi(origin = PRODUCTION_IDENTITY_ORIGIN) {
  const issuer = normalizeOrigin(origin);
  return {
    openapi: '3.1.0',
    info: {
      title: 'CREATE SOMETHING Auth API', version: AUTH_PLATFORM_VERSION,
      description: 'Owned identity API. Agents can discover this contract; credential and access mutations require the owning application workflow.',
    },
    servers: [{ url: issuer }],
    paths: {
      '/v1/auth/signup': { post: operation('signup', 'Create a password identity') },
      '/v1/auth/login': { post: operation('login', 'Exchange credentials for a session') },
      '/v1/auth/player-login': { post: operation('playerLogin', 'Exchange a player code and passphrase for a Guard-scoped session') },
      '/v1/auth/refresh': { post: operation('refreshSession', 'Rotate a refresh token and session') },
      '/v1/auth/logout': { post: operation('logout', 'Revoke a refresh token') },
      '/v1/users/me': { get: operation('getCurrentUser', 'Read the current identity', true) },
    },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    'x-create-something': {
      schema: AUTH_PLATFORM_SCHEMA,
      mcp_resources: ['auth://platform/contract', 'auth://platform/openapi'],
      mutation_boundary: 'No credential issuance, access grants, or secret rotation through the discovery MCP.',
    },
  } as const;
}

export function validateAuthIntegration(input: AuthIntegrationInput): AuthIntegrationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const issuer = normalizeOptionalUrl(input.issuer, 'issuer', errors);
  const derivedJwks = issuer ? `${issuer}/.well-known/jwks.json` : null;
  const jwksUrl = input.jwksUrl ? normalizeOptionalUrl(input.jwksUrl, 'JWKS URL', errors) : derivedJwks;
  const audiences = cleanList(input.audiences);
  const policyDimensions = [
    ['subject', input.allowSubjects], ['email', input.allowEmails],
    ['email_domain', input.allowEmailDomains], ['tenant', input.allowTenants], ['role', input.allowRoles],
  ].filter(([, values]) => cleanList(values as string[] | undefined).length > 0).map(([name]) => name as string);

  if (!issuer) errors.push('A valid HTTPS issuer is required.');
  if (!jwksUrl) errors.push('A valid JWKS URL is required or must be derivable from the issuer.');
  if (audiences.length === 0) errors.push('At least one token audience is required.');
  if (policyDimensions.length === 0 && !input.allowAnyAuthenticated) errors.push('At least one explicit application allow rule is required.');
  if (input.environment === 'production' && input.preview) errors.push('Authentication preview cannot be enabled in production.');
  if (input.hasSecretMaterial) errors.push('Do not send passwords, tokens, keys, or other secret material to this validator.');
  if (input.allowAnyAuthenticated) warnings.push('allowAnyAuthenticated permits every cryptographically valid identity.');
  if (input.environment !== 'production' && input.preview) warnings.push('Preview bypass is active and must not be promoted to production.');

  return {
    schema: AUTH_PLATFORM_SCHEMA, version: AUTH_PLATFORM_VERSION,
    status: errors.length === 0 ? 'ready' : 'blocked', errors, warnings,
    normalized: { issuer, jwksUrl, audiences, policyDimensions, preview: input.preview === true },
    mutationPerformed: false,
  };
}

function normalizeOrigin(value: string): string { return value.replace(/\/+$/, ''); }
function normalizeOptionalUrl(value: string | undefined, label: string, errors: string[]): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') { errors.push(`${label} must use HTTPS.`); return null; }
    return normalizeOrigin(url.href);
  } catch { errors.push(`${label} must be a valid URL.`); return null; }
}
function cleanList(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}
