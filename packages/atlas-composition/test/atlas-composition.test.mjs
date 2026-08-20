import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APP_REVIEW_GOVERNANCE_COMPOSITION,
  ATLAS_COMPOSITION_SCHEMA,
  ATLAS_TRANSCRIPT_EDITOR_SCHEMA,
  compileTranscriptSrt,
  compileTranscriptTimeline,
  createTranscriptEditorProject,
  decideTranscriptEdit,
  ATLAS_TRANSCRIPT_EDITOR_SCHEMA,
  applyApprovedTranscriptEdit,
  createTranscriptEditorProject,
  compileTranscriptProposalAudition,
  exportEditedTranscriptSrt,
  compileTranscriptTimeline,
  decideTranscriptEdit,
  decideArcAction,
  executeArcAction,
  proposeTranscriptEdit,
  proposeArcAction,
  proposeTranscriptEdit,
  resolveMapModule,
  applyApprovedTranscriptEdit,
  toAtlasStoryAdapter,
  validateTranscriptEditorProject,
  validateAtlasComposition
} from '../dist/index.js';

test('a local transcript project initializes an authoritative graph, timeline, and clip diffs', () => {
  const project = createTranscriptEditorProject({
    id: 'project-2',
    atlasSessionId: 'session-2',
    sourceAsset: {
      id: 'asset-2',
      uri: 'fixture://local-source.mp4',
      sha256: 'local-source-hash',
      media: { durationUs: 3_000_000, width: 1920, height: 1080, hasAudio: true }
    },
    transcriptSegments: [
      { id: 'segment-1', assetId: 'asset-2', startUs: 0, endUs: 1_000_000, text: 'First clip.' },
      { id: 'segment-2', assetId: 'asset-2', startUs: 1_000_000, endUs: 3_000_000, text: 'Second clip.' }
    ],
    createdAt: '2026-08-16T00:00:00.000Z'
  });

  assert.equal(project.currentRevisionId, 'revision-1');
  assert.equal(project.revisions[0].cutList.filter((operation) => operation.kind === 'keep').length, 2);
  const clips = project.revisions[0].graph.nodes.filter((node) => node.kind === 'clip');
  assert.deepEqual(clips.map((clip) => clip.cutOperationId), ['keep:segment-1', 'keep:segment-2']);
  assert.ok(clips.every((clip) => clip.diffs?.[0]?.event === 'created'));
  assert.deepEqual(project.revisions[0].captions[0].segmentIds, ['segment-1', 'segment-2']);
});

test('an approved local text overlay proposal creates an immutable graph and timeline revision', () => {
  const initial = createTranscriptEditorProject({
    id: 'project-overlay',
    atlasSessionId: 'session-overlay',
    sourceAsset: {
      id: 'asset-overlay',
      uri: 'fixture://local-overlay-source.mp4',
      sha256: 'local-overlay-source-hash',
      media: { durationUs: 3_000_000, width: 1920, height: 1080, hasAudio: true }
    },
    transcriptSegments: [
      { id: 'segment-overlay', assetId: 'asset-overlay', startUs: 0, endUs: 3_000_000, text: 'Keep the local source.' }
    ],
    createdAt: '2026-08-17T00:00:00.000Z'
  });
  const proposed = proposeTranscriptEdit(initial, {
    id: 'proposal-overlay',
    baseRevisionId: 'revision-1',
    proposedBy: 'operator',
    rationale: 'Add a deterministic local title card.',
    operations: initial.revisions[0].cutList,
    overlays: [
      { id: 'title-overlay', kind: 'text', text: 'Local-first edit', startUs: 0, endUs: 1_500_000 }
    ]
  });
  const applied = applyApprovedTranscriptEdit(
    decideTranscriptEdit(proposed, 'proposal-overlay', {
      decision: 'approved',
      decidedAt: '2026-08-17T00:01:00.000Z',
      decidedBy: 'operator'
    }),
    {
      proposalId: 'proposal-overlay',
      revisionId: 'revision-2',
      appliedAt: '2026-08-17T00:02:00.000Z',
      appliedBy: 'operator'
    }
  );

  assert.deepEqual(initial.revisions[0].overlays, []);
  assert.deepEqual(applied.revisions.at(-1)?.overlays, [
    { id: 'title-overlay', kind: 'text', text: 'Local-first edit', startUs: 0, endUs: 1_500_000 }
  ]);
  assert.ok(applied.revisions.at(-1)?.graph.nodes.some((node) => node.id === 'overlay:revision-2:title-overlay'));
  assert.ok(applied.revisions.at(-1)?.graph.edges.some((edge) => edge.source === 'overlay:revision-2:title-overlay' && edge.port === 'produces'));
  assert.ok(compileTranscriptTimeline(applied).clips.some((clip) => clip.id === 'overlay:title-overlay'));
});

