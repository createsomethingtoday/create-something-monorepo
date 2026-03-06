import { Oso, typedVar } from 'oso-cloud';
import type {
  CompiledConstraintPolicy,
  ConstraintEvaluationInput,
  ConstraintEvaluationResult,
  OsoPrimaryConfig,
} from './types.js';

type CachedClient = {
  client: Oso;
  loadedPolicyHash: string | null;
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

  const created: CachedClient = { client, loadedPolicyHash: null };
  CLIENT_CACHE.set(key, created);
  return created;
}

async function ensureRuntimePolicy(
  cached: CachedClient,
  compiled: CompiledConstraintPolicy,
  config: OsoPrimaryConfig,
): Promise<void> {
  if (!config.bootstrapPolicy) return;
  if (cached.loadedPolicyHash === compiled.policyHash) return;
  await cached.client.policy(compiled.policyPolar);
  cached.loadedPolicyHash = compiled.policyHash;
}

export async function evaluateConstraintPolicyPrimary(
  input: ConstraintEvaluationInput,
  compiled: CompiledConstraintPolicy,
  config: OsoPrimaryConfig,
): Promise<ConstraintEvaluationResult> {
  const started = Date.now();

  if (input.readOnly && input.hasWriteIntent) {
    return {
      decision: 'block',
      reason: 'Read-only account cannot execute write-intent workflow path.',
      matchedRuleIds: ['hard_guard_readonly_write'],
      engine: 'polar_v1',
      policyHash: compiled.policyHash,
      compilerVersion: compiled.compilerVersion,
      evaluationPath: 'primary',
      fallbackReason: null,
      latencyMs: Date.now() - started,
    };
  }

  const cached = buildClient(config);
  await ensureRuntimePolicy(cached, compiled, config);

  const decisionVar = typedVar('String');
  const ruleIdVar = typedVar('String');
  const priorityVar = typedVar('Integer');
  const reasonVar = typedVar('String');

  const queryArgs = ['rule_matches', ruleIdVar, priorityVar, decisionVar, reasonVar] as any;
  const contextFacts = [
    ['input_account_id', input.accountId],
    ['input_action_name', input.actionName ?? ''],
    ['input_resource_kind', input.resourceKind ?? ''],
    ['input_access_type', input.accessType ?? ''],
    ['input_oauth_required', Boolean(input.oauthRequired)],
    ['input_actor_role', input.actorRole ?? ''],
    ['input_tool_mode', input.toolMode ?? ''],
    ['input_identity_source', input.identitySource ?? ''],
    ['input_tool_name', input.toolName],
    ['input_has_write_intent', Boolean(input.hasWriteIntent)],
    ['input_has_human_review_step', Boolean(input.hasHumanReviewStep)],
    ['input_introspection_ok', Boolean(input.introspectionOk)],
    ...(input.resourceTags ?? []).map((tag) => ['input_resource_tag', tag] as const),
  ];

  const rowsRaw = (await cached.client
    .buildQuery(queryArgs)
    .withContextFacts(contextFacts as any)
    .evaluate([ruleIdVar, priorityVar, decisionVar, reasonVar])) as Array<[string, string, string, string]>;

  const rows = rowsRaw
    .map(([ruleId, priority, decision, reason]) => ({
      ruleId,
      priority: Number(priority),
      decision,
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
