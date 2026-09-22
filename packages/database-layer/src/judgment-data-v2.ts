/** Offline, Node-only evidence -> inference -> policy contracts. No execution authority. */
import { seal, verifySealed, canonicalJudgmentJson, type Sealed } from './judgment-data.js';
export { seal, verifySealed, canonicalJudgmentJson };
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Description = string | Json[] | { [key: string]: Json } | null;
export type EvidenceSnapshot = {
  schemaVersion: 'judgment-evidence.v2';
  caseId: string;
  groupId: string;
  cutoff: string;
  certification: 'synthetic' | 'reconstructed' | 'reviewer_verified';
  context: { [key: string]: Json };
  facts: Record<string, boolean | null>;
  eligibility: { scope: 'complete' | 'incomplete'; mandatoryHumanReview: boolean };
  sources: {
    id: string;
    entityId: string;
    sourceRef: string;
    observedAt: string;
    capturedAt: string;
    text: string;
  }[];
};
type QuestionBase = {
  id: string;
  version: string;
  evidenceIds: string[];
  instructions: Description;
};
export type NativeQuestion =
  | {
      type: 'noul';
      instructions: Description;
      criteria?: { true: Description; false: Description };
    }
  | { type: 'choice'; instructions: Description; criteria: Record<string, Description> }
  | { type: 'score'; instructions: Description; criteria: Description[] };
export type Question = QuestionBase & NativeQuestion;
export type QuestionSet = {
  schemaVersion: 'judgment-questions.v2';
  id: string;
  version: string;
  questions: Question[];
};
export type RawAnswer =
  | { type: 'noul'; noul: number }
  | { type: 'choice'; choice: string; probabilities: Record<string, number>; confidence: number }
  | {
      type: 'score';
      score: number;
      legend: Record<string, Description>;
      probabilities: Record<string, number>;
      confidence: number;
    };
