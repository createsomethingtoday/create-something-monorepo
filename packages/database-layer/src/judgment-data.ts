/** Node-side, offline judgment evidence contract. No provider calls or action authority. */
import { createHash } from 'node:crypto';

export type Sealed<T> = { digest: string; payload: T };
export type JudgmentAnswer = {
  constraintId: string;
  value: 'yes' | 'no' | 'unknown';
  probability: number;
};
export type JudgmentProvider = {
  provider: string;
  model: string;
  requestId: string;
  completedAt: string;
  latencyMs: number;
};
export type JudgmentResult = 'prerequisites_supported' | 'needs_human';
export type JudgmentInput = {
  schemaVersion: 'judgment-input.v1';
  caseId: string;
  groupId: string;
  evidence: {
    cutoff: string;
    certification: 'synthetic' | 'reconstructed' | 'reviewer_verified';
    sources: {
      id: string;
      entityId: string;
      sourceRef: string;
      capturedAt: string;
      kind: 'pre_decision';
      text: string;
    }[];
  };
  policy: {
    id: string;
    version: string;
    scope: 'complete' | 'incomplete';
    mandatoryHumanReview: boolean;
    constraints: {
      id: string;
      applicability: 'applicable' | 'not_applicable' | 'unknown';
      evidenceIds: string[];
      evaluator: 'deterministic' | 'semantic';
      result?: 'yes' | 'no' | 'unknown';
      question?: string;
      questionVersion?: string;
      minimumProbability?: number;
    }[];
  };
};
export type JudgmentReceipt = {
  schemaVersion: 'judgment-receipt.v1';
  inputDigest: string;
  requestDigest: string;
  providerStatus: 'ok' | 'unavailable';
  provider: JudgmentProvider | null;
  answers: JudgmentAnswer[];
  result: JudgmentResult;
  reasons: string[];
  authority: 'advisory_only';
};
export type JudgmentReview = {
  inputDigest: string;
  reviewer: string;
  reviewedAt: string;
  independent: boolean;
  split: 'development' | 'held_out';
  label: JudgmentResult;
};

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function object(
  value: unknown,
  keys: string[],
  required = keys
): asserts value is Record<string, unknown> {
  requireValue(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'expected object'
  );
  requireValue(
    Object.keys(value).every((k) => keys.includes(k)),
    'unexpected field (labels and later outcomes are forbidden in input)'
  );
  requireValue(
    required.every((k) => Object.hasOwn(value, k)),
    'missing field'
  );
}
function text(value: unknown): asserts value is string {
  requireValue(typeof value === 'string' && value.trim().length > 0, 'expected nonempty text');
}
function oneOf(value: unknown, choices: readonly unknown[]) {
  requireValue(choices.includes(value), `invalid value: ${String(value)}`);
}
function date(value: unknown): number {
  text(value);
  requireValue(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) &&
      Number.isFinite(Date.parse(value)),
    'invalid UTC timestamp'
  );
  const parsed = Date.parse(value);
  requireValue(
    new Date(parsed).toISOString() === value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z'),
    'invalid calendar timestamp'
  );
  return parsed;
}
function list(value: unknown): asserts value is unknown[] {
  requireValue(Array.isArray(value), 'expected array');
}
function unique(values: string[], name: string) {
  requireValue(new Set(values).size === values.length, `duplicate ${name}`);
}
function probability(value: unknown): asserts value is number {
  requireValue(
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1,
    'invalid probability'
  );
}

/** Stable JSON encoding; unsupported JS values cannot silently disappear. */
export function canonicalJudgmentJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number') {
    requireValue(Number.isFinite(value), 'non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    requireValue(Object.keys(value).length === value.length, 'sparse or extended array');
    return `[${value.map(canonicalJudgmentJson).join(',')}]`;
  }
  requireValue(
    typeof value === 'object' &&
      value !== null &&
      Object.getPrototypeOf(value) === Object.prototype,
    'expected JSON value'
  );
  return `{${Object.keys(value)
    .sort()
    .map(
      (k) => `${JSON.stringify(k)}:${canonicalJudgmentJson((value as Record<string, unknown>)[k])}`
    )
    .join(',')}}`;
}
export function seal<T>(payload: T): Sealed<T> {
  const json = canonicalJudgmentJson(payload);
  return {
    digest: createHash('sha256').update(json).digest('hex'),
    payload: JSON.parse(json) as T
  };
}
export function verifySealed<T>(sealed: Sealed<T>): T {
  object(sealed, ['digest', 'payload']);
  requireValue(
    typeof sealed.digest === 'string' && /^[a-f0-9]{64}$/.test(sealed.digest),
    'invalid digest'
  );
  requireValue(seal(sealed.payload).digest === sealed.digest, 'integrity mismatch');
  return sealed.payload;
}

