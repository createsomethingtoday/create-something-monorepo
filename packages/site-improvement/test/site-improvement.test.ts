import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  appendDecision, evaluateExperiment, resolveAssignment, validateExperiment,
  type Assignment, type AssignmentContext, type Decision, type ExperimentSpec, type Records, type SiteAdapter
} from '../src/index.ts';
import { agencyExperimentFixture, agencyRecipeBoundary, agencySiteAdapter } from '../../agency/src/lib/site-improvement/fixture.ts';

// Every reference, clock, receipt and threshold below is synthetic test evidence, never a live baseline.
function running(overrides: Partial<ExperimentSpec> = {}): ExperimentSpec {
  return { ...structuredClone(agencyExperimentFixture), enabled: true, killSwitch: false, rolloutBps: 10000,
    plan: { ...agencyExperimentFixture.plan, baselineRef: 'fixture:baseline', outcomeDefinitionRef: 'fixture:qualified-rule', attributionWindowMs: 500, minAssignments: 2, maxMissingExposureFraction: 0 }, ...overrides };
}
function context(spec: ExperimentSpec, overrides: Partial<AssignmentContext> = {}): AssignmentContext {
  return { scope: spec.scope, mode: 'fixture', now: 100, path: spec.paths[0], subjectToken: 'visitor_0001',
    consent: { measurement: 'allowed', persistence: 'allowed' }, dnt: false, optedOut: false,
    channel: spec.plan.channel, traffic: { class: 'external', source: 'default' }, ...overrides };
}
function assigned(spec = running(), overrides: Partial<AssignmentContext> = {}, adapter = agencySiteAdapter): Assignment {
  const result = resolveAssignment(spec, adapter, context(spec, overrides));
  assert.equal(result.state, 'assigned');
  if (result.state !== 'assigned') throw new Error(result.reason);
  return result.assignment;
}
function ledger(spec: ExperimentSpec, assignments: Assignment[]): Records {
  return { assignments,
    exposures: assignments.map((a, i) => ({ id: `exposure_${i}`, scope: a.scope, assignmentId: a.id, variantId: a.variantId, recipeVersion: a.recipeVersion, surface: a.surface, path: a.path, observedAt: a.assignedAt + 10, evidence: 'render_acknowledged' })),
    outcomes: assignments.map((a, i) => ({ id: `outcome_${i}`, scope: a.scope, assignmentId: a.id, receiptKey: `receipt_${i}`, kind: spec.plan.primaryOutcome, authority: agencySiteAdapter.outcomes[spec.plan.primaryOutcome]?.authority ?? 'task_evaluation', channel: a.channel, acknowledged: true, observedAt: a.assignedAt + 20 })),
    guardrails: spec.plan.guardrails.map(kind => ({ scope: spec.scope, kind, passed: true, evidenceRef: `fixture:${kind}` }))
  };
}
const total = (report: ReturnType<typeof evaluateExperiment>, field: 'assigned' | 'exposed' | 'primarySubjects' | 'diagnosticReceipts') => Object.values(report.counts).reduce((n, c) => n + c[field], 0);

test('Agency defaults cannot assign, emit exposure, or enable live mode', () => {
  assert.deepEqual(validateExperiment(agencyExperimentFixture, agencySiteAdapter), []);
  assert.deepEqual(resolveAssignment(agencyExperimentFixture, agencySiteAdapter, context(agencyExperimentFixture)), { state: 'control', reason: 'disabled' });
  assert.deepEqual(resolveAssignment(running(), agencySiteAdapter, context(running(), { mode: 'live' })), { state: 'control', reason: 'live_not_supported' });
  assert.equal(agencyExperimentFixture.plan.baselineRef, null);
  assert.equal(agencyExperimentFixture.plan.outcomeDefinitionRef, null);
});

