import { HOST_PLAYBOOKS } from './playbooks.js';
import type { WorkflowPattern } from './playbooks.js';

export interface PlaybookWorkflow extends WorkflowPattern {
  hostSlug: string;
  hostName: string;
}

export const WORKFLOWS: PlaybookWorkflow[] = HOST_PLAYBOOKS.flatMap((host) =>
  host.workflowPatterns.map((pattern) => ({
    ...pattern,
    hostSlug: host.slug,
    hostName: host.name,
  })),
);

export const WORKFLOW_IDS = WORKFLOWS.map((w) => w.id);

export function getWorkflowById(id: string): PlaybookWorkflow | undefined {
  return WORKFLOWS.find((w) => w.id === id);
}

