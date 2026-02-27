import { Oso, typedVar } from 'oso-cloud';
import { getRuntimePolicySource } from './compile.js';
import type {
  CompiledConstraintPolicy,
  ConstraintEvaluationInput,
  ConstraintEvaluationResult,
  OsoPrimaryConfig,
} from './types.js';

type CachedClient = {
  client: Oso;
  runtimePolicyHash: string | null;
};

const CLIENT_CACHE = new Map<string, CachedClient>();

function cacheKey(config: OsoPrimaryConfig): string {
  return `${config.url ?? ''}::${config.apiKey ?? ''}`;
}

function decisionRank(decision: string): number {
  if (decision === 'block') return 0;
  if (decision === 'require_human_review') return 1;
  if (decision === 'allow') return 2;
  return 3;
}

function buildClient(config: OsoPrimaryConfig): CachedClient {
  const key = cacheKey(config);
  const cached = CLIENT_CACHE.get(key);
  if (cached) return cached;

  if (!config.url || !config.apiKey) {
    throw new Error('Missing Oso config (OSO_URL/OSO_API_KEY).');
  }

  const client = new Oso(config.url, config.apiKey, {
    fetchTimeoutMillis: config.fetchTimeoutMillis,
  });

  const created: CachedClient = { client, runtimePolicyHash: null };
  CLIENT_CACHE.set(key, created);
  return created;
}

async function ensureRuntimePolicy(
  cached: CachedClient,
  compiled: CompiledConstraintPolicy,
  config: OsoPrimaryConfig,
): Promise<void> {
  if (!config.bootstrapPolicy) return;
  if (cached.runtimePolicyHash === compiled.runtimePolicyHash) return;
  await cached.client.policy(getRuntimePolicySource());
  cached.runtimePolicyHash = compiled.runtimePolicyHash;
}

export async function evaluateConstraintPolicyPrimary(
  input: ConstraintEvaluationInput,
  compiled: CompiledConstraintPolicy,
  config: OsoPrimaryConfig,
): Promise<ConstraintEvaluationResult> {
  const started = Date.now();
  const cached = buildClient(config);
  await ensureRuntimePolicy(cached, compiled, config);

  const decisionVar = typedVar('String');
  const ruleIdVar = typedVar('String');
  const priorityVar = typedVar('Integer');
  const reasonVar = typedVar('String');

  const queryArgs = [
    'decision',
    decisionVar,
    ruleIdVar,
    priorityVar,
    reasonVar,
    input.accountId,
    input.toolName,
    Boolean(input.hasWriteIntent),
    Boolean(input.hasHumanReviewStep),
    Boolean(input.introspectionOk),
    Boolean(input.readOnly),
  ] as any;

  const rowsRaw = (await cached.client
    .buildQuery(queryArgs)
    .withContextFacts(compiled.contextFacts as any)
    .evaluate([decisionVar, ruleIdVar, priorityVar, reasonVar])) as Array<[string, string, string, string]>;

  const rows = rowsRaw
    .map(([decision, ruleId, priority, reason]) => ({
      decision,
      ruleId,
      priority: Number(priority),
      reason,
    }))
    .filter((row) => row.decision === 'allow' || row.decision === 'require_human_review' || row.decision === 'block')
    .map((row) => ({
      ...row,
      priority: Number.isFinite(row.priority) ? row.priority : 999999,
    }));

  const selected = rows.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return decisionRank(a.decision) - decisionRank(b.decision);
  })[0];

  if (!selected) {
    return {
      decision: 'allow',
      reason: 'No policy rule matched; default allow.',
      matchedRuleIds: ['policy_default_allow'],
      engine: 'polar_v1',
      policyHash: compiled.policyHash,
      compilerVersion: compiled.compilerVersion,
      evaluationPath: 'primary',
      fallbackReason: null,
      latencyMs: Date.now() - started,
    };
  }

  return {
    decision: selected.decision as ConstraintEvaluationResult['decision'],
    reason: selected.reason,
    matchedRuleIds: [selected.ruleId],
    engine: 'polar_v1',
    policyHash: compiled.policyHash,
    compilerVersion: compiled.compilerVersion,
    evaluationPath: 'primary',
    fallbackReason: null,
    latencyMs: Date.now() - started,
  };
}
