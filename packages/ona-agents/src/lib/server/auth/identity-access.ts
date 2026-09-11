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
import { safeAgentReturnPath } from './return-path';

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
    const returnPath =
      context.url.pathname === '/sign-in'
        ? safeAgentReturnPath(context.url.searchParams.get('redirect'))
        : safeAgentReturnPath(`${context.url.pathname}${context.url.search}`);
    target.searchParams.set('redirect', returnPath);
    return target.pathname.startsWith('/') && target.origin === context.url.origin
      ? `${target.pathname}${target.search}`
      : target.toString();
  } catch {
    return '/sign-in';
  }
}

function applicationAudience(context: IdentityAccessContext): string | null {
  const value = readRuntimeEnv(context.platform, 'CS_IDENTITY_AUDIENCE')?.trim();
  return value && !value.includes(',') ? value : null;
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
  const audience = applicationAudience(context);

  if (previewEnabled) {
    return resolveApplicationAccess({
      request: context.request,
      signInUrl,
      verification: {
        issuer: issuer || 'https://preview.invalid',
        jwksUrl: jwksUrl || 'https://preview.invalid/.well-known/jwks.json',
        audience: audience || 'preview'
      },
      policy: {},
      preview: { enabled: true, environment }
    });
  }

  if (!issuer || !jwksUrl || !audience) {
    return makeUnconfiguredState(signInUrl, 'First-party identity verification requires exactly one application audience.');
  }

  return resolveApplicationAccess({
    request: context.request,
    signInUrl,
    verification: {
      issuer,
      jwksUrl,
      audience,
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