test('applying an approved transcript proposal creates a new graph revision with only accepted clips', () => {
  const initial = createTranscriptEditorProject({
    id: 'project-3',
    atlasSessionId: 'session-3',
    sourceAsset: {
      id: 'asset-3',
      uri: 'fixture://local-source.mp4',
      sha256: 'local-source-hash',
      media: { durationUs: 3_000_000, width: 1920, height: 1080, hasAudio: true }
    },
    transcriptSegments: [
      { id: 'segment-1', assetId: 'asset-3', startUs: 0, endUs: 1_000_000, text: 'Keep this.' },
      { id: 'segment-2', assetId: 'asset-3', startUs: 1_000_000, endUs: 3_000_000, text: 'Remove this.' }
    ],
    createdAt: '2026-08-16T00:00:00.000Z'
  });
  const proposed = proposeTranscriptEdit(initial, {
    id: 'proposal-1',
    baseRevisionId: 'revision-1',
    proposedBy: 'operator',
    rationale: 'Keep only the opening.',
    operations: [
      {
        id: 'keep:opening',
        kind: 'keep',
        transcriptSegmentIds: ['segment-1'],
        startUs: 0,
        endUs: 1_000_000,
        reason: 'Keep the concise opening.'
      },
      {
        id: 'remove:closing',
        kind: 'remove',
        transcriptSegmentIds: ['segment-2'],
        startUs: 1_000_000,
        endUs: 3_000_000,
        reason: 'Remove the redundant closing.'
      }
    ]
  });
  const approved = decideTranscriptEdit(proposed, 'proposal-1', {
    decision: 'approved',
    decidedAt: '2026-08-16T00:01:00.000Z',
    decidedBy: 'operator'
  });
  const applied = applyApprovedTranscriptEdit(approved, {
    proposalId: 'proposal-1',
    revisionId: 'revision-2',
    appliedAt: '2026-08-16T00:02:00.000Z',
    appliedBy: 'operator'
  });

  assert.equal(applied.currentRevisionId, 'revision-2');
  assert.equal(applied.revisions[1].parentRevisionId, 'revision-1');
  assert.equal(initial.revisions[0].graph.nodes.filter((node) => node.kind === 'clip').length, 2);
  const acceptedClips = applied.revisions[1].graph.nodes.filter((node) => node.kind === 'clip');
  assert.deepEqual(acceptedClips.map((clip) => clip.cutOperationId), ['keep:opening']);
  assert.ok(acceptedClips.every((clip) => clip.diffs?.[0]?.event === 'applied'));
});