test('fixture control copy is reconciled with origin/main source; only bounded fields differ', () => {
  const source = readFileSync(new URL('../../agency/src/lib/components/films/AgencyHero.svelte', import.meta.url), 'utf8');
  for (const value of Object.values(agencyExperimentFixture.recipes[0].changes)) assert.ok(source.includes(value));
  assert.ok(source.includes(`href={${agencyRecipeBoundary.fixedDestinationSource}}`));
  assert.ok(agencyExperimentFixture.recipes.every(r => Object.keys(r.changes).every(k => agencySiteAdapter.recipeFields.includes(k))));
  assert.equal(agencyExperimentFixture.recipes.length, 2);
});

test('unknown/denied/revoked permission, missing persistence, DNT and profile opt-out fail closed', () => {
  const spec = running(); const old = assigned(spec);
  for (const overrides of [
    { consent: { measurement: 'unknown', persistence: 'allowed' } },
    { consent: { measurement: 'denied', persistence: 'allowed' } },
    { consent: { measurement: 'allowed', persistence: 'unknown' } },
    { consent: { measurement: 'allowed', persistence: 'denied' } }, { dnt: true }, { optedOut: true }
  ] as Partial<AssignmentContext>[]) {
    const result = resolveAssignment(spec, agencySiteAdapter, context(spec, { previous: old, ...overrides }));
    assert.deepEqual(result, { state: 'control', reason: 'permission_missing' });
  }
});

test('assignment is stable; expanding rollout never changes an admitted arm', () => {
  const spec = running(); const small = { ...spec, rolloutBps: 2000 };
  let admitted = 0; let excluded = 0; const arms = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const ctx = context(spec, { subjectToken: `visitor_${String(i).padStart(4, '0')}` });
    const first = resolveAssignment(small, agencySiteAdapter, ctx);
    const expanded = resolveAssignment(spec, agencySiteAdapter, ctx);
    assert.equal(expanded.state, 'assigned');
    if (first.state === 'assigned' && expanded.state === 'assigned') {
      admitted++; assert.equal(first.assignment.variantId, expanded.assignment.variantId);
      const reused = resolveAssignment(spec, agencySiteAdapter, { ...ctx, now: 200, previous: first.assignment });
      assert.deepEqual(reused, first); arms.add(first.assignment.variantId);
    } else excluded++;
  }
  assert.ok(admitted > 0 && excluded > 0); assert.equal(arms.size, 2);
});

test('scope, recipe meaning, prior receipt and time gates cannot be overridden by reuse', () => {
  const spec = running(); const old = assigned(spec);
  for (const overrides of [{ scope: { ...spec.scope, tenantId: 'other-tenant' } }, { subjectToken: null }, { now: spec.endAt }, { path: '/contact' }]) assert.equal(resolveAssignment(spec, agencySiteAdapter, context(spec, { ...overrides, previous: old })).state, 'control');
  for (const next of [{ ...spec, killSwitch: true }, { ...spec, enabled: false }, { ...spec, rolloutBps: 0 }]) assert.deepEqual(resolveAssignment(next, agencySiteAdapter, context(next, { previous: old })), { state: 'control', reason: 'disabled' });
  for (const previous of [{ ...old, variantId: 'forged' }, { ...old, assignedAt: 999 }, { ...old, scope: { ...old.scope, siteId: 'ltd' } }]) assert.equal(resolveAssignment(spec, agencySiteAdapter, context(spec, { previous })).state, 'control');
  const changed = { ...spec, recipes: spec.recipes.map(r => ({ ...r, changes: { ...r.changes, lede: 'Different meaning.' } })) };
  assert.deepEqual(resolveAssignment(changed, agencySiteAdapter, context(changed, { previous: old })), { state: 'control', reason: 'invalid_prior_assignment' });
  const otherTenant = { ...spec, scope: { ...spec.scope, tenantId: 'other-tenant' } };
  assert.notEqual(assigned(otherTenant, {}, { ...agencySiteAdapter, tenantId: 'other-tenant' }).id, old.id);
});

