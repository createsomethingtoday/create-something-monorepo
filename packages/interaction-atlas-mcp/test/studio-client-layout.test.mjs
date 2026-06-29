import assert from 'node:assert/strict';
import test from 'node:test';

import {
  agentActivityFromSessionChange,
  detailModeForZoom,
  focusedStoryNodeSummaries,
  tidyNodeUpdates
} from '../dist/studio/client/layout.js';

function makeNode(overrides) {
  return {
    createdBy: 'agent',
    height: 120,
    id: overrides.id,
    kind: overrides.kind ?? 'actor',
    label: overrides.label ?? overrides.id,
    status: overrides.status ?? 'unknown',
    updatedAt: overrides.updatedAt ?? '2026-06-17T10:00:00.000Z',
    width: overrides.width ?? 280,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    ...overrides
  };
}

function makeSession(nodes) {
  return {
    canvas: {
      edges: [],
      nodes
    },
    client: 'CREATE SOMETHING Test',
    createdAt: '2026-06-17T10:00:00.000Z',
    id: 'test-session',
    observations: [],
    suggestions: [],
    updatedAt: '2026-06-17T10:00:00.000Z',
    version: 1,
    workflow: 'Agent-assisted Atlas onboarding'
  };
}

test('card detail mode follows the current canvas zoom', () => {
  assert.equal(detailModeForZoom(0.4), 'compact');
  assert.equal(detailModeForZoom(1), 'standard');
  assert.equal(detailModeForZoom(1.2), 'detail');
});

test('agent activity detects remote agent changes and ignores operator-only edits', () => {
  const previous = makeSession([
    makeNode({ createdBy: 'agent', id: 'agent-node', label: 'Agent node' }),
    makeNode({ createdBy: 'operator', id: 'operator-node', label: 'Operator node' })
  ]);
  const next = makeSession([
    makeNode({
      createdBy: 'agent',
      id: 'agent-node',
      label: 'Agent node',
      updatedAt: '2026-06-17T10:01:00.000Z'
    }),
    makeNode({
      createdBy: 'operator',
      id: 'operator-node',
      label: 'Operator node',
      updatedAt: '2026-06-17T10:01:00.000Z'
    })
  ]);

  const activity = agentActivityFromSessionChange(previous, next);
  assert.deepEqual(activity?.nodeIds, ['agent-node']);
  assert.equal(activity?.message, 'Agent updated Agent node');

  const operatorOnly = agentActivityFromSessionChange(
    previous,
    makeSession([
      previous.canvas.nodes[0],
      makeNode({
        createdBy: 'operator',
        id: 'operator-node',
        label: 'Operator node',
        updatedAt: '2026-06-17T10:02:00.000Z'
      })
    ])
  );

  assert.equal(operatorOnly, null);
});

test('focused story node summaries preserve walkthrough detail context', () => {
  const session = makeSession([
    makeNode({
      evidence: 'Source link and transcript excerpt.',
      id: 'claude-cowork',
      kind: 'ai',
      label: 'Claude Cowork lane',
      notes: 'Team workspace for shared execution.',
      owner: 'Danny',
      status: 'run'
    }),
    makeNode({
      id: 'finance-boundary',
      kind: 'constraint',
      label: 'Finance boundary'
    })
  ]);
  session.story = {
    active: true,
    activeStepId: 'step-1',
    callouts: [
      {
        id: 'callout-1',
        nodeId: 'claude-cowork',
        severity: 'decision',
        text: 'Cowork is the team workspace.'
      }
    ],
    dimUnfocused: true,
    focusEdgeIds: [],
    focusNodeIds: ['claude-cowork', 'missing-node'],
    questions: [
      {
        id: 'question-1',
        nodeId: 'claude-cowork',
        owner: 'Micah',
        question: 'Which connectors are org-wide?',
        status: 'open'
      }
    ],
    steps: [],
    updatedAt: '2026-06-17T10:00:00.000Z',
    updatedBy: 'agent'
  };

  assert.deepEqual(focusedStoryNodeSummaries(session), [
    {
      callouts: [
        {
          severity: 'decision',
          text: 'Cowork is the team workspace.'
        }
      ],
      evidence: 'Source link and transcript excerpt.',
      id: 'claude-cowork',
      kind: 'ai',
      label: 'Claude Cowork lane',
      notes: 'Team workspace for shared execution.',
      owner: 'Danny',
      questions: [
        {
          owner: 'Micah',
          question: 'Which connectors are org-wide?',
          status: 'open'
        }
      ],
      status: 'run'
    }
  ]);
});