test('the transcript timeline keeps caption timing in the accepted local revision', () => {
  const project = {
    schema: ATLAS_TRANSCRIPT_EDITOR_SCHEMA,
    id: 'project-1',
    atlasSessionId: 'session-1',
    currentRevisionId: 'revision-1',
    sourceAssets: [
      {
        id: 'asset-1',
        uri: 'fixture://source.mp4',
        sha256: 'source-hash',
        media: { durationUs: 2_000_000, width: 1920, height: 1080, hasAudio: true }
      }
    ],
    transcriptSegments: [
      { id: 'segment-1', assetId: 'asset-1', startUs: 0, endUs: 2_000_000, text: 'Keep this caption.' }
    ],
    revisions: [
      {
        id: 'revision-1',
        parentRevisionId: null,
        cutList: [
          {
            id: 'keep-1',
            kind: 'keep',
            transcriptSegmentIds: ['segment-1'],
            startUs: 0,
            endUs: 2_000_000,
            reason: 'Initial accepted source.'
          }
        ],
        captions: [{ id: 'captions-1', segmentIds: ['segment-1'] }],
        overlays: [],
        graph: { nodes: [], edges: [] },
        createdAt: '2026-08-16T00:00:00.000Z',
        createdBy: 'operator'
      }
    ],
    proposals: [],
    receipts: []
  };

  const timeline = compileTranscriptTimeline(project);
  assert.deepEqual(timeline.clips.map((clip) => [clip.kind, clip.startUs, clip.endUs]), [
    ['video', 0, 2_000_000],
    ['caption', 0, 2_000_000]
  ]);
});

test('the accepted transcript revision exports only visible captions as deterministic SRT', () => {
  const initial = createTranscriptEditorProject({
    id: 'project-srt',
    atlasSessionId: 'session-srt',
    sourceAsset: {
      id: 'asset-srt',
      uri: 'fixture://local-source.mp4',
      sha256: 'local-source-hash',
      media: { durationUs: 3_000_000, width: 1920, height: 1080, hasAudio: true }
    },
    transcriptSegments: [
      { id: 'opening', assetId: 'asset-srt', startUs: 0, endUs: 1_000_000, text: 'Keep this.' },
      { id: 'closing', assetId: 'asset-srt', startUs: 1_000_000, endUs: 3_000_000, text: 'Remove this.' }
    ],
    createdAt: '2026-08-16T00:00:00.000Z'
  });
  const proposed = proposeTranscriptEdit(initial, {
    id: 'proposal-srt',
    baseRevisionId: 'revision-1',
    proposedBy: 'operator',
    rationale: 'Keep the concise opening.',
    operations: [
      {
        id: 'keep-opening',
        kind: 'keep',
        transcriptSegmentIds: ['opening'],
        startUs: 0,
        endUs: 1_000_000,
        reason: 'Approved opening.'
      }
    ]
  });
  const approved = decideTranscriptEdit(proposed, 'proposal-srt', {
    decision: 'approved',
    decidedAt: '2026-08-16T00:01:00.000Z',
    decidedBy: 'operator'
  });
  const applied = applyApprovedTranscriptEdit(approved, {
    proposalId: 'proposal-srt',
    revisionId: 'revision-2',
    appliedAt: '2026-08-16T00:02:00.000Z',
    appliedBy: 'operator'
  });

  assert.equal(
    compileTranscriptSrt(applied),
    '1\\n00:00:00,000 --> 00:00:01,000\\nKeep this.\\n'
  );
});

