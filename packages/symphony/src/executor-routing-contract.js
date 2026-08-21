import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import Ajv from 'ajv';

export const EXECUTOR_ROUTING_DECISION_VERSION = 'executor-routing-decision.v1';
export const EXECUTOR_ROUTING_RECEIPT_VERSION = 'executor-routing-receipt.v1';

const schema = JSON.parse(
  readFileSync(new URL('../schemas/executor-routing.v1.schema.json', import.meta.url), 'utf8')
);
const ajv = new Ajv({ allErrors: true, strict: true });
ajv.addSchema(schema);
const validate_decision_schema = ajv.compile({ $ref: `${schema.$id}#/$defs/decision` });
const validate_receipt_schema = ajv.compile({ $ref: `${schema.$id}#/$defs/receipt` });
const TASK_CLASS_BY_LEVEL = {
  A0: 'research',
  A1: 'bounded',
  A2: 'reviewed',
  A3: 'promotion',
  A4: 'escalation'
};
const EXECUTOR_IDENTITY_KEYS = [
  'id',
  'provider',
  'inference_provider',
  'route',
  'protocol',
  'model',
  'model_version',
  'reasoning_effort',
  'execution_mode'
];

function format_schema_error(error) {
  const path = error.instancePath || '/';
  if (error.keyword === 'additionalProperties') {
    return `schema ${path} must NOT have additional property: ${error.params.additionalProperty}`;
  }
  return `schema ${path} ${error.message ?? 'is invalid'}`;
}

function unique(values) {
  return [...new Set(values)];
}

function includes_value(values, value) {
  return Array.isArray(values) && values.includes(value);
}

function candidate_identity(candidate) {
  return Object.fromEntries(EXECUTOR_IDENTITY_KEYS.map((key) => [key, candidate?.[key]]));
}

function active_candidates(decision) {
  const candidates = Array.isArray(decision?.candidates) ? decision.candidates : [];
  const fallback_ids = Array.isArray(decision?.fallback?.candidate_ids)
    ? decision.fallback.candidate_ids
    : [];
  const active_ids = new Set([decision?.selected_candidate_id, ...fallback_ids]);
  return candidates.filter((candidate) => active_ids.has(candidate?.id));
}

function decision_errors(decision) {
  const errors = [];
  const candidates = Array.isArray(decision.candidates) ? decision.candidates : [];
  const candidate_ids = candidates.map((candidate) => candidate?.id).filter(Boolean);
  if (new Set(candidate_ids).size !== candidate_ids.length) {
    errors.push('candidate ids must be unique');
  }

  const selected = candidates.filter((candidate) => candidate?.status === 'selected');
  if (selected.length !== 1) {
    errors.push('decision must contain exactly one selected candidate');
  }
  if (selected.length === 1 && selected[0].id !== decision.selected_candidate_id) {
    errors.push('selected_candidate_id must identify the selected candidate');
  }

  const expected_task_class = TASK_CLASS_BY_LEVEL[decision.autonomy_level];
  if (expected_task_class && decision.task_class !== expected_task_class) {
    errors.push(`${decision.autonomy_level} requires task_class ${expected_task_class}`);
  }

  const fallback_ids = Array.isArray(decision.fallback?.candidate_ids)
    ? decision.fallback.candidate_ids
    : [];
  if (fallback_ids.length > 1 || decision.fallback?.max_attempts > 1) {
    errors.push('executor routing v1 permits at most one sequential fallback attempt');
  }
  if (decision.fallback?.mode === 'none') {
    if (fallback_ids.length !== 0 || decision.fallback.max_attempts !== 0) {
      errors.push('fallback mode none requires zero candidates and zero attempts');
    }
  } else if (
    decision.fallback?.mode &&
    (fallback_ids.length === 0 || decision.fallback.max_attempts < 1)
  ) {
    errors.push('operator or automatic fallback requires a candidate and at least one attempt');
  }
  for (const fallback_id of fallback_ids) {
    const candidate = candidates.find((entry) => entry?.id === fallback_id);
    if (!candidate || candidate.status !== 'eligible') {
      errors.push(`fallback candidate ${fallback_id} must exist and be eligible`);
    }
  }

  for (const candidate of active_candidates(decision)) {
    if (!['responses', 'local'].includes(candidate.protocol)) {
      errors.push('selected and fallback candidates must use responses or local protocol');
    }
    if (!includes_value(decision.data_boundary?.allowed_providers, candidate.provider)) {
      errors.push(`active provider ${candidate.provider} is outside the data boundary allowlist`);
    }
    if (
      !includes_value(
        decision.data_boundary?.allowed_inference_providers,
        candidate.inference_provider
      )
    ) {
      errors.push(
        `active inference provider ${candidate.inference_provider} is outside the data boundary allowlist`
      );
    }
  }

  if (decision.autonomy_level === 'A0') {
    const authority = decision.authority ?? {};
    if (
      authority.filesystem_write ||
      authority.shared_state_write ||
      authority.production_mutation
    ) {
      errors.push('A0 authority must remain read-only');
    }
  }
  if (['A1', 'A2'].includes(decision.autonomy_level)) {
    if (decision.authority?.shared_state_write || decision.authority?.production_mutation) {
      errors.push(`${decision.autonomy_level} cannot mutate shared or production state`);
    }
  }

  const approval_refs = decision.authority?.approval_refs ?? [];
  if (decision.authority?.external_spend && approval_refs.length === 0) {
    errors.push('external spend requires at least one approval reference');
  }
  if (
    (decision.authority?.shared_state_write || decision.authority?.production_mutation) &&
    approval_refs.length === 0
  ) {
    errors.push('shared or production mutation requires at least one approval reference');
  }
  if (decision.authority?.external_spend && !(decision.budget?.max_usd > 0)) {
    errors.push('external spend requires a positive USD budget');
  }
  if (decision.authority?.external_spend === false && decision.budget?.max_usd !== 0) {
    errors.push('a decision without external spend authority must use a zero USD budget');
  }

  for (const candidate of active_candidates(decision).filter(
    (entry) => entry.provider === 'openrouter'
  )) {
    if (decision.autonomy_level !== 'A0' || candidate.execution_mode !== 'shadow') {
      errors.push('OpenRouter candidates are restricted to A0 shadow evaluation');
    }
    if (candidate.route !== 'aggregator') {
      errors.push('OpenRouter must be declared as an aggregator route');
    }
    if (candidate.inference_provider === 'unverified') {
      errors.push('OpenRouter requires an exact inference provider allowlist');
    }
    if (decision.data_boundary?.zero_data_retention_required !== true) {
      errors.push('OpenRouter requires zero-data-retention enforcement');
    }
    if (!decision.authority?.external_spend || !(decision.budget?.max_usd > 0)) {
      errors.push('OpenRouter requires explicit external spend authority and budget');
    }
  }
  return errors;
}