export type NativeRequest = {
  state: {
    context: EvidenceSnapshot['context'];
    facts: EvidenceSnapshot['facts'];
    evidence: Record<string, Omit<EvidenceSnapshot['sources'][number], 'id'>>;
  };
  model: string;
  questions: Record<string, NativeQuestion>;
};
export type RawResponse = {
  model: string;
  answers: Record<string, RawAnswer>;
  usage: { input_tokens: number; output_tokens: number };
};
export type InferenceTrace = {
  invocationId: string;
  providerRequestId: string | null;
  adapterVersion: string;
  startedAt: string;
  completedAt: string;
  latencyMs: number;
};
export type InferenceRun = {
  schemaVersion: 'judgment-inference.v2';
  snapshotDigest: string;
  questionSetDigest: string;
  requestDigest: string;
  request: NativeRequest;
  response: RawResponse | null;
  trace: InferenceTrace;
  error: null | 'timeout' | 'rate_limited' | 'transport' | 'invalid_response';
};
export type Rule = {
  id: string;
  applicability: 'applicable' | 'not_applicable' | 'unknown';
  mode: 'require' | 'forbid';
  source:
    | { kind: 'fact'; factId: string }
    | {
        kind: 'answer';
        questionId: string;
        metric: 'noul' | 'choice_probability' | 'score' | 'confidence';
        option?: string;
      };
  operator: 'gte' | 'lte' | 'eq';
  threshold: number;
};
export type DecisionPolicy = {
  schemaVersion: 'judgment-policy.v2';
  id: string;
  version: string;
  questionSetDigest: string;
  rules: Rule[];
};
export type DecisionRun = {
  schemaVersion: 'judgment-decision.v2';
  snapshotDigest: string;
  questionSetDigest: string;
  inferenceDigest: string;
  policyDigest: string;
  result: 'prerequisites_supported' | 'needs_human';
  reasons: string[];
  authority: 'advisory_only';
};
export type Label = {
  snapshotDigest: string;
  split: 'development' | 'held_out';
  value: string;
  provenance: {
    kind: 'synthetic' | 'model_generated' | 'human_reviewed' | 'observed_outcome';
    actor: string;
    model: string | null;
    version: string;
    independent: boolean;
    createdAt: string;
  };
};

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function fields(
  value: unknown,
  keys: string[],
  required = keys
): asserts value is Record<string, unknown> {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), 'expected object');
  check(
    Object.keys(value).every((k) => keys.includes(k)),
    'unexpected field'
  );
  check(
    required.every((k) => Object.hasOwn(value, k)),
    'missing field'
  );
}
function text(value: unknown): asserts value is string {
  check(typeof value === 'string' && value.trim().length > 0, 'expected text');
}
function identifier(value: unknown): asserts value is string {
  text(value);
  check(
    /^[A-Za-z][A-Za-z0-9_:-]*$/.test(value) &&
      !['__proto__', 'prototype', 'constructor'].includes(value),
    'invalid identifier'
  );
}
function array(value: unknown): asserts value is unknown[] {
  check(Array.isArray(value), 'expected array');
}
function enumValue(value: unknown, choices: unknown[]) {
  check(choices.includes(value), 'invalid enum');
}
function number(value: unknown): asserts value is number {
  check(typeof value === 'number' && Number.isFinite(value), 'invalid number');
}
function probability(value: unknown) {
  number(value);
  check(value >= 0 && value <= 1, 'invalid probability');
}
function digest(value: unknown) {
  check(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), 'invalid digest');
}
function unique(ids: string[]) {
  check(new Set(ids).size === ids.length, 'duplicate ID');
}
function time(value: unknown): number {
  text(value);
  const parsed = Date.parse(value);
  check(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) && Number.isFinite(parsed),
    'invalid UTC time'
  );
  check(
    new Date(parsed).toISOString() === value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z'),
    'invalid calendar time'
  );
  return parsed;
}
function description(value: unknown) {
  check(
    value === null || typeof value === 'string' || typeof value === 'object',
    'invalid description'
  );
  canonicalJudgmentJson(value);
}
function map(value: unknown): asserts value is Record<string, unknown> {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), 'expected map');
  canonicalJudgmentJson(value);
}
function sameKeys(value: unknown, expected: string[]) {
  map(value);
  check(
    Object.keys(value).sort().join('\0') === [...expected].sort().join('\0'),
    'mismatched keys'
  );
}

export function validateSnapshot(s: EvidenceSnapshot): void {
  fields(s, [
    'schemaVersion',
    'caseId',
    'groupId',
    'cutoff',
    'certification',
    'context',
    'facts',
    'eligibility',
    'sources'
  ]);
  enumValue(s.schemaVersion, ['judgment-evidence.v2']);
  text(s.caseId);
  text(s.groupId);
  const cutoff = time(s.cutoff);
  enumValue(s.certification, ['synthetic', 'reconstructed', 'reviewer_verified']);
  map(s.context);
  map(s.facts);
  for (const [key, value] of Object.entries(s.facts)) {
    identifier(key);
    check(value === null || typeof value === 'boolean', 'invalid fact');
  }
  fields(s.eligibility, ['scope', 'mandatoryHumanReview']);
  enumValue(s.eligibility.scope, ['complete', 'incomplete']);
  check(typeof s.eligibility.mandatoryHumanReview === 'boolean', 'invalid eligibility');
  array(s.sources);
  check(s.sources.length > 0, 'empty sources');
  for (const source of s.sources) {
    fields(source, ['id', 'entityId', 'sourceRef', 'observedAt', 'capturedAt', 'text']);
    identifier(source.id);
    text(source.entityId);
    text(source.sourceRef);
    text(source.text);
    const observed = time(source.observedAt);
    check(observed <= cutoff, 'evidence after cutoff');
    check(time(source.capturedAt) >= observed, 'capture before observation');
  }
  unique(s.sources.map((s) => s.id));
}
export function validateQuestions(set: QuestionSet): void {
  fields(set, ['schemaVersion', 'id', 'version', 'questions']);
  enumValue(set.schemaVersion, ['judgment-questions.v2']);
  text(set.id);
  text(set.version);
  array(set.questions);
  check(set.questions.length > 0, 'empty questions');
  for (const q of set.questions) {
    fields(
      q,
      ['id', 'version', 'evidenceIds', 'type', 'instructions', 'criteria'],
      ['id', 'version', 'evidenceIds', 'type', 'instructions']
    );
    identifier(q.id);
    text(q.version);
    description(q.instructions);
    array(q.evidenceIds);
    check(q.evidenceIds.length > 0, 'missing question evidence');
    q.evidenceIds.forEach(identifier);
    unique(q.evidenceIds);
    enumValue(q.type, ['noul', 'choice', 'score']);
    if (q.type === 'noul') {
      if (q.criteria !== undefined) {
        fields(q.criteria, ['true', 'false']);
        description(q.criteria.true);
        description(q.criteria.false);
      }
    } else if (q.type === 'choice') {
      map(q.criteria);
      const keys = Object.keys(q.criteria);
      check(keys.length >= 2 && keys.length <= 255, 'Choice requires 2..255 options');
      keys.forEach(text);
      Object.values(q.criteria).forEach(description);
    } else {
      array(q.criteria);
      check(q.criteria.length >= 2 && q.criteria.length <= 10, 'Score requires 2..10 levels');
      q.criteria.forEach(description);
    }
  }
  unique(set.questions.map((q) => q.id));
}

