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

export type WorkflowMapFromToolSequenceInput = z.infer<typeof WorkflowMapFromToolSequenceSchema>;

export const McpCatalogListSchema = z.object({
  category: z.enum(['create-something', 'workway', 'third-party', 'all']).optional().describe('Catalog category filter'),
});

export type McpCatalogListInput = z.infer<typeof McpCatalogListSchema>;

export const McpIntrospectSchema = z.object({
  slug: z.string().min(1).optional().describe('Catalog slug (preferred)'),
  url: z.string().url().optional().describe('Explicit MCP Streamable HTTP endpoint URL (e.g. https://host/mcp)'),
});

export type McpIntrospectInput = z.infer<typeof McpIntrospectSchema>;

export const McpMapSchema = z.object({
  slug: z.string().min(1).optional().describe('Catalog slug (preferred)'),
  url: z.string().url().optional().describe('Explicit MCP Streamable HTTP endpoint URL'),
  name: z.string().min(1).optional().describe('Optional display name when mapping an arbitrary URL'),
});

export type McpMapInput = z.infer<typeof McpMapSchema>;
