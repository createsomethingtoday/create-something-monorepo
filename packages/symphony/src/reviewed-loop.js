import { SymphonyError } from './errors.js';
import { validate_agent_contract } from './work-unit-contract.js';

const ROLES = ['worker', 'reviewer', 'integrator'];

function assert_valid_contract(contract, expected_kind, label) {
  const result = validate_agent_contract(contract);
  if (!result.ok || result.kind !== expected_kind) {
    throw new SymphonyError(
      'invalid_agent_contract',
      `${label} must be a valid ${expected_kind}: ${result.errors.join('; ')}`,
    );
  }
}

function assert_work_units(issue, work_units) {
  for (const role of ROLES) {
    const unit = work_units?.[role];
    assert_valid_contract(unit, 'work_unit', `${role} work unit`);
    if (unit.role !== role) {
      throw new SymphonyError('invalid_agent_contract', `${role} work unit must declare role=${role}`);
    }
    if (unit.linear.issue !== issue.identifier) {
      throw new SymphonyError(
        'invalid_agent_contract',
        `${role} work unit must target ${issue.identifier}`,
      );
    }
  }
  if (work_units.reviewer.locks.mode !== 'read') {
    throw new SymphonyError('unsafe_reviewer_contract', 'Reviewer work unit must use read locks.');
  }
}

function assert_stage_receipt(receipt, work_unit, role) {
  assert_valid_contract(receipt, 'evidence_receipt', `${role} receipt`);
  if (receipt.work_unit_id !== work_unit.id) {
    throw new SymphonyError(
      'invalid_agent_contract',
      `${role} receipt must target work unit ${work_unit.id}`,
    );
  }
  if (receipt.linear.issue !== work_unit.linear.issue) {
    throw new SymphonyError(
      'invalid_agent_contract',
      `${role} receipt must target Linear issue ${work_unit.linear.issue}`,
    );
  }
  const outside = receipt.changed_paths.filter(
    (path) => !work_unit.locks.paths.some((pattern) => path_matches_lock(path, pattern)),
  );
  if (outside.length > 0) {
    throw new SymphonyError(
      'stage_scope_violation',
      `${role} changed paths outside its locks: ${outside.join(', ')}`,
    );
  }
}

function path_matches_lock(path, pattern) {
  if (pattern.endsWith('/**') && !pattern.slice(0, -3).includes('*')) {
    const prefix = pattern.slice(0, -3);
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  if (!pattern.includes('*')) return path === pattern;
  let expression = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '*' && pattern[index + 1] === '*') {
      expression += '.*';
      index += 1;
    } else if (character === '*') {
      expression += '[^/]*';
    } else {
      expression += /[.+?^${}()|[\]\\]/u.test(character) ? `\\${character}` : character;
    }
  }
  return new RegExp(`^${expression}$`, 'u').test(path);
}

function stage_metrics(receipt) {
  const metrics = receipt.metrics ?? {};
  const tokens = metrics.tokens ?? {};
  return {
    duration_ms: Number.isFinite(metrics.duration_ms) ? metrics.duration_ms : 0,
    retry_count: Number.isFinite(metrics.retry_count) ? metrics.retry_count : 0,
    human_intervention_count: Number.isFinite(metrics.human_intervention_count)
      ? metrics.human_intervention_count
      : 0,
    tokens: {
      input: Number.isFinite(tokens.input) ? tokens.input : 0,
      output: Number.isFinite(tokens.output) ? tokens.output : 0,
      total: Number.isFinite(tokens.total) ? tokens.total : 0,
    },
  };
}

function aggregate_metrics(started_at_ms, completed_at_ms, receipts) {
  const output = {
    elapsed_ms: Math.max(0, completed_at_ms - started_at_ms),
    stage_duration_ms: {},
    retry_count: 0,
    human_intervention_count: 0,
    tokens: { input: 0, output: 0, total: 0 },
  };
  ROLES.forEach((role, index) => {
    const metrics = stage_metrics(receipts[index]);
    output.stage_duration_ms[role] = metrics.duration_ms;
    output.retry_count += metrics.retry_count;
    output.human_intervention_count += metrics.human_intervention_count;
    output.tokens.input += metrics.tokens.input;
    output.tokens.output += metrics.tokens.output;
    output.tokens.total += metrics.tokens.total;
  });
  return output;
}

async function execute(role, run_id, work_unit, sandbox, prior_receipts, execute_stage) {
  const receipt = await execute_stage({ role, run_id, work_unit, sandbox, prior_receipts });
  assert_stage_receipt(receipt, work_unit, role);
  if (receipt.run_id !== run_id || receipt.role !== role) {
    throw new SymphonyError(
      'invalid_agent_contract',
      `${role} receipt must declare run_id=${run_id} and role=${role}`,
    );
  }
  if (receipt.status !== 'passed') {
    throw new SymphonyError('reviewed_stage_failed', `${role} stage returned ${receipt.status}.`);
  }
  return receipt;
}

export async function run_reviewed_loop(options) {
  const {
    issue,
    work_units,
    execute_stage,
    fingerprint,
    now_ms = Date.now,
  } = options;
  if (!issue?.identifier) throw new SymphonyError('invalid_issue', 'Reviewed loop requires an issue identifier.');
  if (typeof execute_stage !== 'function') throw new SymphonyError('invalid_executor', 'Reviewed loop requires execute_stage.');
  if (typeof fingerprint !== 'function') throw new SymphonyError('invalid_fingerprint', 'Reviewed loop requires fingerprint.');

  assert_work_units(issue, work_units);
  const started_at_ms = now_ms();
  const run_id = `${issue.identifier}-reviewed-single-pass`;
  const receipts = [];

  receipts.push(await execute('worker', run_id, work_units.worker, 'workspace-write', receipts, execute_stage));
  const before = await fingerprint();
  receipts.push(await execute('reviewer', run_id, work_units.reviewer, 'read-only', receipts, execute_stage));
  const after = await fingerprint();
  if (before !== after || receipts[1].changed_paths.length > 0) {
    throw new SymphonyError(
      'reviewer_mutated_workspace',
      'Reviewer changed the worker workspace; reviewed loop stopped before integration.',
    );
  }
  receipts.push(await execute('integrator', run_id, work_units.integrator, 'workspace-write', receipts, execute_stage));

  const completed_at_ms = now_ms();
  const changed_paths = [...new Set(receipts.flatMap((entry) => entry.changed_paths))].sort();
  return {
    schema_version: 'multi-agent-reviewed-run-receipt.v1',
    run_id,
    linear: { issue: issue.identifier },
    status: 'passed',
    stages: receipts,
    reviewer_guard: {
      sandbox: 'read-only',
      before,
      after,
      unchanged: true,
    },
    changed_paths,
    metrics: aggregate_metrics(started_at_ms, completed_at_ms, receipts),
    next_decision: 'Reviewed single pass completed; inspect proof before promotion.',
  };
}