function transcriptFixture() {
  return {
    schema: ATLAS_TRANSCRIPT_EDITOR_SCHEMA,
    id: 'fixture-project',
    atlasSessionId: 'fixture-session',
    currentRevisionId: 'revision-1',
    sourceAssets: [
      {
        id: 'source-1',
        uri: 'fixture://private/source.mp4',
        sha256: 'fixture-hash',
        media: { durationUs: 12_000_000, width: 1920, height: 1080, hasAudio: true }
      }
    ],
    transcriptSegments: [
      { id: 'segment-1', assetId: 'source-1', startUs: 0, endUs: 3_000_000, text: 'Opening.' },
      { id: 'segment-2', assetId: 'source-1', startUs: 3_000_000, endUs: 5_000_000, text: 'Filler.' },
      { id: 'segment-3', assetId: 'source-1', startUs: 5_000_000, endUs: 12_000_000, text: 'Closing.' }
    ],
    revisions: [
      {
        id: 'revision-1',
        parentRevisionId: null,
        createdAt: '2026-08-14T00:00:00.000Z',
        createdBy: 'operator',
        cutList: [
          { id: 'keep-1', kind: 'keep', transcriptSegmentIds: ['segment-1'], startUs: 0, endUs: 3_000_000, reason: 'Keep opening.' },
          { id: 'remove-1', kind: 'remove', transcriptSegmentIds: ['segment-2'], startUs: 3_000_000, endUs: 5_000_000, reason: 'Remove filler.' },
          { id: 'keep-2', kind: 'keep', transcriptSegmentIds: ['segment-3'], startUs: 5_000_000, endUs: 12_000_000, reason: 'Keep closing.' }
        ],
        captions: [{ id: 'captions-main', segmentIds: ['segment-1', 'segment-3'] }],
        overlays: [{ id: 'title', kind: 'text', startUs: 0, endUs: 1_000_000 }],
        graph: {
          nodes: [
            { id: 'source', kind: 'source-asset' },
            { id: 'transcript', kind: 'transcript' },
            { id: 'cut-list', kind: 'cut-list' },
            { id: 'timeline', kind: 'timeline' },
            { id: 'clip:keep-1', kind: 'clip', cutOperationId: 'keep-1', diffs: [{ id: 'diff:keep-1:created', at: '2026-08-14T00:00:00.000Z', event: 'created', actor: 'operator', summary: 'Created source clip.', after: { cutOperationId: 'keep-1' } }] },
            { id: 'clip:keep-2', kind: 'clip', cutOperationId: 'keep-2', diffs: [{ id: 'diff:keep-2:created', at: '2026-08-14T00:00:00.000Z', event: 'created', actor: 'operator', summary: 'Created source clip.', after: { cutOperationId: 'keep-2' } }] }
          ],
          edges: [
            { id: 'edge-source-transcript', source: 'source', target: 'transcript', port: 'produces' },
            { id: 'edge-transcript-cutlist', source: 'transcript', target: 'cut-list', port: 'produces' },
            { id: 'edge-cutlist-timeline', source: 'cut-list', target: 'timeline', port: 'produces' }
          ]
        }
      }
    ],
    proposals: []
  };
}