test('tidy layout returns deterministic lane updates', () => {
  const session = makeSession([
    makeNode({ id: 'approval', kind: 'human', label: 'Approval boundary', x: 900, y: 50 }),
    makeNode({ id: 'client', kind: 'actor', label: 'Client', x: 500, y: 500 }),
    makeNode({ id: 'workflow', kind: 'data', label: 'Workflow artifact', x: 200, y: 800 }),
    makeNode({ id: 'agent', kind: 'ai', label: 'Agent support', x: 300, y: 1000 })
  ]);

  assert.deepEqual(
    tidyNodeUpdates(session).map((update) => ({
      id: update.id,
      x: update.x,
      y: update.y
    })),
    [
      { id: 'client', x: 84, y: 198 },
      { id: 'workflow', x: 456, y: 136 },
      { id: 'agent', x: 828, y: 112 },
      { id: 'approval', x: 1200, y: 136 }
    ]
  );
});

test('tidy layout stacks node kinds that share a visual column', () => {
  const session = makeSession([
    makeNode({ id: 'asset-table', kind: 'data', label: 'Airtable Assets', x: 420, y: 120 }),
    makeNode({
      id: 'review-dashboard',
      kind: 'touchpoint',
      label: 'Review dashboard',
      x: 420,
      y: 130
    }),
    makeNode({
      id: 'asset-versions',
      kind: 'data',
      label: 'Airtable Asset Versions',
      x: 420,
      y: 140
    }),
    makeNode({
      id: 'template-review-hub',
      kind: 'system',
      label: 'Template Review Hub',
      x: 760,
      y: 120
    }),
    makeNode({ id: 'feedback-runner', kind: 'ai', label: 'Feedback runner', x: 760, y: 130 })
  ]);

  const updates = tidyNodeUpdates(session);
  const byId = new Map(updates.map((update) => [update.id, update]));

  assert.deepEqual(
    ['asset-table', 'review-dashboard', 'asset-versions'].map((id) => byId.get(id)?.x),
    [456, 456, 456]
  );
  assert.deepEqual(
    ['asset-table', 'review-dashboard', 'asset-versions'].map((id) => byId.get(id)?.y),
    [136, 342, 548]
  );
  assert.deepEqual(
    ['template-review-hub', 'feedback-runner'].map((id) => byId.get(id)?.x),
    [828, 828]
  );
  assert.deepEqual(
    ['template-review-hub', 'feedback-runner'].map((id) => byId.get(id)?.y),
    [112, 318]
  );
});

test('tidy layout compacts lanes for narrow operator panes', () => {
  const session = makeSession([
    makeNode({ id: 'client', kind: 'actor', label: 'Client', x: 500, y: 500 }),
    makeNode({ id: 'workflow', kind: 'data', label: 'Workflow artifact', x: 200, y: 800 }),
    makeNode({ id: 'agent', kind: 'ai', label: 'Agent support', x: 300, y: 1000 }),
    makeNode({ id: 'approval', kind: 'human', label: 'Approval boundary', x: 900, y: 50 })
  ]);

  const updates = tidyNodeUpdates(session, { viewportWidth: 700 });

  assert.deepEqual(
    updates.map((update) => ({
      id: update.id,
      x: update.x,
      y: update.y
    })),
    [
      { id: 'client', x: 48, y: 112 },
      { id: 'workflow', x: 48, y: 318 },
      { id: 'agent', x: 48, y: 524 },
      { id: 'approval', x: 48, y: 730 }
    ]
  );
});
