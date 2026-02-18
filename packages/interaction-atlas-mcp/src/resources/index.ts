/**
 * Interaction Atlas — Resources (Database tier)
 *
 * Exposes:
 * - Atlas dataset snapshots (meta/stats + key dimensions)
 * - Built-in workflow mappings (list + per-workflow JSON + mermaid)
 */

import type { ScopedMcpServer } from '@create-something/mcp-core';
import {
  AI_TASKS,
  CONSTRAINTS,
  DATA_ARTIFACTS,
  HUMAN_TASKS,
  LAYERS,
  META,
  SYSTEM_TASKS,
  TOUCHPOINTS,
  getAtlasStats,
} from '@quietloudlab/ai-interaction-atlas';

import { WORKFLOW_DEFINITIONS } from '../workflows/registry.js';
import { getBuiltWorkflowTemplate, getWorkflowMermaid, listWorkflowSummaries, validateBuiltWorkflow } from '../workflows/index.js';

export function registerResources(server: ScopedMcpServer): void {
  server.resource(
    'account',
    'interaction-atlas://account',
    { description: 'Current account context (scopes, readOnly)', mimeType: 'application/json' },
    async (uri, ctx) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify({
          accountId: ctx.accountId,
          userId: ctx.userId,
          teamId: ctx.teamId,
          scopes: ctx.policy.scopes,
          readOnly: ctx.policy.readOnly,
          metadata: ctx.metadata,
        }, null, 2),
      }],
    }),
  );

  // Atlas dataset snapshots
  server.resource(
    'atlas-meta',
    'interaction-atlas://atlas/meta',
    { description: 'Atlas metadata', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(META, null, 2) }],
    }),
  );

  server.resource(
    'atlas-stats',
    'interaction-atlas://atlas/stats',
    { description: 'Atlas element counts by dimension', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(getAtlasStats(), null, 2) }],
    }),
  );

  server.resource(
    'atlas-layers',
    'interaction-atlas://atlas/layers',
    { description: 'Atlas layer definitions', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(LAYERS, null, 2) }],
    }),
  );

  server.resource(
    'atlas-tasks-ai',
    'interaction-atlas://atlas/tasks/ai',
    { description: 'Atlas AI tasks', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(AI_TASKS, null, 2) }],
    }),
  );

  server.resource(
    'atlas-tasks-human',
    'interaction-atlas://atlas/tasks/human',
    { description: 'Atlas human tasks', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(HUMAN_TASKS, null, 2) }],
    }),
  );

  server.resource(
    'atlas-tasks-system',
    'interaction-atlas://atlas/tasks/system',
    { description: 'Atlas system tasks', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(SYSTEM_TASKS, null, 2) }],
    }),
  );

  server.resource(
    'atlas-data-artifacts',
    'interaction-atlas://atlas/data_artifacts',
    { description: 'Atlas data artifacts', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(DATA_ARTIFACTS, null, 2) }],
    }),
  );

  server.resource(
    'atlas-constraints',
    'interaction-atlas://atlas/constraints',
    { description: 'Atlas constraints', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(CONSTRAINTS, null, 2) }],
    }),
  );

  server.resource(
    'atlas-touchpoints',
    'interaction-atlas://atlas/touchpoints',
    { description: 'Atlas touchpoints', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(TOUCHPOINTS, null, 2) }],
    }),
  );

  // Workflow mappings
  server.resource(
    'workflow-list',
    'interaction-atlas://workflows',
    { description: 'List available workflow mappings', mimeType: 'application/json' },
    async (uri, ctx) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify({
          accountId: ctx.accountId,
          workflows: listWorkflowSummaries(),
        }, null, 2),
      }],
    }),
  );

  for (const def of WORKFLOW_DEFINITIONS) {
    const baseUri = `interaction-atlas://workflows/${def.id}`;

    server.resource(
      `workflow-${def.id}`,
      baseUri,
      { description: `${def.name} workflow (Atlas WorkflowTemplate JSON)`, mimeType: 'application/json' },
      async (uri) => {
        const template = getBuiltWorkflowTemplate(def.id);
        if (!template) {
          return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ error: 'Not found' }) }] };
        }
        const validation = validateBuiltWorkflow(template);
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ definition: def, workflow: template, validation }, null, 2),
          }],
        };
      },
    );

    server.resource(
      `workflow-${def.id}-mermaid`,
      `${baseUri}/mermaid`,
      { description: `${def.name} workflow as Mermaid flowchart text`, mimeType: 'text/plain' },
      async (uri) => {
        const mermaid = getWorkflowMermaid(def.id);
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/plain',
            text: mermaid ?? `error: unknown workflow ${def.id}`,
          }],
        };
      },
    );
  }
}
