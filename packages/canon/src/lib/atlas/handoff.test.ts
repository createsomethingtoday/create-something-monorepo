import { describe, expect, it } from 'vitest';

import {
  createPublicAtlasDevelopmentHandoff,
  createPublicAtlasEdge,
  createPublicAtlasNode,
  normalizePublicAtlasCanvas
} from './index.js';

describe('public Atlas development handoff', () => {
  it('turns a shaped Atlas workflow into a Linear-ready development packet', () => {
    const owner = createPublicAtlasNode('actor', {
      id: 'actor_ops',
      label: 'Ops owner',
      status: 'wait'
    });
    const record = createPublicAtlasNode('data', {
      id: 'data_ticket',
      label: 'Ticket record',
      status: 'wait'
    });
    const runPath = createPublicAtlasNode('system', {
      id: 'system_router',
      label: 'Route ticket',
      status: 'run'
    });
    const approval = createPublicAtlasNode('human', {
      id: 'human_review',
      label: 'Manager review',
      status: 'wait'
    });
    const stop = createPublicAtlasNode('constraint', {
      id: 'constraint_refund',
      label: 'Refund threshold',
      status: 'stop'
    });
    const proof = createPublicAtlasNode('touchpoint', {
      id: 'touchpoint_receipt',
      label: 'Case receipt',
      status: 'run'
    });
    const canvas = normalizePublicAtlasCanvas({
      version: 1,
      id: 'public_atlas_support-triage_123',
      nodes: [owner, record, runPath, approval, stop, proof],
      edges: [
        createPublicAtlasEdge(owner.id, record.id, { id: 'edge_owner_record', label: 'owns' }),
        createPublicAtlasEdge(record.id, runPath.id, { id: 'edge_record_run', label: 'triggers' }),
        createPublicAtlasEdge(runPath.id, approval.id, {
          id: 'edge_run_approval',
          label: 'waits for'
        }),
        createPublicAtlasEdge(approval.id, proof.id, {
          id: 'edge_approval_proof',
          label: 'reviewed in'
        }),
        createPublicAtlasEdge(record.id, stop.id, {
          id: 'edge_record_stop',
          label: 'bounded by'
        })
      ],
      createdAt: '2026-07-04T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z'
    });

    const handoff = createPublicAtlasDevelopmentHandoff({
      sessionId: 'public_atlas_session_1',
      canvas,
      source: 'agency-public-atlas',
      summary: 'Support triage needs a governed routing path.'
    });

    expect(handoff.title).toBe('Implement Atlas handoff: Support triage');
    expect(handoff.tier).toBe('mixed');
    expect(handoff.lane).toBe('claim-worktree');
    expect(handoff.linear_create_command).toContain(
      "pnpm linear:create -- --title 'Implement Atlas handoff: Support triage'"
    );
    expect(handoff.packet).toContain('Atlas session: public_atlas_session_1');
    expect(handoff.packet).toContain('Database:');
    expect(handoff.packet).toContain('Data artifact: Ticket record');
    expect(handoff.packet).toContain('Automation:');
    expect(handoff.packet).toContain('System operation: Route ticket (run)');
    expect(handoff.packet).toContain('Judgment:');
    expect(handoff.packet).toContain('Constraint: Refund threshold (stop)');
    expect(handoff.packet).toContain('Stop conditions:');
    expect(handoff.packet).toContain('Support triage needs a governed routing path.');
  });

  it('routes underspecified Atlas captures to research/no-edit', () => {
    const record = createPublicAtlasNode('data', {
      id: 'data_unknown',
      label: 'Workflow artifact'
    });
    const canvas = normalizePublicAtlasCanvas({
      version: 1,
      id: 'public_atlas_early-capture_123',
      nodes: [record],
      edges: [],
      createdAt: '2026-07-04T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z'
    });

    const handoff = createPublicAtlasDevelopmentHandoff({
      sessionId: 'public_atlas_session_2',
      canvas
    });

    expect(handoff.lane).toBe('research/no-edit');
    expect(handoff.goal).toContain('Clarify');
    expect(handoff.packet).toContain('Lane: research/no-edit');
  });
});
