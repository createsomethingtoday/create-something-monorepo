import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const sessionPath = path.join(
  packageRoot,
  'data',
  'create-something-internal-operating-topology.atlas-session.json'
);
const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
const performanceContract = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-performance-contract.json'), 'utf8')
);
const organizationReview = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-organization-review.json'), 'utf8')
);

test('internal topology exports an Atlas Studio session artifact', () => {
  assert.equal(session.version, 1);
  assert.equal(session.id, 'create-something-internal-operating-topology');
  assert.equal(session.client, 'CREATE SOMETHING');
  assert.equal(session.workflow, 'Internal operating topology');
});

test('Atlas Studio session preserves topology node and edge parity', () => {
  assert.equal(session.canvas.nodes.length, topology.nodes.length);
  assert.equal(session.canvas.edges.length, topology.edges.length);
  assert.ok(session.canvas.nodes.every((node) => node.atlasId?.startsWith('substrate:create-something:')));
});

test('Atlas Studio session exposes display-safe node owners', () => {
  const badOwner = session.canvas.nodes.find(
    (node) => typeof node.owner !== 'string' || !node.owner.trim()
  );

  assert.equal(badOwner, undefined);
});

test('Atlas Studio session carries Substrate bindings, sync state, and governance receipts', () => {
  const substrateNode = session.canvas.nodes.find((node) =>
    node.atlasId?.includes('substrate-mcp')
  );
  const clientNode = session.canvas.nodes.find((node) =>
    /packages\/agency\/clients\/outerfields/.test(node.notes ?? '')
  );

  assert.equal(substrateNode?.sync?.status, 'synced');
  assert.ok(substrateNode?.governanceRecords?.length >= 1);
  assert.equal(clientNode?.sync?.status, 'synced');
  assert.ok(clientNode?.governanceRecords?.length >= 1);
  assert.ok(clientNode?.bindings?.some((binding) => binding.selector === clientNode.atlasId));
});

test('Atlas Studio session includes a review story for topology completion', () => {
  assert.equal(session.story.active, true);
  assert.equal(session.story.activeStepId, 'topology-root');
  assert.equal(session.story.steps.length, 6);
  assert.ok(session.story.callouts.length > 0);
  assert.ok(
    session.story.questions.some((question) =>
      question.question.includes('Which mapped operating slice')
    )
  );
  assert.ok(session.story.nextAction.includes('readiness gates'));
  assert.ok(session.story.callouts.some((callout) => callout.text.includes('approval required')));
});

test('Atlas Studio session observes the API/MCP/agent management surface', () => {
  assert.ok(
    session.observations.some((observation) =>
      observation.text.includes('API/MCP/agent management surface is mapped')
    )
  );
  assert.ok(
    session.observations.some((observation) =>
      observation.text.includes('write-shaped operations approval-gated')
    )
  );
});

test('Atlas Studio session surfaces topology diagnostics for business review', () => {
  const diagnosticsObservation = session.observations.find(
    (observation) => observation.id === 'observation_topology_diagnostics'
  );
  const diagnosticsStep = session.story.steps.find((step) => step.id === 'topology-diagnostics');

  assert.ok(diagnosticsObservation);
  assert.ok(diagnosticsObservation.text.includes('connected_map_with_review_signals'));
  assert.ok(diagnosticsObservation.text.includes('0 hard gaps'));
  assert.ok(diagnosticsObservation.text.includes('6 review signals'));
  assert.ok(diagnosticsStep);
  assert.ok(diagnosticsStep.summary.includes('Automation has 245'));
  assert.ok(diagnosticsStep.summary.includes('Database has 25'));
  assert.ok(diagnosticsStep.proof.includes('0 hard gaps'));
  assert.ok(session.story.callouts.some((callout) => callout.id.startsWith('diagnostic_callout_')));
});

test('Atlas Studio session surfaces the Substrate performance contract for speed review', () => {
  const performanceObservation = session.observations.find(
    (observation) => observation.id === 'observation_performance_contract'
  );
  const performanceStep = session.story.steps.find((step) => step.id === 'substrate-performance');

  assert.ok(performanceObservation);
  assert.ok(performanceObservation.text.includes('obsidian_like_operator_speed'));
  assert.ok(performanceObservation.text.includes(`${performanceContract.summary.topologyRecords} topology records`));
  assert.ok(performanceStep);
  assert.ok(performanceStep.summary.includes('Record navigation'));
  assert.ok(performanceStep.summary.includes('Direct record URLs'));
  assert.ok(performanceStep.proof.includes(`${performanceContract.budgets.length} budgets`));
  assert.ok(performanceStep.proof.includes(`${performanceContract.fastPath.length} fast paths`));
});

test('Atlas Studio session surfaces the organization review for business value review', () => {
  const organizationObservation = session.observations.find(
    (observation) => observation.id === 'observation_organization_review'
  );
  const organizationStep = session.story.steps.find((step) => step.id === 'organization-review');

  assert.ok(organizationObservation);
  assert.ok(organizationObservation.text.includes(organizationReview.valueState));
  assert.ok(organizationObservation.text.includes(`${organizationReview.summary.hardGaps} hard gaps`));
  assert.ok(organizationObservation.text.includes(`${organizationReview.summary.reviewSignals} review signals`));
  assert.ok(organizationStep);
  assert.ok(organizationStep.summary.includes('Atlas is showing value'));
  assert.ok(organizationStep.summary.includes('automation/database imbalance'));
  assert.ok(organizationStep.proof.includes('5 findings'));
  assert.ok(organizationStep.proof.includes('4 recommended moves'));
});