test('invalid rollout, incoherent recipes, unresolved plan and foreign goals are rejected', () => {
  for (const rolloutBps of [-1, 10001, 0.5, NaN]) assert.ok(validateExperiment(running({ rolloutBps }), agencySiteAdapter).includes('invalid_rollout'));
  assert.ok(validateExperiment(running({ endAt: 0 }), agencySiteAdapter).includes('invalid_window'));
  const spec = running();
  assert.ok(validateExperiment({ ...spec, recipes: spec.recipes.map(r => ({ ...r, changes: { price: '$0' } })) }, agencySiteAdapter).includes('invalid_recipe'));
  assert.ok(validateExperiment({ ...spec, recipes: [spec.recipes[0], { ...spec.recipes[1], changes: { lede: 'Only one field.' } }] }, agencySiteAdapter).includes('incoherent_recipe_fields'));
  assert.ok(validateExperiment({ ...spec, plan: agencyExperimentFixture.plan }, agencySiteAdapter).includes('baseline_or_definition_unresolved'));
  assert.ok(validateExperiment({ ...spec, plan: { ...spec.plan, channel: 'synthetic_agent' } }, agencySiteAdapter).includes('invalid_primary_outcome'));
  assert.doesNotThrow(() => validateExperiment({ ...spec, recipes: [null, null] } as unknown as ExperimentSpec, agencySiteAdapter));
  assert.equal(evaluateExperiment({ ...spec, recipes: {} } as unknown as ExperimentSpec, agencySiteAdapter, {} as Records, 11000).status, 'blocked');
});

test('assignment is not exposure; missing render acknowledgement blocks quality without changing denominator', () => {
  const spec = running(); const a = assigned(spec); const records = ledger(spec, [a]);
  const report = evaluateExperiment(spec, agencySiteAdapter, { ...records, exposures: [], outcomes: [] }, 11000);
  assert.equal(total(report, 'assigned'), 1); assert.equal(total(report, 'exposed'), 0);
  assert.equal(report.missingExposures, 1); assert.ok(report.issues.includes('missing_exposure_guardrail'));
});

test('render reattach and receipt retry dedup; multiple qualified receipts count one assigned subject', () => {
  const spec = running(); const records = ledger(spec, [assigned(spec)]);
  const report = evaluateExperiment(spec, agencySiteAdapter, {
    ...records, assignments: [...records.assignments, ...records.assignments],
    exposures: [...records.exposures, { ...records.exposures[0], id: 'reattached', observedAt: 115 }],
    outcomes: [...records.outcomes, { ...records.outcomes[0], id: 'retry' }, { ...records.outcomes[0], id: 'second_inquiry', receiptKey: 'another_receipt' }]
  }, 11000);
  assert.deepEqual(report.issues, []); assert.equal(total(report, 'assigned'), 1);
  assert.equal(total(report, 'exposed'), 1); assert.equal(total(report, 'primarySubjects'), 1);
  assert.ok(report.duplicates >= 3); assert.equal(report.status, 'inconclusive');
});

test('same accepted receipt with another assignment is blocked even when the second has no exposure', () => {
  const spec = running({ plan: { ...running().plan, maxMissingExposureFraction: 1 } });
  const records = ledger(spec, [assigned(spec), assigned(spec, { subjectToken: 'visitor_0002' })]);
  const report = evaluateExperiment(spec, agencySiteAdapter, { ...records, exposures: [records.exposures[0]], outcomes: [records.outcomes[0], { ...records.outcomes[1], receiptKey: records.outcomes[0].receiptKey }] }, 11000);
  assert.equal(report.status, 'blocked'); assert.ok(report.issues.includes('conflicting_outcome_assignment')); assert.equal(total(report, 'primarySubjects'), 1);
});

