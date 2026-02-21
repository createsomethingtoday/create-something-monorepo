import type { AtlasWorkflowDefinition } from './types.js';
import type { WorkflowMapFromToolSequenceInput } from '../schemas/index.js';
export type WorkflowToolSequenceMapping = {
    definition: AtlasWorkflowDefinition;
    warnings: string[];
};
export declare function mapToolSequenceToWorkflowDefinition(input: WorkflowMapFromToolSequenceInput): WorkflowToolSequenceMapping;
//# sourceMappingURL=map.d.ts.map