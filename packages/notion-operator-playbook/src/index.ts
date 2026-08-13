import { Worker } from '@notionhq/workers';
import * as Builder from '@notionhq/workers/builder';
import * as Schema from '@notionhq/workers/schema';
import { j } from '@notionhq/workers/schema-builder';
import type { NotionRunbookClient } from './contracts.js';
import { DEMO_EVIDENCE } from './demo-evidence.js';
import { instantiateRunbook } from './instantiate-runbook.js';
import { inspectRunbookReadiness } from './readiness.js';
import { processEvidenceWebhookEvents } from './webhook.js';

const worker = new Worker();
export default worker;

const demoEvidenceDatabase = worker.database('demoEvidence', {
  type: 'managed',
  initialTitle: 'Runbook Evidence [Demo]',
  primaryKeyProperty: 'Evidence ID',
  schema: {
    properties: {
      Name: Schema.title(),
      'Evidence ID': Schema.richText(),
      Kind: Schema.select([
        { name: 'Map', color: 'blue' },
        { name: 'Automation', color: 'yellow' },
        { name: 'Judgment', color: 'purple' }
      ]),
      Status: Schema.select([
        { name: 'Review', color: 'yellow' },
        { name: 'Verified', color: 'green' }
      ]),
      Source: Schema.url(),
      Observed: Schema.date(),
      Summary: Schema.richText()
    }
  }
});

worker.sync('demoEvidenceSync', {
  database: demoEvidenceDatabase,
  mode: 'replace',
  schedule: 'manual',
  execute: async () => ({
    changes: DEMO_EVIDENCE.map((item) => ({
      type: 'upsert' as const,
      key: item.id,
      upstreamUpdatedAt: item.observedAt,
      properties: {
        Name: Builder.title(item.title),
        'Evidence ID': Builder.richText(item.id),
        Kind: Builder.select(item.kind),
        Status: Builder.select(item.status),
        Source: Builder.url(item.sourceUrl),
        Observed: Builder.dateTime(item.observedAt),
        Summary: Builder.richText(item.summary)
      }
    })),
    hasMore: false
  })
});

worker.tool('inspectRunbookReadiness', {
  title: 'Inspect Runbook Readiness',
  description:
    'Evaluate whether a Runbook has its owner, approval, rollback, evidence, and executable steps. This tool is read-only and never changes Notion.',
  hints: { readOnlyHint: true },
  schema: j.object({
    runbookId: j.string().describe('Stable Runbook identifier.'),
    title: j.string().describe('Human-readable Runbook title.'),
    owner: j.string().describe('Named accountable operator.'),
    approvalStatus: j
      .enum('draft', 'review', 'approved', 'rejected')
      .describe('Current operator review state.'),
    rollbackPlan: j.string().describe('Recovery or rollback instruction.'),
    evidenceCount: j.integer().describe('Number of attached evidence artifacts.'),
    stepCount: j.integer().describe('Number of executable Runbook steps.')
  }),
  outputSchema: j.object({
    runbookId: j.string().describe('Stable Runbook identifier.'),
    ready: j.boolean().describe('Whether every readiness requirement is satisfied.'),
    status: j.enum('ready', 'blocked').describe('Readiness result.'),
    missingRequirements: j.array(j.string()).describe('Unmet requirements.'),
    recommendedAction: j.string().describe('Next operator action.'),
    receiptId: j.string().describe('Deterministic receipt for this exact evaluation.')
  }),
  execute: inspectRunbookReadiness
});

worker.tool('instantiateRunbook', {
  title: 'Instantiate Runbook',
  description:
    'Preview or create one Runbook from an approved Playbook. Always use dryRun=true first. A live write also requires explicit approval, a disposable target data source, and the NOTION_RUNBOOK_WRITE_ENABLED environment gate.',
  schema: j.object({
    playbookId: j.string().describe('Stable Playbook identifier.'),
    playbookVersion: j.string().describe('Version of the Playbook being instantiated.'),
    runbookTitle: j.string().describe('Title for the new Runbook.'),
    owner: j.string().describe('Accountable operator for the Runbook.'),
    approved: j.boolean().describe('Whether an operator explicitly approved instantiation.'),
    dryRun: j.boolean().describe('When true, return a preview receipt without writing.'),
    targetDataSourceId: j
      .string()
      .nullable()
      .describe('Disposable Runbooks data source ID; null for previews.'),
    steps: j.array(j.string()).describe('Ordered executable steps copied into the Runbook.')
  }),
  outputSchema: j.object({
    status: j.enum('blocked', 'preview', 'created', 'existing').describe('Instantiation result.'),
    created: j.boolean().describe('Whether a Notion page was created.'),
    reason: j.string().nullable().describe('Block, preview, or idempotency explanation.'),
    receiptId: j.string().describe('Deterministic idempotency receipt.'),
    pageId: j.string().nullable().describe('Created or existing Notion page ID.'),
    runbookTitle: j.string().describe('Runbook title.'),
    stepCount: j.integer().describe('Number of copied steps.'),
    dryRun: j.boolean().describe('Whether execution was a dry run.')
  }),
  execute: async (input, { notion }) =>
    instantiateRunbook(input, {
      notion: notion as unknown as NotionRunbookClient,
      writeEnabled: process.env.NOTION_RUNBOOK_WRITE_ENABLED === 'true'
    })
});

worker.webhook('runbookEvidenceWebhook', {
  title: 'Runbook Evidence Webhook',
  description:
    'Accept a signed synthetic or external evidence event and emit a deterministic receipt after HMAC verification.',
  execute: async (events) => {
    const receipts = processEvidenceWebhookEvents(events, process.env.RUNBOOK_WEBHOOK_SECRET);
    for (const receipt of receipts) {
      console.log(JSON.stringify(receipt));
    }
  }
});
