import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createTranscriptEditorProject } from '@create-something/atlas-composition';

import { healSessionProductionBindings } from '../dist/studio/production-bindings.js';
import {
  createWritebackProposal,
  exportWritebackProposalHandoff,
  reviewWritebackProposalAction
} from '../dist/studio/writeback-proposals.js';
import {
  acceptSuggestion,
  addEdge,
  addNode,
  addObservation,
  attachGovernanceRecord,
  addStoryQuestion,
  activateStoryStep,
  advanceStoryStep,
  clearStoryFocus,
  createSession,
  exportClientHandoffMarkdown,
  exportSessionMarkdown,
  readSession,
  readSessionDatabaseHealth,
  readTranscriptEditorProject,
  removeNode,
  setStoryFocus,
  updateEdge,
  writeSession,
  writeTranscriptEditorProject
} from '../dist/studio/store.js';
import { focusStory, storySessionPayload } from '../dist/studio/story-api.js';
import {
  createAtlasMediaProject,
  getAtlasMediaProjectPath,
  parseTimestampedTranscript,
  readAtlasMediaProject,
  writeAtlasMediaProject
} from '../dist/studio/media-project.js';
import {
  applyApprovedTranscriptEdit,
  decideTranscriptEdit,
  proposeTranscriptEdit
} from '@create-something/atlas-composition';

function transcriptProjectInput() {
  return {
    id: 'media-project-1',
    currentRevisionId: 'revision-1',
    sourceAssets: [{
      id: 'source-1', uri: 'fixture://private/source.mp4', sha256: 'fixture-hash',
      media: { durationUs: 5_000_000, width: 1920, height: 1080, hasAudio: true }
    }],
    transcriptSegments: [{
      id: 'segment-1', assetId: 'source-1', startUs: 0, endUs: 5_000_000, text: 'Synthetic source.'
    }],
    revisions: [{
      id: 'revision-1', parentRevisionId: null, createdAt: '2026-08-14T00:00:00.000Z', createdBy: 'operator',
      cutList: [{ id: 'keep-1', kind: 'keep', transcriptSegmentIds: ['segment-1'], startUs: 0, endUs: 5_000_000, reason: 'Keep source.' }],
      captions: [{ id: 'caption-1', segmentIds: ['segment-1'] }], overlays: [],
      graph: {
        nodes: [
          { id: 'source', kind: 'source-asset' }, { id: 'transcript', kind: 'transcript' },
          { id: 'cut-list', kind: 'cut-list' }, { id: 'timeline', kind: 'timeline' },
          { id: 'clip:keep-1', kind: 'clip', cutOperationId: 'keep-1', diffs: [{ id: 'diff:keep-1:created', at: '2026-08-14T00:00:00.000Z', event: 'created', actor: 'operator', summary: 'Created source clip.', after: { cutOperationId: 'keep-1' } }] }
        ],
        edges: [
          { id: 'source-to-transcript', source: 'source', target: 'transcript', port: 'produces' },
          { id: 'transcript-to-cut-list', source: 'transcript', target: 'cut-list', port: 'produces' },
          { id: 'cut-list-to-clip', source: 'cut-list', target: 'clip:keep-1', port: 'produces' },
          { id: 'clip-to-timeline', source: 'clip:keep-1', target: 'timeline', port: 'produces' }
        ]
      }
    }],
    proposals: []
  };
}

test('local timestamped transcript input parses without sending transcript content anywhere', () => {
  assert.deepEqual(
    parseTimestampedTranscript('00:00.000 --> 00:03.500 | Opening.\n00:03.500 --> 00:05.000 | Closing.'),
    [
      { startUs: 0, endUs: 3_500_000, text: 'Opening.' },
      { startUs: 3_500_000, endUs: 5_000_000, text: 'Closing.' }
    ]
  );
  assert.throws(() => parseTimestampedTranscript('not timestamped'), /must use/i);
});

