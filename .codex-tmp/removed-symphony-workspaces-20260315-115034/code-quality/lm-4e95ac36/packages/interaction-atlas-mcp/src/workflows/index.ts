import type { WorkflowTemplate } from '@quietloudlab/ai-interaction-atlas';
import {
  isValidTaskId,
  isValidConstraintId,
  isValidTouchpointId,
  isValidArtifactId,
} from '@quietloudlab/ai-interaction-atlas';

import type { AtlasWorkflowDefinition } from './types.js';
import { WORKFLOW_DEFINITIONS, getWorkflowDefinition } from './registry.js';
import { buildWorkflowTemplate } from './build.js';
import { workflowTemplateToMermaid } from './mermaid.js';

export type WorkflowSummary = Pick<AtlasWorkflowDefinition, 'id' | 'name' | 'description' | 'primaryUseCase' | 'tags'>;

export function listWorkflowSummaries(): WorkflowSummary[] {
  return WORKFLOW_DEFINITIONS.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    primaryUseCase: w.primaryUseCase,
    tags: w.tags,
  }));
}

const templateCache = new Map<string, WorkflowTemplate>();

export function getBuiltWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  const cached = templateCache.get(id);
  if (cached) return cached;

  const def = getWorkflowDefinition(id);
  if (!def) return undefined;

  const built = buildWorkflowTemplate(def);
  templateCache.set(id, built);
  return built;
}

export function getWorkflowMermaid(id: string): string | undefined {
  const template = getBuiltWorkflowTemplate(id);
  if (!template) return undefined;
  return workflowTemplateToMermaid(template);
}

export type WorkflowValidationResult = {
  valid: boolean;
  invalidIds: string[];
};

export function validateBuiltWorkflow(template: WorkflowTemplate): WorkflowValidationResult {
  const invalid = new Set<string>();

  for (const node of template.nodes) {
    if (node.type === 'touchpoint') {
      if (!isValidTouchpointId(node.referenceId)) invalid.add(node.referenceId);
      continue;
    }

    if (node.type === 'constraint') {
      if (!isValidConstraintId(node.referenceId)) invalid.add(node.referenceId);
      continue;
    }

    if (node.type === 'data') {
      if (!isValidArtifactId(node.referenceId)) invalid.add(node.referenceId);
      continue;
    }

    if (node.type === 'task') {
      if (!isValidTaskId(node.referenceId)) invalid.add(node.referenceId);
    }

    for (const att of node.attachments ?? []) {
      if (att.type === 'constraint' && !isValidConstraintId(att.referenceId)) invalid.add(att.referenceId);
      if (att.type === 'data' && !isValidArtifactId(att.referenceId)) invalid.add(att.referenceId);
    }
  }

  return { valid: invalid.size === 0, invalidIds: [...invalid] };
}