test('the App Review Arc makes intake and preflight a reusable first scene', () => {
  const result = validateAtlasComposition(APP_REVIEW_GOVERNANCE_COMPOSITION);

  assert.deepEqual(result, { ok: true, issues: [] });
  assert.equal(APP_REVIEW_GOVERNANCE_COMPOSITION.schema, ATLAS_COMPOSITION_SCHEMA);
  assert.equal(APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.length, 10);
  assert.equal(APP_REVIEW_GOVERNANCE_COMPOSITION.mapModules.length, 1);

  const intake = APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.find((scene) => scene.id === 'intake-preflight');
  assert.ok(intake, 'the Arc should expose a first-class intake and preflight scene');
  assert.deepEqual(intake.focusNodeIds, [
    'app-submission-form',
    'app-review-preflight',
    'webflow-app-preflight-skills',
    'app-governance-mcp'
  ]);
  assert.deepEqual(intake.artifactIds, [
    'app-submission-form-contract',
    'app-review-preflight-contract',
    'webflow-app-preflight-skill-contract',
    'motion-authoring-contract'
  ]);
  assert.match(intake.detail, /not an approval/i);
  const preflightCapabilities = APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.find(
    (scene) => scene.id === 'preflight-capabilities'
  );
  assert.ok(preflightCapabilities);
  assert.deepEqual(
    preflightCapabilities.presentation.capabilities.map((capability) => capability.nodeId),
    ['app-submission-form', 'app-review-preflight', 'webflow-app-preflight-skills'],
    'the intake scene should explain each tool instead of collapsing them into one preflight claim'
  );
  assert.deepEqual(
    preflightCapabilities.presentation.capabilities.map((capability) => capability.title),
    ['Submission form', 'App Review Preflight', 'Preflight skills']
  );

  const reviewCapabilities = APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.find(
    (scene) => scene.id === 'review-capabilities'
  );
  assert.ok(reviewCapabilities);
  assert.deepEqual(
    reviewCapabilities.presentation.capabilities.map((capability) => capability.nodeId),
    ['claude-agent', 'app-governance-mcp', 'operator-decision'],
    'the review scene should make the agent, MCP, and human boundaries explicit'
  );
  for (const capability of [
    ...preflightCapabilities.presentation.capabilities,
    ...reviewCapabilities.presentation.capabilities
  ]) {
    assert.ok(capability.can.trim(), `${capability.title} should say what it can do`);
    assert.ok(capability.produces.trim(), `${capability.title} should name its output`);
    assert.ok(capability.boundary.trim(), `${capability.title} should name its decision boundary`);
  }

  assert.deepEqual(
    APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.map((scene) => scene.presentation.layout),
    ['split', 'capabilities', 'statement', 'code', 'capabilities', 'map', 'decision', 'branches', 'demo', 'proof'],
    'an Arc is a sequence of deliberately different slide compositions, not one repeated panel'
  );
  assert.equal(intake.presentation.media?.artifactId, 'app-review-evidence-gate-media');
  assert.equal(
    APP_REVIEW_GOVERNANCE_COMPOSITION.artifacts.find(
      (artifact) => artifact.id === 'app-review-evidence-gate-media'
    )?.provenance.costUsd,
    null,
    'an unmetered generated asset must not be presented as a zero-cost generation'
  );

  const story = toAtlasStoryAdapter(APP_REVIEW_GOVERNANCE_COMPOSITION, 'app-review-governance-arc');
  assert.equal(story.scenes[0].presentation.layout, 'split');
  assert.equal(story.scenes[3].presentation.code?.language, 'typescript');
  assert.deepEqual(
    APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.map((scene) => scene.presentation.reader.heading),
    [
      'A developer submits an app.',
      'Three tools make the submission inspectable.',
      'The submission reaches the review team.',
      'An agent prepares the review item.',
      'Automation stops where judgment begins.',
      'Each system keeps one clear job.',
      'A person decides what happens next.',
      'A no creates a clear way forward.',
      'Only the approved action can run.',
      'The system records what happened.'
    ]
  );
  assert.deepEqual(
    APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.find((scene) => scene.id === 'recover')
      ?.presentation.branches?.map((branch) => branch.label),
    ['Request changes', 'Reject', 'Escalate an exception']
  );
  assert.deepEqual(
    APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.find((scene) => scene.id === 'orient')
      ?.presentation.relationships,
    [
      {
        fromNodeId: 'zendesk-context',
        label: 'Keeps context attached',
        toNodeId: 'd1-governance-record'
      },
      {
        fromNodeId: 'd1-governance-record',
        label: 'Projects a readable view',
        toNodeId: 'airtable-projection'
      }
    ],
    'the map slide should encode the focused relationship instead of relying on decorative geometry'
  );
  for (const scene of APP_REVIEW_GOVERNANCE_COMPOSITION.scenes) {
    assert.ok(scene.presentation.reader.stakeholders.length > 0);
    assert.ok(scene.presentation.reader.stakeholders.every((stakeholder) => stakeholder.meaning.length > 0));
  }
  assert.match(
    APP_REVIEW_GOVERNANCE_COMPOSITION.scenes[0].presentation.reader.explanation,
    /checks the form.*gathers the evidence/i
  );
  assert.match(
    APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.find((scene) => scene.id === 'decide')
      .presentation.reader.explanation,
    /proposed means waiting/i
  );
  assert.deepEqual(
    APP_REVIEW_GOVERNANCE_COMPOSITION.routes.map((route) => route.description),
    [
      'Follow an app from submission to a final receipt.',
      'Reuse the review method: collect evidence, keep each source clear, require a person to decide, and record proof.',
      'Run one review: gather context, wait for approval, take one bounded action, and record the result.'
    ]
  );

  const moduleId = APP_REVIEW_GOVERNANCE_COMPOSITION.mapModules[0].id;
  for (const route of APP_REVIEW_GOVERNANCE_COMPOSITION.routes) {
    assert.ok(route.sceneIds.length > 0);
    assert.equal(route.sceneIds[0], 'intake-preflight');
    for (const sceneId of route.sceneIds) {
      const scene = APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.find((item) => item.id === sceneId);
      assert.ok(scene, `route ${route.id} should reference an existing scene`);
      assert.ok(scene.mapModuleIds.includes(moduleId));
      assert.notEqual(scene.motion.cue, 'none');
      assert.equal(scene.motion.reducedMotion, 'static-emphasis');
    }
  }
});

