import type { NodeAttachment, NodeType } from '@quietloudlab/ai-interaction-atlas';

export type WorkflowAttachmentDef = Omit<NodeAttachment, 'id'> & {
  id?: string;
};

export type WorkflowStepDef = {
  /**
   * Atlas reference ID. For task steps this should be an AI/Human/System task id
   * (e.g. "task_synthesize", "human_review", "system_api").
   */
  referenceId: string;
  /** Optional label override for display */
  label?: string;
  /** Implementation notes / evidence requirements / tool mapping, etc */
  notes?: string;
  /** Optional node type override (defaults to 'task') */
  type?: NodeType;
  /** Optional attachments (constraints/data) docked to the node */
  attachments?: WorkflowAttachmentDef[];
};

export type WorkflowPolicyDef = {
  blockedTools?: string[];
  requiredTools?: string[];
  notes?: string;
};

export type AtlasWorkflowDefinition = {
  id: string;
  name: string;
  description: string;
  primaryUseCase: string;
  tags?: string[];
  touchpoints?: string[]; // Atlas touchpoint IDs (e.g. tp_cli, tp_api)
  constraints?: string[]; // Atlas constraint IDs to show at workflow-level
  steps: WorkflowStepDef[];
  policy?: WorkflowPolicyDef;
};

