import type { CheckOperator, JudgmentCheck } from './types.js';

function getByPath(input: unknown, path: string): unknown {
  const parts = path.split('.').filter(Boolean);
  let current: unknown = input;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(part);
      if (!Number.isInteger(idx)) return undefined;
      current = current[idx];
      continue;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
      continue;
    }
    return undefined;
  }
  return current;
}

function compare(operator: CheckOperator, observed: unknown, target: string | number | boolean): boolean {
  if (operator === 'eq') return observed === target;
  if (operator === 'neq') return observed !== target;

  if (typeof observed !== 'number' || typeof target !== 'number') return false;
  if (operator === 'lt') return observed < target;
  if (operator === 'lte') return observed <= target;
  if (operator === 'gt') return observed > target;
  if (operator === 'gte') return observed >= target;
  return false;
}

export type CheckEvaluation = {
  checkId: string;
  observed: unknown;
  extracted: boolean;
  triggered: boolean;
  reason: string;
};

export function evaluateCheck(check: JudgmentCheck, toolResult: unknown): CheckEvaluation {
  const observed = getByPath(toolResult, check.valuePath);
  if (observed === undefined) {
    return {
      checkId: check.id,
      observed: undefined,
      extracted: false,
      triggered: false,
      reason: `Path not found: ${check.valuePath}`
    };
  }

  const triggered = compare(check.operator, observed, check.target);
  const reason = triggered
    ? `Triggered: observed=${String(observed)} operator=${check.operator} target=${String(check.target)}`
    : `Not triggered: observed=${String(observed)} operator=${check.operator} target=${String(check.target)}`;

  return {
    checkId: check.id,
    observed,
    extracted: true,
    triggered,
    reason
  };
}

