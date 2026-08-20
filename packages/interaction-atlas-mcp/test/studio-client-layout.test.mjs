import assert from 'node:assert/strict';
import test from 'node:test';

import {
  agentActivityFromSessionChange,
  buildMediaClipNodePresentations,
  buildTranscriptEditorSnapshot,
  cleanupRemovalOperations,
  detailModeForZoom,
  focusedStoryNodeSummaries,
  intersectNodeIdSets,
  parseSrtTranscriptCues,
  storyPresenterNodeIds,
  tidyNodeUpdates
} from '../dist/studio/client/layout.js';
import { fastTopologyGraph } from '../dist/studio/client/FastTopologyCanvas.js';
import { createTranscriptEditorProject } from '@create-something/atlas-composition';

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

test('transcript editor snapshot projects the accepted revision, graph, and visible clip diffs', () => {
  const project = createTranscriptEditorProject({
    atlasSessionId: 'test-session',
    createdAt: '2026-08-16T00:00:00.000Z',
    id: 'video-project',
    sourceAsset: {
      id: 'source-a',
      media: { durationUs: 5_000_000, hasAudio: true, height: 1080, width: 1920 },
      sha256: 'a'.repeat(64),
      uri: 'file:///private/tmp/source-a.mp4'
    },
    transcriptSegments: [
      { assetId: 'source-a', endUs: 1_100_000, id: 'segment-1', startUs: 0, text: 'Hello there.' },
      { assetId: 'source-a', endUs: 3_200_000, id: 'segment-2', startUs: 2_000_000, text: 'This is Atlas.' }
    ]
  });
  project.receipts.push({
    cacheHit: false,
    completedAt: '2026-08-17T00:00:01.000Z',
    id: 'receipt:revision-1',
    inspection: {
      audioStreams: 1,
      durationUs: 2_300_000,
      height: 1080,
      inspectedAt: '2026-08-17T00:00:01.000Z',
      tool: 'ffprobe',
      videoCodec: 'h264',
      width: 1920
    },
    kind: 'render',
    outputSha256: 'b'.repeat(64),
    request: {
      cacheKey: 'cache-1',
      captionSha256: 'c'.repeat(64),
      compositionId: 'AtlasTranscriptTimeline',
      compositionVersion: '1',
      id: 'render:revision-1',
      output: { codec: 'h264', fps: 30, height: 1080, path: '/private/tmp/accepted.mp4', width: 1920 },
      projectId: 'video-project',
      rendererVersion: 'ffmpeg-local-v1',
      requestedAt: '2026-08-17T00:00:00.000Z',
      revisionId: 'revision-1',
      timelineHash: 'timeline-1'
    },
    status: 'completed'
  });

  const snapshot = buildTranscriptEditorSnapshot(project);

  assert.deepEqual(snapshot.source, {
    durationUs: 5_000_000,
    hasAudio: true,
    height: 1080,
    id: 'source-a',
    width: 1920
  });
  assert.equal(snapshot.revision.id, 'revision-1');
  assert.equal(snapshot.timeline.durationUs, 2_300_000);
  assert.deepEqual(snapshot.overlays, []);
  assert.deepEqual(
    snapshot.timeline.clips.map((clip) => ({ id: clip.id, text: clip.text })),
    [
      { id: 'video:keep:segment-1', text: 'Hello there.' },
      { id: 'video:keep:segment-2', text: 'This is Atlas.' }
    ]
  );
  assert.equal(snapshot.graph.clipNodes.length, 2);
  assert.equal(snapshot.graph.edges, 8);
  assert.deepEqual(snapshot.exports, [
    {
      cacheHit: false,
      captionSha256: 'c'.repeat(64),
      completedAt: '2026-08-17T00:00:01.000Z',
      durationUs: 2_300_000,
      id: 'receipt:revision-1',
      outputSha256: 'b'.repeat(64)
    }
  ]);
  assert.deepEqual(snapshot.diffs, [
    {
      at: '2026-08-16T00:00:00.000Z',
      event: 'created',
      nodeId: 'clip:segment-1',
      summary: 'Created from the local transcript source.'
    },
    {
      at: '2026-08-16T00:00:00.000Z',
      event: 'created',
      nodeId: 'clip:segment-2',
      summary: 'Created from the local transcript source.'
    }
  ]);
});

test('clip-node presentation keeps source, time, transcript, revision, and approval context together', () => {
  const project = createTranscriptEditorProject({
    atlasSessionId: 'test-session',
    createdAt: '2026-08-20T00:00:00.000Z',
    id: 'video-project',
    sourceAsset: {
      id: 'source-a',
      media: { durationUs: 5_000_000, hasAudio: true, height: 1080, width: 1920 },
      sha256: 'a'.repeat(64),
      uri: 'file:///private/tmp/source-a.mp4'
    },
    transcriptSegments: [
      { assetId: 'source-a', endUs: 2_500_000, id: 'segment-1', startUs: 1_000_000, text: 'Keep this clear opening statement.' }
    ]
  });

  assert.deepEqual(buildMediaClipNodePresentations(project), [
    {
      diffCount: 1,
      id: 'clip:keep:segment-1',
      operation: {
        endUs: 2_500_000,
        id: 'keep:segment-1',
        reason: 'Initial transcript interval.',
        startUs: 1_000_000
      },
      revisionId: 'revision-1',
      source: {
        hasAudio: true,
        height: 1080,
        id: 'source-a',
        width: 1920
      },
      transcript: 'Keep this clear opening statement.'
    }
  ]);
});