/** Retains primitive meaning and adds explicit evidence paths to model-visible instructions. */
export function compileRequest(
  snapshot: Sealed<EvidenceSnapshot>,
  questions: Sealed<QuestionSet>,
  model: string
): NativeRequest {
  const s = verifySealed(snapshot),
    set = verifySealed(questions);
  validateSnapshot(s);
  validateQuestions(set);
  text(model);
  const used = new Set(set.questions.flatMap((q) => q.evidenceIds));
  const evidence: NativeRequest['state']['evidence'] = {};
  for (const source of s.sources)
    if (used.has(source.id)) {
      const { id, ...record } = source;
      evidence[id] = record;
    }
  for (const id of used) check(Object.hasOwn(evidence, id), 'missing evidence reference');
  const compiled: Record<string, NativeQuestion> = {};
  for (const q of set.questions) {
    const instructions = {
      task: q.instructions,
      evidencePaths: q.evidenceIds.map((id) =>
        /^[A-Za-z][A-Za-z0-9_]*$/.test(id)
          ? `\`evidence.${id}\``
          : `\`evidence[${JSON.stringify(id)}]\``
      )
    };
    if (q.type === 'noul')
      compiled[q.id] = {
        type: q.type,
        instructions,
        ...(q.criteria === undefined ? {} : { criteria: q.criteria })
      };
    else if (q.type === 'choice')
      compiled[q.id] = { type: q.type, instructions, criteria: q.criteria };
    else compiled[q.id] = { type: q.type, instructions, criteria: q.criteria };
  }
  return seal({
    state: { context: s.context, facts: s.facts, evidence },
    model,
    questions: compiled
  }).payload;
}
function validateResponse(response: RawResponse, request: NativeRequest): void {
  fields(response, ['model', 'answers', 'usage']);
  text(response.model);
  check(
    response.model !== 'jev-latest' && response.model !== 'jev-preview',
    'served model must be resolved'
  );
  if (!['jev-latest', 'jev-preview'].includes(request.model))
    check(response.model === request.model, 'pinned model mismatch');
  fields(response.usage, ['input_tokens', 'output_tokens']);
  for (const n of Object.values(response.usage))
    check(Number.isSafeInteger(n) && n >= 0, 'invalid token usage');
  sameKeys(response.answers, Object.keys(request.questions));
  for (const [id, q] of Object.entries(request.questions)) {
    const a = response.answers[id];
    check(a !== null && typeof a === 'object' && a.type === q.type, 'answer type mismatch');
    if (a.type === 'noul') {
      fields(a, ['type', 'noul']);
      probability(a.noul);
      continue;
    }
    probability(a.confidence);
    const options =
      q.type === 'choice'
        ? Object.keys(q.criteria)
        : q.type === 'score'
          ? q.criteria.map((_, i) => String(i))
          : [];
    sameKeys(a.probabilities, options);
    Object.values(a.probabilities).forEach(probability);
    check(
      Math.abs(Object.values(a.probabilities).reduce((s, p) => s + p, 0) - 1) <= 1e-6,
      'probability sum mismatch'
    );
    if (a.type === 'choice') {
      fields(a, ['type', 'choice', 'probabilities', 'confidence']);
      check(options.includes(a.choice), 'unknown selected option');
      check(
        a.probabilities[a.choice] >= Math.max(...Object.values(a.probabilities)) - 1e-9,
        'selected option is not highest probability'
      );
    } else {
      fields(a, ['type', 'score', 'legend', 'probabilities', 'confidence']);
      number(a.score);
      sameKeys(a.legend, options);
      check(q.type === 'score', 'score question mismatch');
      for (const key of options)
        check(
          canonicalJudgmentJson(a.legend[key]) === canonicalJudgmentJson(q.criteria[Number(key)]),
          'legend mismatch'
        );
      const expected = Object.entries(a.probabilities).reduce((s, [i, p]) => s + Number(i) * p, 0);
      check(
        a.score >= 0 && a.score <= options.length - 1 && Math.abs(a.score - expected) <= 1e-6,
        'score expectation mismatch'
      );
    }
  }
}

