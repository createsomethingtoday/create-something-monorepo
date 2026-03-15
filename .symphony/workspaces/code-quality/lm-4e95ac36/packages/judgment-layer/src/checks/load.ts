import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import TOML from '@iarna/toml';
import type { CheckOperator, CheckSeverity, ChecksFile, JudgmentCheck } from './types.js';

type CheckToml = {
  id?: unknown;
  description?: unknown;
  enabled?: unknown;
  server?: unknown;
  tool?: unknown;
  args_json?: unknown;
  value_path?: unknown;
  operator?: unknown;
  target?: unknown;
  severity?: unknown;
  cooldown_minutes?: unknown;
  notify_channel?: unknown;
  suggestion_prompt?: unknown;
  allow_auto_write?: unknown;
};

type ChecksToml = {
  checks?: unknown;
};

const OPERATORS = new Set<CheckOperator>(['lt', 'lte', 'gt', 'gte', 'eq', 'neq']);
const SEVERITIES = new Set<CheckSeverity>(['low', 'medium', 'high', 'critical']);

function assertString(v: unknown, field: string, checkId: string): string {
  if (typeof v !== 'string' || v.trim() === '') {
    throw new Error(`Invalid ${field} for check "${checkId}" (expected non-empty string)`);
  }
  return v;
}

function assertBoolean(v: unknown, field: string, checkId: string, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  if (typeof v !== 'boolean') throw new Error(`Invalid ${field} for check "${checkId}" (expected boolean)`);
  return v;
}

function assertNumber(v: unknown, field: string, checkId: string, fallback: number): number {
  if (v === undefined) return fallback;
  if (typeof v !== 'number' || Number.isNaN(v)) throw new Error(`Invalid ${field} for check "${checkId}" (expected number)`);
  return v;
}

function normalizeCheck(raw: CheckToml, index: number): JudgmentCheck {
  const id = assertString(raw.id, 'id', `#${index + 1}`);
  const server = assertString(raw.server, 'server', id);
  const tool = assertString(raw.tool, 'tool', id);
  const valuePath = assertString(raw.value_path, 'value_path', id);

  if (raw.target === undefined) throw new Error(`Missing target for check "${id}"`);
  if (typeof raw.target !== 'string' && typeof raw.target !== 'number' && typeof raw.target !== 'boolean') {
    throw new Error(`Invalid target for check "${id}" (expected string|number|boolean)`);
  }

  if (raw.operator !== undefined && (typeof raw.operator !== 'string' || !OPERATORS.has(raw.operator as CheckOperator))) {
    throw new Error(`Invalid operator for check "${id}"`);
  }

  if (raw.severity !== undefined && (typeof raw.severity !== 'string' || !SEVERITIES.has(raw.severity as CheckSeverity))) {
    throw new Error(`Invalid severity for check "${id}"`);
  }

  return {
    id,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    enabled: assertBoolean(raw.enabled, 'enabled', id, true),
    server,
    tool,
    argsJson: typeof raw.args_json === 'string' ? raw.args_json : '{}',
    valuePath,
    operator: (raw.operator as CheckOperator | undefined) ?? 'lt',
    target: raw.target,
    severity: (raw.severity as CheckSeverity | undefined) ?? 'medium',
    cooldownMinutes: assertNumber(raw.cooldown_minutes, 'cooldown_minutes', id, 60),
    notifyChannel: typeof raw.notify_channel === 'string' ? raw.notify_channel : 'console',
    suggestionPrompt: typeof raw.suggestion_prompt === 'string' ? raw.suggestion_prompt : undefined,
    allowAutoWrite: assertBoolean(raw.allow_auto_write, 'allow_auto_write', id, false)
  };
}

export function loadChecks(cwd: string): ChecksFile {
  const path = join(cwd, '.judgment', 'checks.toml');
  if (!existsSync(path)) return { checks: [] };

  let parsed: ChecksToml;
  try {
    parsed = TOML.parse(readFileSync(path, 'utf-8')) as unknown as ChecksToml;
  } catch (err: any) {
    throw new Error(`Failed to parse ${path}: ${err?.message ?? String(err)}`);
  }

  if (!Array.isArray(parsed.checks)) {
    throw new Error(`Invalid ${path}: expected [[checks]] array`);
  }

  const checks = parsed.checks.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Invalid checks entry at index ${index}`);
    return normalizeCheck(item as CheckToml, index);
  });

  return { checks };
}