test('SRT import parsing preserves timestamped local transcript cues', () => {
  assert.deepEqual(
    parseSrtTranscriptCues(`1
00:00:00,000 --> 00:00:01,250
Hello there.

2
00:00:01,250 --> 00:00:02,000
This remains local.`),
    [
      { endUs: 1_250_000, startUs: 0, text: 'Hello there.' },
      { endUs: 2_000_000, startUs: 1_250_000, text: 'This remains local.' }
    ]
  );
  assert.throws(
    () => parseSrtTranscriptCues('1\ninvalid range\nNope'),
    /valid timestamp range/
  );
});

test('cleanup batch removal only changes whole accepted clips matched by explicit filler candidates', () => {
  const project = createTranscriptEditorProject({
    atlasSessionId: 'cleanup-batch-session',
    createdAt: '2026-08-17T00:00:00.000Z',
    id: 'cleanup-batch-project',
    sourceAsset: {
      id: 'cleanup-batch-source',
      media: { durationUs: 3_000_000, hasAudio: true, height: 1080, width: 1920 },
      sha256: 'd'.repeat(64),
      uri: 'fixture://cleanup-batch-source.mp4'
    },
    transcriptSegments: [
      { assetId: 'cleanup-batch-source', endUs: 500_000, id: 'segment-um', startUs: 0, text: 'um' },
      { assetId: 'cleanup-batch-source', endUs: 1_000_000, id: 'segment-uh', startUs: 500_000, text: 'uh' },
      { assetId: 'cleanup-batch-source', endUs: 3_000_000, id: 'segment-keep', startUs: 1_000_000, text: 'Keep this.' }
    ]
  });
  const candidates = [
    { id: 'filler:segment-um', kind: 'filler', startUs: 0, endUs: 500_000, transcriptSegmentIds: ['segment-um'], summary: 'Configured filler token: um.' },
    { id: 'filler:segment-uh', kind: 'filler', startUs: 500_000, endUs: 1_000_000, transcriptSegmentIds: ['segment-uh'], summary: 'Configured filler token: uh.' },
    { id: 'pause:ignored', kind: 'long-pause', startUs: 1_000_000, endUs: 1_200_000, transcriptSegmentIds: ['segment-uh', 'segment-keep'], summary: 'Long pause: 0.2 seconds.' },
    { id: 'filler:partial', kind: 'filler', startUs: 1_200_000, endUs: 1_300_000, transcriptSegmentIds: ['segment-keep'], summary: 'Configured filler token: um.' }
  ];

  assert.deepEqual(
    cleanupRemovalOperations(project, candidates).map((operation) => [operation.id, operation.kind]),
    [
      ['keep:segment-um', 'remove'],
      ['keep:segment-uh', 'remove'],
      ['keep:segment-keep', 'keep']
    ]
  );
});

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

test('story presenter node ids keep the guided canvas slice small', () => {
  const session = makeSession([
    makeNode({ id: 'root' }),
    makeNode({ id: 'worker' }),
    makeNode({ id: 'policy' }),
    makeNode({ id: 'unfocused' })
  ]);
  session.canvas.edges = [
    { id: 'edge-root-worker', label: 'runs', source: 'root', target: 'worker' },
    { id: 'edge-worker-policy', label: 'governed by', source: 'worker', target: 'policy' },
    { id: 'edge-root-unfocused', label: 'mentions', source: 'root', target: 'unfocused' }
  ];
  session.story = {
    active: true,
    activeStepId: 'step-1',
    callouts: [],
    dimUnfocused: true,
    focusEdgeIds: ['edge-worker-policy'],
    focusNodeIds: ['root', 'worker'],
    questions: [],
    steps: []
  };

  assert.deepEqual([...storyPresenterNodeIds(session)].sort(), ['policy', 'root', 'worker']);
  assert.deepEqual([...intersectNodeIdSets(new Set(['root', 'worker']), new Set(['worker']))], [
    'worker'
  ]);
});

test('fast topology graph keeps hidden nodes and dangling edges out of the CanvasKernel projection', () => {
  const session = makeSession([
    makeNode({ id: 'root' }),
    makeNode({ id: 'visible-worker' }),
    makeNode({ id: 'hidden-worker' })
  ]);
  session.canvas.edges = [
    { id: 'visible-edge', label: 'runs', source: 'root', target: 'visible-worker' },
    { id: 'hidden-edge', label: 'mentions', source: 'root', target: 'hidden-worker' }
  ];

  const graph = fastTopologyGraph(session, new Set(['root', 'visible-worker']));

  assert.deepEqual(
    graph.nodes.map((node) => node.id),
    ['root', 'visible-worker']
  );
  assert.deepEqual(
    graph.edges.map((edge) => edge.id),
    ['visible-edge']
  );
});

test('fast topology graph displays large sessions through the readable board projection', () => {
  const nodes = Array.from({ length: 120 }, (_, index) =>
    makeNode({
      height: 142,
      id: `worker-${index}`,
      kind: 'system',
      label: `Worker ${index}`,
      notes: `packages/example-${index} | worker | Automation`,
      width: 280,
      x: 80,
      y: 120 + index * 34
    })
  );
  const session = makeSession(nodes);

  const graph = fastTopologyGraph(session, null);
  const first = graph.nodes.find((node) => node.id === 'worker-0');

  assert.equal(graph.nodes.length, 120);
  assert.equal(first?.height, 64);
  assert.equal(first?.width, 176);
  assert.notEqual(first?.x, 80);
  assert.notEqual(first?.y, 120);
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
