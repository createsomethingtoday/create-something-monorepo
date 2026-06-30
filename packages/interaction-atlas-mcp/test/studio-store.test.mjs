import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

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
  exportSessionMarkdown,
  readSession,
  removeNode,
  setStoryFocus,
  updateEdge,
  writeSession
} from '../dist/studio/store.js';

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
