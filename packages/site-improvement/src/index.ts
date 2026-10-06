/** Headless, fixture-only experiment mechanics. No storage, network, rendering or promotion. */
export type Scope = Readonly<{
  tenantId: string; siteId: string; experimentId: string; allocationVersion: string;
}>;
export type Channel = 'site' | 'human_task' | 'synthetic_agent';
export type Authority = 'server_receipt' | 'client_diagnostic' | 'task_evaluation';
export type Traffic = Readonly<{
  class: 'external' | 'internal' | 'preview' | 'automated' | 'test';
  source: 'declared' | 'host' | 'user_agent' | 'default';
}>;
export type SiteAdapter = Readonly<{
  tenantId: string; siteId: string; surface: string;
  paths: readonly string[]; recipeFields: readonly string[];
  outcomes: Readonly<Record<string, Readonly<{ authority: Authority; channel: Channel }>>>;
}>;
export type Recipe = Readonly<{ id: string; version: string; changes: Readonly<Record<string, string>> }>;
export type EvaluationPlan = Readonly<{
  primaryOutcome: string; channel: Channel; unit: 'assigned_subject';
  baselineRef: string | null; outcomeDefinitionRef: string | null;
  attributionWindowMs: number | null; minAssignments: number | null;
  maxMissingExposureFraction: number | null; guardrails: readonly string[];
}>;
export type ExperimentSpec = Readonly<{
  scope: Scope; enabled: boolean; killSwitch: boolean; rolloutBps: number;
  startAt: number; endAt: number; seed: string; surface: string; paths: readonly string[];
  controlId: string; recipes: readonly Recipe[]; plan: EvaluationPlan;
}>;
export type Assignment = Readonly<{
  id: string; scope: Scope; subjectToken: string; configKey: string;
  variantId: string; recipeVersion: string; surface: string; path: string;
  assignedAt: number; expiresAt: number; channel: Channel; traffic: Traffic;
}>;
export type AssignmentContext = Readonly<{
  scope: Scope; mode: 'fixture' | 'live'; now: number; path: string;
  consent: Readonly<{ measurement: 'allowed' | 'denied' | 'unknown'; persistence: 'allowed' | 'denied' | 'unknown' }>;
  dnt: boolean; optedOut: boolean; subjectToken: string | null;
  channel: Channel; traffic: Traffic; previous?: Assignment;
}>;
export type AssignmentResult =
  | Readonly<{ state: 'assigned'; assignment: Assignment }>
  | Readonly<{ state: 'control'; reason: string }>;
export type Exposure = Readonly<{
  id: string; scope: Scope; assignmentId: string; variantId: string; recipeVersion: string;
  surface: string; path: string; observedAt: number; evidence: 'render_acknowledged';
}>;
/** Records must originate at a trusted adapter. A client assertion is not a verified receipt. */
export type Outcome = Readonly<{
  id: string; scope: Scope; assignmentId: string; receiptKey: string; kind: string;
  authority: Authority; channel: Channel; acknowledged: boolean; observedAt: number;
}>;
export type Guardrail = Readonly<{ scope: Scope; kind: string; passed: boolean; evidenceRef: string }>;
export type Records = Readonly<{
  assignments: readonly Assignment[]; exposures: readonly Exposure[];
  outcomes: readonly Outcome[]; guardrails: readonly Guardrail[];
}>;
export type Decision = Readonly<{
  id: string; scope: Scope; previousId: string | null; owner: string; at: number;
  action: 'propose' | 'approve_fixture' | 'pause' | 'rollback' | 'review' | 'inconclusive' | 'request_activation';
  reason: string; evidenceRefs: readonly string[]; rollbackAllocationVersion: string | null;
}>;