test('local Atlas Studio sessions can be mutated by agent commands', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Support recovery', owner: 'Ops' },
    cwd
  );

  assert.equal(session.client, 'Acme');
  assert.equal(session.canvas.nodes.length, 4);
  assert.deepEqual(session.products, ['atlas', 'signal', 'decision', 'proof']);
  assert.deepEqual(
    session.productLinks?.map((link) => `${link.source}->${link.target}`),
    ['atlas->signal', 'signal->decision', 'decision->proof', 'proof->atlas']
  );
  assert.equal(
    session.canvas.nodes.find((node) => node.id === 'data_workflow')?.products?.[0]?.productId,
    'signal'
  );
  assert.equal(
    session.canvas.nodes.find((node) => node.id === 'human_approval')?.products?.[0]?.productId,
    'decision'
  );

  const withObservation = await addObservation(
    session.id,
    {
      text: 'The account owner must approve refunds before the agent drafts a note and logs a receipt in Linear.',
      source: 'agent',
      suggest: true
    },
    cwd
  );

  assert.equal(withObservation.observations.length, 1);
  assert.ok(withObservation.suggestions.length >= 3);

  const accepted = await acceptSuggestion(session.id, withObservation.suggestions[0].id, cwd);
  assert.equal(accepted.canvas.nodes.length, 5);

  const withNode = await addNode(
    session.id,
    { kind: 'touchpoint', label: 'Linear issue', status: 'run', createdBy: 'agent' },
    cwd
  );
  const node = withNode.canvas.nodes.at(-1);
  assert.equal(node?.label, 'Linear issue');
  assert.equal(node?.y, 475);

  const withEdge = await addEdge(
    session.id,
    { source: 'data_workflow', target: node.id, label: 'records evidence', createdBy: 'agent' },
    cwd
  );
  const edge = withEdge.canvas.edges.at(-1);
  assert.equal(edge?.target, node.id);

  const withUpdatedEdge = await updateEdge(
    session.id,
    edge.id,
    { label: 'records governed evidence', evidence: 'Linear issue stores approval trace.' },
    cwd
  );
  const updatedEdge = withUpdatedEdge.canvas.edges.find((item) => item.id === edge.id);
  assert.equal(updatedEdge?.label, 'records governed evidence');
  assert.equal(updatedEdge?.evidence, 'Linear issue stores approval trace.');
  assert.equal(updatedEdge?.source, 'data_workflow');
  assert.equal(updatedEdge?.target, node.id);

  const withGovernanceRecord = await attachGovernanceRecord(
    session.id,
    node.id,
    {
      id: 'gov_proof_123',
      productId: 'proof',
      title: 'Docs PR merged',
      summary: 'Proof receipt from the governance runtime.',
      status: 'passed',
      href: 'https://createsomething.agency/admin/governance?atlas_node_id=linear_issue',
      source: '/api/governance/proofs',
      attachedBy: 'agent'
    },
    cwd
  );
  const recordNode = withGovernanceRecord.canvas.nodes.find((item) => item.id === node.id);
  assert.equal(recordNode?.governanceRecords?.length, 1);
  assert.equal(recordNode?.governanceRecords?.[0].productId, 'proof');
  assert.equal(recordNode?.products?.some((product) => product.productId === 'proof'), true);

  const reloaded = await readSession(session.id, cwd);
  const markdown = exportSessionMarkdown(reloaded);
  assert.match(markdown, /Acme - Atlas Workflow Map/);
  assert.match(markdown, /Products: Atlas -> Signal -> Decision -> Proof/);
  assert.match(markdown, /Linear issue/);
  assert.match(markdown, /proof: Docs PR merged \(gov_proof_123\) - passed/);
});

