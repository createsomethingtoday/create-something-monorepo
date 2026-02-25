/**
 * Secure output middleware for Composio tool responses.
 *
 * This module provides a policy artifact contract and a redaction hook that
 * can be plugged into ToolFactoryConfig.executionHooks.afterExecute.
 */

import type {
  ComposioAfterExecuteContext,
  ComposioAfterExecuteHook,
} from './types.js';

/**
 * Redaction rules for a policy layer.
 */
export interface SecureOutputRuleSet {
  /**
   * Keys to redact anywhere in the response payload.
   * Matching is case-insensitive.
   */
  redactKeys?: string[];

  /**
   * Keys to remove entirely from the response payload.
   * Matching is case-insensitive.
   */
  dropKeys?: string[];

  /**
   * Dotted path patterns to redact (supports '*' and '**').
   * Example: "result.data.recording_files.*.download_url"
   */
  redactPaths?: string[];

  /**
   * Dotted path patterns to remove (supports '*' and '**').
   */
  dropPaths?: string[];

  /**
   * URL query parameter keys to redact inside string values.
   * Matching is case-insensitive.
   */
  redactQueryParams?: string[];

  /**
   * Replacement value used for redacted fields.
   * Default: "[REDACTED]".
   */
  replacementText?: string;

  /**
   * Optional hard cap for string values to reduce PII spill in logs/context.
   */
  maxStringLength?: number;
}

/**
 * Policy artifact for secure response handling.
 *
 * Layering model:
 * 1) baseline
 * 2) toolkitOverrides[APP]
 * 3) toolOverrides[TOOL_SLUG]
 */
export interface SecureOutputPolicyArtifact {
  policyId: string;
  version: string;
  description?: string;
  baseline?: SecureOutputRuleSet;
  toolkitOverrides?: Record<string, SecureOutputRuleSet>;
  toolOverrides?: Record<string, SecureOutputRuleSet>;
}

interface ResolvedSecureOutputRules {
  redactKeys: Set<string>;
  dropKeys: Set<string>;
  redactPaths: string[];
  dropPaths: string[];
  redactQueryParams: Set<string>;
  replacementText: string;
  maxStringLength?: number;
}

/**
 * Default global baseline: safe for universal client usage.
 */
export const DEFAULT_SECURE_OUTPUT_POLICY: SecureOutputPolicyArtifact = {
  policyId: 'global-secure-output-default',
  version: '1.0.0',
  description: 'Global baseline for Composio response redaction.',
  baseline: {
    redactKeys: [
      'access_token',
      'refresh_token',
      'token',
      'authorization',
      'api_key',
      'apikey',
      'secret',
      'client_secret',
      'password',
      'passcode',
      'download_access_token',
      'zak',
      'cookie',
      'set-cookie',
      'webhook_secret',
      'private_key',
      'session_context',
      'start_url',
    ],
    redactQueryParams: [
      'access_token',
      'token',
      'refresh_token',
      'zak',
      'pwd',
      'password',
      'passcode',
      'api_key',
      'apikey',
      'signature',
      'sig',
      'code',
    ],
    replacementText: '[REDACTED]',
  },
};

/**
 * Compose multiple policy artifacts into one.
 *
 * Order matters: later artifacts override/extend earlier artifacts.
 * Recommended: [global, toolkit, client].
 */
export function composeSecureOutputPolicies(
  policies: SecureOutputPolicyArtifact[],
  meta: { policyId: string; version: string; description?: string },
): SecureOutputPolicyArtifact {
  const baselineLayers: SecureOutputRuleSet[] = [];
  const toolkitLayers = new Map<string, SecureOutputRuleSet[]>();
  const toolLayers = new Map<string, SecureOutputRuleSet[]>();

  for (const policy of policies) {
    if (policy.baseline) {
      baselineLayers.push(policy.baseline);
    }
    for (const [toolkit, rules] of Object.entries(policy.toolkitOverrides ?? {})) {
      const key = toolkit.toUpperCase();
      const list = toolkitLayers.get(key) ?? [];
      list.push(rules);
      toolkitLayers.set(key, list);
    }
    for (const [toolSlug, rules] of Object.entries(policy.toolOverrides ?? {})) {
      const key = toolSlug.toUpperCase();
      const list = toolLayers.get(key) ?? [];
      list.push(rules);
      toolLayers.set(key, list);
    }
  }

  const toolkitOverrides: Record<string, SecureOutputRuleSet> = {};
  for (const [toolkit, rules] of toolkitLayers.entries()) {
    toolkitOverrides[toolkit] = mergeRuleSets(rules);
  }

  const toolOverrides: Record<string, SecureOutputRuleSet> = {};
  for (const [toolSlug, rules] of toolLayers.entries()) {
    toolOverrides[toolSlug] = mergeRuleSets(rules);
  }

  return {
    policyId: meta.policyId,
    version: meta.version,
    ...(meta.description ? { description: meta.description } : {}),
    ...(baselineLayers.length > 0 ? { baseline: mergeRuleSets(baselineLayers) } : {}),
    ...(Object.keys(toolkitOverrides).length > 0 ? { toolkitOverrides } : {}),
    ...(Object.keys(toolOverrides).length > 0 ? { toolOverrides } : {}),
  };
}

/**
 * Build an afterExecute hook that enforces secure output redaction.
 */
export function createSecureOutputRedactionHook(
  policy: SecureOutputPolicyArtifact,
): ComposioAfterExecuteHook {
  return (ctx: ComposioAfterExecuteContext): Record<string, unknown> => {
    const rules = resolveSecureOutputRules(policy, ctx);
    return redactSensitiveResult(ctx.result, rules);
  };
}

/**
 * Resolve effective rules for an execution context.
 */