const SCOPE_KEYS = ['tenantId', 'siteId', 'experimentId', 'allocationVersion'];
const ASSIGNMENT_KEYS = ['id', 'scope', 'subjectToken', 'configKey', 'variantId', 'recipeVersion', 'surface', 'path', 'assignedAt', 'expiresAt', 'channel', 'traffic'];
const EXPOSURE_KEYS = ['id', 'scope', 'assignmentId', 'variantId', 'recipeVersion', 'surface', 'path', 'observedAt', 'evidence'];
const OUTCOME_KEYS = ['id', 'scope', 'assignmentId', 'receiptKey', 'kind', 'authority', 'channel', 'acknowledged', 'observedAt'];
const CHANNELS = ['site', 'human_task', 'synthetic_agent'];
const TRAFFIC_CLASSES = ['external', 'internal', 'preview', 'automated', 'test'];
const TRAFFIC_SOURCES = ['declared', 'host', 'user_agent', 'default'];
const AUTHORITIES = ['server_receipt', 'client_diagnostic', 'task_evaluation'];
const token = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(v);
const subject = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 2000;
const time = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: unknown, allowed: readonly string[]) => object(v) && Object.keys(v).every(k => allowed.includes(k));
const validScope = (v: unknown): v is Scope => keys(v, SCOPE_KEYS) && SCOPE_KEYS.every(k => token((v as Record<string, unknown>)[k]));
const scopeTuple = (s: Scope) => [s.tenantId, s.siteId, s.experimentId, s.allocationVersion];
const sameScope = (a: unknown, b: Scope) => validScope(a) && scopeTuple(a).every((v, i) => v === scopeTuple(b)[i]);
const validTraffic = (v: unknown): v is Traffic => keys(v, ['class', 'source']) && TRAFFIC_CLASSES.includes((v as Traffic).class) && TRAFFIC_SOURCES.includes((v as Traffic).source);
const validPath = (p: unknown): p is string => typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !/[?#\s]/.test(p);
const unique = (values: readonly string[]) => new Set(values).size === values.length;

/** Canonical equality/keying, including scope, avoids delimiter and insertion-order ambiguity. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (object(v)) return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v) ?? 'null';
}

/** Frozen fixture allocation algorithm; not cryptography, signing, identity proof or a statistics engine. */
function bucket(domain: string, spec: ExperimentSpec, subjectToken: string): number {
  const input = canonical(['fnv1a32-v1', domain, scopeTuple(spec.scope), spec.seed, subjectToken]);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619) >>> 0;
  // Avalanche the low bits before deriving cohort and arm; freeze this mix with the version.
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35) >>> 0;
  return (hash ^ (hash >>> 16)) >>> 0;
}
function configuration(spec: ExperimentSpec): string {
  return canonical(['fnv1a32-v1', scopeTuple(spec.scope), spec.seed, spec.surface, spec.paths, spec.controlId, spec.recipes]);
}
function selectedRecipe(spec: ExperimentSpec, subjectToken: string): Recipe {
  return spec.recipes[bucket('arm', spec, subjectToken) % 2];
}
function assignmentId(spec: ExperimentSpec, subjectToken: string): string {
  // Internal ledger key, not an analytics ID; a future adapter supplies an opaque transport alias.
  return canonical(['assignment', scopeTuple(spec.scope), subjectToken]);
}
function planIssues(plan: EvaluationPlan): string[] {
  const issues: string[] = [];
  if (!text(plan.baselineRef) || !text(plan.outcomeDefinitionRef)) issues.push('baseline_or_definition_unresolved');
  if (!time(plan.attributionWindowMs) || plan.attributionWindowMs === 0) issues.push('attribution_window_unresolved');
  if (!Number.isSafeInteger(plan.minAssignments) || (plan.minAssignments ?? 0) < 1) issues.push('evidence_threshold_unresolved');
  if (typeof plan.maxMissingExposureFraction !== 'number' || !Number.isFinite(plan.maxMissingExposureFraction) || plan.maxMissingExposureFraction < 0 || plan.maxMissingExposureFraction > 1) issues.push('quality_threshold_unresolved');
  return issues;
}

