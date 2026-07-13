import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  WorkflowPilotLiveAdapterError,
  loadWorkflowPilotLiveAdapterReceipt,
  observeTemplateReviewQueue,
} from '../dist/index.js';

const SERVICE = 'webflow-template-review-mcp';
const READ_TOOL = 'template_review_list_queue';

function createTransport(options = {}) {
  const calls = [];
  const discoveredTools = options.discoveredTools ?? [options.discoveredTool ?? READ_TOOL];
  return {
    calls,
    async listTools() {
      return discoveredTools.map((name) => ({ name }));
    },
    async callTool(name, args) {
      calls.push({ name, args });
      if (name === READ_TOOL) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                records: [
                  {
                    version_id: 'rec-private-version',
                    template_name: 'Private Template Alpha',
                    reviewer: 'private.reviewer@example.com',
                    review_feedback: 'Private feedback text',
                    review_status: 'ready_to_review',
                  },
                  {
                    version_id: 'rec-private-version-two',
                    template_name: 'Private Template Beta',
                    reviewer: null,
                    review_status: 'ready_to_review',
                  },
                ],
              }),
            },
          ],
        };
      }
      throw new Error(`Unexpected tool ${name}`);
    },
  };
}

test('observes the authenticated review queue and emits only a sanitized immutable receipt', async () => {
  const transport = createTransport();
  const receipt = await observeTemplateReviewQueue({ transport, limit: 2 });

  assert.deepEqual(receipt, {
    schemaVersion: 'workflow_live_adapter_receipt.v0.1',
    mode: 'shadow',
    adapterId: 'review',
    owner: 'Webflow Template Review MCP',
    authBoundary: 'create-something-identity',
    serviceName: SERVICE,
    toolName: READ_TOOL,
    requestedLimit: 2,
    observedItemCount: 2,
    rawResponseSha256: receipt.rawResponseSha256,
    discoveryVerified: true,
    readScopeVerified: true,
    mutationsPerformed: 0,
    invokedTools: [READ_TOOL],
  });
  assert.match(receipt.rawResponseSha256, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(transport.calls[0], {
    name: READ_TOOL,
    args: { limit: 2, status: 'ready_to_review', assigned: 'any' },
  });

  const serialized = JSON.stringify(receipt);
  for (const privateValue of [
    'rec-private-version',
    'rec-private-version-two',
    'Private Template Alpha',
    'Private Template Beta',
    'private.reviewer@example.com',
    'Private feedback text',
  ]) {
    assert.equal(serialized.includes(privateValue), false);
  }
});

test('rejects a captured receipt that claims any mutation or extra private field', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'workflow-live-receipt-'));
  const receiptPath = path.join(directory, 'receipt.json');
  try {
    await writeFile(
      receiptPath,
      JSON.stringify({
        schemaVersion: 'workflow_live_adapter_receipt.v0.1',
        mode: 'shadow',
        adapterId: 'review',
        owner: 'Webflow Template Review MCP',
        authBoundary: 'create-something-identity',
        serviceName: SERVICE,
        toolName: READ_TOOL,
        requestedLimit: 1,
        observedItemCount: 1,
        rawResponseSha256: `sha256:${'b'.repeat(64)}`,
        discoveryVerified: true,
        readScopeVerified: true,
        mutationsPerformed: 1,
        invokedTools: [READ_TOOL],
        template_name: 'must never be accepted',
      }),
    );
    await assert.rejects(
      loadWorkflowPilotLiveAdapterReceipt(receiptPath),
      (error) => {
        assert.equal(error.code, 'LIVE_ADAPTER_RECEIPT_INVALID');
        return true;
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('fails before execution when discovery drifts to a write-scoped tool', async () => {
  const transport = createTransport({
    discoveredTool: 'webflow-template-review-mcp__template_review_approve_version',
  });

  await assert.rejects(
    observeTemplateReviewQueue({ transport, limit: 1 }),
    (error) => {
      assert.ok(error instanceof WorkflowPilotLiveAdapterError);
      assert.equal(error.code, 'LIVE_ADAPTER_TOOL_DRIFT');
      return true;
    },
  );
  assert.equal(transport.calls.length, 0);
});

test('fails before execution when discovery includes the read tool plus any wider tool', async () => {
  const transport = createTransport({
    discoveredTools: [
      READ_TOOL,
      'webflow-template-review-mcp__template_review_set_review_status',
    ],
  });

  await assert.rejects(
    observeTemplateReviewQueue({ transport, limit: 1 }),
    (error) => {
      assert.ok(error instanceof WorkflowPilotLiveAdapterError);
      assert.equal(error.code, 'LIVE_ADAPTER_TOOL_DRIFT');
      return true;
    },
  );
  assert.equal(transport.calls.length, 0);
});

test('OAuth callback copy does not claim adapter success before token exchange finishes', async () => {
  const script = await readFile(
    new URL('../scripts/live-review-oauth.mjs', import.meta.url),
    'utf8',
  );

  assert.equal(script.includes('Read-only adapter authorized'), false);
  assert.equal(script.includes('Authorization received'), true);
  assert.equal(script.includes('The adapter is completing token exchange and the bounded observation.'), true);
  assert.equal(script.includes("const OAUTH_SCOPE = 'openid profile email mcp template-review:queue-read'"), true);
  assert.equal(script.includes('await auth(provider, {'), true);
  assert.equal(script.includes('scope: OAUTH_SCOPE'), true);
  assert.equal(script.includes("'live-auth-evidence.json'"), true);
  const oauthScope = script.match(/const OAUTH_SCOPE = '([^']+)'/)?.[1];
  assert.deepEqual(oauthScope?.split(/\s+/), [
    'openid',
    'profile',
    'email',
    'mcp',
    'template-review:queue-read',
  ]);
});