test('composition validation refuses nested map modules and unapproved action paths', () => {
  const nested = structuredClone(APP_REVIEW_GOVERNANCE_COMPOSITION);
  nested.mapModules[0].nestedModuleIds = ['another-map-module'];

  const result = validateAtlasComposition(nested);
  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /nested map modules/i);
});

test('map relationships must connect focused nodes in the shared map module', () => {
  const invalid = structuredClone(APP_REVIEW_GOVERNANCE_COMPOSITION);
  const orient = invalid.scenes.find((scene) => scene.id === 'orient');
  assert.ok(orient);
  orient.presentation.relationships[0].fromNodeId = 'slack-signal';

  const result = validateAtlasComposition(invalid);
  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /relationship.*focused node/i);
});

test('capability explanations must belong to focused nodes and state all three reader contracts', () => {
  const invalid = structuredClone(APP_REVIEW_GOVERNANCE_COMPOSITION);
  const capabilities = invalid.scenes.find((scene) => scene.id === 'preflight-capabilities');
  assert.ok(capabilities);
  capabilities.presentation.capabilities[0].boundary = '';
  capabilities.presentation.capabilities[1].nodeId = 'operator-decision';

  const result = validateAtlasComposition(invalid);
  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /capability.*complete/i);
  assert.match(result.issues.join('\n'), /capability.*focused node/i);
});

test('map module resolution preserves an explicit pinned map version', () => {
  const resolved = resolveMapModule(
    APP_REVIEW_GOVERNANCE_COMPOSITION,
    'app-review-governance-map',
    (mapId) => ({
      mapId,
      latestVersion: '2026-08-11',
      versions: ['2026-08-11', '2026-08-10']
    })
  );

  assert.equal(resolved.map.mapId, 'app-review-governance-canonical-map');
  assert.equal(resolved.resolvedVersion, '2026-08-11');
  assert.equal(resolved.versionMode, 'pinned');
});

test('a bounded agent proposal requires an operator decision before local execution returns a receipt', () => {
  const proposal = proposeArcAction(APP_REVIEW_GOVERNANCE_COMPOSITION, {
    proposedBy: 'atlas-agent'
  });

  assert.equal(proposal.status, 'proposed');
  assert.equal(proposal.gate, 'approval');
  assert.equal(proposal.title, 'Send the creator the requested-changes summary');
  assert.throws(() => executeArcAction(proposal, { executor: 'local-prototype-runtime' }), /approved/i);

  const approved = decideArcAction(proposal, {
    decision: 'approved',
    decidedBy: 'operator'
  });
  const completed = executeArcAction(approved, { executor: 'local-prototype-runtime' });

  assert.equal(completed.action.status, 'completed');
  assert.equal(completed.receipt.issuer, 'local-prototype-runtime');
  assert.equal(completed.receipt.kind, 'proof');
  assert.match(completed.receipt.evidence, /local fixture/i);
});

test('a local source plus timestamped transcript initializes an authoritative clip graph', () => {
  const project = createTranscriptEditorProject({
    id: 'project-local-import',
    atlasSessionId: 'session-local-import',
    createdAt: '2026-08-14T00:00:00.000Z',
    includeTitleOverlay: true,
    sourceAsset: {
      id: 'source-1', uri: 'fixture://private/source.mp4', sha256: 'fixture-hash',
      media: { durationUs: 4_000_000, width: 1920, height: 1080, hasAudio: true }
    },
    transcriptSegments: [
      { startUs: 0, endUs: 1_000_000, text: 'Opening.' },
      { startUs: 1_000_000, endUs: 4_000_000, text: 'Closing.' }
    ]
  });

  assert.deepEqual(validateTranscriptEditorProject(project), { ok: true, issues: [] });
  const graph = project.revisions[0].graph;
  assert.equal(graph.nodes.filter((node) => node.kind === 'clip').length, 2);
  assert.ok(graph.edges.some((edge) => edge.source === 'cut-list' && edge.target === 'clip:keep:segment-1'));
  assert.ok(graph.edges.some((edge) => edge.source === 'clip:keep:segment-1' && edge.target === 'timeline'));
  assert.equal(project.revisions[0].captions[0].segmentIds.length, 2);
  assert.equal(project.revisions[0].overlays[0].kind, 'text');
});