/** Validate contracts, not the truth of an operator's evidence reference. */
export function validateExperiment(spec: ExperimentSpec, adapter: SiteAdapter): readonly string[] {
  if (!object(spec) || !object(adapter) || !validScope(spec.scope)) return ['invalid_scope_or_adapter'];
  const issues: string[] = [];
  if (spec.scope.tenantId !== adapter.tenantId || spec.scope.siteId !== adapter.siteId) issues.push('adapter_scope_mismatch');
  if (!Number.isInteger(spec.rolloutBps) || spec.rolloutBps < 0 || spec.rolloutBps > 10000) issues.push('invalid_rollout');
  if (typeof spec.enabled !== 'boolean' || typeof spec.killSwitch !== 'boolean') issues.push('invalid_switches');
  if (!time(spec.startAt) || !time(spec.endAt) || spec.endAt <= spec.startAt) issues.push('invalid_window');
  if (!token(spec.seed) || !token(spec.surface) || spec.surface !== adapter.surface) issues.push('invalid_surface_or_seed');
  if (!Array.isArray(adapter.paths) || !Array.isArray(adapter.recipeFields) || !object(adapter.outcomes)) return [...issues, 'invalid_adapter'];
  if (!Array.isArray(spec.paths) || !spec.paths.length || !unique(spec.paths) || spec.paths.some(p => !validPath(p) || !adapter.paths.includes(p))) issues.push('invalid_paths');
  if (!Array.isArray(spec.recipes) || spec.recipes.length !== 2) issues.push('exactly_two_recipes_required');
  else {
    if (!unique(spec.recipes.map(r => r?.id)) || !spec.recipes.some(r => r?.id === spec.controlId)) issues.push('invalid_recipe_ids');
    for (const recipe of spec.recipes) {
      if (!object(recipe) || !token(recipe.id) || !token(recipe.version) || !keys(recipe.changes, adapter.recipeFields) || !Object.keys(recipe.changes ?? {}).length || Object.values(recipe.changes ?? {}).some(v => !text(v))) issues.push('invalid_recipe');
    }
    if (canonical(Object.keys(spec.recipes[0]?.changes ?? {}).sort()) !== canonical(Object.keys(spec.recipes[1]?.changes ?? {}).sort())) issues.push('incoherent_recipe_fields');
  }
  if (!object(spec.plan)) return [...issues, 'invalid_plan'];
  const primary = adapter.outcomes[spec.plan.primaryOutcome];
  if (spec.plan.unit !== 'assigned_subject' || !CHANNELS.includes(spec.plan.channel) || !primary || !AUTHORITIES.includes(primary.authority) || primary.channel !== spec.plan.channel) issues.push('invalid_primary_outcome');
  if (!Array.isArray(spec.plan.guardrails) || !spec.plan.guardrails.length || !unique(spec.plan.guardrails) || spec.plan.guardrails.some(g => !token(g))) issues.push('invalid_guardrails');
  if (spec.enabled && !spec.killSwitch) issues.push(...planIssues(spec.plan));
  return [...new Set(issues)];
}

function validAssignment(a: Assignment, spec: ExperimentSpec): boolean {
  if (!keys(a, ASSIGNMENT_KEYS) || !sameScope(a.scope, spec.scope) || !subject(a.subjectToken) || !validTraffic(a.traffic) || !CHANNELS.includes(a.channel)) return false;
  const recipe = selectedRecipe(spec, a.subjectToken);
  return a.id === assignmentId(spec, a.subjectToken) && a.configKey === configuration(spec) &&
    a.variantId === recipe.id && a.recipeVersion === recipe.version && a.surface === spec.surface &&
    spec.paths.includes(a.path) && time(a.assignedAt) && a.assignedAt >= spec.startAt && a.assignedAt < spec.endAt && a.expiresAt === spec.endAt;
}

/** Always rejects live mode. Switching a fixture on does not authorize public assignment. */
export function resolveAssignment(spec: ExperimentSpec, adapter: SiteAdapter, ctx: AssignmentContext): AssignmentResult {
  const control = (reason: string): AssignmentResult => ({ state: 'control', reason });
  if (validateExperiment(spec, adapter).length) return control('invalid_specification');
  if (ctx.mode !== 'fixture') return control('live_not_supported');
  if (!sameScope(ctx.scope, spec.scope)) return control('scope_mismatch');
  if (!time(ctx.now) || !validTraffic(ctx.traffic) || !CHANNELS.includes(ctx.channel)) return control('invalid_context');
  if (ctx.dnt !== false || ctx.optedOut !== false || ctx.consent?.measurement !== 'allowed' || ctx.consent?.persistence !== 'allowed') return control('permission_missing');
  if (!spec.enabled || spec.killSwitch || spec.rolloutBps === 0) return control('disabled');
  if (ctx.now < spec.startAt || ctx.now >= spec.endAt) return control('outside_window');
  if (!spec.paths.includes(ctx.path)) return control('outside_surface');
  if (!subject(ctx.subjectToken)) return control('subject_missing');
  if (bucket('cohort', spec, ctx.subjectToken) % 10000 >= spec.rolloutBps) return control('outside_rollout');
  if (ctx.previous) {
    if (!validAssignment(ctx.previous, spec) || ctx.previous.subjectToken !== ctx.subjectToken || ctx.previous.assignedAt > ctx.now || ctx.previous.path !== ctx.path || ctx.previous.channel !== ctx.channel || canonical(ctx.previous.traffic) !== canonical(ctx.traffic)) return control('invalid_prior_assignment');
    return { state: 'assigned', assignment: ctx.previous };
  }
  const recipe = selectedRecipe(spec, ctx.subjectToken);
  return { state: 'assigned', assignment: {
    id: assignmentId(spec, ctx.subjectToken), scope: { ...spec.scope }, subjectToken: ctx.subjectToken,
    configKey: configuration(spec), variantId: recipe.id, recipeVersion: recipe.version,
    surface: spec.surface, path: ctx.path, assignedAt: ctx.now, expiresAt: spec.endAt,
    channel: ctx.channel, traffic: { ...ctx.traffic }
  } };
}