function receipt_errors(receipt) {
  const errors = [];
  const acceptance = receipt.acceptance ?? {};
  if (
    acceptance.status === 'accepted' &&
    acceptance.criteria_passed !== acceptance.criteria_total
  ) {
    errors.push('accepted receipts require every acceptance criterion to pass');
  }
  if (receipt.status === 'passed' && acceptance.status !== 'accepted') {
    errors.push('passed receipts require accepted outcome evidence');
  }
  if (receipt.status !== 'passed' && acceptance.status === 'accepted') {
    errors.push('accepted outcome evidence requires a passed receipt');
  }

  const fallback = receipt.fallback ?? {};
  if (fallback.used === false) {
    if (
      fallback.from_candidate_id !== null ||
      fallback.reason !== null ||
      fallback.attempt_count !== 0
    ) {
      errors.push('unused fallback requires null provenance and zero attempts');
    }
  }
  if (fallback.used === true) {
    if (!fallback.from_candidate_id || !fallback.reason || fallback.attempt_count < 1) {
      errors.push('used fallback requires provenance, reason, and at least one attempt');
    }
  }

  const tokens = receipt.metrics?.tokens;
  if (tokens && tokens.total !== tokens.input + tokens.output) {
    errors.push('metrics.tokens.total must equal input plus output');
  }
  if (
    typeof receipt.cost?.provider_api_usd === 'number' &&
    typeof receipt.cost?.landed_cost_usd === 'number' &&
    receipt.cost.landed_cost_usd < receipt.cost.provider_api_usd
  ) {
    errors.push('landed cost cannot be lower than provider API cost');
  }
  return errors;
}

export function validate_executor_routing_contract(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, kind: 'unknown', errors: ['contract must be a JSON object'] };
  }
  const kind =
    value.schema_version === EXECUTOR_ROUTING_DECISION_VERSION
      ? 'decision'
      : value.schema_version === EXECUTOR_ROUTING_RECEIPT_VERSION
        ? 'receipt'
        : 'unknown';
  if (kind === 'unknown') {
    return {
      ok: false,
      kind,
      errors: [
        `schema_version must be ${EXECUTOR_ROUTING_DECISION_VERSION} or ${EXECUTOR_ROUTING_RECEIPT_VERSION}`
      ]
    };
  }

  const validator = kind === 'decision' ? validate_decision_schema : validate_receipt_schema;
  const schema_ok = validator(value);
  const errors = schema_ok ? [] : validator.errors.map(format_schema_error);
  errors.push(...(kind === 'decision' ? decision_errors(value) : receipt_errors(value)));
  const deduped = unique(errors);
  return { ok: deduped.length === 0, kind, errors: deduped };
}