test('client conversion, synthetic intent, unacknowledged receipt and raw contact metadata cannot become primary', () => {
  const spec = running(); const records = ledger(spec, [assigned(spec)]);
  for (const outcome of [
    { ...records.outcomes[0], authority: 'client_diagnostic' },
    { ...records.outcomes[0], channel: 'synthetic_agent' },
    { ...records.outcomes[0], acknowledged: false },
    { ...records.outcomes[0], metadata: { message: 'PRIVATE_CONTACT_TEXT' } }
  ]) {
    const report = evaluateExperiment(spec, agencySiteAdapter, { ...records, outcomes: [outcome] } as Records, 11000);
    assert.equal(report.status, 'blocked'); assert.equal(total(report, 'primarySubjects'), 0);
    assert.ok(!JSON.stringify(report).includes('PRIVATE_CONTACT_TEXT'));
  }
  const diagnostic = evaluateExperiment(spec, agencySiteAdapter, { ...records, outcomes: [{ ...records.outcomes[0], kind: 'booking_notification', authority: 'client_diagnostic' }] }, 11000);
  assert.equal(total(diagnostic, 'primarySubjects'), 0); assert.equal(total(diagnostic, 'diagnosticReceipts'), 1);
});

test('malformed, foreign and out-of-order exposure/outcome evidence blocks evaluation', () => {
  const spec = running(); const records = ledger(spec, [assigned(spec)]);
  for (const exposure of [
    { ...records.exposures[0], scope: { ...spec.scope, allocationVersion: 'v2' } },
    { ...records.exposures[0], recipeVersion: 'forged' },
    { ...records.exposures[0], observedAt: 0 }
  ]) assert.equal(evaluateExperiment(spec, agencySiteAdapter, { ...records, exposures: [exposure] }, 11000).status, 'blocked');
  for (const observedAt of [105, 1000, NaN]) assert.equal(evaluateExperiment(spec, agencySiteAdapter, { ...records, outcomes: [{ ...records.outcomes[0], observedAt }] }, 11000).status, 'blocked');
  assert.ok(evaluateExperiment(spec, agencySiteAdapter, { ...records, assignments: [] }, 11000).issues.includes('invalid_exposure_join'));
});

test('traffic classes and provenance remain uncertain and excluded classes do not inflate commercial counts', () => {
  const spec = running();
  const assignments = ['external', 'internal', 'preview', 'automated', 'test'].map((kind, i) => assigned(spec, { subjectToken: `visitor_${String(i).padStart(4, '0')}`, traffic: { class: kind as Assignment['traffic']['class'], source: i === 0 ? 'default' : 'declared' } }));
  const report = evaluateExperiment(spec, agencySiteAdapter, ledger(spec, assignments), 11000);
  assert.equal(total(report, 'assigned'), 1); assert.equal(total(report, 'primarySubjects'), 1);
  assert.equal(Object.keys(report.excluded).length, 4); assert.match(report.trafficCaveat, /external is unverified/);
  assert.equal(assignments[0].traffic.source, 'default');
});

test('stop rule prevents early review, tiny cohorts stay inconclusive and guardrail failures block', () => {
  const spec = running(); const records = ledger(spec, [assigned(spec), assigned(spec, { subjectToken: 'visitor_0002' })]);
  assert.equal(evaluateExperiment(spec, agencySiteAdapter, records, 200).status, 'inconclusive');
  const report = evaluateExperiment(spec, agencySiteAdapter, records, 11000);
  assert.equal(report.status, 'ready_for_human_review'); assert.ok(!('winner' in report));
  assert.equal(evaluateExperiment({ ...spec, plan: { ...spec.plan, minAssignments: 100 } }, agencySiteAdapter, records, 11000).status, 'inconclusive');
  assert.equal(evaluateExperiment(spec, agencySiteAdapter, { ...records, guardrails: [] }, 11000).status, 'blocked');
  assert.ok(evaluateExperiment(spec, agencySiteAdapter, { ...records, guardrails: [{ ...records.guardrails[0], passed: false }, ...records.guardrails.slice(1)] }, 11000).issues.includes('guardrail_failed:consent'));
});

