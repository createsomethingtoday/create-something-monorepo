import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AirtableClient } from '../src/airtable.js';
import type { ReviewerProfile } from '../src/reviewer-directory.js';
import { registerResources } from '../src/resources.js';

type ResourceResult = {
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
};

type ResourceHandler = (uri: URL) => Promise<ResourceResult>;

function createResourceHarness() {
  const handlers = new Map<string, ResourceHandler>();

  const server = {
    resource(_name: string, uri: string, _meta: unknown, handler: ResourceHandler) {
      handlers.set(uri, handler);
    },
  } as unknown as McpServer;

  return { handlers, server };
}

const reviewer: ReviewerProfile = {
  accountId: 'acct_wf_eric',
  airtableCollaboratorId: 'usr_eric',
  email: 'eric.unger@webflow.com',
  name: 'Eric Unger',
  lane: 'wf-template-review-eric',
};

test('host playbook resource documents price updates and the cross-server analyzer workflow', async () => {
  const { handlers, server } = createResourceHarness();
  const client = {
    listAssetQueueDetailed: async () => ({
      sortApplied: 'submittedDate_desc',
      items: [],
    }),
  } as unknown as AirtableClient;

  registerResources(server, () => client, () => reviewer);

  const result = await handlers.get('template-review://host-playbook')?.(new URL('template-review://host-playbook'));

  assert.ok(result);
  const payload = JSON.parse(result.contents[0]?.text ?? '{}') as {
    operatorSequences?: {
      priceUpdate?: Array<{ tool?: string; returnFields?: string[] }>;
      priceBatchUpdate?: Array<{ tool?: string; returnFields?: string[] }>;
    };
    crossServerHubWorkflows?: {
      analyzerReview?: {
        server?: string;
        preferredSequence?: Array<{ tool: string }>;
        debugFallback?: { tool?: string };
      };
    };
  };

  assert.deepEqual(
    payload.operatorSequences?.priceUpdate?.map((step) => step.tool),
    ['template_review_get_asset', 'template_review_set_price', 'template_review_update_asset_publishing', undefined],
  );
  assert.deepEqual(payload.operatorSequences?.priceUpdate?.[3]?.returnFields, [
    'publishing_context.mrp_id',
    'publishing_context.current_price',
    'publishing_context.set_price',
    'publishing_context.price_string',
    'publishing_context.mrp_id_override',
  ]);
  assert.deepEqual(
    payload.operatorSequences?.priceBatchUpdate?.map((step) => step.tool),
    ['template_review_bulk_set_price', undefined],
  );
  assert.deepEqual(payload.operatorSequences?.priceBatchUpdate?.[1]?.returnFields, [
    'summary.updated',
    'summary.already_set',
    'summary.not_found',
    'summary.ambiguous',
    'summary.needs_admin_update',
    'admin_handoff',
  ]);
  assert.equal(payload.crossServerHubWorkflows?.analyzerReview?.server, 'webflow-site-analyzer-mcp');
  assert.deepEqual(
    payload.crossServerHubWorkflows?.analyzerReview?.preferredSequence?.map((step) => step.tool),
    ['enqueue_template_review', 'get_template_review_job', 'list_template_review_jobs'],
  );
  assert.equal(payload.crossServerHubWorkflows?.analyzerReview?.debugFallback?.tool, 'run_template_review');
  assert.match(result.contents[0]?.text ?? '', /remote-only/);
});
