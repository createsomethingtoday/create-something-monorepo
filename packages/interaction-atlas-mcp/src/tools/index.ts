/**
 * Interaction Atlas — Tools (Automation tier)
 *
 * These tools make the Atlas and workflow mappings AI-native:
 * - search/get Atlas elements
 * - list/get mapped workflows
 * - validate workflow reference IDs against the Atlas
 */

import { jsonContent, errorContent } from '@create-something/mcp-core';
import type { ScopedMcpServer } from '@create-something/mcp-core';

import {
  getAtlasStats,
  getPattern,
  searchPatterns,
} from '@quietloudlab/ai-interaction-atlas';

import {
  getBuiltWorkflowTemplate,
  getWorkflowMermaid,
  listWorkflowSummaries,
  validateBuiltWorkflow,
} from '../workflows/index.js';

import { buildWorkflowTemplate } from '../workflows/build.js';
import { workflowTemplateToMermaid } from '../workflows/mermaid.js';
import { mapToolSequenceToWorkflowDefinition } from '../workflows/map.js';

import {
  AtlasGetSchema,
  AtlasSearchSchema,
  WorkflowIdSchema,
  WorkflowMapFromToolSequenceSchema,
  McpCatalogListSchema,
  McpIntrospectSchema,
  McpMapSchema,
} from '../schemas/index.js';

import type { McpCatalogEntry } from '../mcps/catalog.js';
import {
  findMcpCatalogEntry,
  listMcpCatalog,
  resolveMcpHttpEndpointUrl,
  resolveMcpHttpEndpointUrlFromUrl,
} from '../mcps/catalog.js';
import { introspectMcpServer } from '../mcps/introspect.js';
import { mapMcpToWorkflowDefinition } from '../mcps/map.js';

function slugFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const raw = `${u.host}${u.pathname}`.replace(/\/+$/g, '');
    return raw
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'mcp';
  } catch {
    return url
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'mcp';
  }
}

function makeSyntheticCatalogEntry(url: string, name?: string): McpCatalogEntry {
  return {
    name: name ?? url,
    slug: slugFromUrl(url),
    url,
    description: 'Arbitrary MCP server URL',
    category: 'third-party',
    transports: ['http'],
    requiresAuth: false,
  };
}

