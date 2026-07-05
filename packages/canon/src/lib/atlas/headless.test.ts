import { describe, expect, it } from 'vitest';

import {
  createPublicAtlasCanvas,
  createPublicAtlasFocusGroups,
  createPublicAtlasGraphArtifact,
  createPublicAtlasEdge,
  createPublicAtlasNode,
  layoutPublicAtlasNodes,
  normalizePublicAtlasCanvas
} from './headless.js';

describe('public Atlas governance product attachments', () => {
  it('connects the default Atlas canvas to the Signal Decision Proof contract', () => {
    const artifact = createPublicAtlasGraphArtifact(createPublicAtlasCanvas());

    expect(artifact.productContract.compositionId).toBe('signal-decision-proof');
    expect(artifact.productContract.atlasHub).toBe('atlas');
    expect(artifact.productContract.requiredProducts).toEqual([
      'atlas',
      'signal',
      'decision',
      'proof'
    ]);
    expect(artifact.productContract.connectedProducts).toEqual([
      'atlas',
      'signal',
      'decision',
      'proof'
    ]);

    const productIds = artifact.nodes.flatMap((node) =>
      node.products.map((product) => product.productId)
    );
    expect(productIds).toContain('atlas');
    expect(productIds).toContain('signal');
    expect(productIds).toContain('decision');
  });

  it('preserves explicit product attachments while normalizing public canvas input', () => {
    const node = createPublicAtlasNode('touchpoint', {
      id: 'touchpoint_reviewer_inbox',
      label: 'Reviewer inbox',
      products: [
        {
          productId: 'proof',
          mode: 'records',
          surface: 'proof-graph',
          required: true,
          source: 'Reviewer inbox'
        }
      ]
    });

    const canvas = normalizePublicAtlasCanvas({
      version: 1,
      id: 'custom',
      nodes: [node],
      edges: [],
      createdAt: '2026-06-30T00:00:00.000Z',
      updatedAt: '2026-06-30T00:00:00.000Z'
    });

    expect(canvas.nodes[0].products).toEqual([
      {
        productId: 'proof',
        mode: 'records',
        surface: 'proof-graph',
        required: true,
        source: 'Reviewer inbox'
      }
    ]);
  });
});

describe('public Atlas editable layout', () => {
  it('preserves full workflow lanes for the blank intake map', () => {
    const positioned = layoutPublicAtlasNodes(createPublicAtlasCanvas().nodes);

    expect(positioned.map((node) => node.id)).toEqual([
      'actor_client',
      'data_workflow',
      'human_approval'
    ]);
    expect(positioned.map((node) => node.x)).toEqual([72, 398, 1060]);
    expect(positioned.map((node) => node.y)).toEqual([190, 132, 132]);
    expect(positioned.map((node) => node.width)).toEqual([274, 274, 274]);
  });
});

describe('public Atlas focus groups', () => {
  it('derives owner run wait stop and proof focus groups from the graph contract', () => {
    const owner = createPublicAtlasNode('actor', {
      id: 'actor_owner',
      label: 'Ops owner',
      status: 'wait'
    });
    const workflow = createPublicAtlasNode('data', {
      id: 'data_workflow',
      label: 'Ticket handoff',
      status: 'wait'
    });
    const system = createPublicAtlasNode('system', {
      id: 'system_route',
      label: 'Route ticket',
      status: 'run'
    });
    const human = createPublicAtlasNode('human', {
      id: 'human_review',
      label: 'CX review',
      status: 'wait'
    });
    const boundary = createPublicAtlasNode('constraint', {
      id: 'constraint_stop',
      label: 'Refund threshold',
      status: 'stop'
    });
    const receipt = createPublicAtlasNode('touchpoint', {
      id: 'touchpoint_receipt',
      label: 'Case receipt',
      status: 'run'
    });
    const canvas = normalizePublicAtlasCanvas({
      version: 1,
      id: 'focus-test',
      nodes: [owner, workflow, system, human, boundary, receipt],
      edges: [
        createPublicAtlasEdge(owner.id, workflow.id, { id: 'edge_owner_workflow', label: 'owns' }),
        createPublicAtlasEdge(workflow.id, system.id, { id: 'edge_workflow_system', label: 'triggers' }),
        createPublicAtlasEdge(system.id, human.id, { id: 'edge_system_human', label: 'waits for' }),
        createPublicAtlasEdge(workflow.id, boundary.id, { id: 'edge_workflow_boundary', label: 'bounded by' }),
        createPublicAtlasEdge(human.id, receipt.id, { id: 'edge_human_receipt', label: 'reviewed in' })
      ],
      createdAt: '2026-07-04T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z'
    });

    const groups = createPublicAtlasFocusGroups(canvas);

    expect(groups.map((group) => group.id)).toEqual(['owner', 'run', 'wait', 'stop', 'proof']);
    expect(groups.find((group) => group.id === 'owner')?.nodeIds).toEqual([
      'actor_owner',
      'data_workflow'
    ]);
    expect(groups.find((group) => group.id === 'run')?.nodeIds).toEqual(['system_route']);
    expect(groups.find((group) => group.id === 'wait')?.nodeIds).toEqual([
      'data_workflow',
      'human_review'
    ]);
    expect(groups.find((group) => group.id === 'stop')?.nodeIds).toEqual(['constraint_stop']);
    expect(groups.find((group) => group.id === 'proof')?.nodeIds).toEqual(['touchpoint_receipt']);
    expect(groups.find((group) => group.id === 'proof')?.edgeIds).toEqual(['edge_human_receipt']);
  });
});
