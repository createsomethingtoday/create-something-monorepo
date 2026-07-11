import {
  resolveApplicationAccess,
  type ApplicationAccessState
} from '@create-something/canon/auth/access';
import type { GuardAccessScope } from './scope.js';

export interface GuardAccessConfig {
  operatorSubjects: string[];
  playerBindings: ReadonlyMap<string, string>;
}

export interface GuardApplicationAccess extends ApplicationAccessState {
  scope: GuardAccessScope | null;
}

export type RuntimeEnv = Record<string, string | undefined>;

function list(value: string | undefined): string[] {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}

function flag(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() ?? '');
}

export function parseGuardAccessConfig(env: RuntimeEnv): GuardAccessConfig {
  const operatorSubjects = list(env.GUARD_LAB_OPERATOR_SUBJECTS);
  let rawBindings: unknown = {};
  if (env.GUARD_LAB_PLAYER_BINDINGS?.trim()) {
    try {
      rawBindings = JSON.parse(env.GUARD_LAB_PLAYER_BINDINGS);
    } catch {
      throw new Error('GUARD_LAB_PLAYER_BINDINGS must be a JSON object of subject to player ID.');
    }
  }
  if (!rawBindings || Array.isArray(rawBindings) || typeof rawBindings !== 'object') {
    throw new Error('GUARD_LAB_PLAYER_BINDINGS must be a JSON object of subject to player ID.');
  }

  const playerBindings = new Map<string, string>();
  for (const [subject, playerId] of Object.entries(rawBindings)) {
    if (!subject.trim() || typeof playerId !== 'string' || !playerId.trim()) {
      throw new Error('Every Guard Lab player binding requires a non-empty subject and player ID.');
    }
    if (operatorSubjects.includes(subject.trim())) {
      throw new Error(`Guard Lab subject ${subject.trim()} cannot be both operator and player.`);
    }
    playerBindings.set(subject.trim(), playerId.trim());
  }
  return { operatorSubjects, playerBindings };
}

export function bindGuardIdentity(subject: string, config: GuardAccessConfig): GuardAccessScope | null {
  if (config.operatorSubjects.includes(subject)) return { role: 'operator', subject };
  const playerId = config.playerBindings.get(subject);
  return playerId ? { role: 'player', playerId, subject } : null;
}

function unconfigured(signInUrl: string, reason: string): GuardApplicationAccess {
  return {
    status: 'unconfigured',
    source: 'none',
    signInUrl,
    subject: null,
    email: null,
    tenantId: null,
    roles: [],
    reason,
    detail: reason,
    scope: null
  };
}

function signInUrlFor(url: URL, configured: string | undefined): string {
  const target = new URL(configured?.trim() || '/sign-in', url.origin);
  target.searchParams.set('redirect', `${url.pathname}${url.search}`);
  return target.origin === url.origin ? `${target.pathname}${target.search}` : target.toString();
}

function developmentScope(value: string | undefined): GuardAccessScope | null {
  const raw = value?.trim();
  if (raw === 'operator') return { role: 'operator', subject: 'local-preview' };
  if (raw?.startsWith('player:') && raw.slice('player:'.length).trim()) {
    return { role: 'player', playerId: raw.slice('player:'.length).trim(), subject: 'local-preview' };
  }
  return null;
}

export async function resolveGuardApplicationAccess(input: {
  request: Request;
  url: URL;
  env: RuntimeEnv;
  fetch?: typeof globalThis.fetch;
}): Promise<GuardApplicationAccess> {
  const signInUrl = signInUrlFor(input.url, input.env.CS_AUTH_SIGN_IN_URL);
  let config: GuardAccessConfig;
  try {
    config = parseGuardAccessConfig(input.env);
  } catch (error) {
    return unconfigured(signInUrl, error instanceof Error ? error.message : 'Guard Lab access bindings are invalid.');
  }

  const environment = input.env.ENVIRONMENT === 'production' ? 'production' : 'development';
  if (flag(input.env.ALLOW_CS_AUTH_PREVIEW)) {
    const scope = developmentScope(input.env.GUARD_LAB_DEV_SCOPE);
    if (!scope) return unconfigured(signInUrl, 'Preview access requires an explicit GUARD_LAB_DEV_SCOPE.');
    const preview = await resolveApplicationAccess({
      request: input.request,
      signInUrl,
      verification: {
        issuer: input.env.CS_IDENTITY_ISSUER || 'https://preview.invalid',
        jwksUrl: input.env.CS_IDENTITY_JWKS_URL || 'https://preview.invalid/.well-known/jwks.json',
        audience: list(input.env.CS_IDENTITY_AUDIENCE)
      },
      policy: {},
      preview: { enabled: true, environment }
    });
    return { ...preview, scope: preview.status === 'allowed' ? scope : null };
  }

  const issuer = input.env.CS_IDENTITY_ISSUER?.trim().replace(/\/+$/, '');
  const audience = list(input.env.CS_IDENTITY_AUDIENCE);
  const jwksUrl = input.env.CS_IDENTITY_JWKS_URL?.trim() || (issuer ? `${issuer}/.well-known/jwks.json` : undefined);
  const allowedSubjects = [...config.operatorSubjects, ...config.playerBindings.keys()];
  if (!issuer || !jwksUrl || audience.length === 0 || allowedSubjects.length === 0) {
    return unconfigured(signInUrl, 'Guard Lab requires identity verification plus at least one explicit subject binding.');
  }

  const access = await resolveApplicationAccess({
    request: input.request,
    signInUrl,
    verification: { issuer, jwksUrl, audience, fetch: input.fetch },
    policy: { allowedSubjects }
  });
  const scope = access.status === 'allowed' && access.subject
    ? bindGuardIdentity(access.subject, config)
    : null;
  if (access.status === 'allowed' && !scope) {
    return { ...access, status: 'blocked', reason: 'Verified identity has no Guard Lab binding.', detail: 'Ask an operator to bind this subject explicitly.', scope: null };
  }
  return { ...access, scope };
}

export function runtimeEnv(platform?: App.Platform): RuntimeEnv {
  const platformEnv = platform?.env as RuntimeEnv | undefined;
  const processEnv = typeof process !== 'undefined' ? process.env : undefined;
  return new Proxy({}, {
    get: (_target, key: string) => processEnv?.[key] ?? platformEnv?.[key]
  }) as RuntimeEnv;
}

export function deniedAccessResponse(access: GuardApplicationAccess): Response {
  const status = access.status === 'blocked' ? 403
    : access.status === 'unconfigured' ? 503
    : 401;
  return Response.json({
    ok: false,
    error: access.reason,
    signInUrl: access.signInUrl
  }, { status });
}