export function resolveSecureOutputRules(
  policy: SecureOutputPolicyArtifact,
  ctx: Pick<ComposioAfterExecuteContext, 'app' | 'toolSlug'>,
): ResolvedSecureOutputRules {
  const toolkitKey = ctx.app.toUpperCase();
  const toolKey = ctx.toolSlug.toUpperCase();

  const layers: SecureOutputRuleSet[] = [];
  if (policy.baseline) {
    layers.push(policy.baseline);
  }
  const toolkitRules = policy.toolkitOverrides?.[toolkitKey];
  if (toolkitRules) {
    layers.push(toolkitRules);
  }
  const toolRules = policy.toolOverrides?.[toolKey];
  if (toolRules) {
    layers.push(toolRules);
  }

  return toResolvedRules(mergeRuleSets(layers));
}

/**
 * Apply redaction rules to a Composio result payload.
 */
export function redactSensitiveResult(
  input: Record<string, unknown>,
  rules: ResolvedSecureOutputRules,
): Record<string, unknown> {
  const redacted = redactUnknown(input, [], rules);
  return isRecord(redacted) ? redacted : {};
}

function mergeRuleSets(ruleSets: SecureOutputRuleSet[]): SecureOutputRuleSet {
  const merged: SecureOutputRuleSet = {};
  for (const layer of ruleSets) {
    if (layer.redactKeys) {
      merged.redactKeys = dedupeStrings([...(merged.redactKeys ?? []), ...layer.redactKeys]);
    }
    if (layer.dropKeys) {
      merged.dropKeys = dedupeStrings([...(merged.dropKeys ?? []), ...layer.dropKeys]);
    }
    if (layer.redactPaths) {
      merged.redactPaths = dedupeStrings([...(merged.redactPaths ?? []), ...layer.redactPaths]);
    }
    if (layer.dropPaths) {
      merged.dropPaths = dedupeStrings([...(merged.dropPaths ?? []), ...layer.dropPaths]);
    }
    if (layer.redactQueryParams) {
      merged.redactQueryParams = dedupeStrings([
        ...(merged.redactQueryParams ?? []),
        ...layer.redactQueryParams,
      ]);
    }
    if (layer.replacementText !== undefined) {
      merged.replacementText = layer.replacementText;
    }
    if (layer.maxStringLength !== undefined) {
      merged.maxStringLength = layer.maxStringLength;
    }
  }
  return merged;
}

function toResolvedRules(rules: SecureOutputRuleSet): ResolvedSecureOutputRules {
  return {
    redactKeys: new Set((rules.redactKeys ?? []).map(toLower)),
    dropKeys: new Set((rules.dropKeys ?? []).map(toLower)),
    redactPaths: (rules.redactPaths ?? []).map(normalizePathPattern),
    dropPaths: (rules.dropPaths ?? []).map(normalizePathPattern),
    redactQueryParams: new Set((rules.redactQueryParams ?? []).map(toLower)),
    replacementText: rules.replacementText ?? '[REDACTED]',
    maxStringLength: rules.maxStringLength,
  };
}

function redactUnknown(
  value: unknown,
  path: string[],
  rules: ResolvedSecureOutputRules,
): unknown {
  if (typeof value === 'string') {
    return sanitizeString(value, rules);
  }
  if (Array.isArray(value)) {
    return value.map((entry, idx) => redactUnknown(entry, [...path, String(idx)], rules));
  }
  if (!isRecord(value)) {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    const nextPath = [...path, key];
    const keyLower = toLower(key);

    if (rules.dropKeys.has(keyLower) || matchesAnyPath(nextPath, rules.dropPaths)) {
      continue;
    }

    if (rules.redactKeys.has(keyLower) || matchesAnyPath(nextPath, rules.redactPaths)) {
      output[key] = rules.replacementText;
      continue;
    }

    output[key] = redactUnknown(raw, nextPath, rules);
  }

  return output;
}

function sanitizeString(input: string, rules: ResolvedSecureOutputRules): string {
  let value = redactUrlQueryValues(input, rules);
  if (rules.maxStringLength && value.length > rules.maxStringLength) {
    value = `${value.slice(0, rules.maxStringLength)}...[TRUNCATED]`;
  }
  return value;
}

function redactUrlQueryValues(value: string, rules: ResolvedSecureOutputRules): string {
  if (rules.redactQueryParams.size === 0) {
    return value;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  let touched = false;
  for (const key of Array.from(url.searchParams.keys())) {
    if (rules.redactQueryParams.has(toLower(key))) {
      url.searchParams.set(key, rules.replacementText);
      touched = true;
    }
  }

  return touched ? url.toString() : value;
}

function matchesAnyPath(path: string[], patterns: string[]): boolean {
  return patterns.some((pattern) => matchesPathPattern(path, pattern));
}

function matchesPathPattern(path: string[], pattern: string): boolean {
  const patternSegments = pattern.split('.').filter(Boolean);
  if (patternSegments.length === 0) {
    return false;
  }
  return matchSegments(path, patternSegments);
}

function matchSegments(path: string[], pattern: string[]): boolean {
  const pathHead = path[0];
  const patternHead = pattern[0];

  if (patternHead === undefined) {
    return path.length === 0;
  }
  if (patternHead === '**') {
    if (pattern.length === 1) {
      return true;
    }
    for (let idx = 0; idx <= path.length; idx++) {
      if (matchSegments(path.slice(idx), pattern.slice(1))) {
        return true;
      }
    }
    return false;
  }
  if (pathHead === undefined) {
    return false;
  }
  if (patternHead !== '*' && patternHead !== pathHead) {
    return false;
  }
  return matchSegments(path.slice(1), pattern.slice(1));
}

function normalizePathPattern(pattern: string): string {
  return pattern
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('.');
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function toLower(value: string): string {
  return value.toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