export function validateJudgmentInput(value: unknown): asserts value is JudgmentInput {
  object(value, ['schemaVersion', 'caseId', 'groupId', 'evidence', 'policy']);
  oneOf(value.schemaVersion, ['judgment-input.v1']);
  text(value.caseId);
  text(value.groupId);
  const evidence = value.evidence;
  object(evidence, ['cutoff', 'certification', 'sources']);
  const cutoff = date(evidence.cutoff);
  oneOf(evidence.certification, ['synthetic', 'reconstructed', 'reviewer_verified']);
  list(evidence.sources);
  const sourceIds: string[] = [];
  for (const source of evidence.sources) {
    object(source, ['id', 'entityId', 'sourceRef', 'capturedAt', 'kind', 'text']);
    text(source.id);
    text(source.sourceRef);
    text(source.text);
    requireValue(source.entityId === value.caseId, 'source identity conflict');
    oneOf(source.kind, ['pre_decision']);
    requireValue(date(source.capturedAt) <= cutoff, 'evidence after cutoff');
    sourceIds.push(source.id);
  }
  unique(sourceIds, 'source ID');
  const policy = value.policy;
  object(policy, ['id', 'version', 'scope', 'mandatoryHumanReview', 'constraints']);
  text(policy.id);
  text(policy.version);
  oneOf(policy.scope, ['complete', 'incomplete']);
  requireValue(typeof policy.mandatoryHumanReview === 'boolean', 'invalid mandatory review flag');
  list(policy.constraints);
  requireValue(policy.constraints.length > 0, 'empty constraints');
  const ids: string[] = [];
  for (const c of policy.constraints) {
    object(
      c,
      [
        'id',
        'applicability',
        'evidenceIds',
        'evaluator',
        'result',
        'question',
        'questionVersion',
        'minimumProbability'
      ],
      ['id', 'applicability', 'evidenceIds', 'evaluator']
    );
    text(c.id);
    ids.push(c.id);
    oneOf(c.applicability, ['applicable', 'not_applicable', 'unknown']);
    list(c.evidenceIds);
    c.evidenceIds.forEach((id) => {
      text(id);
      requireValue(sourceIds.includes(id), 'missing evidence reference');
    });
    unique(c.evidenceIds as string[], 'evidence reference');
    oneOf(c.evaluator, ['deterministic', 'semantic']);
    if (c.evaluator === 'semantic') {
      text(c.question);
      text(c.questionVersion);
      probability(c.minimumProbability);
      requireValue(c.minimumProbability > 0.5, 'threshold must exceed chance');
      requireValue(!Object.hasOwn(c, 'result'), 'semantic result must be separate');
    } else {
      oneOf(c.result, ['yes', 'no', 'unknown']);
      requireValue(
        !['question', 'questionVersion', 'minimumProbability'].some((k) => Object.hasOwn(c, k)),
        'deterministic constraint contains semantic fields'
      );
    }
  }
  unique(ids, 'constraint ID');
}

/** Explicit projection excludes evaluation labels, policy thresholds and downstream outcomes. */
export function prepareJudgment(input: Sealed<JudgmentInput>) {
  const data = verifySealed(input);
  validateJudgmentInput(data);
  const questions =
    data.policy.mandatoryHumanReview || data.policy.scope !== 'complete'
      ? []
      : data.policy.constraints
          .filter(
            (c) =>
              c.applicability === 'applicable' &&
              c.evaluator === 'semantic' &&
              c.evidenceIds.length > 0
          )
          .map((c) => ({
            id: c.id,
            version: c.questionVersion!,
            question: c.question!,
            evidenceIds: c.evidenceIds
          }));
  const ids = new Set(questions.flatMap((q) => q.evidenceIds));
  return {
    schemaVersion: 'judgment-request.v1',
    questions,
    evidence: data.evidence.sources
      .filter((s) => ids.has(s.id))
      .map((s) => ({ id: s.id, text: s.text }))
  };
}