/** Descriptive, assignment-based evaluation. No winner, uplift, significance or promotion output. */
export function evaluateExperiment(spec: ExperimentSpec, adapter: SiteAdapter, records: Records, now: number) {
  const issues = [...validateExperiment(spec, adapter)];
  if (object(spec?.plan)) issues.push(...planIssues(spec.plan));
  if (!time(now)) issues.push('invalid_review_clock');
  const counts: Record<string, { assigned: number; exposed: number; primarySubjects: number; diagnosticReceipts: number }> = Object.create(null);
  for (const recipe of Array.isArray(spec?.recipes) ? spec.recipes : []) if (recipe?.id) counts[recipe.id] = { assigned: 0, exposed: 0, primarySubjects: 0, diagnosticReceipts: 0 };
  const assignments = new Map<string, Assignment>();
  const eligible = new Map<string, Assignment>();
  const exposed = new Map<string, Exposure>();
  const outcomeKeys = new Map<string, Outcome>();
  const eventIds = new Map<string, string>();
  const primarySubjects = new Set<string>();
  const excluded: Record<string, number> = Object.create(null);
  let duplicates = 0;
  // Never traverse malformed records/spec after validation fails.
  const validRecords = object(records) && [records.assignments, records.exposures, records.outcomes, records.guardrails].every(Array.isArray);
  if (issues.length || !validRecords) {
    return { status: 'blocked' as const, issues: [...new Set([...issues, ...(!validRecords ? ['invalid_records'] : [])])], counts, excluded, duplicates, missingExposures: 0, trafficCaveat: 'external is unverified; fixture counts are not human conversion evidence' };
  }
  const checkId = (id: unknown, record: unknown): boolean => {
    if (!text(id)) { issues.push('invalid_record_id'); return false; }
    const value = canonical(record);
    if (eventIds.has(id)) {
      if (eventIds.get(id) !== value) issues.push('conflicting_record_id');
      else duplicates++;
      return false;
    }
    eventIds.set(id, value); return true;
  };
  for (const a of records.assignments) {
    if (!validAssignment(a, spec) || a.assignedAt > now) { issues.push('invalid_assignment'); continue; }
    if (!checkId(a.id, a)) continue;
    assignments.set(a.id, a);
    const exclusion = a.channel !== spec.plan.channel ? `channel:${a.channel}` : a.channel === 'site' && a.traffic.class !== 'external' ? `traffic:${a.traffic.class}` : null;
    if (exclusion) { excluded[exclusion] = (excluded[exclusion] ?? 0) + 1; continue; }
    eligible.set(a.id, a); counts[a.variantId].assigned++;
  }
  for (const e of records.exposures) {
    if (!keys(e, EXPOSURE_KEYS) || !sameScope(e.scope, spec.scope)) { issues.push('invalid_exposure_scope_or_fields'); continue; }
    const a = assignments.get(e.assignmentId);
    if (!a || e.variantId !== a.variantId || e.recipeVersion !== a.recipeVersion || e.surface !== a.surface || e.path !== a.path || e.evidence !== 'render_acknowledged' || !time(e.observedAt) || e.observedAt < a.assignedAt || e.observedAt >= a.expiresAt || e.observedAt > now) { issues.push('invalid_exposure_join'); continue; }
    if (!checkId(e.id, e) || !eligible.has(a.id)) continue;
    if (exposed.has(a.id)) {
      duplicates++;
      // Earliest valid exposure anchors the predeclared attribution window, independent of record order.
      if (e.observedAt < exposed.get(a.id)!.observedAt) exposed.set(a.id, e);
      continue;
    }
    exposed.set(a.id, e); counts[a.variantId].exposed++;
  }
  for (const o of records.outcomes) {
    if (!keys(o, OUTCOME_KEYS) || !sameScope(o.scope, spec.scope) || !text(o.receiptKey)) { issues.push('invalid_outcome_scope_or_fields'); continue; }
    const a = assignments.get(o.assignmentId);
    const contract = adapter.outcomes[o.kind];
    if (!a || !contract || contract.authority !== o.authority || contract.channel !== o.channel || o.channel !== a.channel || o.acknowledged !== true) { issues.push('outcome_authority_or_channel_mismatch'); continue; }
    if (!checkId(o.id, o)) continue;
    // Dedup receipt authority before exposure filtering, so an unexposed conflicting claim cannot disappear.
    const key = canonical([scopeTuple(o.scope), o.kind, o.receiptKey]);
    const existing = outcomeKeys.get(key);
    if (existing) {
      if (existing.assignmentId !== o.assignmentId) issues.push('conflicting_outcome_assignment');
      else if (existing.observedAt !== o.observedAt || existing.authority !== o.authority) issues.push('conflicting_outcome_receipt');
      else duplicates++;
      continue;
    }
    outcomeKeys.set(key, o);
    if (!eligible.has(a.id)) continue;
    const e = exposed.get(a.id);
    if (!e || !time(o.observedAt) || o.observedAt < e.observedAt || o.observedAt > e.observedAt + spec.plan.attributionWindowMs! || o.observedAt > now) { issues.push('outcome_without_valid_exposure_window'); continue; }
    if (o.kind === spec.plan.primaryOutcome) {
      if (!primarySubjects.has(a.id)) { primarySubjects.add(a.id); counts[a.variantId].primarySubjects++; }
    } else counts[a.variantId].diagnosticReceipts++;
  }
  for (const g of records.guardrails) {
    if (!keys(g, ['scope', 'kind', 'passed', 'evidenceRef']) || !sameScope(g.scope, spec.scope) || !spec.plan.guardrails.includes(g.kind) || typeof g.passed !== 'boolean' || !text(g.evidenceRef)) issues.push('invalid_guardrail_evidence');
    else if (!g.passed) issues.push(`guardrail_failed:${g.kind}`);
  }
  for (const kind of spec.plan.guardrails) if (!records.guardrails.some(g => sameScope(g?.scope, spec.scope) && g.kind === kind && g.passed === true && text(g.evidenceRef))) issues.push(`guardrail_missing:${kind}`);
  const missingExposures = eligible.size - exposed.size;
  if (eligible.size && missingExposures / eligible.size > spec.plan.maxMissingExposureFraction!) issues.push('missing_exposure_guardrail');
  const status = issues.length ? 'blocked' as const : now < spec.endAt || eligible.size < spec.plan.minAssignments! ? 'inconclusive' as const : 'ready_for_human_review' as const;
  return { status, issues: [...new Set(issues)], counts, excluded, duplicates, missingExposures, trafficCaveat: 'external is unverified; fixture counts are not human conversion evidence' };
}