export function recordInference(
  snapshot: Sealed<EvidenceSnapshot>,
  questions: Sealed<QuestionSet>,
  model: string,
  response: RawResponse | null,
  trace: InferenceTrace,
  error: InferenceRun['error'] = null
): Sealed<InferenceRun> {
  const request = compileRequest(snapshot, questions, model);
  fields(trace, [
    'invocationId',
    'providerRequestId',
    'adapterVersion',
    'startedAt',
    'completedAt',
    'latencyMs'
  ]);
  text(trace.invocationId);
  text(trace.adapterVersion);
  if (trace.providerRequestId !== null) text(trace.providerRequestId);
  check(time(trace.startedAt) >= time(snapshot.payload.cutoff), 'run before cutoff');
  check(
    snapshot.payload.sources.every((source) => time(source.capturedAt) <= time(trace.startedAt)),
    'run before capture'
  );
  check(time(trace.completedAt) >= time(trace.startedAt), 'invalid run time');
  number(trace.latencyMs);
  check(trace.latencyMs >= 0, 'invalid latency');
  enumValue(error, [null, 'timeout', 'rate_limited', 'transport', 'invalid_response']);
  if (error !== null) check(response === null, 'failed run cannot have response');
  else {
    check(response !== null, 'missing response');
    validateResponse(response, request);
  }
  return seal({
    schemaVersion: 'judgment-inference.v2',
    snapshotDigest: snapshot.digest,
    questionSetDigest: questions.digest,
    requestDigest: seal(request).digest,
    request,
    response,
    trace,
    error
  });
}
function verifyInference(
  snapshot: Sealed<EvidenceSnapshot>,
  questions: Sealed<QuestionSet>,
  run: Sealed<InferenceRun>
): InferenceRun {
  const r = verifySealed(run);
  fields(r, [
    'schemaVersion',
    'snapshotDigest',
    'questionSetDigest',
    'requestDigest',
    'request',
    'response',
    'trace',
    'error'
  ]);
  enumValue(r.schemaVersion, ['judgment-inference.v2']);
  check(
    r.snapshotDigest === snapshot.digest && r.questionSetDigest === questions.digest,
    'inference input mismatch'
  );
  const rebuilt = recordInference(
    snapshot,
    questions,
    r.request.model,
    r.response,
    r.trace,
    r.error
  );
  check(rebuilt.digest === run.digest, 'inference request/replay mismatch');
  return rebuilt.payload;
}
export function validatePolicy(p: DecisionPolicy, questions: QuestionSet): void {
  fields(p, ['schemaVersion', 'id', 'version', 'questionSetDigest', 'rules']);
  enumValue(p.schemaVersion, ['judgment-policy.v2']);
  text(p.id);
  text(p.version);
  digest(p.questionSetDigest);
  array(p.rules);
  check(p.rules.length > 0, 'empty policy');
  for (const rule of p.rules) {
    fields(rule, ['id', 'applicability', 'mode', 'source', 'operator', 'threshold']);
    identifier(rule.id);
    enumValue(rule.applicability, ['applicable', 'not_applicable', 'unknown']);
    enumValue(rule.mode, ['require', 'forbid']);
    enumValue(rule.operator, ['gte', 'lte', 'eq']);
    number(rule.threshold);
    fields(rule.source, ['kind', 'factId', 'questionId', 'metric', 'option'], ['kind']);
    if (rule.source.kind === 'fact') {
      fields(rule.source, ['kind', 'factId']);
      identifier(rule.source.factId);
      enumValue(rule.threshold, [0, 1]);
    } else {
      fields(
        rule.source,
        ['kind', 'questionId', 'metric', 'option'],
        ['kind', 'questionId', 'metric']
      );
      enumValue(rule.source.kind, ['answer']);
      const source = rule.source;
      const q = questions.questions.find((q) => q.id === source.questionId);
      check(q, 'unknown policy question');
      enumValue(source.metric, ['noul', 'choice_probability', 'score', 'confidence']);
      if (source.metric === 'noul') check(q.type === 'noul', 'metric primitive mismatch');
      if (source.metric === 'score') check(q.type === 'score', 'metric primitive mismatch');
      if (source.metric === 'confidence') check(q.type !== 'noul', 'Noul has no confidence');
      if (source.metric === 'choice_probability') {
        check(
          q.type === 'choice' &&
            typeof source.option === 'string' &&
            Object.hasOwn(q.criteria, source.option),
          'invalid policy option'
        );
      } else check(!Object.hasOwn(source, 'option'), 'unused policy option');
      if (source.metric !== 'score') probability(rule.threshold);
      else
        check(
          q.type === 'score' && rule.threshold >= 0 && rule.threshold <= q.criteria.length - 1,
          'invalid score threshold'
        );
    }
  }
  unique(p.rules.map((r) => r.id));
}
function measure(rule: Rule, snapshot: EvidenceSnapshot, run: InferenceRun): number | null {
  if (rule.source.kind === 'fact') {
    const v = snapshot.facts[rule.source.factId];
    return typeof v === 'boolean' ? Number(v) : null;
  }
  const s = rule.source,
    a = run.response?.answers[s.questionId];
  if (!a) return null;
  if (s.metric === 'noul' && a.type === 'noul') return a.noul;
  if (s.metric === 'score' && a.type === 'score') return a.score;
  if (s.metric === 'confidence' && a.type !== 'noul') return a.confidence;
  if (s.metric === 'choice_probability' && a.type === 'choice') return a.probabilities[s.option!];
  throw new Error('metric mismatch');
}
export function decide(
  snapshot: Sealed<EvidenceSnapshot>,
  questions: Sealed<QuestionSet>,
  inference: Sealed<InferenceRun>,
  policy: Sealed<DecisionPolicy>
): Sealed<DecisionRun> {
  const run = verifyInference(snapshot, questions, inference),
    p = verifySealed(policy);
  validatePolicy(p, questions.payload);
  check(p.questionSetDigest === questions.digest, 'policy question-set mismatch');
  const reasons: string[] = [];
  if (snapshot.payload.eligibility.mandatoryHumanReview) reasons.push('mandatory_human_review');
  if (snapshot.payload.eligibility.scope !== 'complete') reasons.push('incomplete_scope');
  if (run.error !== null) reasons.push(`provider:${run.error}`);
  if (!p.rules.some((r) => r.applicability === 'applicable')) reasons.push('no_applicable_rules');
  for (const rule of p.rules) {
    if (rule.applicability === 'not_applicable') continue;
    if (rule.applicability === 'unknown') {
      reasons.push(`${rule.id}:unknown_applicability`);
      continue;
    }
    const value = measure(rule, snapshot.payload, run);
    if (value === null) {
      reasons.push(`${rule.id}:missing_measurement`);
      continue;
    }
    const matched =
      rule.operator === 'gte'
        ? value >= rule.threshold
        : rule.operator === 'lte'
          ? value <= rule.threshold
          : value === rule.threshold;
    if (rule.mode === 'require' ? !matched : matched)
      reasons.push(`${rule.id}:${rule.mode === 'require' ? 'requirement_not_met' : 'violation'}`);
  }
  return seal({
    schemaVersion: 'judgment-decision.v2',
    snapshotDigest: snapshot.digest,
    questionSetDigest: questions.digest,
    inferenceDigest: inference.digest,
    policyDigest: policy.digest,
    result: reasons.length ? 'needs_human' : 'prerequisites_supported',
    reasons,
    authority: 'advisory_only'
  });
}
export function replayDecision(
  snapshot: Sealed<EvidenceSnapshot>,
  questions: Sealed<QuestionSet>,
  inference: Sealed<InferenceRun>,
  policy: Sealed<DecisionPolicy>,
  decision: Sealed<DecisionRun>
): DecisionRun {
  verifySealed(decision);
  const rebuilt = decide(snapshot, questions, inference, policy);
  check(rebuilt.digest === decision.digest, 'decision replay mismatch');
  return rebuilt.payload;
}