test('Atlas persists a private transcript project beside the session and preserves approved revisions', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-media-project-test-'));
  const session = await createSession({ client: 'Acme', workflow: 'Video edit', owner: 'Micah' }, cwd);
  const created = await createAtlasMediaProject(session.id, transcriptProjectInput(), cwd);

  assert.equal(created.session.mediaProject?.projectId, 'media-project-1');
  assert.equal(created.session.mediaProject?.currentRevisionId, 'revision-1');
  assert.equal(existsSync(getAtlasMediaProjectPath('media-project-1', cwd)), true);
  const reopened = await readAtlasMediaProject(session.id, cwd);
  assert.equal(reopened.atlasSessionId, session.id);
  assert.equal(reopened.sourceAssets[0].sha256, 'fixture-hash');

  const proposed = proposeTranscriptEdit(reopened, {
    id: 'proposal-1',
    baseRevisionId: 'revision-1',
    proposedBy: 'codex-managed-session',
    rationale: 'Keep the same synthetic interval as an approval-path test.',
    operations: reopened.revisions[0].cutList
  });
  const approved = decideTranscriptEdit(proposed, 'proposal-1', {
    decision: 'approved', decidedAt: '2026-08-14T00:01:00.000Z', decidedBy: 'Micah'
  });
  const applied = applyApprovedTranscriptEdit(approved, {
    proposalId: 'proposal-1', revisionId: 'revision-2', appliedAt: '2026-08-14T00:02:00.000Z', appliedBy: 'operator'
  });
  await writeAtlasMediaProject(session.id, applied, cwd);

  const recovered = await readAtlasMediaProject(session.id, cwd);
  assert.equal(recovered.currentRevisionId, 'revision-2');
  assert.equal(recovered.revisions.find((revision) => revision.id === 'revision-2')?.parentRevisionId, 'revision-1');
  assert.equal(recovered.sourceAssets[0].sha256, 'fixture-hash');
  const recoveredSession = await readSession(session.id, cwd);
  assert.equal(recoveredSession.mediaProject?.currentRevisionId, 'revision-2');
});

test('a transcript project persists beside its Atlas session without entering the session manifest', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-transcript-project-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Transcript editing', owner: 'Ops' },
    cwd
  );
  const project = createTranscriptEditorProject({
    id: 'project-local-only',
    atlasSessionId: session.id,
    sourceAsset: {
      id: 'asset-local-only',
      uri: 'fixture://local-source.mp4',
      sha256: 'local-source-hash',
      media: { durationUs: 1_000_000, width: 1920, height: 1080, hasAudio: true }
    },
    transcriptSegments: [
      { id: 'segment-local-only', assetId: 'asset-local-only', startUs: 0, endUs: 1_000_000, text: 'Keep this.' }
    ],
    createdAt: '2026-08-16T00:00:00.000Z'
  });

  await writeTranscriptEditorProject(session.id, project, cwd);
  assert.deepEqual(await readTranscriptEditorProject(session.id, cwd), project);
  assert.equal('transcriptProject' in (await readSession(session.id, cwd)), false);
});

