import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from 'jose';

import type { ControlActor, ControlActorRole, ControlScope } from './control.js';

export interface ControlRequestContext {
  scope: ControlScope;
  actor: ControlActor;
  credentialSource: 'bearer';
  schedulerActivationId?: string;
}

export interface ControlIdentityResolver {
  resolve(request: Request): Promise<ControlRequestContext | undefined>;
}

export class ControlIdentityConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ControlIdentityConfigurationError';
  }
}

export class ControlIdentityUnavailableError extends Error {
  constructor() {
    super('Control identity verification is temporarily unavailable');
    this.name = 'ControlIdentityUnavailableError';
  }
}

function identityInfrastructureFailure(error: unknown): boolean {
  return (
    error instanceof errors.JWKSTimeout ||
    error instanceof errors.JWKSInvalid ||
    (error instanceof errors.JOSEError && error.code === 'ERR_JOSE_GENERIC') ||
    !(error instanceof errors.JOSEError)
  );
}

function tokenFromRequest(
  request: Request
): { token: string; source: ControlRequestContext['credentialSource'] } | undefined {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (token) return { token, source: 'bearer' };
  return undefined;
}

function claim(payload: JWTPayload, names: string[]): string | undefined {
  for (const name of names) {
    const value = payload[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function roles(payload: JWTPayload): string[] {
  const found = new Set<string>();
  for (const name of ['role', 'org_role', 'organization_role']) {
    const value = payload[name];
    if (typeof value === 'string' && value.trim()) found.add(value.trim());
  }
  if (Array.isArray(payload.roles)) {
    for (const value of payload.roles) {
      if (typeof value === 'string' && value.trim()) found.add(value.trim());
    }
  }
  return [...found];
}

const acceptedRoles = new Set<ControlActorRole>([
  'account_owner',
  'agency_operator',
  'account_reader',
  'control_scheduler'
]);

function controlRole(payload: JWTPayload): ControlActorRole | undefined {
  for (const role of roles(payload)) {
    if (acceptedRoles.has(role as ControlActorRole)) return role as ControlActorRole;
  }
  return undefined;
}

export class FirstPartyControlIdentity implements ControlIdentityResolver {
  private readonly jwks;
  private readonly audiences: string[];

  constructor(
    private readonly config: {
      issuer: string;
      jwksUrl: string;
      audience: string | string[];
    }
  ) {
    const issuer = config.issuer.trim().replace(/\/+$/, '');
    const jwksUrl = config.jwksUrl.trim();
    this.audiences = (Array.isArray(config.audience) ? config.audience : config.audience.split(','))
      .map((value) => value.trim().replace(/\/+$/, ''))
      .filter(Boolean);
    if (!issuer || !jwksUrl || this.audiences.length === 0) {
      throw new ControlIdentityConfigurationError(
        'Control identity requires an exact issuer, JWKS URL, and audience'
      );
    }
    this.config = { ...config, issuer };
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  async resolve(request: Request): Promise<ControlRequestContext | undefined> {
    const credential = tokenFromRequest(request);
    if (!credential) return undefined;
    try {
      const { payload } = await jwtVerify(credential.token, this.jwks, {
        issuer: this.config.issuer,
        audience: this.audiences,
        algorithms: ['ES256', 'RS256']
      });
      if (!payload.sub?.trim()) return undefined;
      const accountId = claim(payload, ['account_id']);
      const tenantId = claim(payload, ['tenant_id', 'org_id', 'organization_id']);
      const workspaceAccountId = claim(payload, ['workspace_account_id']);
      const role = controlRole(payload);
      if (!accountId || !tenantId || !workspaceAccountId || !role) return undefined;
      const schedulerActivationId = claim(payload, ['activation_id']);
      if (role === 'control_scheduler' && !schedulerActivationId) return undefined;
      return {
        scope: { accountId, tenantId, workspaceAccountId },
        actor: { subject: payload.sub.trim(), role },
        credentialSource: credential.source,
        ...(schedulerActivationId ? { schedulerActivationId } : {})
      };
    } catch (error) {
      if (identityInfrastructureFailure(error)) throw new ControlIdentityUnavailableError();
      return undefined;
    }
  }
}
