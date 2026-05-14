import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { HydraRecallClient } from './client.js';
import { compileRecallContext } from './compiler.js';

const USER_VISIBLE = {
  annotations: {
    audience: ['user' as const, 'assistant' as const],
    priority: 0.8
  }
};

export function registerTools(server: McpServer, client: HydraRecallClient): void {
  server.tool(
    'context_recall',
    'Read-only recall from the approved CREATE SOMETHING Hydra DB context-memory pilot. Returns redacted excerpts scoped to an allowed sub-tenant.',
    {
      query: z
        .string()
        .min(3)
        .describe('Recall query. Ask for policy, architecture, or decision context.'),
      sub_tenant_id: z
        .string()
        .min(1)
        .optional()
        .describe('Optional Hydra DB sub-tenant. Must be in HYDRA_DB_ALLOWED_SUB_TENANT_IDS.'),
      max_results: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Maximum recall results. Default: 5.'),
      mode: z
        .enum(['fast', 'thinking'])
        .optional()
        .describe('Hydra DB recall mode. Default: thinking.'),
      graph_context: z
        .boolean()
        .optional()
        .describe('Include Hydra DB graph context when available. Default: true.'),
      output_format: z
        .enum(['json', 'compiled'])
        .optional()
        .describe(
          'Output format. json returns structured redacted chunks; compiled returns agent-ready markdown. Default: json.'
        ),
      min_score: z
        .number()
        .optional()
        .describe('Optional minimum relevancy score for compiled output.'),
      max_excerpt_chars: z
        .number()
        .int()
        .min(120)
        .max(2000)
        .optional()
        .describe('Maximum excerpt characters per compiled source. Default: 700.')
    },
    async ({
      query,
      sub_tenant_id,
      max_results,
      mode,
      graph_context,
      output_format,
      min_score,
      max_excerpt_chars
    }) => {
      const result = await client.recall({
        graphContext: graph_context,
        maxResults: max_results,
        mode,
        query,
        subTenantId: sub_tenant_id
      });
      const text =
        output_format === 'compiled'
          ? compileRecallContext(result, {
              maxExcerptChars: max_excerpt_chars,
              maxSources: max_results,
              minScore: min_score
            }).compiledContext
          : JSON.stringify(result, null, 2);

      return {
        content: [
          {
            type: 'text' as const,
            text,
            ...USER_VISIBLE
          }
        ]
      };
    }
  );
}
