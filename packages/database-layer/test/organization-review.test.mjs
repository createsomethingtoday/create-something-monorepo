import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const organizationReview = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-organization-review.json'), 'utf8')
);
const diagnostics = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-topology-diagnostics.json'), 'utf8')
);
const operatingSliceReview = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-operating-slice-review.json'), 'utf8')
);

test('organization review answers whether Atlas is showing CREATE SOMETHING operating value', () => {
  assert.equal(organizationReview.id, 'substrate:create-something:organization-review:internal');
  assert.equal(organizationReview.topologyId, diagnostics.topologyId);
  assert.equal(organizationReview.atlasCanvasId, diagnostics.atlasCanvasId);
  assert.equal(organizationReview.valueState, 'valuable_with_review_signals');
  assert.match(organizationReview.answer, /Atlas is showing value/);
  assert.equal(organizationReview.summary.nodes, diagnostics.summary.nodes);
  assert.equal(organizationReview.summary.hardGaps, diagnostics.summary.hardGapCount);
  assert.equal(organizationReview.summary.reviewSignals, diagnostics.summary.reviewSignalCount);
  assert.equal(organizationReview.summary.operatingSlices, operatingSliceReview.slices.length);
});

test('organization review exposes disconnect, overlap, and redundancy findings', () => {
  const findings = new Map(organizationReview.findings.map((finding) => [finding.id, finding]));

  assert.equal(findings.get('automation_database_imbalance')?.classification, 'disconnect');
  assert.equal(findings.get('worker_surface_concentration')?.classification, 'overlap');
  assert.equal(findings.get('mcp_surface_overlap')?.classification, 'overlap');
  assert.equal(findings.get('knowledge_policy_spread')?.classification, 'redundancy');
  assert.ok(findings.get('atlas_is_showing_value')?.evidence.includes('0 local Atlas/Substrate gaps'));
});

test('organization review recommends product and operating moves with API or agent handoff points', () => {
  assert.ok(
    organizationReview.recommendedMoves.some(
      (move) =>
        move.id === 'promote_database_layer_as_product_surface' &&
        move.apiPath === '/api/substrate/management' &&
        move.agentCommand === 'databaseLayer.management.get'
    )
  );
  assert.ok(
    organizationReview.recommendedMoves.every((move) => move.evidence.length > 0)
  );
});
