import { SymphonyError } from './errors.js';
import { run_reviewed_loop } from './reviewed-loop.js';
import { validate_agent_contract } from './work-unit-contract.js';

export function select_reviewed_pilot_issue(candidates, issue_identifier) {
  const expected = String(issue_identifier ?? '').trim().toUpperCase();
  const matches = candidates.filter(
    (issue) => String(issue.identifier ?? '').trim().toUpperCase() === expected,
  );
  if (matches.length !== 1) {
    throw new SymphonyError(
      'reviewed_issue_not_dispatchable',
      `Expected exactly one dispatchable ${expected || 'Linear issue'}, found ${matches.length}.`,
    );
  }
  return matches[0];
}

function validate_stage_contracts(work_units, issue_identifier) {
  const ordered = ['worker', 'reviewer', 'integrator'];
  for (const role of ordered) {
    const unit = work_units?.[role];
    const validation = validate_agent_contract(unit);
    if (!validation.ok || validation.kind !== 'work_unit') {
      throw new SymphonyError(
        'invalid_agent_contract',
        `${role} work unit is invalid: ${validation.errors.join('; ')}`,
      );
    }
    if (unit.role !== role || unit.linear.issue !== issue_identifier) {
      throw new SymphonyError(
        'invalid_agent_contract',
        `${role} work unit must declare role=${role} and issue=${issue_identifier}`,
      );
    }
  }
  return ordered.map((role) => work_units[role].id);
}

export async function run_reviewed_pilot(options) {
  const direct = typeof options.tracker.fetch_issue_by_identifier === 'function'
    ? await options.tracker.fetch_issue_by_identifier(options.issue_identifier)
    : null;
  const candidates = direct ? [direct] : await options.tracker.fetch_candidate_issues();
  const issue = select_reviewed_pilot_issue(candidates, options.issue_identifier);
  const work_unit_ids = validate_stage_contracts(options.work_units, issue.identifier);
  const verification_commands = [...new Set(
    ['worker', 'reviewer', 'integrator'].flatMap(
      (role) => options.work_units[role].verification.map((entry) => entry.command),
    ),
  )];
  const base = {
    mode: options.dispatch ? 'dispatch' : 'readiness',
    issue: {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
    },
    work_unit_ids,
    removed_model_api_keys: options.removed_model_api_keys ?? [],
    verification_commands,
    reviewer_guard: {
      sandbox: 'read-only',
      fingerprint: 'sha256 repository state before and after review',
      mutation_result: 'fail',
    },
    metric_fields: [
      'elapsed_ms',
      'stage_duration_ms',
      'retry_count',
      'human_intervention_count',
      'tokens',
    ],
    receipt_destination: options.receipt_destination ?? null,
    dispatched: false,
  };
  if (!options.dispatch) return base;

  const claimed_issue = await options.tracker.claim_issue(issue);
  const workspace = await options.workspace_manager.ensure_workspace(issue.identifier);
  const execute_stage = options.create_stage_executor({
    issue: claimed_issue,
    workspace_path: workspace.path,
  });
  const receipt = await run_reviewed_loop({
    issue: claimed_issue,
    work_units: options.work_units,
    execute_stage,
    fingerprint: () => options.fingerprint(workspace.path),
  });
  const receipt_path = await options.write_receipt(receipt);
  await options.tracker.comment_issue(
    issue.id,
    [
      'Reviewed single-pass pilot evidence:',
      '',
      `- Run: ${receipt.run_id}`,
      `- Receipt: ${receipt_path}`,
      `- Stages: ${receipt.stages.map((stage) => stage.role).join(' -> ')}`,
      `- Reviewer fingerprint unchanged: ${receipt.reviewer_guard.unchanged ? 'yes' : 'no'}`,
      `- Elapsed ms: ${receipt.metrics.elapsed_ms}`,
      `- Tokens: ${receipt.metrics.tokens.total}`,
      `- Human interventions: ${receipt.metrics.human_intervention_count}`,
      `- Next decision: ${receipt.next_decision}`,
    ].join('\n'),
  );
  return {
    ...base,
    dispatched: true,
    workspace_path: workspace.path,
    receipt_path,
    receipt,
  };
}