test('rollback stops rendering while historical exposure can receive a valid delayed outcome', () => {
  const spec = running({ plan: { ...running().plan, attributionWindowMs: 20000 } });
  const records = ledger(spec, [assigned(spec), assigned(spec, { subjectToken: 'visitor_0002' })]);
  const paused = { ...spec, enabled: false, killSwitch: true, rolloutBps: 0 };
  assert.equal(resolveAssignment(paused, agencySiteAdapter, context(paused, { previous: records.assignments[0] })).state, 'control');
  assert.equal(evaluateExperiment(paused, agencySiteAdapter, { ...records, outcomes: records.outcomes.map(o => ({ ...o, observedAt: 10500 })) }, 11000).status, 'ready_for_human_review');
});

test('IO and LTD use different outcome contracts through the same core; comprehension is not a click', () => {
  for (const [siteId, channel, primaryOutcome, authority] of [
    ['io', 'site', 'artifact_opened', 'client_diagnostic'],
    ['ltd', 'human_task', 'next_step_comprehended', 'task_evaluation']
  ] as const) {
    const adapter: SiteAdapter = { tenantId: 'create-something', siteId, surface: `${siteId}-orientation`, paths: [siteId === 'io' ? '/experiments' : '/playbooks'], recipeFields: ['orientation'], outcomes: { [primaryOutcome]: { authority, channel } } };
    const base = running();
    const spec: ExperimentSpec = { ...base, scope: { ...base.scope, siteId }, surface: adapter.surface, paths: adapter.paths, recipes: [{ id: 'control', version: 'v1', changes: { orientation: 'Current next step.' } }, { id: 'task-first', version: 'v1', changes: { orientation: 'Explain the next step.' } }], plan: { ...base.plan, primaryOutcome, channel } };
    const assignments = [assigned(spec, {}, adapter), assigned(spec, { subjectToken: 'visitor_0002' }, adapter)];
    const records = ledger(spec, assignments);
    const outcomes = records.outcomes.map(o => ({ ...o, authority }));
    assert.equal(evaluateExperiment(spec, adapter, { ...records, outcomes }, 11000).status, 'ready_for_human_review');
    if (siteId === 'ltd') assert.equal(evaluateExperiment(spec, adapter, { ...records, outcomes: outcomes.map(o => ({ ...o, authority: 'client_diagnostic' })) }, 11000).status, 'blocked');
  }
});

test('decision history is scoped, immutable, idempotent and sequential; rollback requires a target', () => {
  const scope = running().scope;
  const first: Decision = { id: 'decision_1', scope, previousId: null, owner: 'fixture-operator', at: 1, action: 'approve_fixture', reason: 'Synthetic regression review.', evidenceRefs: ['fixture:test-run'], rollbackAllocationVersion: null };
  const history: Decision[] = [];
  const result = appendDecision(scope, history, first); assert.equal(result.ok, true); assert.equal(history.length, 0);
  if (!result.ok) throw new Error(result.reason);
  assert.equal(appendDecision(scope, result.history, first).ok, true);
  assert.equal(appendDecision(scope, result.history, { ...first, reason: 'Conflicting content.' }).ok, false);
  assert.equal(appendDecision(scope, result.history, { ...first, id: 'decision_2' }).ok, false);
  assert.equal(appendDecision(scope, [], { ...first, scope: { ...scope, tenantId: 'other' } }).ok, false);
  const rollback = { ...first, id: 'decision_2', previousId: first.id, at: 2, action: 'rollback' as const, rollbackAllocationVersion: 'baseline' };
  assert.equal(appendDecision(scope, result.history, rollback).ok, true);
  assert.equal(appendDecision(scope, result.history, { ...rollback, rollbackAllocationVersion: null }).ok, false);
  assert.equal(appendDecision(scope, [{ ...first, previousId: 'broken' }], rollback).ok, false);
});
