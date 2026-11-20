import { run_reviewed_loop } from '../../packages/symphony/src/reviewed-loop.js';
import { validate_agent_contract } from '../../packages/symphony/src/work-unit-contract.js';

const ISSUE = 'CRE-2322';
const COMMAND = 'synthetic:verification';
const ROLES = ['worker', 'reviewer', 'integrator'];

/** Synthetic fixture only: the real aggregator validates inert stage receipts. */
export async function createReviewFixture() {
  const workUnits = Object.fromEntries(
    ROLES.map((role) => [
      role,
      {
        schema_version: 'multi-agent-work-unit.v1',
        id: `synthetic-${ISSUE}-${role}`,
        linear: { issue: ISSUE },
        lane: role === 'worker' ? 'code-quality' : 'review',
        role,
        tier: ['Database', 'Automation', 'Judgment'],
        goal: `Synthetic ${role} fixture; no execution or production authority.`,
        scope: { packages: [], paths: ['scripts/graph-engineering/**'] },
        locks: {
          packages: [],
          paths: ['scripts/graph-engineering/**'],
          mode: role === 'reviewer' ? 'read' : 'write'
        },
        allowed_commands: [COMMAND],
        verification: [
          { command: COMMAND, evidence: 'Synthetic verification fixture; no command executed.' }
        ],
        evidence: { target: 'synthetic fixture', required_artifacts: ['synthetic stage receipt'] },
        stop_conditions: ['Synthetic fixture cannot execute commands or promote artifacts.'],
        promotion_gate: { batch_agents: false, production_mutation: false, merge_or_deploy: false }
      }
    ])
  );
  let clock = 0;
  const receipt = await run_reviewed_loop({
    issue: { identifier: ISSUE, title: 'Synthetic graph engineering review fixture' },
    work_units: workUnits,
    fingerprint: async () => 'synthetic-unchanged-workspace',
    now_ms: () => ++clock,
    execute_stage: async ({ role, run_id, work_unit }) => ({
      schema_version: 'multi-agent-evidence-receipt.v1',
      run_id,
      role,
      work_unit_id: work_unit.id,
      linear: { issue: ISSUE },
      status: 'passed',
      commands: [
        { command: COMMAND, exit_code: 0, summary: 'Synthetic fixture; no command executed.' }
      ],
      changed_paths: [],
      evidence: 'Synthetic fixture; not observed execution evidence.',
      next_decision: 'Inspect synthetic fixture only; no promotion authority.',
      metrics: {
        duration_ms: 0,
        retry_count: 0,
        human_intervention_count: 0,
        tokens: { input: 0, output: 0, total: 0 }
      }
    })
  });
  const validation = validate_agent_contract(receipt);
  if (!validation.ok || validation.kind !== 'reviewed_run_receipt') {
    throw new TypeError('Synthetic reviewed-loop fixture failed its owning validator');
  }
  return receipt;
}