export function registerTools(server: ScopedMcpServer): void {
  server.tool(
    'atlas_stats',
    'Get summary counts for the AI Interaction Atlas dataset.',
    {},
    async (_params, ctx) => {
      return jsonContent({ accountId: ctx.accountId, stats: getAtlasStats() });
    },
    { readOnly: true },
  );

  server.tool(
    'atlas_search',
    'Search the AI Interaction Atlas by keyword across tasks, constraints, data artifacts, and touchpoints.',
    AtlasSearchSchema.shape,
    async (params, ctx) => {
      const input = AtlasSearchSchema.parse(params);
      const results = searchPatterns(input.query, {
        dimensions: input.dimensions,
        limit: input.limit ?? 25,
      });

      // Return a compact payload: enough to use in prompting + mapping.
      return jsonContent({
        accountId: ctx.accountId,
        query: input.query,
        results: results.map((r: any) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          task_type: r.task_type,
          category: r.category,
          description: r.description ?? r.elevator_pitch,
        })),
      });
    },
    { readOnly: true },
  );

  server.tool(
    'atlas_get',
    'Get a single Atlas element by id (or task slug).',
    AtlasGetSchema.shape,
    async (params, ctx) => {
      const input = AtlasGetSchema.parse(params);
      const pattern = getPattern(input.id);
      if (!pattern) {
        return errorContent(`Pattern not found: ${input.id}`);
      }
      return jsonContent({ accountId: ctx.accountId, pattern });
    },
    { readOnly: true },
  );

  server.tool(
    'workflow_list',
    'List available workflow mappings (read-only).',
    {},
    async (_params, ctx) => {
      return jsonContent({ accountId: ctx.accountId, workflows: listWorkflowSummaries() });
    },
    { readOnly: true },
  );

  server.tool(
    'workflow_get',
    'Get a workflow mapping as an Atlas WorkflowTemplate (nodes + edges).',
    WorkflowIdSchema.shape,
    async (params, ctx) => {
      const input = WorkflowIdSchema.parse(params);
      const template = getBuiltWorkflowTemplate(input.workflow_id);
      if (!template) return errorContent(`Unknown workflow_id: ${input.workflow_id}`);

      const validation = validateBuiltWorkflow(template);

      return jsonContent({
        accountId: ctx.accountId,
        workflow_id: input.workflow_id,
        valid: validation.valid,
        invalidIds: validation.invalidIds,
        workflow: template,
      });
    },
    { readOnly: true },
  );

  server.tool(
    'workflow_mermaid',
    'Get a workflow mapping as Mermaid flowchart text for quick visualization.',
    WorkflowIdSchema.shape,
    async (params, ctx) => {
      const input = WorkflowIdSchema.parse(params);
      const mermaid = getWorkflowMermaid(input.workflow_id);
      if (!mermaid) return errorContent(`Unknown workflow_id: ${input.workflow_id}`);
      return jsonContent({ accountId: ctx.accountId, workflow_id: input.workflow_id, mermaid });
    },
    { readOnly: true },
  );

	  server.tool(
	    'workflow_map_from_tool_sequence',
	    'Automatically map an ordered tool-call sequence into an Atlas WorkflowTemplate for client review.',
	    WorkflowMapFromToolSequenceSchema.shape,
	    async (params, ctx) => {
	      const input = WorkflowMapFromToolSequenceSchema.parse(params);
	      const mapped = mapToolSequenceToWorkflowDefinition(input);
	      const def = mapped.definition;
	      const workflow = buildWorkflowTemplate(def);
	      const validation = validateBuiltWorkflow(workflow);
	      const mermaid = workflowTemplateToMermaid(workflow);

	      return jsonContent({
	        accountId: ctx.accountId,
	        definition: def,
	        warnings: mapped.warnings,
	        valid: validation.valid,
	        invalidIds: validation.invalidIds,
	        mermaid,
	        workflow,
	      });
	    },
	    { readOnly: true },
	  );

  server.tool(
    'mcp_catalog_list',
    'List known MCP servers from the Playbook catalog.',
    McpCatalogListSchema.shape,
    async (params, ctx) => {
      const input = McpCatalogListSchema.parse(params);
      return jsonContent({
        accountId: ctx.accountId,
        category: input.category ?? 'all',
        catalog: listMcpCatalog(input.category),
      });
    },
    { readOnly: true },
  );

  server.tool(
    'mcp_introspect',
    'Introspect an MCP server (tools/resources/prompts) via Streamable HTTP.',
    McpIntrospectSchema.shape,
    async (params, ctx) => {
      const input = McpIntrospectSchema.parse(params);

      const entry = input.slug ? findMcpCatalogEntry(input.slug) : undefined;
      if (input.slug && !entry) return errorContent(`Unknown MCP slug: ${input.slug}`);

      const endpointUrl = input.url
        ? resolveMcpHttpEndpointUrlFromUrl(input.url)
        : entry
          ? resolveMcpHttpEndpointUrl(entry)
          : undefined;
      if (!endpointUrl) return errorContent('Provide slug or url.');

      const introspection = await introspectMcpServer(endpointUrl);

      return jsonContent({
        accountId: ctx.accountId,
        entry,
        endpointUrl,
        introspection,
      });
    },
    { readOnly: true },
  );

  server.tool(
    'mcp_map_to_workflow',
    'Automatically map an MCP server into an Atlas workflow (capability map) for client review.',
    McpMapSchema.shape,
    async (params, ctx) => {
      const input = McpMapSchema.parse(params);

      const entry = input.slug
        ? findMcpCatalogEntry(input.slug)
        : input.url
          ? makeSyntheticCatalogEntry(input.url, input.name)
          : undefined;
      if (input.slug && !entry) return errorContent(`Unknown MCP slug: ${input.slug}`);
      if (!entry) return errorContent('Provide slug or url.');

	      const endpointUrl = input.url
	        ? resolveMcpHttpEndpointUrlFromUrl(input.url)
	        : resolveMcpHttpEndpointUrl(entry);

	      const introspection = await introspectMcpServer(endpointUrl);
	      const mapped = mapMcpToWorkflowDefinition(entry, introspection.ok ? introspection.value : undefined);
	      const def = mapped.definition;

	      const workflow = buildWorkflowTemplate(def);
	      const validation = validateBuiltWorkflow(workflow);
	      const mermaid = workflowTemplateToMermaid(workflow);

	      return jsonContent({
	        accountId: ctx.accountId,
	        entry,
	        endpointUrl,
	        introspection,
	        definition: def,
	        warnings: mapped.warnings,
	        valid: validation.valid,
	        invalidIds: validation.invalidIds,
	        mermaid,
	        workflow,
	      });
	    },
	    { readOnly: true },
	  );
}
