import type { WorkflowTemplate } from '@quietloudlab/ai-interaction-atlas';
import type { AtlasWorkflowDefinition } from './types.js';
export type WorkflowSummary = Pick<AtlasWorkflowDefinition, 'id' | 'name' | 'description' | 'primaryUseCase' | 'tags'>;
export declare function listWorkflowSummaries(): WorkflowSummary[];
export declare function getBuiltWorkflowTemplate(id: string): WorkflowTemplate | undefined;
export declare function getWorkflowMermaid(id: string): string | undefined;
export type WorkflowValidationResult = {
    valid: boolean;
    invalidIds: string[];
};
export declare function validateBuiltWorkflow(template: WorkflowTemplate): WorkflowValidationResult;
//# sourceMappingURL=index.d.ts.map