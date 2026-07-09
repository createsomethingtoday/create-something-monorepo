import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const recommendations = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-business-operating-recommendations.json'), 'utf8')
);
const organizationReview = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-organization-review.json'), 'utf8')
);
const readiness = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-operating-slice-readiness.json'), 'utf8')
);
const clientOverlayCoverage = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-client-overlay-coverage.json'), 'utf8')
);

test('business operating recommendations complete every organization-review move', () => {
  assert.equal(recommendations.id, 'substrate:create-something:business-operating-recommendations:internal');
  assert.equal(recommendations.topologyId, organizationReview.topologyId);
  assert.equal(recommendations.atlasCanvasId, organizationReview.atlasCanvasId);
  assert.equal(recommendations.sourceOrganizationReviewId, organizationReview.id);
  assert.equal(recommendations.summary.operationalizedLanes, 4);
  assert.equal(recommendations.lanes.length, organizationReview.recommendedMoves.length);
  assert.deepEqual(
    recommendations.lanes.map((lane) => lane.sourceMoveId).sort(),
    organizationReview.recommendedMoves.map((move) => move.id).sort()
  );
  assert.ok(recommendations.lanes.every((lane) => lane.status === 'operationalized'));
  assert.ok(recommendations.lanes.every((lane) => /explicit operator approval/.test(lane.approvalBoundary)));
});

test('worker runtime recommendation is backed by runtime binding coverage without secret values', () => {
  const workerLane = recommendations.lanes.find((lane) => lane.sourceMoveId === 'review_worker_runtime_slice_first');

  assert.equal(workerLane?.operatingLane, 'worker_runtime_review');
  assert.ok(workerLane?.relatedSliceIds.length >= 1);
  assert.ok(workerLane?.metrics.runtimeConfigRecords >= 90);
  assert.ok(workerLane?.metrics.bindingRefs >= 400);
  assert.equal(workerLane?.metrics.secretValuesCaptured, false);
  assert.equal(recommendations.workerRuntimeReview.primarySlice.title, 'Automation worker Atlas coverage');
  assert.match(recommendations.workerRuntimeReview.runtime.secretHandling, /does not capture secret values/);
});

test('client overlay recommendation becomes repeatable delivery packets', () => {
  const clientLane = recommendations.lanes.find((lane) => lane.sourceMoveId === 'turn_client_overlays_into_repeatable_delivery');

  assert.equal(clientLane?.operatingLane, 'client_overlay_delivery');
  assert.equal(recommendations.clientDeliveryPackets.length, clientOverlayCoverage.overlays.length);
  assert.equal(clientLane?.metrics.clientOverlays, clientOverlayCoverage.overlays.length);
  assert.ok(recommendations.clientDeliveryPackets.every((packet) => packet.apiPath.startsWith('/api/substrate/client-overlays/')));
  assert.ok(recommendations.clientDeliveryPackets.every((packet) => packet.receiptCount >= 1));
  assert.ok(recommendations.clientDeliveryPackets.every((packet) => /Client overlay packets are read-only/.test(packet.approvalBoundary)));
});

test('policy and guide recommendation attaches evidence to every operating slice', () => {
  const policyLane = recommendations.lanes.find((lane) => lane.sourceMoveId === 'attach_policy_to_slices');

  assert.equal(policyLane?.operatingLane, 'policy_guide_attachment');
  assert.equal(recommendations.policyGuideAttachments.length, readiness.items.length);
  assert.equal(policyLane?.policyAttachmentCount, readiness.items.length);
  assert.ok(recommendations.policyGuideAttachments.every((attachment) => attachment.policyRecordIds.length > 0));
  assert.ok(recommendations.policyGuideAttachments.every((attachment) => attachment.guideRecordIds.length > 0));
  assert.ok(recommendations.policyGuideAttachments.every((attachment) => attachment.receiptPath.endsWith('/readiness')));
});

test('Substrate product-surface recommendation is API, MCP, and agent addressable', () => {
  const productLane = recommendations.lanes.find(
    (lane) => lane.sourceMoveId === 'promote_database_layer_as_product_surface'
  );

  assert.equal(productLane?.operatingLane, 'substrate_product_surface');
  assert.ok(productLane?.resources.some((resource) => resource.apiPath === '/api/substrate/capabilities'));
  assert.ok(productLane?.metrics.resourceCount >= 500);
  assert.ok(productLane?.metrics.operationCount >= 20);
  assert.equal(productLane?.agentCommand, 'databaseLayer.business.recommendations.get');
});
