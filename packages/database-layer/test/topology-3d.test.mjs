import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const topology3dPath = path.join(packageRoot, 'data', 'create-something-internal-topology.3d.json');

const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const topology3d = JSON.parse(fs.readFileSync(topology3dPath, 'utf8'));

test('3d topology artifact preserves canonical topology identity and parity', () => {
  assert.equal(topology3d.version, 1);
  assert.equal(topology3d.topologyId, topology.id);
  assert.equal(topology3d.atlasCanvasId, topology.atlasCanvasId);
  assert.equal(topology3d.nodes.length, topology.nodes.length);
  assert.equal(topology3d.edges.length, topology.edges.length);
  assert.equal(topology3d.rendererBudget.layout, 'precomputed');
});

test('3d topology artifact has finite precomputed positions and compact click targets', () => {
  assert.ok(topology3d.clusters.length > 4);

  for (const node of topology3d.nodes) {
    assert.equal(typeof node.id, 'string');
    assert.equal(typeof node.targetPath, 'string');
    assert.equal(node.substrate.recordId, node.id);
    assert.ok(node.substrate.apiPath.startsWith('/api/substrate/topology/internal/records/'));
    assert.ok(node.substrate.mcpUri.startsWith('substrate://topology/internal/records/'));
    assert.equal(node.substrate.agentCommand, 'databaseLayer.topology.records.get');
    assert.equal(node.substrate.receiptId, `receipt:${node.id}`);
    assert.equal(node.substrate.atlasCanvasId, topology.atlasCanvasId);
    assert.equal(node.substrate.atlasNodeId, node.atlasNodeId);
    assert.equal(Number.isFinite(node.x), true);
    assert.equal(Number.isFinite(node.y), true);
    assert.equal(Number.isFinite(node.z), true);
    assert.ok(node.size > 0);
    assert.match(node.color, /^#[0-9a-f]{6}$/i);
  }
});

test('3d topology artifact includes a parity-preserving inferred business lens', () => {
  assert.equal(topology3d.lenses.operational.label, 'Operational');
  assert.equal(topology3d.lenses.business.label, 'Business');
  assert.equal(topology3d.lenses.business.inferred, true);
  assert.equal(topology3d.lenses.business.nodes.length, topology.nodes.length);

  const businessGroupIds = new Set(topology3d.lenses.business.groups.map((group) => group.id));
  assert.ok(businessGroupIds.has('mcp-capability-platform'));
  assert.ok(businessGroupIds.has('cloudflare-delivery-spine'));
  assert.ok(businessGroupIds.has('policy-judgment-os'));
  assert.ok(businessGroupIds.has('database-substrate'));

  for (const nodeView of topology3d.lenses.business.nodes) {
    assert.ok(businessGroupIds.has(nodeView.groupId));
    assert.equal(Number.isFinite(nodeView.x), true);
    assert.equal(Number.isFinite(nodeView.y), true);
    assert.equal(Number.isFinite(nodeView.z), true);
    assert.match(nodeView.color, /^#[0-9a-f]{6}$/i);
  }
});

test('3d topology artifact includes a parity-preserving API and AI native lens', () => {
  assert.equal(topology3d.lenses.apiAi.label, 'API / AI');
  assert.equal(topology3d.lenses.apiAi.inferred, true);
  assert.equal(topology3d.lenses.apiAi.nodes.length, topology.nodes.length);

  const interfaceGroupIds = new Set(topology3d.lenses.apiAi.groups.map((group) => group.id));
  assert.ok(interfaceGroupIds.has('agent-callable-interfaces'));
  assert.ok(interfaceGroupIds.has('api-readable-substrate'));
  assert.ok(interfaceGroupIds.has('ai-orchestration'));
  assert.ok(interfaceGroupIds.has('machine-readable-governance'));
  assert.ok(interfaceGroupIds.has('knowledge-to-tools'));

  for (const nodeView of topology3d.lenses.apiAi.nodes) {
    assert.ok(interfaceGroupIds.has(nodeView.groupId));
    assert.equal(Number.isFinite(nodeView.x), true);
    assert.equal(Number.isFinite(nodeView.y), true);
    assert.equal(Number.isFinite(nodeView.z), true);
    assert.match(nodeView.color, /^#[0-9a-f]{6}$/i);
  }
});

test('3d topology artifact declares an agent-native context API contract', () => {
  assert.equal(topology3d.contextApi.id, 'create-something.topology3d.context.v1');
  assert.equal(topology3d.contextApi.stateSchema.lensId.default, 'operational');
  assert.deepEqual(topology3d.contextApi.stateSchema.edgeMode.enum, ['operational', 'structural', 'all', 'contains']);

  const resourceUris = new Set(topology3d.contextApi.resources.map((resource) => resource.uri));
  assert.ok(resourceUris.has('topology3d://create-something/internal/artifact'));
  assert.ok(resourceUris.has('topology3d://create-something/internal/state'));
  assert.ok(resourceUris.has('topology3d://create-something/internal/context'));
  assert.ok(resourceUris.has('topology3d://create-something/internal/node/{nodeId}'));
  assert.ok(resourceUris.has('topology3d://create-something/internal/insights'));
  assert.ok(resourceUris.has('topology3d://create-something/internal/atlas-session'));
  assert.ok(resourceUris.has('topology3d://create-something/internal/atlas-story'));
  assert.ok(resourceUris.has('topology3d://create-something/internal/atlas-node/{atlasNodeId}'));

  const tools = new Map(topology3d.contextApi.tools.map((tool) => [tool.name, tool]));
  assert.equal(tools.get('topology3d_context_read')?.kind, 'read');
  assert.equal(tools.get('topology3d_context_set')?.kind, 'view_state');
  assert.equal(tools.get('topology3d_node_focus')?.kind, 'view_state');
  assert.equal(tools.get('topology3d_lens_summarize')?.kind, 'read');
  assert.equal(tools.get('topology3d_selection_export')?.kind, 'read');
  assert.equal(tools.get('topology3d_insights_read')?.kind, 'read');
  assert.equal(tools.get('topology3d_group_explain')?.kind, 'read');
  assert.equal(tools.get('topology3d_atlas_context_read')?.kind, 'read');
  assert.equal(tools.get('topology3d_atlas_story_read')?.kind, 'read');
  assert.ok(topology3d.contextApi.mcp.boundaries.some((boundary) => boundary.includes('do not mutate topology truth')));
});

test('3d topology artifact includes generated insights and improvement candidates', () => {
  assert.ok(Array.isArray(topology3d.insights.observations));
  assert.ok(Array.isArray(topology3d.insights.improvementCandidates));
  assert.ok(Array.isArray(topology3d.insights.completedImprovements));
  assert.ok(topology3d.insights.observations.length >= 4);
  assert.ok(topology3d.insights.improvementCandidates.length >= 2);
  assert.ok(topology3d.insights.completedImprovements.length >= 1);

  const observationIds = new Set(topology3d.insights.observations.map((observation) => observation.id));
  assert.ok(observationIds.has('api-surface-is-largest-interface'));
  assert.ok(observationIds.has('knowledge-operates-as-product-tissue'));
  assert.ok(observationIds.has('governance-is-cross-cutting'));
  assert.ok(observationIds.has('contains-edges-dominate-raw-topology'));

  const improvementIds = new Set(topology3d.insights.improvementCandidates.map((candidate) => candidate.id));
  assert.ok(improvementIds.has('client-api-overlay-playbooks'));
  assert.equal(improvementIds.has('substrate-operator-contract'), false);
  assert.ok(improvementIds.has('capability-package-contracts'));

  const completedIds = new Set(topology3d.insights.completedImprovements.map((candidate) => candidate.id));
  assert.ok(completedIds.has('semantic-edge-weighting'));
  assert.ok(completedIds.has('agent-explainable-groups'));
  assert.ok(completedIds.has('substrate-operator-contract'));
  assert.ok(
    topology3d.insights.completedImprovements.some((candidate) =>
      candidate.groupIds?.includes('api-readable-substrate')
    )
  );

  assert.equal(topology3d.insights.relationCounts.contains > topology3d.insights.relationCounts.depends_on, true);
  assert.ok(topology3d.insights.lenses.apiAi.topStructuralPairs.length > 0);
  assert.ok(topology3d.insights.lenses.apiAi.directionalStructuralLinks.length > 0);
  assert.ok(topology3d.insights.lenses.apiAi.groups.some((group) => group.classificationEvidence?.representativeNodes?.length));
});

test('3d business lens carries readable meanings for every group', () => {
  for (const group of [...topology3d.lenses.business.groups, ...topology3d.lenses.apiAi.groups]) {
    assert.equal(typeof group.label, 'string');
    assert.equal(typeof group.meaning, 'string');
    assert.ok(group.meaning.length > 40);
    assert.ok(group.count > 0);
  }
});

test('3d topology edges use numeric indexes for fast renderer buffers', () => {
  const maxIndex = topology3d.nodes.length - 1;

  for (const edge of topology3d.edges) {
    assert.equal(Number.isInteger(edge.source), true);
    assert.equal(Number.isInteger(edge.target), true);
    assert.ok(edge.source >= 0 && edge.source <= maxIndex);
    assert.ok(edge.target >= 0 && edge.target <= maxIndex);
    assert.match(edge.color, /^#[0-9a-f]{6}$/i);
    assert.ok(edge.alpha > 0 && edge.alpha <= 1);
  }
});