export function recordJudgment(
  input: Sealed<JudgmentInput>,
  answers: JudgmentAnswer[],
  provider: JudgmentProvider | null,
  providerStatus: 'ok' | 'unavailable' = 'ok'
): Sealed<JudgmentReceipt> {
  const request = prepareJudgment(input);
  oneOf(providerStatus, ['ok', 'unavailable']);
  list(answers);
  const expected = request.questions.map((q) => q.id);
  if (providerStatus === 'unavailable') {
    requireValue(
      answers.length === 0 && provider === null,
      'failed provider cannot supply answers'
    );
  } else {
    requireValue(answers.length === expected.length, 'missing or extra answers');
    if (expected.length > 0) requireValue(provider !== null, 'missing provider provenance');
    else requireValue(provider === null, 'unused provider provenance');
    for (const a of answers) {
      object(a, ['constraintId', 'value', 'probability']);
      requireValue(expected.includes(a.constraintId), 'unsolicited answer');
      oneOf(a.value, ['yes', 'no', 'unknown']);
      probability(a.probability);
    }
    unique(
      answers.map((a) => a.constraintId),
      'answer'
    );
  }
  if (provider !== null) {
    object(provider, ['provider', 'model', 'requestId', 'completedAt', 'latencyMs']);
    text(provider.provider);
    text(provider.model);
    text(provider.requestId);
    requireValue(
      date(provider.completedAt) >= date(input.payload.evidence.cutoff),
      'provider predates evidence'
    );
    requireValue(Number.isFinite(provider.latencyMs) && provider.latencyMs >= 0, 'invalid latency');
  }
  const reasons: string[] = [];
  const policy = input.payload.policy;
  if (providerStatus === 'unavailable') reasons.push('provider_unavailable');
  if (policy.mandatoryHumanReview) reasons.push('mandatory_human_review');
  if (policy.scope !== 'complete') reasons.push('incomplete_scope');
  if (!policy.constraints.some((c) => c.applicability === 'applicable'))
    reasons.push('no_applicable_constraints');
  for (const c of policy.constraints) {
    if (c.applicability === 'not_applicable') continue;
    if (c.applicability === 'unknown') {
      reasons.push(`${c.id}:unknown_applicability`);
      continue;
    }
    if (c.evidenceIds.length === 0) {
      reasons.push(`${c.id}:missing_evidence`);
      continue;
    }
    if (c.evaluator === 'deterministic') {
      if (c.result !== 'yes') reasons.push(`${c.id}:${c.result}`);
    } else {
      const a = answers.find((a) => a.constraintId === c.id);
      if (!a) reasons.push(`${c.id}:not_evaluated`);
      else if (a.value !== 'yes') reasons.push(`${c.id}:${a.value}`);
      else if (a.probability < c.minimumProbability!) reasons.push(`${c.id}:uncertain`);
    }
  }
  return seal({
    schemaVersion: 'judgment-receipt.v1',
    inputDigest: input.digest,
    requestDigest: seal(request).digest,
    providerStatus,
    provider,
    answers: [...answers].sort((a, b) =>
      a.constraintId < b.constraintId ? -1 : a.constraintId > b.constraintId ? 1 : 0
    ),
    result: reasons.length ? 'needs_human' : 'prerequisites_supported',
    reasons,
    authority: 'advisory_only'
  });
}

export function replayJudgment(
  input: Sealed<JudgmentInput>,
  receipt: Sealed<JudgmentReceipt>
): JudgmentReceipt {
  const saved = verifySealed(receipt);
  requireValue(saved.inputDigest === input.digest, 'receipt input mismatch');
  const replayed = recordJudgment(input, saved.answers, saved.provider, saved.providerStatus);
  requireValue(replayed.digest === receipt.digest, 'replay mismatch');
  return replayed.payload;
}

/** Structural eligibility only. Attribution must be authenticated by the owning intake system. */
export function verifyEvaluationSet(inputs: Sealed<JudgmentInput>[], reviews: JudgmentReview[]) {
  requireValue(inputs.length > 0, 'empty evaluation set');
  const caseIds: string[] = [];
  for (const input of inputs) {
    prepareJudgment(input);
    requireValue(
      input.payload.evidence.certification === 'reviewer_verified',
      'evidence must be reviewer certified'
    );
    caseIds.push(input.payload.caseId);
  }
  unique(caseIds, 'case ID');
  unique(
    inputs.map((i) => i.digest),
    'input digest'
  );
  requireValue(reviews.length === inputs.length, 'missing or extra reviews');
  const groups = new Map<string, string>();
  const seen: string[] = [];
  for (const review of reviews) {
    object(review, ['inputDigest', 'reviewer', 'reviewedAt', 'independent', 'split', 'label']);
    text(review.reviewer);
    date(review.reviewedAt);
    requireValue(review.independent === true, 'independent review required');
    oneOf(review.split, ['development', 'held_out']);
    oneOf(review.label, ['prerequisites_supported', 'needs_human']);
    const input = inputs.find((i) => i.digest === review.inputDigest);
    requireValue(input, 'review input mismatch');
    seen.push(review.inputDigest);
    requireValue(
      date(review.reviewedAt) >= date(input.payload.evidence.cutoff),
      'review predates evidence'
    );
    const group = input.payload.groupId;
    requireValue(!groups.has(group) || groups.get(group) === review.split, 'group split leakage');
    groups.set(group, review.split);
  }
  unique(seen, 'review');
  requireValue(
    reviews.some((r) => r.split === 'development') && reviews.some((r) => r.split === 'held_out'),
    'development and held_out groups required'
  );
  return {
    eligibleCases: inputs.length,
    groups: groups.size,
    effectiveness: 'not_established' as const
  };
}