export function appendDecision(scope: Scope, history: readonly Decision[], decision: Decision):
  | { ok: true; history: readonly Decision[]; appended: boolean }
  | { ok: false; reason: string } {
  const valid = (d: Decision) => keys(d, ['id', 'scope', 'previousId', 'owner', 'at', 'action', 'reason', 'evidenceRefs', 'rollbackAllocationVersion']) &&
    sameScope(d.scope, scope) && token(d.id) && text(d.owner) && time(d.at) && text(d.reason) &&
    ['propose', 'approve_fixture', 'pause', 'rollback', 'review', 'inconclusive', 'request_activation'].includes(d.action) &&
    Array.isArray(d.evidenceRefs) && d.evidenceRefs.length > 0 && d.evidenceRefs.every(text) &&
    (d.action === 'rollback' ? token(d.rollbackAllocationVersion) : d.rollbackAllocationVersion === null);
  if (!validScope(scope) || !Array.isArray(history) || !valid(decision)) return { ok: false, reason: 'invalid_decision' };
  for (let i = 0; i < history.length; i++) {
    if (!valid(history[i]) || history[i].previousId !== (history[i - 1]?.id ?? null) || history.slice(0, i).some(d => d.id === history[i].id) || history[i].at < (history[i - 1]?.at ?? 0)) return { ok: false, reason: 'invalid_history' };
  }
  const existing = history.find(d => d.id === decision.id);
  if (existing) return canonical(existing) === canonical(decision) ? { ok: true, history: [...history], appended: false } : { ok: false, reason: 'conflicting_decision_id' };
  const prior = history.at(-1);
  if (decision.previousId !== (prior?.id ?? null) || decision.at < (prior?.at ?? 0)) return { ok: false, reason: 'stale_decision' };
  return { ok: true, history: [...history, { ...decision, scope: { ...decision.scope }, evidenceRefs: [...decision.evidenceRefs] }], appended: true };
}
