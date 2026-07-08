import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createJsonRpcHandler,
  createMcpFrameParser,
  createTopology3dRuntime,
  encodeMcpFrame,
  loadTopology3dArtifact
} from '../scripts/topology-3d-mcp.mjs';

test('topology 3d MCP runtime exposes declared tools and resources', async () => {
  const runtime = createTopology3dRuntime();

  const tools = new Set(runtime.toolsList().map((tool) => tool.name));
  assert.ok(tools.has('topology3d_context_read'));
  assert.ok(tools.has('topology3d_context_set'));
  assert.ok(tools.has('topology3d_node_focus'));
  assert.ok(tools.has('topology3d_insights_read'));
  assert.ok(tools.has('topology3d_group_explain'));
  assert.ok(tools.has('topology3d_atlas_context_read'));
  assert.ok(tools.has('topology3d_atlas_story_read'));

  const resources = new Set(runtime.resourcesList().map((resource) => resource.uri));
  assert.ok(resources.has('topology3d://create-something/internal/context'));
  assert.ok(resources.has('topology3d://create-something/internal/insights'));
  assert.ok(resources.has('topology3d://create-something/internal/node/{nodeId}'));
  assert.ok(resources.has('topology3d://create-something/internal/atlas-session'));
  assert.ok(resources.has('topology3d://create-something/internal/atlas-story'));
  assert.ok(resources.has('topology3d://create-something/internal/atlas-node/{atlasNodeId}'));
});

test('topology 3d MCP runtime can read insights and navigate context', async () => {
  const runtime = createTopology3dRuntime();
  const insights = runtime.callTool('topology3d_insights_read', { lensId: 'apiAi' });

  assert.ok(insights.observations.some((observation) => observation.id === 'api-surface-is-largest-interface'));
  assert.ok(insights.lens.topStructuralPairs.length > 0);

  const context = runtime.callTool('topology3d_context_set', {
    lensId: 'business',
    groupId: 'client-overlays',
    edgeMode: 'structural'
  });

  assert.equal(context.state.lensId, 'business');
  assert.equal(context.state.groupId, 'client-overlays');
  assert.equal(context.counts.visibleNodes, 12);
  assert.ok(context.nodes.every((node) => node.group?.id === 'client-overlays'));

  const focused = runtime.callTool('topology3d_node_focus', {
    nodeId: context.nodes[0].id,
    lensId: 'business'
  });

  assert.equal(focused.selected, context.nodes[0].id);
  assert.equal(focused.state.selectedNodeId, context.nodes[0].id);
  assert.equal(focused.substrate.recordId, context.nodes[0].id);
  assert.ok(focused.substrate.apiPath.startsWith('/api/substrate/topology/internal/records/'));
  assert.ok(focused.substrate.mcpUri.startsWith('substrate://topology/internal/records/'));
  assert.ok(focused.lensViews.business.groupId);
  assert.equal(focused.atlas.topologyNode.id, context.nodes[0].id);
  assert.equal(focused.atlas.atlasNode.atlasId, context.nodes[0].id);

  const exported = runtime.callTool('topology3d_selection_export', { limit: 5 });
  assert.equal(exported.substrate.recordId, context.nodes[0].id);
  assert.equal(exported.handoff.substrateRecordId, context.nodes[0].id);
  assert.equal(exported.handoff.substrateMcpUri, exported.substrate.mcpUri);
  assert.equal(exported.handoff.receiptId, exported.substrate.receiptId);
});

test('topology 3d MCP runtime composes topology and Atlas context', async () => {
  const runtime = createTopology3dRuntime();
  const artifact = loadTopology3dArtifact();
  const context = runtime.callTool('topology3d_atlas_context_read', {
    nodeId: 'substrate:create-something:root',
    includeStory: true,
    limit: 5
  });

  assert.equal(context.joins.topologyId, 'substrate:create-something:topology:internal');
  assert.equal(context.joins.atlasCanvasId, 'create-something-internal-operating-topology');
  assert.equal(context.topologyNode.id, 'substrate:create-something:root');
  assert.equal(context.atlasNode.atlasId, 'substrate:create-something:root');
  assert.equal(context.atlasSession.nodes, artifact.nodes.length);
  assert.equal(context.atlasSession.edges, artifact.edges.length);
  assert.ok(context.atlasEdges.length > 0);
  assert.ok(context.story.steps.some((step) => step.id === 'topology-root'));

  const story = runtime.callTool('topology3d_atlas_story_read', { stepId: 'client-overlays', limit: 10 });
  assert.equal(story.atlasSession.id, 'create-something-internal-operating-topology');
  assert.equal(story.activeStep.id, 'client-overlays');
  assert.ok(story.activeStep.focusTopologyNodeIds.length > 0);

  const resource = runtime.readResource(`topology3d://create-something/internal/atlas-node/${context.atlasNode.id}`);
  assert.equal(resource.atlasNode.id, context.atlasNode.id);
  assert.equal(resource.topologyNode.id, context.topologyNode.id);
});

test('topology 3d MCP runtime explains groups with directional context', async () => {
  const runtime = createTopology3dRuntime();
  const explanation = runtime.callTool('topology3d_group_explain', {
    lensId: 'apiAi',
    groupId: 'api-readable-substrate',
    limit: 5
  });

  assert.equal(explanation.lens.id, 'apiAi');
  assert.equal(explanation.group.id, 'api-readable-substrate');
  assert.ok(explanation.classificationEvidence.dominantSurfaces.length > 0);
  assert.ok(explanation.representativeNodes.length > 0);
  assert.ok(explanation.directionalLinks.topLensLinks.length > 0);
  assert.ok(explanation.directionalLinks.inbound.length > 0);
  assert.ok(explanation.directionalLinks.outbound.length > 0);
  assert.notEqual(
    explanation.improvementCandidates.some((candidate) => candidate.id === 'substrate-operator-contract'),
    explanation.completedImprovements.some((candidate) => candidate.id === 'substrate-operator-contract')
  );
});

test('topology 3d MCP JSON-RPC handler returns structured tool content', async () => {
  const runtime = createTopology3dRuntime();
  const handle = createJsonRpcHandler(runtime);

  const initialized = await handle({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2024-11-05' }
  });
  assert.equal(initialized.result.serverInfo.name, '@create-something/database-layer/topology3d');

  const response = await handle({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'topology3d_lens_summarize',
      arguments: { lensId: 'business' }
    }
  });

  assert.equal(response.result.structuredContent.lens.id, 'business');
  assert.ok(response.result.structuredContent.groups.some((group) => group.id === 'database-substrate'));
  assert.match(response.result.content[0].text, /database-substrate/);
});

test('topology 3d MCP frame parser accepts content-length frames and newline JSON', () => {
  const messages = [];
  const parser = createMcpFrameParser((message) => messages.push(message));
  const framed = encodeMcpFrame({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

  parser(Buffer.from(framed));
  parser(Buffer.from('{"jsonrpc":"2.0","id":2,"method":"resources/list"}\n'));

  assert.deepEqual(
    messages.map((message) => message.method),
    ['tools/list', 'resources/list']
  );
});
