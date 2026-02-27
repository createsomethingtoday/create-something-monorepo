import { compileConstraintPolicy } from './compile.js';
import { evaluateConstraintPolicyLocal } from './local-eval.js';
import { evaluateConstraintPolicyPrimary } from './oso-primary.js';
import { shouldSampleCanary } from './rollout.js';
import type {
  CompiledConstraintPolicy,
  ConstraintEvaluationInput,
  ConstraintEvaluationResult,
  ConstraintPolicy,
  HybridEvaluatorConfig,
  RolloutConfig,
  RolloutEvaluationResult,
} from './types.js';

type BreakerState = {
  openUntilMs: number;
  lastError: string | null;
};

const BREAKER_BY_POLICY = new Map<string, BreakerState>();

const BREAKER_OPEN_MS = 30_000;

function nowMs(): number {
  return Date.now();
}

function toFallbackResult(
  local: ConstraintEvaluationResult,
  compiled: CompiledConstraintPolicy,
  fallbackReason: string,
): ConstraintEvaluationResult {
  return {
    ...local,
    engine: 'polar_v1',
    policyHash: compiled.policyHash,
    compilerVersion: compiled.compilerVersion,
    evaluationPath: 'fallback',
    fallbackReason,
  };
}

export async function evaluateConstraintPolicyHybrid(
  input: ConstraintEvaluationInput,
  policy: ConstraintPolicy,
  compiledOrNull: CompiledConstraintPolicy | null,
  config: HybridEvaluatorConfig,
): Promise<ConstraintEvaluationResult> {
  const mode = config.mode ?? 'hybrid';
  const fallbackEnabled = config.fallbackEnabled !== false;
  const started = nowMs();

  const local = evaluateConstraintPolicyLocal(input, policy);
  if (mode === 'legacy') {
    return { ...local, latencyMs: nowMs() - started };
  }

  const compiled = compiledOrNull ?? compileConstraintPolicy(policy);
  const breaker = BREAKER_BY_POLICY.get(compiled.policyHash);
  const breakerOpen = breaker ? breaker.openUntilMs > nowMs() : false;

  if (!breakerOpen) {
    try {
      const primary = await evaluateConstraintPolicyPrimary(input, compiled, {
        ...config.oso,
      });
      BREAKER_BY_POLICY.delete(compiled.policyHash);
      return {
        ...primary,
        latencyMs: nowMs() - started,
      };
    } catch (err: any) {
      BREAKER_BY_POLICY.set(compiled.policyHash, {
        openUntilMs: nowMs() + BREAKER_OPEN_MS,
        lastError: err?.message ?? String(err),
      });
      if (!fallbackEnabled || mode === 'polar') {
        throw err;
      }
      return {
        ...toFallbackResult(local, compiled, err?.message ?? String(err)),
        latencyMs: nowMs() - started,
      };
    }
  }

  if (fallbackEnabled) {
    const reason = breaker?.lastError ?? 'circuit breaker is open';
    return {
      ...toFallbackResult(local, compiled, reason),
      latencyMs: nowMs() - started,
    };
  }

  throw new Error('Primary evaluator circuit breaker is open and fallback is disabled.');
}

export async function evaluateConstraintPolicyWithRollout(
  input: ConstraintEvaluationInput,
  policy: ConstraintPolicy,
  rollout: RolloutConfig,
  config: HybridEvaluatorConfig,
): Promise<RolloutEvaluationResult> {
  const compiled = compileConstraintPolicy(policy);
  const legacy = evaluateConstraintPolicyLocal(input, policy);
  const polar = await evaluateConstraintPolicyHybrid(input, policy, compiled, {
    ...config,
    mode: config.mode === 'legacy' ? 'hybrid' : config.mode,
  });

  const mismatch = legacy.decision !== polar.decision || legacy.reason !== polar.reason;
  const sampleKey = `${input.accountId}:${input.toolName}:${policy.id}`;
  const sampledPolar = shouldSampleCanary(sampleKey, rollout.canaryPercent);

  if (rollout.mode === 'legacy_enforce') {
    return {
      final: legacy,
      legacy,
      polar,
      mismatch,
      sampledPolar: false,
    };
  }

  if (rollout.mode === 'polar_enforce') {
    return {
      final: polar,
      legacy,
      polar,
      mismatch,
      sampledPolar: true,
    };
  }

  return {
    final: sampledPolar ? polar : legacy,
    legacy,
    polar,
    mismatch,
    sampledPolar,
  };
}