/** Structural provenance only; authenticating labelers is owned by the intake application. */
export function validateLabels(
  snapshots: Sealed<EvidenceSnapshot>[],
  labels: Label[],
  lane: 'development' | 'effectiveness'
) {
  enumValue(lane, ['development', 'effectiveness']);
  array(snapshots);
  array(labels);
  check(snapshots.length > 0 && snapshots.length === labels.length, 'missing or extra labels');
  snapshots.forEach((s) => validateSnapshot(verifySealed(s)));
  unique(snapshots.map((s) => s.payload.caseId));
  unique(snapshots.map((s) => s.digest));
  const groups = new Map<string, string>();
  for (const label of labels) {
    fields(label, ['snapshotDigest', 'split', 'value', 'provenance']);
    digest(label.snapshotDigest);
    text(label.value);
    enumValue(label.split, ['development', 'held_out']);
    const s = snapshots.find((s) => s.digest === label.snapshotDigest);
    check(s, 'unknown label snapshot');
    const p = label.provenance;
    fields(p, ['kind', 'actor', 'model', 'version', 'independent', 'createdAt']);
    enumValue(p.kind, ['synthetic', 'model_generated', 'human_reviewed', 'observed_outcome']);
    text(p.actor);
    text(p.version);
    check(typeof p.independent === 'boolean', 'invalid independence');
    check(time(p.createdAt) >= time(s.payload.cutoff), 'label before evidence');
    if (p.kind === 'model_generated') text(p.model);
    else check(p.model === null, 'unexpected labeler model');
    if (lane === 'effectiveness') {
      check(
        s.payload.certification === 'reviewer_verified' &&
          p.kind === 'human_reviewed' &&
          p.independent,
        'independent reviewer evidence required'
      );
      enumValue(label.value, ['needs_human', 'prerequisites_supported']);
    }
    const group = s.payload.groupId;
    check(!groups.has(group) || groups.get(group) === label.split, 'group split leakage');
    groups.set(group, label.split);
  }
  unique(labels.map((l) => l.snapshotDigest));
  if (lane === 'effectiveness')
    check(
      labels.some((l) => l.split === 'development') && labels.some((l) => l.split === 'held_out'),
      'independent development and held_out splits required'
    );
  return { eligibleCases: labels.length, lane, effectiveness: 'not_established' as const };
}