test('client handoff projects internal Atlas truth into Map, Build, and Control without mutation', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-client-handoff-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Support recovery', owner: 'Ops' },
    cwd
  );

  const withSystem = await addNode(
    session.id,
    {
      kind: 'system',
      label: 'Ticketing integration',
      owner: 'Acme',
      status: 'run',
      notes: 'Connect the approved support source after account-owner authorization.',
      createdBy: 'agent'
    },
    cwd
  );
  const withProof = await attachGovernanceRecord(
    session.id,
    'data_workflow',
    {
      id: 'proof_support_contract',
      productId: 'proof',
      title: 'Support workflow contract',
      summary: 'The approved workflow definition is source controlled.',
      status: 'verified',
      attachedBy: 'agent'
    },
    cwd
  );
  await attachGovernanceRecord(
    session.id,
    'human_approval',
    {
      id: 'control_account_owner_required',
      productId: 'decision',
      title: 'Account-owner authorization is still required',
      summary: 'This is a control boundary, not verified implementation evidence.',
      status: 'required',
      attachedBy: 'agent'
    },
    cwd
  );
  const mapped = await setStoryFocus(
    session.id,
    {
      questions: [
        {
          id: 'question_account_owner',
          nodeId: withSystem.canvas.nodes.at(-1)?.id,
          owner: 'Acme',
          question: 'Who can authorize the production ticketing connection?',
          status: 'open'
        }
      ],
      title: 'Support recovery walkthrough',
      updatedBy: 'agent'
    },
    cwd
  );
  const before = structuredClone(mapped);

  const markdown = exportClientHandoffMarkdown(mapped);

  assert.match(markdown, /# Acme - CREATE SOMETHING Map-to-Build Handoff/);
  assert.match(markdown, /Public sequence: Map -> Build -> Control/);
  assert.match(markdown, /## Map: Shared Workflow Definition/);
  assert.match(markdown, /## Build: Scoped Candidates/);
  assert.match(markdown, /Ticketing integration \[candidate\]/);
  assert.doesNotMatch(markdown, /Acme \[candidate\]/);
  assert.doesNotMatch(markdown, /Support recovery \[candidate\]/);
  assert.match(markdown, /## Control: Approval and Operating Boundaries/);
  assert.match(markdown, /Approval boundary \[wait\]/);
  assert.match(markdown, /## Verified Proof/);
  assert.match(markdown, /Support workflow contract \(proof_support_contract\) - verified/);
  assert.doesNotMatch(markdown, /Account-owner authorization is still required/);
  assert.match(markdown, /## Open Questions/);
  assert.match(markdown, /Who can authorize the production ticketing connection\?/);
  assert.match(markdown, /No production or client-system change is authorized by this handoff\./);
  assert.doesNotMatch(markdown, /Atlas Workflow Map/);
  assert.doesNotMatch(markdown, /Products: Atlas -> Signal -> Decision -> Proof/);
  assert.deepEqual(mapped, before);

  const internal = exportSessionMarkdown(withProof);
  assert.match(internal, /Acme - Atlas Workflow Map/);
  assert.match(internal, /Products: Atlas -> Signal -> Decision -> Proof/);
});

test('removing an Atlas Studio node also removes connected edges', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-remove-node-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Support recovery', owner: 'Ops' },
    cwd
  );

  const result = await removeNode(session.id, 'data_workflow', cwd);

  assert.equal(result.removedNode.id, 'data_workflow');
  assert.deepEqual(result.removedEdges.map((edge) => edge.id).sort(), [
    'edge_client_workflow',
    'edge_workflow_agent'
  ]);
  assert.equal(
    result.session.canvas.nodes.some((node) => node.id === 'data_workflow'),
    false
  );
  assert.equal(
    result.session.canvas.edges.some(
      (edge) => edge.source === 'data_workflow' || edge.target === 'data_workflow'
    ),
    false
  );
});

test('Atlas Studio story focus is transient presentation state', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-story-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Support recovery', owner: 'Ops' },
    cwd
  );

  const focused = await setStoryFocus(
    session.id,
    {
      callouts: [{ nodeId: 'data_workflow', severity: 'info', text: 'Start here.' }],
      activeStepId: 'ingest',
      focusNodeIds: ['data_workflow', 'actor_agent'],
      narration: 'Walk the client through the golden path.',
      nextAction: 'Ask the operator to confirm the system of record.',
      steps: [
        {
          id: 'ingest',
          title: 'Ingest',
          summary: 'Bring the workflow source data into the map.',
          focusNodeIds: ['data_workflow'],
          proof: 'Source data owner named.'
        },
        {
          id: 'approve',
          title: 'Approve',
          summary: 'Confirm the human approval boundary.',
          focusNodeIds: ['human_approval'],
          status: 'next'
        }
      ],
      title: 'Golden path',
      updatedBy: 'agent'
    },
    cwd
  );

  assert.equal(focused.canvas.nodes.length, session.canvas.nodes.length);
  assert.equal(focused.canvas.edges.length, session.canvas.edges.length);
  assert.equal(focused.story?.active, true);
  assert.equal(focused.story?.activeStepId, 'ingest');
  assert.equal(focused.story?.steps.length, 2);
  assert.equal(focused.story?.nextAction, 'Ask the operator to confirm the system of record.');
  assert.deepEqual(focused.story?.focusNodeIds, ['data_workflow', 'actor_agent']);

  const activated = await activateStoryStep(session.id, 'approve', cwd);
  assert.equal(activated.story?.activeStepId, 'approve');
  assert.deepEqual(activated.story?.focusNodeIds, ['human_approval']);
  assert.equal(activated.story?.steps[0].status, 'done');
  assert.equal(activated.story?.steps[1].status, 'current');

  const previous = await advanceStoryStep(session.id, 'previous', cwd);
  assert.equal(previous.story?.activeStepId, 'ingest');

  const withQuestion = await addStoryQuestion(
    session.id,
    { nodeId: 'data_workflow', owner: 'Ops', question: 'Which system owns this state?' },
    cwd
  );
  assert.equal(withQuestion.story?.questions.length, 1);
  assert.equal(withQuestion.story?.focusNodeIds.includes('data_workflow'), true);

  const cleared = await clearStoryFocus(session.id, {}, cwd);
  assert.equal(cleared.story?.active, false);
  assert.equal(cleared.story?.questions.length, 1);
  assert.equal(cleared.story?.steps.length, 0);
  assert.equal(cleared.canvas.nodes.length, session.canvas.nodes.length);
});

