import assert from 'node:assert/strict';
import test from 'node:test';

import {
  next_executor_routing_action,
  validate_executor_routing_contract,
  verify_executor_routing_pair
} from '../src/index.js';

function valid_decision() {
  return {
    schema_version: 'executor-routing-decision.v1',
    decision_id: 'CRE-1817-route-1',
    run_id: 'CRE-1817-run-1',
    linear: { issue: 'CRE-1817' },
    autonomy_level: 'A1',
    task_class: 'bounded',
    selected_candidate_id: 'codex-terra',
    candidates: [
      {
        id: 'codex-terra',
        provider: 'openai',
        inference_provider: 'openai',
        route: 'direct',
        protocol: 'responses',
        model: 'gpt-5.6-terra',
        model_version: 'unverified',
        reasoning_effort: 'medium',
        execution_mode: 'primary',
        status: 'selected',
        reasons: ['Native bounded executor with no new provider boundary.']
      },
      {
        id: 'codex-luna',
        provider: 'openai',
        inference_provider: 'openai',
        route: 'direct',
        protocol: 'responses',
        model: 'gpt-5.6-luna',
        model_version: 'unverified',
        reasoning_effort: 'medium',
        execution_mode: 'primary',
        status: 'eligible',
        reasons: ['Lower-cost fallback for the same bounded contract.']
      }
    ],
    fallback: {
      mode: 'operator',
      candidate_ids: ['codex-luna'],
      max_attempts: 1,
      stop_conditions: ['Stop if the fallback would expand authority or data access.']
    },
    authority: {
      filesystem_write: true,
      shared_state_write: false,
      production_mutation: false,
      external_spend: false,
      approval_refs: []
    },
    data_boundary: {
      classification: 'internal',
      zero_data_retention_required: false,
      allowed_providers: ['openai'],
      allowed_inference_providers: ['openai']
    },
    budget: { currency: 'USD', max_usd: 0 },
    rationale: ['Use the cheapest eligible native executor, with an operator-gated fallback.']
  };
}

function valid_receipt() {
  return {
    schema_version: 'executor-routing-receipt.v1',
    decision_id: 'CRE-1817-route-1',
    run_id: 'CRE-1817-run-1',
    linear: { issue: 'CRE-1817' },
    executor: {
      id: 'codex-terra',
      provider: 'openai',
      inference_provider: 'openai',
      route: 'direct',
      protocol: 'responses',
      model: 'gpt-5.6-terra',
      model_version: 'unverified',
      reasoning_effort: 'medium',
      execution_mode: 'primary'
    },
    status: 'passed',
    fallback: {
      used: false,
      from_candidate_id: null,
      reason: null,
      attempt_count: 0
    },
    metrics: {
      duration_ms: 1200,
      retry_count: 0,
      human_intervention_count: 0,
      tokens: { input: 100, output: 50, total: 150 }
    },
    cost: {
      currency: 'USD',
      provider_api_usd: null,
      landed_cost_usd: 0.04,
      kind: 'estimated',
      basis: ['Allocated subscription cost plus verification time.']
    },
    acceptance: {
      status: 'accepted',
      criteria_passed: 2,
      criteria_total: 2,
      evidence: ['Focused tests passed.', 'Diff review passed.']
    },
    evidence: ['output/executor-routing/CRE-1817-run-1.json']
  };
}

test('executor routing contract accepts a strict decision and accepted receipt', () => {
  const decision = valid_decision();
  const receipt = valid_receipt();

  assert.deepEqual(validate_executor_routing_contract(decision), {
    ok: true,
    kind: 'decision',
    errors: []
  });
  assert.deepEqual(validate_executor_routing_contract(receipt), {
    ok: true,
    kind: 'receipt',
    errors: []
  });
  assert.deepEqual(verify_executor_routing_pair(decision, receipt), { ok: true, errors: [] });
});

test('executor routing contract rejects unknown fields and an ambiguous selection', () => {
  const decision = valid_decision();
  decision.candidates[0].unreviewed_override = true;
  decision.candidates[1].status = 'selected';

  const result = validate_executor_routing_contract(decision);

  assert.equal(result.ok, false);
  assert.equal(result.kind, 'decision');
  assert.ok(result.errors.some((error) => error.includes('unreviewed_override')));
  assert.ok(result.errors.some((error) => error.includes('exactly one selected candidate')));
});