export function verify_executor_routing_pair(decision, receipt) {
  const decision_result = validate_executor_routing_contract(decision);
  const receipt_result = validate_executor_routing_contract(receipt);
  const errors = [
    ...decision_result.errors.map((error) => `decision: ${error}`),
    ...receipt_result.errors.map((error) => `receipt: ${error}`)
  ];
  if (decision_result.kind !== 'decision')
    errors.push('first contract must be an executor routing decision');
  if (receipt_result.kind !== 'receipt')
    errors.push('second contract must be an executor routing receipt');
  if (errors.length > 0) return { ok: false, errors: unique(errors) };

  if (receipt.decision_id !== decision.decision_id)
    errors.push('receipt decision_id does not match decision');
  if (receipt.run_id !== decision.run_id) errors.push('receipt run_id does not match decision');
  if (receipt.linear.issue !== decision.linear.issue)
    errors.push('receipt Linear issue does not match decision');

  const selected = decision.candidates.find(
    (candidate) => candidate.id === decision.selected_candidate_id
  );
  const executed = decision.candidates.find((candidate) => candidate.id === receipt.executor.id);
  if (
    !executed ||
    (executed.id !== selected?.id &&
      !(decision.fallback?.candidate_ids ?? []).includes(executed.id))
  ) {
    errors.push('receipt executor is not the selected or an approved fallback candidate');
  } else if (!isDeepStrictEqual(receipt.executor, candidate_identity(executed))) {
    errors.push('receipt executor identity does not match the approved candidate');
  }

  if (receipt.fallback.used) {
    if (receipt.fallback.from_candidate_id !== selected?.id) {
      errors.push('fallback provenance must identify the selected candidate');
    }
    if (!(decision.fallback?.candidate_ids ?? []).includes(receipt.executor.id)) {
      errors.push('used fallback must execute an approved fallback candidate');
    }
    if (receipt.fallback.attempt_count > decision.fallback.max_attempts) {
      errors.push('fallback attempts exceed the approved maximum');
    }
  } else if (receipt.executor.id !== selected?.id) {
    errors.push('receipt without fallback must execute the selected candidate');
  }

  if (decision.authority.external_spend) {
    if (typeof receipt.cost.provider_api_usd !== 'number') {
      errors.push('external spend receipts require observed provider API cost');
    } else if (receipt.cost.provider_api_usd > decision.budget.max_usd) {
      errors.push('provider API cost exceeds the approved budget');
    }
  }
  return { ok: errors.length === 0, errors: unique(errors) };
}

export function next_executor_routing_action(decision, receipt = null) {
  const decision_result = validate_executor_routing_contract(decision);
  if (!decision_result.ok || decision_result.kind !== 'decision') {
    return {
      action: 'block',
      candidate_id: null,
      reason: `Routing decision is invalid: ${decision_result.errors.join('; ')}`
    };
  }
  if (decision.autonomy_level === 'A4') {
    return {
      action: 'request_operator',
      candidate_id: decision.selected_candidate_id,
      reason: 'A4 escalation always requires an operator decision.'
    };
  }
  if (receipt === null || receipt === undefined) {
    return {
      action: 'execute_selected',
      candidate_id: decision.selected_candidate_id,
      reason: 'No executor receipt exists for this decision.'
    };
  }

  const pair = verify_executor_routing_pair(decision, receipt);
  if (!pair.ok) {
    return {
      action: 'block',
      candidate_id: null,
      reason: `Executor receipt is not bound to the decision: ${pair.errors.join('; ')}`
    };
  }
  if (receipt.status === 'passed' && receipt.acceptance.status === 'accepted') {
    return receipt.executor.execution_mode === 'shadow'
      ? {
          action: 'evaluate_challenger',
          candidate_id: receipt.executor.id,
          reason: 'An accepted shadow run requires comparison before any promotion.'
        }
      : {
          action: 'accept',
          candidate_id: receipt.executor.id,
          reason: 'The selected executor passed every acceptance criterion.'
        };
  }
  if (receipt.fallback.used) {
    return {
      action: 'escalate',
      candidate_id: null,
      reason: 'The approved fallback failed or was exhausted.'
    };
  }

  const fallback_id = decision.fallback.candidate_ids[0] ?? null;
  if (decision.fallback.mode === 'automatic' && fallback_id) {
    return {
      action: 'execute_fallback',
      candidate_id: fallback_id,
      reason: 'The selected executor failed within an approved automatic fallback policy.'
    };
  }
  if (decision.fallback.mode === 'operator' && fallback_id) {
    return {
      action: 'request_operator_fallback',
      candidate_id: fallback_id,
      reason: 'The selected executor failed and fallback requires operator approval.'
    };
  }
  return {
    action: 'escalate',
    candidate_id: null,
    reason: 'The selected executor failed without an approved fallback.'
  };
}
