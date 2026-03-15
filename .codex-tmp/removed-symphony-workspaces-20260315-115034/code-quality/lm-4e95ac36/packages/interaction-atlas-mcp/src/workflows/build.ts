import type { BuilderEdge, BuilderNode, NodeAttachment, WorkflowTemplate } from '@quietloudlab/ai-interaction-atlas';
import type { AtlasWorkflowDefinition } from './types.js';

function withAttachmentIds(attachments: Array<Omit<NodeAttachment, 'id'> & { id?: string }> | undefined, nodeId: string): NodeAttachment[] | undefined {
  if (!attachments || attachments.length === 0) return undefined;
  return attachments.map((a, idx) => ({
    id: a.id ?? `${nodeId}__att_${idx + 1}`,
    referenceId: a.referenceId,
    type: a.type,
    direction: a.direction,
    notes: a.notes,
    examples: a.examples,
  }));
}

export function buildWorkflowTemplate(def: AtlasWorkflowDefinition): WorkflowTemplate {
  const nodes: BuilderNode[] = [];
  const edges: BuilderEdge[] = [];

  // Touchpoints (top row)
  const touchpointNodeIds: string[] = [];
  for (const [idx, tp] of (def.touchpoints ?? []).entries()) {
    const id = `${def.id}__tp_${idx + 1}`;
    touchpointNodeIds.push(id);
    nodes.push({
      id,
      type: 'touchpoint',
      referenceId: tp,
      x: 0,
      y: -160 - idx * 90,
    });
  }

  // Steps (main row)
  const stepNodeIds: string[] = [];
  for (const [idx, step] of def.steps.entries()) {
    const id = `${def.id}__step_${idx + 1}`;
    stepNodeIds.push(id);

    nodes.push({
      id,
      type: step.type ?? 'task',
      referenceId: step.referenceId,
      x: 240 + idx * 280,
      y: 0,
      customLabel: step.label,
      notes: step.notes,
      attachments: withAttachmentIds(step.attachments, id),
    });
  }

  // Workflow-level constraints get docked on the first step (so the graph stays compact)
  if (def.constraints && def.constraints.length > 0 && nodes.length > 0) {
    const first = nodes.find((n) => n.id === stepNodeIds[0]);
    if (first) {
      const existing = first.attachments ?? [];
      const next = [...existing];
      for (const [idx, constraintId] of def.constraints.entries()) {
        next.push({
          id: `${first.id}__wf_const_${idx + 1}`,
          referenceId: constraintId,
          type: 'constraint',
          notes: 'Workflow-level constraint',
        });
      }
      first.attachments = next;
    }
  }

  // Edges: touchpoints -> first step
  if (stepNodeIds.length > 0) {
    for (const [idx, tpNodeId] of touchpointNodeIds.entries()) {
      edges.push({
        id: `${def.id}__edge_tp_${idx + 1}`,
        source: tpNodeId,
        target: stepNodeIds[0],
      });
    }
  }

  // Edges: sequential steps
  for (let i = 0; i < stepNodeIds.length - 1; i++) {
    edges.push({
      id: `${def.id}__edge_${i + 1}_${i + 2}`,
      source: stepNodeIds[i],
      target: stepNodeIds[i + 1],
    });
  }

  return {
    id: def.id,
    name: def.name,
    description: def.description,
    primary_use_case: def.primaryUseCase,
    nodes,
    edges,
    common_variations: [],
    tags: def.tags,
  };
}