test('Atlas Story API v1 accepts snake_case payloads and reports invalid focus ids', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-story-api-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Support recovery', owner: 'Ops' },
    cwd
  );

  const result = await focusStory(
    session.id,
    {
      active_step_id: 'intro',
      callout_node_id: 'data_workflow',
      callout_severity: 'decision',
      callout_text: 'Start from the source record.',
      focus_node_ids: ['data_workflow', 'missing-node'],
      next_action: 'Confirm the system of record.',
      steps: [
        {
          id: 'intro',
          title: 'Intro',
          summary: 'Show the operator-owned source.',
          focus_node_ids: ['data_workflow'],
          proof: 'Source node exists.'
        }
      ]
    },
    'http',
    cwd
  );
  const payload = storySessionPayload(result);

  assert.equal(payload.meta.apiVersion, 1);
  assert.equal(payload.meta.storyContract, 'atlas-story-v1');
  assert.deepEqual(payload.meta.invalidFocusNodeIds, ['missing-node']);
  assert.equal(payload.story?.activeStepId, 'intro');
  assert.equal(payload.story?.nextAction, 'Confirm the system of record.');
  assert.equal(payload.story?.callouts[0].severity, 'decision');
  assert.deepEqual(payload.story?.steps[0].focusNodeIds, ['data_workflow']);
});

test('Atlas Studio session database health is readable by agent commands', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-health-command-test-'));
  const session = await createSession(
    { client: 'CREATE SOMETHING', workflow: 'Internal operating topology', owner: 'Micah' },
    cwd
  );

  await writeSession(
    {
      ...session,
      story: {
        active: true,
        activeStepId: 'topology-diagnostics',
        callouts: [
          {
            id: 'diagnostic_callout_data_workflow',
            nodeId: 'data_workflow',
            severity: 'decision',
            text: 'Workflow ownership needs a durable database binding.'
          }
        ],
        dimUnfocused: false,
        focusEdgeIds: [],
        focusNodeIds: ['data_workflow'],
        steps: [
          {
            id: 'topology-diagnostics',
            title: 'Business health signals',
            summary: 'Atlas surfaced one durable topology gap.',
            proof: '1 signal from 4 nodes / 3 edges',
            status: 'current'
          },
          {
            id: 'substrate-performance',
            title: 'Substrate speed contract',
            summary: 'Large maps stay responsive by disabling expensive chrome.',
            proof: 'MiniMap disabled over 180 nodes.',
            status: 'next'
          },
          {
            id: 'organization-review',
            title: 'Organization review',
            summary: 'Atlas can surface disconnects and redundancy.',
            proof: '5 findings / 4 recommended moves',
            status: 'next'
          }
        ],
        title: 'Health',
        updatedAt: new Date().toISOString(),
        updatedBy: 'agent'
      },
      observations: [
        {
          id: 'observation_organization_review',
          source: 'agent',
          text: 'Organization review: one API ownership gap should be filled.',
          createdAt: new Date().toISOString()
        }
      ]
    },
    cwd
  );

  const health = await readSessionDatabaseHealth(session.id, cwd);

  assert.equal(health.sessionId, session.id);
  assert.equal(health.topology.title, 'Business health signals');
  assert.equal(health.topology.signals[0]?.nodeLabel, 'Internal operating topology');
  assert.equal(health.performance?.title, 'Substrate speed contract');
  assert.equal(health.organization?.proof, '5 findings / 4 recommended moves');
  assert.match(health.organization?.observation ?? '', /API ownership gap/);
});