test('executor routing contract fails closed for malformed nested candidates', () => {
  const decision = valid_decision();
  decision.candidates = [null];

  assert.doesNotThrow(() => validate_executor_routing_contract(decision));
  const result = validate_executor_routing_contract(decision);
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'decision');
});

test('executor routing contract fails closed for malformed candidate collections', () => {
  const decision = valid_decision();
  decision.candidates = {};
  decision.fallback.candidate_ids = 'codex-luna';

  assert.doesNotThrow(() => validate_executor_routing_contract(decision));
  const result = validate_executor_routing_contract(decision);
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'decision');
});

test('executor routing contract fails closed for malformed provider allowlists', () => {
  const decision = valid_decision();
  decision.data_boundary.allowed_providers = {};
  decision.data_boundary.allowed_inference_providers = {};

  assert.doesNotThrow(() => validate_executor_routing_contract(decision));
  const result = validate_executor_routing_contract(decision);
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'decision');
});

test('executor routing contract keeps OpenRouter in A0 shadow with ZDR and approved spend', () => {
  const decision = valid_decision();
  decision.autonomy_level = 'A1';
  decision.candidates = [
    {
      ...decision.candidates[0],
      id: 'openrouter-glm',
      provider: 'openrouter',
      inference_provider: 'example-provider',
      route: 'aggregator',
      model: 'example/challenger-model',
      execution_mode: 'primary',
      reasons: ['Unapproved external challenger.']
    }
  ];
  decision.selected_candidate_id = 'openrouter-glm';
  decision.fallback = { mode: 'none', candidate_ids: [], max_attempts: 0, stop_conditions: [] };
  decision.data_boundary.allowed_providers = ['openrouter'];
  decision.data_boundary.allowed_inference_providers = ['example-provider'];
  decision.data_boundary.zero_data_retention_required = false;
  decision.authority.external_spend = true;
  decision.budget.max_usd = 1;

  const result = validate_executor_routing_contract(decision);

  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('OpenRouter candidates are restricted to A0 shadow evaluation'));
  assert.ok(result.errors.includes('OpenRouter requires zero-data-retention enforcement'));
  assert.ok(result.errors.includes('external spend requires at least one approval reference'));
});

test('executor routing contract accepts OpenRouter only after the A0 shadow controls are explicit', () => {
  const decision = valid_decision();
  decision.autonomy_level = 'A0';
  decision.task_class = 'research';
  decision.candidates = [
    {
      ...decision.candidates[0],
      id: 'openrouter-glm',
      provider: 'openrouter',
      inference_provider: 'example-provider',
      route: 'aggregator',
      model: 'example/challenger-model',
      execution_mode: 'shadow',
      reasons: ['Approved challenger for a receipt-bearing comparison only.']
    }
  ];
  decision.selected_candidate_id = 'openrouter-glm';
  decision.fallback = { mode: 'none', candidate_ids: [], max_attempts: 0, stop_conditions: [] };
  decision.authority = {
    filesystem_write: false,
    shared_state_write: false,
    production_mutation: false,
    external_spend: true,
    approval_refs: ['Linear CRE-1817 operator approval']
  };
  decision.data_boundary = {
    classification: 'internal',
    zero_data_retention_required: true,
    allowed_providers: ['openrouter'],
    allowed_inference_providers: ['example-provider']
  };
  decision.budget = { currency: 'USD', max_usd: 1 };

  assert.deepEqual(validate_executor_routing_contract(decision), {
    ok: true,
    kind: 'decision',
    errors: []
  });
});

test('executor routing contract rejects a selected protocol that Codex cannot consume', () => {
  const decision = valid_decision();
  decision.candidates[0].provider = 'zai-coding-plan';
  decision.candidates[0].inference_provider = 'z-ai';
  decision.candidates[0].protocol = 'chat-completions';
  decision.data_boundary.allowed_providers = ['zai-coding-plan'];
  decision.data_boundary.allowed_inference_providers = ['z-ai'];

  const result = validate_executor_routing_contract(decision);

  assert.equal(result.ok, false);
  assert.ok(
    result.errors.includes('selected and fallback candidates must use responses or local protocol')
  );
});

