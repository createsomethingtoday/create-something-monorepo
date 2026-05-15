import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  upsertFlueRunHistoryRecord,
  type D1WritableDatabaseLike,
} from './flue-run-history-ingestion.js';
import {
  createFlueRunHistoryGovernanceSummary,
  parseFlueRunHistoryRecordJson,
} from './flue-run-history-governance.js';

const USER_VISIBLE = {
  annotations: {
    audience: ['user' as const, 'assistant' as const],
    priority: 0.8,
  },
};

export interface FlueRunHistoryToolOptions {
  db?: D1WritableDatabaseLike;
  storageLabel?: string;
}

const recordFlueRunOutputSchema = {
  ok: z.boolean(),
  action: z.enum(['validated', 'upserted']),
  dryRun: z.boolean(),
  storage: z.string(),
  runId: z.string(),
  resourceUri: z.string(),
  issue: z.string(),
  status: z.enum(['ready', 'review_required', 'blocked']),
  deployable: z.boolean(),
  checkedAt: z.string(),
  governance: z.object({
    tier: z.enum(['database', 'automation', 'judgment']),
    evidenceCount: z.number(),
    validationStatus: z.enum(['passed', 'review_required', 'failed']),
    rollback: z.string(),
  }),
};

export function registerFlueRunHistoryTools(
  server: McpServer,
  options: FlueRunHistoryToolOptions = {},
): void {
  if (!options.db) return;

  const storage = options.storageLabel ?? 'd1://TELEMETRY_DB/flue_run_history';

  server.registerTool(
    'record_flue_run',
    {
      title: 'Record Flue Run',
      description:
        'Validate and idempotently upsert a governed flue.run_history.v1 service-agent run record into TELEMETRY_DB.flue_run_history. Requires Linear issue, evidence, validation, rollback, and tier governance metadata.',
      inputSchema: {
        recordJson: z.string().min(2).describe(
          'A single JSON-encoded flue.run_history.v1 record. Pretty-printed JSON is accepted, but JSONL with multiple records is rejected.',
        ),
        operatorIntent: z.literal('record_flue_run').describe(
          'Exact confirmation string required for this governed write path.',
        ),
        dryRun: z.boolean().optional().describe(
          'When true, validate governance and return the normalized summary without writing to D1.',
        ),
      },
      outputSchema: recordFlueRunOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ recordJson, dryRun }) => {
      const record = parseFlueRunHistoryRecordJson(recordJson, 'record_flue_run.recordJson');
      const governed = dryRun ? record : await upsertFlueRunHistoryRecord(options.db!, record);
      const structuredContent = {
        ok: true,
        action: dryRun ? 'validated' as const : 'upserted' as const,
        dryRun: Boolean(dryRun),
        storage,
        runId: governed.runId,
        resourceUri: governed.resourceUri,
        issue: governed.issue!,
        status: governed.status,
        deployable: governed.guardrails.deployable,
        checkedAt: governed.checkedAt,
        governance: createFlueRunHistoryGovernanceSummary(governed),
      };

      return {
        structuredContent,
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(structuredContent, null, 2),
            ...USER_VISIBLE,
          },
        ],
      };
    },
  );
}