test('Atlas Story API v1 projects Canon story chapters into presenter steps', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-story-chapter-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Support recovery', owner: 'Ops' },
    cwd
  );

  const result = await focusStory(
    session.id,
    {
      story_artifact: {
        headline: 'Atlas story for Support recovery',
        chapters: [
          {
            id: 'claim',
            eyebrow: 'Atlas graph',
            title: 'Map Support recovery before execution.',
            body: 'The workflow, handoffs, and next decision are visible.',
            focus_node_ids: ['actor_agent', 'data_workflow'],
            proof_label: 'owner and workflow named',
            relationship_ids: ['missing-edge']
          },
          {
            id: 'judgment',
            eyebrow: 'What waits',
            title: 'Human judgment stays explicit.',
            body: 'Approval remains named.',
            focus_node_ids: ['human_approval'],
            proof_label: 'human review named'
          }
        ]
      }
    },
    'tauri',
    cwd
  );

  assert.equal(result.meta.source, 'tauri');
  assert.deepEqual(result.meta.invalidFocusEdgeIds, ['missing-edge']);
  assert.equal(result.story?.title, 'Atlas story for Support recovery');
  assert.equal(result.story?.activeStepId, 'claim');
  assert.equal(result.story?.steps.length, 2);
  assert.equal(result.story?.steps[0].summary, 'The workflow, handoffs, and next decision are visible.');
  assert.deepEqual(result.story?.focusNodeIds, ['actor_agent', 'data_workflow']);
});

test('Atlas Studio can self-heal Template System production primitive bindings', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-heal-test-'));
  await mkdir(path.join(cwd, 'packages/webflow-template-search'), { recursive: true });
  await mkdir(path.join(cwd, 'docs/deliveries/webflow-marketplace'), { recursive: true });
  await writeFile(
    path.join(cwd, 'packages/webflow-template-search/wrangler.toml'),
    'name = "webflow-template-search"\\ndatabase_name = "webflow-template-search"\\n'
  );
  await writeFile(
    path.join(cwd, 'packages/webflow-template-search/README.md'),
    '# Search\\nGET /api/templates/search\\n'
  );
  await writeFile(
    path.join(cwd, 'docs/deliveries/webflow-marketplace/README.md'),
    'Agent instructions, validator logic, and review MCP guardrails\\n'
  );

  const session = await createSession(
    { client: 'CREATE SOMETHING', workflow: 'Template System', owner: 'Ops' },
    cwd
  );
  const custom = await writeSession(
    {
      ...session,
      canvas: {
        edges: [],
        nodes: [
          {
            createdBy: 'agent',
            height: 142,
            id: 'system_search_worker',
            kind: 'system',
            label: 'webflow-template-search Worker',
            status: 'run',
            updatedAt: session.updatedAt,
            width: 280,
            x: 0,
            y: 0
          },
          {
            createdBy: 'agent',
            height: 142,
            id: 'system_review_mcp',
            kind: 'system',
            label: 'Template Review MCP',
            status: 'run',
            updatedAt: session.updatedAt,
            width: 280,
            x: 320,
            y: 0
          }
        ]
      }
    },
    cwd
  );

  const result = await healSessionProductionBindings(custom.id, { cwd });
  const searchNode = result.session.canvas.nodes.find((node) => node.id === 'system_search_worker');
  const reviewNode = result.session.canvas.nodes.find((node) => node.id === 'system_review_mcp');

  assert.equal(searchNode?.sync?.status, 'synced');
  assert.equal(searchNode?.bindings?.length, 2);
  assert.equal(reviewNode?.sync?.status, 'missing');
  assert.equal(result.summary.bindingsChecked, 4);
  assert.equal(result.summary.synced, 1);
  assert.equal(result.summary.missing, 1);
});