test('a rejected proposal remains a visible stop condition', () => {
  const proposal = proposeArcAction(APP_REVIEW_GOVERNANCE_COMPOSITION, {
    proposedBy: 'atlas-agent'
  });
  const rejected = decideArcAction(proposal, {
    decision: 'rejected',
    decidedBy: 'operator'
  });

  assert.equal(rejected.status, 'rejected');
  assert.throws(() => executeArcAction(rejected, { executor: 'local-prototype-runtime' }), /approved/i);
});

test('an approved transcript proposal creates a reversible revision and a renderer-neutral timeline', () => {
  const original = transcriptFixture();
  assert.deepEqual(validateTranscriptEditorProject(original), { ok: true, issues: [] });

  const proposed = proposeTranscriptEdit(original, {
    id: 'proposal-tighten',
    baseRevisionId: 'revision-1',
    proposedBy: 'codex-managed-session',
    rationale: 'Remove the filler segment without touching the source asset.',
    instruction: {
      id: 'prompt-tighten',
      text: 'Propose a bounded filler removal and preserve the source.',
      source: 'agent',
      createdAt: '2026-08-14T00:00:15.000Z'
    },
    operations: [
      { id: 'keep-1', kind: 'keep', transcriptSegmentIds: ['segment-1'], startUs: 0, endUs: 3_000_000, reason: 'Keep opening.' },
      { id: 'remove-1', kind: 'remove', transcriptSegmentIds: ['segment-2'], startUs: 3_000_000, endUs: 5_000_000, reason: 'Remove filler.' },
      { id: 'keep-2', kind: 'keep', transcriptSegmentIds: ['segment-3'], startUs: 5_000_000, endUs: 12_000_000, reason: 'Keep closing.' }
    ]
  });
  assert.throws(
    () => applyApprovedTranscriptEdit(proposed, {
      proposalId: 'proposal-tighten', revisionId: 'revision-2', appliedAt: '2026-08-14T00:01:00.000Z', appliedBy: 'operator'
    }),
    /approved/i
  );

  const audition = compileTranscriptProposalAudition(proposed, 'proposal-tighten');
  assert.deepEqual(audition, {
    proposalId: 'proposal-tighten',
    baseRevisionId: 'revision-1',
    durationUs: 10_000_000,
    sourceRanges: [
      { operationId: 'keep-1', startUs: 0, endUs: 3_000_000 },
      { operationId: 'keep-2', startUs: 5_000_000, endUs: 12_000_000 }
    ]
  });
  assert.equal(proposed.currentRevisionId, 'revision-1', 'auditioning never applies a proposal');

  const approved = decideTranscriptEdit(proposed, 'proposal-tighten', {
    decision: 'approved',
    decidedAt: '2026-08-14T00:00:30.000Z',
    decidedBy: 'Micah'
  });
  const applied = applyApprovedTranscriptEdit(approved, {
    proposalId: 'proposal-tighten', revisionId: 'revision-2', appliedAt: '2026-08-14T00:01:00.000Z', appliedBy: 'operator'
  });

  assert.equal(original.currentRevisionId, 'revision-1', 'the prior revision remains recoverable');
  assert.equal(applied.currentRevisionId, 'revision-2');
  assert.equal(applied.revisions.find((revision) => revision.id === 'revision-2')?.parentRevisionId, 'revision-1');
  assert.equal(applied.sourceAssets[0].sha256, 'fixture-hash', 'source evidence is immutable across edits');
  const clipNode = applied.revisions.find((revision) => revision.id === 'revision-2')?.graph.nodes.find(
    (node) => node.cutOperationId === 'keep-1'
  );
  assert.equal(clipNode?.kind, 'clip');
  assert.equal(applied.proposals[0]?.instruction?.text, 'Propose a bounded filler removal and preserve the source.');
  assert.equal(clipNode?.diffs?.at(-1)?.event, 'applied');
  assert.equal(clipNode?.diffs?.at(-1)?.proposalId, 'proposal-tighten');
  const timeline = compileTranscriptTimeline(applied);
  assert.equal(timeline.durationUs, 10_000_000);
  assert.deepEqual(
    timeline.clips.filter((clip) => clip.kind === 'video').map((clip) => [clip.startUs, clip.endUs, clip.sourceStartUs, clip.sourceEndUs]),
    [[0, 3_000_000, 0, 3_000_000], [3_000_000, 10_000_000, 5_000_000, 12_000_000]]
  );
  assert.equal(timeline.clips.filter((clip) => clip.kind === 'caption').length, 2);
  assert.deepEqual(
    timeline.clips.filter((clip) => clip.kind === 'video').map((clip) => clip.nodeId),
    ['clip:keep-1', 'clip:keep-2']
  );
});

