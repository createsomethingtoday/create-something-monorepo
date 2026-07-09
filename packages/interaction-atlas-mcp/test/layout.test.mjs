import assert from 'node:assert/strict';
import test from 'node:test';

import {
  largeTopologyLayoutNodes,
  largeTopologySectionSummaries,
  shouldRenderInteractiveMiniMap,
  tidyNodeUpdates,
  topologyBoardSectionForNode
} from '../dist/studio/client/layout.js';

function node(index, surface, kind = 'system') {
  return {
    id: `node_${index}`,
    kind,
    label: `${surface} ${index}`,
    owner: 'CREATE SOMETHING',
    status: 'run',
    notes: `packages/example-${index} | ${surface} | Automation`,
    x: 80,
    y: 120 + index * 34,
    width: 280,
    height: 142,
    createdBy: 'system',
    updatedAt: '2026-07-07T00:00:00.000Z'
  };
}

test('tidy layout spreads large topology sessions into board sections', () => {
  const nodes = [
    node(0, 'repo', 'actor'),
    ...Array.from({ length: 40 }, (_, index) => node(index + 1, 'package', 'system')),
    ...Array.from({ length: 80 }, (_, index) => node(index + 41, 'worker', 'system')),
    ...Array.from({ length: 52 }, (_, index) => node(index + 121, 'mcp', 'ai')),
    ...Array.from({ length: 48 }, (_, index) => node(index + 173, 'policy', 'constraint'))
  ];
  const updates = tidyNodeUpdates({
    canvas: {
      edges: [],
      nodes
    }
  });

  const xs = updates.map((update) => update.x);
  const ys = updates.map((update) => update.y);
  assert.equal(updates.length, nodes.length);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 2600);
  assert.ok(Math.max(...ys) - Math.min(...ys) < nodes.length * 34);
  assert.deepEqual(
    updates.find((update) => update.id === 'node_0'),
    {
      height: 64,
      id: 'node_0',
      width: 176,
      x: 96,
      y: 176
    }
  );
});

test('large topology projection keeps existing sessions readable before persisted arrange', () => {
  const nodes = [
    node(0, 'repo', 'actor'),
    ...Array.from({ length: 110 }, (_, index) => node(index + 1, 'worker', 'system')),
    ...Array.from({ length: 110 }, (_, index) => node(index + 111, 'policy', 'constraint'))
  ];

  const projected = largeTopologyLayoutNodes({
    canvas: {
      edges: [],
      nodes
    }
  });
  const byId = new Map(projected.map((item) => [item.id, item]));

  assert.equal(projected.length, nodes.length);
  assert.equal(byId.get('node_0')?.height, 64);
  assert.equal(byId.get('node_0')?.width, 176);
  assert.ok((byId.get('node_1')?.x ?? 0) > (byId.get('node_0')?.x ?? 0));
  assert.ok((byId.get('node_111')?.y ?? 0) > 176);
});

test('large topology section summaries expose readable board labels', () => {
  const nodes = [
    node(0, 'repo', 'actor'),
    ...Array.from({ length: 2 }, (_, index) => node(index + 1, 'worker', 'system')),
    ...Array.from({ length: 3 }, (_, index) => node(index + 3, 'mcp', 'ai')),
    ...Array.from({ length: 4 }, (_, index) => node(index + 6, 'policy', 'constraint'))
  ];

  const summaries = largeTopologySectionSummaries({
    canvas: {
      edges: [],
      nodes
    }
  });

  assert.deepEqual(
    summaries.map((summary) => [summary.key, summary.label, summary.count]),
    [
      ['core', 'Core records', 1],
      ['runtime', 'Runtime workers', 2],
      ['agent_plane', 'MCP / Agents', 3],
      ['judgment', 'Policy / Canon', 4]
    ]
  );
});

test('topology board classifier keeps large-map lenses aligned with surfaces', () => {
  assert.equal(topologyBoardSectionForNode(node(1, 'repo', 'actor')), 'core');
  assert.equal(topologyBoardSectionForNode(node(2, 'worker')), 'runtime');
  assert.equal(topologyBoardSectionForNode(node(3, 'mcp', 'ai')), 'agent_plane');
  assert.equal(topologyBoardSectionForNode(node(4, 'agent', 'ai')), 'agent_plane');
  assert.equal(topologyBoardSectionForNode(node(5, 'config', 'data')), 'agent_plane');
  assert.equal(topologyBoardSectionForNode(node(6, 'policy', 'constraint')), 'judgment');
  assert.equal(topologyBoardSectionForNode(node(7, 'guide', 'human')), 'judgment');
  assert.equal(topologyBoardSectionForNode(node(8, 'doc', 'human')), 'judgment');
});

test('large topology canvases skip the interactive minimap for zoom performance', () => {
  assert.equal(shouldRenderInteractiveMiniMap(80), true);
  assert.equal(shouldRenderInteractiveMiniMap(180), true);
  assert.equal(shouldRenderInteractiveMiniMap(181), false);
  assert.equal(shouldRenderInteractiveMiniMap(439), false);
});