test('Atlas Studio can generate approval-gated write-back proposals', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-proposal-test-'));
  await mkdir(path.join(cwd, 'docs/deliveries/webflow-marketplace'), { recursive: true });
  await mkdir(path.join(cwd, 'config/dify'), { recursive: true });
  await mkdir(path.join(cwd, 'config/dify-agents'), { recursive: true });
  await mkdir(path.join(cwd, 'packages/webflow-template-search'), { recursive: true });
  await writeFile(
    path.join(cwd, 'docs/deliveries/webflow-marketplace/README.md'),
    'Agent instructions, validator logic, and review MCP guardrails\\n'
  );
  await writeFile(
    path.join(cwd, 'config/dify/inventory.json'),
    '{ "id": "template-review-hub" }\\n'
  );
  await writeFile(
    path.join(cwd, 'config/dify-agents/template-review-hub.dify.yml'),
    'template_review_format_agent_review_feedback: true\\n'
  );
  await writeFile(
    path.join(cwd, 'packages/webflow-template-search/wrangler.toml'),
    'name = "webflow-template-search"\\n'
  );

  const session = await createSession(
    { client: 'CREATE SOMETHING', workflow: 'Template System', owner: 'Ops' },
    cwd
  );
  await writeSession(
    {
      ...session,
      canvas: {
        edges: [],
        nodes: [
          {
            createdBy: 'agent',
            height: 142,
            id: 'actor_cs_operator',
            kind: 'actor',
            label: 'CREATE SOMETHING operator',
            notes: 'Operator-owned delivery packet and workflow instructions.',
            status: 'run',
            updatedAt: session.updatedAt,
            width: 280,
            x: 0,
            y: 0
          },
          {
            createdBy: 'agent',
            height: 142,
            id: 'ai_template_review_hub',
            kind: 'ai',
            label: 'Template Review Hub',
            notes: 'Dify agent reviews template feedback before human approval.',
            status: 'wait',
            updatedAt: session.updatedAt,
            width: 280,
            x: 320,
            y: 0
          },
          {
            createdBy: 'agent',
            height: 142,
            id: 'system_search_worker',
            kind: 'system',
            label: 'webflow-template-search Worker',
            notes: 'Cloudflare Worker serves template discovery.',
            status: 'run',
            updatedAt: session.updatedAt,
            width: 280,
            x: 640,
            y: 0
          }
        ]
      }
    },
    cwd
  );

  const result = await createWritebackProposal(session.id, { cwd });
  const reloaded = await readSession(session.id, cwd);
  const proposal = result.proposal;
  const reviewAction = proposal.actions.find((action) => action.risk === 'review');
  assert.ok(reviewAction);
  const reviewed = await reviewWritebackProposalAction(
    session.id,
    {
      actionId: reviewAction.id,
      note: 'Ready for a Dify smoke before import.',
      proposalId: proposal.id,
      status: 'approved'
    },
    cwd
  );

  assert.equal(result.summary.total, 3);
  assert.equal(result.summary.safe, 1);
  assert.equal(result.summary.review, 1);
  assert.equal(result.summary.approval, 1);
  assert.equal(reloaded.proposals?.[0]?.id, proposal.id);
  assert.equal(reviewed.action.status, 'approved');
  assert.equal(reviewed.summary.approved, 1);
  const handoff = exportWritebackProposalHandoff(reviewed.session, { proposalId: proposal.id });
  assert.match(exportSessionMarkdown(reviewed.session), /Write-back Proposals/);
  assert.match(
    exportSessionMarkdown(reviewed.session),
    /Review Template Review Hub \[review, approved\]/
  );
  assert.match(exportSessionMarkdown(reviewed.session), /Ready for a Dify smoke before import/);
  assert.match(handoff, /Safety Boundary/);
  assert.match(handoff, /Approved Implementation Candidates/);
  assert.match(handoff, /Review Template Review Hub/);
  assert.match(handoff, /Pending Review/);
});