test('transcript projects reject cyclic graph, missing assets, and stale approvals', () => {
  const invalid = transcriptFixture();
  invalid.transcriptSegments[0].assetId = 'missing-source';
  invalid.revisions[0].graph.edges.push({
    id: 'edge-cycle', source: 'timeline', target: 'source', port: 'invalidates'
  });
  const validation = validateTranscriptEditorProject(invalid);
  assert.equal(validation.ok, false);
  assert.match(validation.issues.join('\n'), /missing source asset/i);
  assert.match(validation.issues.join('\n'), /cyclic dependency graph/i);

  const base = transcriptFixture();
  const proposed = proposeTranscriptEdit(base, {
    id: 'proposal-stale', baseRevisionId: 'revision-1', proposedBy: 'codex-managed-session', rationale: 'A bounded cut.',
    operations: base.revisions[0].cutList
  });
  const approved = decideTranscriptEdit(proposed, 'proposal-stale', {
    decision: 'approved', decidedAt: '2026-08-14T00:00:30.000Z', decidedBy: 'Micah'
  });
  const stale = { ...approved, currentRevisionId: 'another-revision' };
  assert.throws(
    () => applyApprovedTranscriptEdit(stale, {
      proposalId: 'proposal-stale', revisionId: 'revision-2', appliedAt: '2026-08-14T00:01:00.000Z', appliedBy: 'operator'
    }),
    /Invalid transcript editor project|stale/i
  );
});

test('edited SRT captions preserve only locally timestamped words retained after a cut', () => {
  const project = createTranscriptEditorProject({
    id: 'caption-project', atlasSessionId: 'caption-session', createdAt: '2026-08-15T00:00:00.000Z',
    sourceAsset: { id: 'source', uri: 'fixture://private/source.mp4', sha256: 'fixture', media: { durationUs: 3_000_000, width: 320, height: 180, hasAudio: true } },
    transcriptSegments: [{ startUs: 0, endUs: 3_000_000, text: 'Hello um world', words: [
      { startUs: 0, endUs: 1_000_000, text: 'Hello' }, { startUs: 1_000_000, endUs: 2_000_000, text: 'um' }, { startUs: 2_000_000, endUs: 3_000_000, text: 'world' }
    ] }]
  });
  const proposed = proposeManualWordRemoval(project, { id: 'caption-cut', proposedAt: '2026-08-15T00:00:01.000Z', transcriptWordIds: ['segment-1:word-2'] });
  const approved = decideTranscriptEdit(proposed, 'caption-cut', { decision: 'approved', decidedAt: '2026-08-15T00:00:02.000Z', decidedBy: 'operator' });
  const applied = applyApprovedTranscriptEdit(approved, { proposalId: 'caption-cut', revisionId: 'revision-2', appliedAt: '2026-08-15T00:00:03.000Z', appliedBy: 'operator' });
  assert.equal(exportEditedTranscriptSrt(applied), '1\n00:00:00,000 --> 00:00:01,000\nHello\n\n2\n00:00:01,000 --> 00:00:02,000\nworld\n');
});
