/**
 * Interaction Atlas — Schemas
 *
 * Typed Artifacts for Atlas lookup + workflow mapping.
 */
import { z } from 'zod';
export const AtlasSearchSchema = z.object({
    query: z.string().min(1).describe('Keyword search query'),
    dimensions: z
        .array(z.enum(['ai', 'human', 'system', 'data', 'constraints', 'touchpoints']))
        .optional()
        .describe('Limit search to specific Atlas dimensions'),
    limit: z.number().int().min(1).max(50).optional().describe('Maximum number of results (default: 25)'),
});
export const AtlasGetSchema = z.object({
    id: z.string().min(1).describe('Atlas pattern id (e.g. task_synthesize, human_review, const_privacy)'),
});
export const WorkflowIdSchema = z.object({
    workflow_id: z.string().min(1).describe('Workflow id (e.g. fleet-watchdog)'),
});
export const WorkflowToolSequenceItemSchema = z.object({
    server: z.string().min(1).optional().describe('Optional server identifier (e.g. "gmail", "substrate")'),
    tool: z.string().min(1).describe('Tool name (e.g. "query_health", "notion_query_database")'),
});
export const WorkflowMapFromToolSequenceSchema = z.object({
    name: z.string().min(1).optional().describe('Workflow name (used for display + id generation)'),
    workflow_id: z.string().min(1).optional().describe('Optional explicit workflow id (slug).'),
    primaryUseCase: z.string().min(1).optional().describe('Primary use case / intended outcome'),
    touchpoints: z.array(z.string().min(1)).optional().describe('Atlas touchpoint IDs'),
    constraints: z.array(z.string().min(1)).optional().describe('Atlas constraint IDs'),
    sequence: z.array(WorkflowToolSequenceItemSchema).min(1).describe('Ordered sequence of tool calls'),
    add_synthesis: z.boolean().optional().describe('Append task_synthesize (default: true)'),
    add_verification: z.boolean().optional().describe('Append task_verify (default: true)'),
    add_human_review: z.boolean().optional().describe('Append human_review (default: true)'),
});
//# sourceMappingURL=index.js.map