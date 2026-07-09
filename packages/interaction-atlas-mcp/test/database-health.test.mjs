import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAtlasDatabaseHealth } from '../dist/studio/database-health.js';

const baseNode = {
  atlasId: 'substrate:test:node',
  createdBy: 'system',
  evidence: '',
  height: 124,
  kind: 'system',
  notes: '',
  owner: 'CREATE SOMETHING',
  status: 'run',
  updatedAt: '2026-07-08T00:00:00.000Z',
  width: 232,
  x: 0,
  y: 0
};

function session() {
  return {
    canvas: {
      edges: [],
      nodes: [
        { ...baseNode, id: 'visible_node', label: 'Visible node' },
        { ...baseNode, id: 'hidden_node', label: 'Hidden node', x: 260 }
      ]
    },
    client: 'CREATE SOMETHING',
    createdAt: '2026-07-08T00:00:00.000Z',
    id: 'health_projection_test',
    observations: [
      {
        createdAt: '2026-07-08T00:00:00.000Z',
        id: 'observation_performance_contract',
        source: 'system',
        text: 'Substrate performance contract: obsidian_like_operator_speed.'
      },
      {
        createdAt: '2026-07-08T00:00:00.000Z',
        id: 'observation_organization_review',
        source: 'system',
        text: 'Organization review: valuable_with_review_signals.'
      }
    ],
    owner: 'CREATE SOMETHING',
    productLinks: [],
    products: [],
    proposals: [],
    story: {
      active: true,
      activeStepId: 'topology-diagnostics',
      callouts: [
        {
          id: 'diagnostic_callout_visible',
          nodeId: 'visible_node',
          severity: 'decision',
          text: 'Visible diagnostic'
        },
        {
          id: 'diagnostic_callout_hidden',
          nodeId: 'hidden_node',
          severity: 'risk',
          text: 'Hidden diagnostic'
        }
      ],
      dimUnfocused: false,
      focusEdgeIds: [],
      focusNodeIds: [],
      narration: '',
      nextAction: '',
      questions: [],
      steps: [
        {
          id: 'topology-diagnostics',
          owner: 'CREATE SOMETHING',
          proof: '0 hard gaps / 2 review signals',
          status: 'current',
          summary: 'Topology health summary',
          title: 'Business health signals'
        },
        {
          id: 'substrate-performance',
          owner: 'CREATE SOMETHING',
          proof: '4 budgets / 5 fast paths',
          status: 'next',
          summary: 'Speed summary',
          title: 'Substrate speed contract'
        },
        {
          id: 'organization-review',
          owner: 'CREATE SOMETHING',
          proof: '5 findings / 4 recommended moves',
          status: 'next',
          summary: 'Organization summary',
          title: 'Organization review'
        }
      ],
      title: 'Health projection',
      updatedAt: '2026-07-08T00:00:00.000Z',
      updatedBy: 'system'
    },
    suggestions: [],
    updatedAt: '2026-07-08T00:00:00.000Z',
    version: 1,
    workflow: 'Projection test'
  };
}

test('database health projector returns topology, performance, and organization health', () => {
  const health = buildAtlasDatabaseHealth(session());

  assert.equal(health.sessionId, 'health_projection_test');
  assert.equal(health.topology.title, 'Business health signals');
  assert.equal(health.topology.signals.length, 2);
  assert.equal(health.topology.signals[0].nodeLabel, 'Visible node');
  assert.equal(health.performance?.title, 'Substrate speed contract');
  assert.match(health.performance?.observation ?? '', /obsidian_like_operator_speed/);
  assert.equal(health.organization?.title, 'Organization review');
  assert.match(health.organization?.observation ?? '', /valuable_with_review_signals/);
});

test('database health projector scopes diagnostic callouts to visible nodes', () => {
  const health = buildAtlasDatabaseHealth(session(), new Set(['visible_node']));

  assert.deepEqual(
    health.topology.signals.map((signal) => signal.id),
    ['diagnostic_callout_visible']
  );
  assert.equal(health.topology.signals[0].nodeLabel, 'Visible node');
});
