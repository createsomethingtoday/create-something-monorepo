/**
 * Interaction Atlas — Tools (Automation tier)
 *
 * These tools make the Atlas and workflow mappings AI-native:
 * - search/get Atlas elements
 * - list/get mapped workflows
 * - validate workflow reference IDs against the Atlas
 */
import { jsonContent, errorContent } from '@create-something/mcp-core';
import { getAtlasStats, getPattern, searchPatterns, } from '@quietloudlab/ai-interaction-atlas';
import { getBuiltWorkflowTemplate, getWorkflowMermaid, listWorkflowSummaries, validateBuiltWorkflow, } from '../workflows/index.js';
import { AtlasGetSchema, AtlasSearchSchema, WorkflowIdSchema } from '../schemas/index.js';
export function registerTools(server) {
    server.tool('atlas_stats', 'Get summary counts for the AI Interaction Atlas dataset.', {}, async (_params, ctx) => {
        return jsonContent({ accountId: ctx.accountId, stats: getAtlasStats() });
    }, { readOnly: true });
    server.tool('atlas_search', 'Search the AI Interaction Atlas by keyword across tasks, constraints, data artifacts, and touchpoints.', AtlasSearchSchema.shape, async (params, ctx) => {
        const input = AtlasSearchSchema.parse(params);
        const results = searchPatterns(input.query, {
            dimensions: input.dimensions,
            limit: input.limit ?? 25,
        });
        // Return a compact payload: enough to use in prompting + mapping.
        return jsonContent({
            accountId: ctx.accountId,
            query: input.query,
            results: results.map((r) => ({
                id: r.id,
                name: r.name,
                slug: r.slug,
                task_type: r.task_type,
                category: r.category,
                description: r.description ?? r.elevator_pitch,
            })),
        });
    }, { readOnly: true });
    server.tool('atlas_get', 'Get a single Atlas element by id (or task slug).', AtlasGetSchema.shape, async (params, ctx) => {
        const input = AtlasGetSchema.parse(params);
        const pattern = getPattern(input.id);
        if (!pattern) {
            return errorContent(`Pattern not found: ${input.id}`);
        }
        return jsonContent({ accountId: ctx.accountId, pattern });
    }, { readOnly: true });
    server.tool('workflow_list', 'List available workflow mappings (read-only).', {}, async (_params, ctx) => {
        return jsonContent({ accountId: ctx.accountId, workflows: listWorkflowSummaries() });
    }, { readOnly: true });
    server.tool('workflow_get', 'Get a workflow mapping as an Atlas WorkflowTemplate (nodes + edges).', WorkflowIdSchema.shape, async (params, ctx) => {
        const input = WorkflowIdSchema.parse(params);
        const template = getBuiltWorkflowTemplate(input.workflow_id);
        if (!template)
            return errorContent(`Unknown workflow_id: ${input.workflow_id}`);
        const validation = validateBuiltWorkflow(template);
        return jsonContent({
            accountId: ctx.accountId,
            workflow_id: input.workflow_id,
            valid: validation.valid,
            invalidIds: validation.invalidIds,
            workflow: template,
        });
    }, { readOnly: true });
    server.tool('workflow_mermaid', 'Get a workflow mapping as Mermaid flowchart text for quick visualization.', WorkflowIdSchema.shape, async (params, ctx) => {
        const input = WorkflowIdSchema.parse(params);
        const mermaid = getWorkflowMermaid(input.workflow_id);
        if (!mermaid)
            return errorContent(`Unknown workflow_id: ${input.workflow_id}`);
        return jsonContent({ accountId: ctx.accountId, workflow_id: input.workflow_id, mermaid });
    }, { readOnly: true });
}
//# sourceMappingURL=index.js.map