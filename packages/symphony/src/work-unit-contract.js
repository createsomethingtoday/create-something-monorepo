import { readFile } from 'node:fs/promises';

const WORK_UNIT_VERSION = 'multi-agent-work-unit.v1';
const EVIDENCE_RECEIPT_VERSION = 'multi-agent-evidence-receipt.v1';
const REVIEWED_RUN_RECEIPT_VERSION = 'multi-agent-reviewed-run-receipt.v1';
const LANES = new Set(['code-quality', 'policy', 'stability', 'performance', 'innovation', 'review', 'promotion']);
const ROLES = new Set(['scout', 'worker', 'reviewer', 'integrator', 'operator']);
const REVIEWED_ROLES = ['worker', 'reviewer', 'integrator'];
const TIERS = new Set(['Database', 'Automation', 'Judgment']);
const RECEIPT_STATUSES = new Set(['passed', 'failed', 'blocked']);

function is_object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function non_empty_string(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function string_array(value) {
  return Array.isArray(value) && value.every(non_empty_string);
}

function issue_identifier(value) {
  return non_empty_string(value) && /^[A-Z][A-Z0-9]+-\d+$/u.test(value);
}

function add_required_string(errors, object, key, path) {
  if (!non_empty_string(object?.[key])) {
    errors.push(`${path}.${key} must be a non-empty string`);
  }
}

function add_string_array(errors, object, key, path, { non_empty = false } = {}) {
  if (!string_array(object?.[key])) {
    errors.push(`${path}.${key} must be an array of non-empty strings`);
    return;
  }
  if (non_empty && object[key].length === 0) {
    errors.push(`${path}.${key} must include at least one entry`);
  }
}

function validate_linear(errors, linear) {
  if (!is_object(linear)) {
    errors.push('linear must be an object');
    return;
  }
  if (!issue_identifier(linear.issue)) {
    errors.push('linear.issue must be a Linear issue identifier such as CRE-1131');
  }
  if (linear.map_issue !== undefined && !issue_identifier(linear.map_issue)) {
    errors.push('linear.map_issue must be a Linear issue identifier when present');
  }
}

function validate_work_unit(value) {
  const errors = [];
  if (!is_object(value)) return ['contract must be a JSON object'];
  add_required_string(errors, value, 'id', 'contract');
  validate_linear(errors, value.linear);
  if (!LANES.has(value.lane)) errors.push(`lane must be one of: ${Array.from(LANES).join(', ')}`);
  if (!ROLES.has(value.role)) errors.push(`role must be one of: ${Array.from(ROLES).join(', ')}`);
  if (!string_array(value.tier) || value.tier.length === 0 || value.tier.some((tier) => !TIERS.has(tier))) {
    errors.push(`tier must include one or more of: ${Array.from(TIERS).join(', ')}`);
  }
  add_required_string(errors, value, 'goal', 'contract');

  const scope = is_object(value.scope) ? value.scope : null;
  if (!scope) {
    errors.push('scope must be an object');
  } else {
    add_string_array(errors, scope, 'packages', 'scope');
    add_string_array(errors, scope, 'paths', 'scope');
    if ((scope.packages?.length ?? 0) === 0 && (scope.paths?.length ?? 0) === 0) {
      errors.push('scope.paths or scope.packages must include at least one entry');
    }
  }

  const locks = is_object(value.locks) ? value.locks : null;
  if (!locks) {
    errors.push('locks must be an object');
  } else {
    add_string_array(errors, locks, 'packages', 'locks');
    add_string_array(errors, locks, 'paths', 'locks');
    if (locks.mode !== 'read' && locks.mode !== 'write') errors.push('locks.mode must be read or write');
    if ((locks.packages?.length ?? 0) === 0 && (locks.paths?.length ?? 0) === 0) {
      errors.push('locks.paths or locks.packages must include at least one entry');
    }
    if (value.role === 'reviewer' && locks.mode !== 'read') {
      errors.push('reviewer work units must use read locks');
    }
  }

  add_string_array(errors, value, 'allowed_commands', 'contract', { non_empty: true });
  if (!Array.isArray(value.verification) || value.verification.length === 0) {
    errors.push('verification must include at least one command');
  } else {
    value.verification.forEach((entry, index) => {
      if (!is_object(entry)) {
        errors.push(`verification[${index}] must be an object`);
        return;
      }
      add_required_string(errors, entry, 'command', `verification[${index}]`);
      add_required_string(errors, entry, 'evidence', `verification[${index}]`);
      if (
        non_empty_string(entry.command)
        && string_array(value.allowed_commands)
        && !value.allowed_commands.includes(entry.command)
      ) {
        errors.push(`verification[${index}].command must appear in allowed_commands`);
      }
    });
  }

  const evidence = is_object(value.evidence) ? value.evidence : null;
  if (!evidence) {
    errors.push('evidence must be an object');
  } else {
    add_required_string(errors, evidence, 'target', 'evidence');
    add_string_array(errors, evidence, 'required_artifacts', 'evidence', { non_empty: true });
  }

  add_string_array(errors, value, 'stop_conditions', 'contract', { non_empty: true });
  const gate = is_object(value.promotion_gate) ? value.promotion_gate : null;
  if (!gate) {
    errors.push('promotion_gate must be an object');
  } else {
    for (const key of ['batch_agents', 'production_mutation', 'merge_or_deploy']) {
      if (typeof gate[key] !== 'boolean') errors.push(`promotion_gate.${key} must be boolean`);
    }
  }
  return errors;
}

function validate_receipt(value) {
  const errors = [];
  if (!is_object(value)) return ['contract must be a JSON object'];
  add_required_string(errors, value, 'work_unit_id', 'contract');
  add_required_string(errors, value, 'run_id', 'contract');
  if (!ROLES.has(value.role)) errors.push(`role must be one of: ${Array.from(ROLES).join(', ')}`);
  validate_linear(errors, value.linear);
  if (!RECEIPT_STATUSES.has(value.status)) {
    errors.push(`status must be one of: ${Array.from(RECEIPT_STATUSES).join(', ')}`);
  }
  if (!Array.isArray(value.commands) || value.commands.length === 0) {
    errors.push('commands must include at least one command result');
  } else {
    value.commands.forEach((entry, index) => {
      if (!is_object(entry)) {
        errors.push(`commands[${index}] must be an object`);
        return;
      }
      add_required_string(errors, entry, 'command', `commands[${index}]`);
      if (!Number.isInteger(entry.exit_code) || entry.exit_code < 0) {
        errors.push(`commands[${index}].exit_code must be a non-negative integer`);
      }
      add_required_string(errors, entry, 'summary', `commands[${index}]`);
    });
  }
  add_string_array(errors, value, 'changed_paths', 'contract');
  add_required_string(errors, value, 'evidence', 'contract');
  add_required_string(errors, value, 'next_decision', 'contract');
  const metrics = is_object(value.metrics) ? value.metrics : null;
  if (!metrics) {
    errors.push('metrics must be an object');
  } else {
    for (const key of ['duration_ms', 'retry_count', 'human_intervention_count']) {
      if (!Number.isFinite(metrics[key]) || metrics[key] < 0) {
        errors.push(`metrics.${key} must be a non-negative number`);
      }
    }
    const tokens = is_object(metrics.tokens) ? metrics.tokens : null;
    for (const key of ['input', 'output', 'total']) {
      if (!tokens || !Number.isFinite(tokens[key]) || tokens[key] < 0) {
        errors.push(`metrics.tokens.${key} must be a non-negative number`);
      }
    }
  }
  return errors;
}

function validate_reviewed_run_receipt(value) {
  const errors = [];
  if (!is_object(value)) return ['contract must be a JSON object'];
  add_required_string(errors, value, 'run_id', 'contract');
  validate_linear(errors, value.linear);
  if (!RECEIPT_STATUSES.has(value.status)) {
    errors.push(`status must be one of: ${Array.from(RECEIPT_STATUSES).join(', ')}`);
  }
  if (!Array.isArray(value.stages) || value.stages.length !== 3) {
    errors.push('stages must contain worker, reviewer, and integrator receipts');
  } else {
    value.stages.forEach((entry, index) => {
      const stage_errors = validate_receipt(entry);
      for (const error of stage_errors) errors.push(`stages[${index}].${error}`);
      if (entry.linear?.issue !== value.linear?.issue) {
        errors.push(`stages[${index}] must target Linear issue ${value.linear?.issue}`);
      }
      if (entry.run_id !== value.run_id) errors.push(`stages[${index}] must target run ${value.run_id}`);
      if (entry.role !== REVIEWED_ROLES[index]) {
        errors.push(`stages[${index}] must declare role=${REVIEWED_ROLES[index]}`);
      }
    });
  }
  const guard = is_object(value.reviewer_guard) ? value.reviewer_guard : null;
  if (!guard) {
    errors.push('reviewer_guard must be an object');
  } else {
    if (guard.sandbox !== 'read-only') errors.push('reviewer_guard.sandbox must be read-only');
    add_required_string(errors, guard, 'before', 'reviewer_guard');
    add_required_string(errors, guard, 'after', 'reviewer_guard');
    if (guard.unchanged !== true || guard.before !== guard.after) {
      errors.push('reviewer_guard must prove an unchanged workspace');
    }
  }
  add_string_array(errors, value, 'changed_paths', 'contract');
  const metrics = is_object(value.metrics) ? value.metrics : null;
  if (!metrics) {
    errors.push('metrics must be an object');
  } else {
    for (const key of ['elapsed_ms', 'retry_count', 'human_intervention_count']) {
      if (!Number.isFinite(metrics[key]) || metrics[key] < 0) {
        errors.push(`metrics.${key} must be a non-negative number`);
      }
    }
    const tokens = is_object(metrics.tokens) ? metrics.tokens : null;
    for (const key of ['input', 'output', 'total']) {
      if (!tokens || !Number.isFinite(tokens[key]) || tokens[key] < 0) {
        errors.push(`metrics.tokens.${key} must be a non-negative number`);
      }
    }
    const stage_duration = is_object(metrics.stage_duration_ms) ? metrics.stage_duration_ms : null;
    for (const role of ['worker', 'reviewer', 'integrator']) {
      if (!stage_duration || !Number.isFinite(stage_duration[role]) || stage_duration[role] < 0) {
        errors.push(`metrics.stage_duration_ms.${role} must be a non-negative number`);
      }
    }
  }
  add_required_string(errors, value, 'next_decision', 'contract');
  return errors;
}

export function validate_agent_contract(value) {
  if (!is_object(value)) {
    return { ok: false, kind: 'unknown', errors: ['contract must be a JSON object'] };
  }
  let kind = 'unknown';
  let errors;
  if (value.schema_version === WORK_UNIT_VERSION) {
    kind = 'work_unit';
    errors = validate_work_unit(value);
  } else if (value.schema_version === EVIDENCE_RECEIPT_VERSION) {
    kind = 'evidence_receipt';
    errors = validate_receipt(value);
  } else if (value.schema_version === REVIEWED_RUN_RECEIPT_VERSION) {
    kind = 'reviewed_run_receipt';
    errors = validate_reviewed_run_receipt(value);
  } else {
    errors = [
      `schema_version must be ${WORK_UNIT_VERSION}, ${EVIDENCE_RECEIPT_VERSION}, or ${REVIEWED_RUN_RECEIPT_VERSION}`,
    ];
  }
  return { ok: errors.length === 0, kind, errors };
}

export async function validate_agent_contract_file(path) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    return {
      ok: false,
      kind: 'unknown',
      path,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  return { ...validate_agent_contract(parsed), path };
}
