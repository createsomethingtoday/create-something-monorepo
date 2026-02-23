import type { AuthContext, HubAuthEnv } from './auth';

export type CapabilityClass = 'read' | 'write' | 'mixed';
export type RiskTier = 'low' | 'medium' | 'high';

export type RetryProfile = {
  name: string;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  retryableStatusCodes: number[];
  retryableErrorSubstrings: string[];
  nonRetryableErrorSubstrings: string[];
};

export type PolicyRule = {
  scope: string;
  server: string;
  tool: string;
};

export type HubPolicyConfig = {
  version: number;
  defaultEffect: 'allow' | 'deny';
  allow: PolicyRule[];
  deny: PolicyRule[];
  retryProfiles: Record<string, Omit<RetryProfile, 'name'>>;
};

export type ToolPolicyMetadata = {
  serverName: string;
  toolName: string;
  requiredScopes: string[];
  capabilityClass: CapabilityClass;
  riskTier: RiskTier;
  retryProfile?: string;
};

export type AuthzDecision =
  | {
      allowed: true;
      reason: 'allowed';
      matchedScope: string;
    }
  | {
      allowed: false;
      reason: 'missing_required_scopes' | 'explicit_deny' | 'no_allow_rule';
      missingScopes?: string[];
      matchedScope?: string;
    };

export interface PolicyEnv extends HubAuthEnv {
  HUB_RETRY_PROFILE_DEFAULT?: string;
}

const DEFAULT_RETRY_PROFILE: RetryProfile = {
  name: 'standard',
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 2_000,
  jitter: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrorSubstrings: ['timeout', 'temporar', 'rate limit', '429', '503', 'connection reset', 'econnreset'],
  nonRetryableErrorSubstrings: ['permission', 'forbidden', 'unauthorized', 'invalid_request'],
};

export function evaluateAuthorization(
  auth: AuthContext | null,
  metadata: ToolPolicyMetadata,
  policy: HubPolicyConfig,
): AuthzDecision {
  if (!auth) {
    return {
      allowed: policy.defaultEffect === 'allow',
      reason: policy.defaultEffect === 'allow' ? 'allowed' : 'no_allow_rule',
      matchedScope: policy.defaultEffect === 'allow' ? 'anonymous' : undefined,
    } as AuthzDecision;
  }

  const scopes = auth.scopes;
  if (!hasAllRequiredScopes(scopes, metadata.requiredScopes)) {
    return {
      allowed: false,
      reason: 'missing_required_scopes',
      missingScopes: metadata.requiredScopes.filter((scope) => !hasScope(scopes, scope)),
    };
  }

  const denyMatch = findMatchingRule(policy.deny, scopes, metadata.serverName, metadata.toolName);
  if (denyMatch) {
    return {
      allowed: false,
      reason: 'explicit_deny',
      matchedScope: denyMatch.scope,
    };
  }

  const allowMatch = findMatchingRule(policy.allow, scopes, metadata.serverName, metadata.toolName);
  if (allowMatch) {
    return {
      allowed: true,
      reason: 'allowed',
      matchedScope: allowMatch.scope,
    };
  }

  if (policy.defaultEffect === 'allow') {
    return {
      allowed: true,
      reason: 'allowed',
      matchedScope: 'default:allow',
    };
  }

  return {
    allowed: false,
    reason: 'no_allow_rule',
  };
}

export function resolveRetryProfile(
  env: PolicyEnv,
  policy: HubPolicyConfig,
  profileName: string | undefined,
): RetryProfile {
  const configuredDefault = readEnvString(env, 'HUB_RETRY_PROFILE_DEFAULT') ?? 'standard';
  const effectiveName = profileName ?? configuredDefault;
  const configured = policy.retryProfiles[effectiveName] ?? policy.retryProfiles[configuredDefault];

  if (!configured) {
    return DEFAULT_RETRY_PROFILE;
  }

  return {
    name: effectiveName,
    maxAttempts: clampInt(configured.maxAttempts, 1, 8, DEFAULT_RETRY_PROFILE.maxAttempts),
    baseDelayMs: clampInt(configured.baseDelayMs, 10, 60_000, DEFAULT_RETRY_PROFILE.baseDelayMs),
    maxDelayMs: clampInt(configured.maxDelayMs, 10, 300_000, DEFAULT_RETRY_PROFILE.maxDelayMs),
    jitter: configured.jitter ?? DEFAULT_RETRY_PROFILE.jitter,
    retryableStatusCodes: dedupeNumbers(configured.retryableStatusCodes ?? DEFAULT_RETRY_PROFILE.retryableStatusCodes),
    retryableErrorSubstrings: dedupeStrings(
      configured.retryableErrorSubstrings ?? DEFAULT_RETRY_PROFILE.retryableErrorSubstrings,
    ),
    nonRetryableErrorSubstrings: dedupeStrings(
      configured.nonRetryableErrorSubstrings ?? DEFAULT_RETRY_PROFILE.nonRetryableErrorSubstrings,
    ),
  };
}

export function normalizeCapabilityClass(raw: unknown): CapabilityClass {
  if (raw === 'read' || raw === 'write' || raw === 'mixed') {
    return raw;
  }
  return 'read';
}

export function normalizeRiskTier(raw: unknown): RiskTier {
  if (raw === 'low' || raw === 'medium' || raw === 'high') {
    return raw;
  }
  return 'medium';
}

function findMatchingRule(
  rules: PolicyRule[],
  scopes: string[],
  serverName: string,
  toolName: string,
): PolicyRule | null {
  for (const rule of rules) {
    if (!hasScope(scopes, rule.scope)) continue;
    if (!matchesPattern(rule.server, serverName)) continue;
    if (!matchesPattern(rule.tool, toolName)) continue;
    return rule;
  }
  return null;
}

function hasAllRequiredScopes(scopes: string[], required: string[]): boolean {
  if (required.length === 0) return true;
  return required.every((scope) => hasScope(scopes, scope));
}

function hasScope(scopes: string[], required: string): boolean {
  if (required === '*') return true;
  if (scopes.includes('*')) return true;
  return scopes.includes(required);
}

function matchesPattern(pattern: string, value: string): boolean {
  if (pattern === '*' || pattern.trim().length === 0) return true;
  if (!pattern.includes('*')) return pattern === value;

  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  const regex = new RegExp(`^${escaped}$`);
  return regex.test(value);
}

function readEnvString(env: PolicyEnv, key: string): string | undefined {
  const value = env[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  const floored = Math.floor(value);
  return Math.max(min, Math.min(max, floored));
}

function dedupeNumbers(values: number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value)).map((value) => Math.floor(value))));
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    ),
  );
}
