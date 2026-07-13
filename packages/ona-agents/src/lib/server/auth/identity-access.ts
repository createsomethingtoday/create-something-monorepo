import {
  resolveApplicationAccess,
  type ApplicationAccessState
} from '@create-something/canon/auth/access';
import {
  isAuthPreviewAccessEnabled,
  isProductionRuntime,
  parseBooleanFlag,
  readRuntimeEnv,
  readRuntimeList
} from '../runtime';

export interface IdentityAccessContext {
  fetch?: typeof globalThis.fetch;
  platform?: App.Platform;
  request: Request;
  url: URL;
}

function makeUnconfiguredState(signInUrl: string, reason: string): ApplicationAccessState {
  return {
    status: 'unconfigured',
    source: 'none',
    signInUrl,
    subject: null,
    email: null,
    tenantId: null,
    roles: [],
    reason,
    detail: 'Configure the first-party identity issuer, audience, JWKS, and app allow rules.'
  };
}

function buildSignInUrl(context: IdentityAccessContext): string {
  const rawUrl = readRuntimeEnv(context.platform, 'CS_AUTH_SIGN_IN_URL')?.trim() || '/sign-in';
  try {
    const target = new URL(rawUrl, context.url.origin);
    target.searchParams.set('redirect', `${context.url.pathname}${context.url.search}`);
    return target.pathname.startsWith('/') && target.origin === context.url.origin
      ? `${target.pathname}${target.search}`
      : target.toString();
  } catch {
    return '/sign-in';
  }
}

export async function getIdentityAccessState(
  context: IdentityAccessContext
): Promise<ApplicationAccessState> {
  const signInUrl = buildSignInUrl(context);
  const environment = isProductionRuntime(context.platform) ? 'production' : 'development';
  const previewEnabled = isAuthPreviewAccessEnabled(context.platform);
  const issuer = readRuntimeEnv(context.platform, 'CS_IDENTITY_ISSUER')?.trim()?.replace(/\/+$/, '');
  const jwksUrl =
    readRuntimeEnv(context.platform, 'CS_IDENTITY_JWKS_URL')?.trim() ||
    (issuer ? `${issuer}/.well-known/jwks.json` : undefined);
  const audiences = readRuntimeList(context.platform, 'CS_IDENTITY_AUDIENCE');

  if (previewEnabled) {
    return resolveApplicationAccess({
      request: context.request,
      signInUrl,
      verification: {
        issuer: issuer || 'https://preview.invalid',
        jwksUrl: jwksUrl || 'https://preview.invalid/.well-known/jwks.json',
        audience: audiences
      },
      policy: {},
      preview: { enabled: true, environment }
    });
  }

  if (!issuer || !jwksUrl || audiences.length === 0) {
    return makeUnconfiguredState(signInUrl, 'First-party identity verification is not configured.');
  }

  return resolveApplicationAccess({
    request: context.request,
    signInUrl,
    verification: {
      issuer,
      jwksUrl,
      audience: audiences,
      fetch: context.fetch
    },
    policy: {
      allowedSubjects: readRuntimeList(context.platform, 'CS_AUTH_ALLOWED_SUBJECTS'),
      allowedEmails: readRuntimeList(context.platform, 'CS_AUTH_ALLOWED_EMAILS'),
      allowedEmailDomains: readRuntimeList(context.platform, 'CS_AUTH_ALLOWED_EMAIL_DOMAINS'),
      allowedTenantIds: readRuntimeList(context.platform, 'CS_AUTH_ALLOWED_TENANT_IDS'),
      allowedRoles: readRuntimeList(context.platform, 'CS_AUTH_ALLOWED_ROLES'),
      allowAnyAuthenticated:
        parseBooleanFlag(readRuntimeEnv(context.platform, 'CS_AUTH_ALLOW_ANY_AUTHENTICATED')) === true
    }
  });
}
