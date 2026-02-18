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

export type AtlasSearchInput = z.infer<typeof AtlasSearchSchema>;

export const AtlasGetSchema = z.object({
  id: z.string().min(1).describe('Atlas pattern id (e.g. task_synthesize, human_review, const_privacy)'),
});

export type AtlasGetInput = z.infer<typeof AtlasGetSchema>;

export const WorkflowIdSchema = z.object({
  workflow_id: z.string().min(1).describe('Workflow id (e.g. fleet-watchdog)'),
});

export type WorkflowIdInput = z.infer<typeof WorkflowIdSchema>;