test('executor routing v1 permits at most one sequential fallback attempt', () => {
  const decision = valid_decision();
  decision.candidates.push({
    ...decision.candidates[1],
    id: 'codex-luna-second',
    reasons: ['A second fallback would make the v1 cost envelope ambiguous.']
  });
  decision.fallback.candidate_ids.push('codex-luna-second');
  decision.fallback.max_attempts = 2;

  const result = validate_executor_routing_contract(decision);

  assert.equal(result.ok, false);
  assert.ok(
    result.errors.includes('executor routing v1 permits at most one sequential fallback attempt')
  );
});

test('executor routing pair binds an accepted fallback to the approved decision', () => {
  const decision = valid_decision();
  const receipt = valid_receipt();
  const fallback = decision.candidates[1];
  receipt.executor = {
    id: fallback.id,
    provider: fallback.provider,
    inference_provider: fallback.inference_provider,
    route: fallback.route,
    protocol: fallback.protocol,
    model: fallback.model,
    model_version: fallback.model_version,
    reasoning_effort: fallback.reasoning_effort,
    execution_mode: fallback.execution_mode
  };
  receipt.fallback = {
    used: true,
    from_candidate_id: 'codex-terra',
    reason: 'The selected executor was unavailable.',
    attempt_count: 1
  };
  assert.deepEqual(verify_executor_routing_pair(decision, receipt), { ok: true, errors: [] });

  receipt.executor.id = 'unapproved-provider';
  const unapproved = verify_executor_routing_pair(decision, receipt);
  assert.equal(unapproved.ok, false);
  assert.ok(
    unapproved.errors.includes(
      'receipt executor is not the selected or an approved fallback candidate'
    )
  );
});

test('executor routing receipt cannot claim acceptance without complete evidence and landed cost', () => {
  const receipt = valid_receipt();
  receipt.cost.landed_cost_usd = -1;
  receipt.acceptance.criteria_passed = 1;
  receipt.evidence = [];

  const result = validate_executor_routing_contract(receipt);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('landed_cost_usd')));
  assert.ok(result.errors.includes('accepted receipts require every acceptance criterion to pass'));
  assert.ok(result.errors.some((error) => error.includes('evidence')));
});

test('executor routing algorithm turns receipt relationships into bounded next actions', () => {
  const decision = valid_decision();
  assert.deepEqual(next_executor_routing_action(decision), {
    action: 'execute_selected',
    candidate_id: 'codex-terra',
    reason: 'No executor receipt exists for this decision.'
  });

  const failed = valid_receipt();
  failed.status = 'failed';
  failed.acceptance.status = 'rejected';
  failed.acceptance.criteria_passed = 1;
  assert.deepEqual(next_executor_routing_action(decision, failed), {
    action: 'request_operator_fallback',
    candidate_id: 'codex-luna',
    reason: 'The selected executor failed and fallback requires operator approval.'
  });

  decision.fallback.mode = 'automatic';
  assert.deepEqual(next_executor_routing_action(decision, failed), {
    action: 'execute_fallback',
    candidate_id: 'codex-luna',
    reason: 'The selected executor failed within an approved automatic fallback policy.'
  });
});

test('executor routing algorithm evaluates shadow success and escalates exhausted fallback', () => {
  const shadow = valid_decision();
  shadow.autonomy_level = 'A0';
  shadow.task_class = 'research';
  shadow.candidates[0].execution_mode = 'shadow';
  shadow.authority.filesystem_write = false;
  const accepted = valid_receipt();
  accepted.executor.execution_mode = 'shadow';

  assert.deepEqual(next_executor_routing_action(shadow, accepted), {
    action: 'evaluate_challenger',
    candidate_id: 'codex-terra',
    reason: 'An accepted shadow run requires comparison before any promotion.'
  });

  const exhausted = valid_receipt();
  exhausted.status = 'failed';
  exhausted.acceptance.status = 'rejected';
  exhausted.acceptance.criteria_passed = 0;
  exhausted.executor = {
    id: 'codex-luna',
    provider: 'openai',
    inference_provider: 'openai',
    route: 'direct',
    protocol: 'responses',
    model: 'gpt-5.6-luna',
    model_version: 'unverified',
    reasoning_effort: 'medium',
    execution_mode: 'primary'
  };
  exhausted.fallback = {
    used: true,
    from_candidate_id: 'codex-terra',
    reason: 'The selected executor was unavailable.',
    attempt_count: 1
  };

  assert.deepEqual(next_executor_routing_action(valid_decision(), exhausted), {
    action: 'escalate',
    candidate_id: null,
    reason: 'The approved fallback failed or was exhausted.'
  });
});
