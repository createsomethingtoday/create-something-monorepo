import { validate_agent_contract } from '../../packages/symphony/src/work-unit-contract.js';

/**
 * Redacts a structurally valid Symphony reviewed-run receipt.
 * Validation establishes consistency only, not signer authenticity, independent
 * actor identity, command execution, or authority to merge, deploy, or approve.
 */
export function projectSymphonyReview(value) {
  const validation = validate_agent_contract(value);
  if (!validation.ok || validation.kind !== 'reviewed_run_receipt') {
    throw new TypeError('A valid Symphony reviewed-run receipt is required');
  }
  const identities = new Set(value.stages.map((stage) => stage.work_unit_id));
  if (identities.size !== value.stages.length) {
    throw new TypeError('Symphony reviewed-run receipt has duplicate work-unit identities');
  }
  for (const stage of value.stages) {
    if (stage.status === 'passed' && stage.commands.some((command) => command.exit_code !== 0)) {
      throw new TypeError('A passed Symphony stage contradicts its command exit codes');
    }
  }
  if (value.status === 'passed' && value.stages.some((stage) => stage.status !== 'passed')) {
    throw new TypeError('A passed Symphony review requires every stage to report passed');
  }
  return {
    runId: value.run_id,
    issue: value.linear.issue,
    status: value.status,
    stages: value.stages.map((stage) => ({
      role: stage.role,
      workUnitId: stage.work_unit_id,
      status: stage.status
    })),
    verification: 'schema_validated'
  };
}
