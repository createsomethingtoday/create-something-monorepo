import assert from 'node:assert/strict';

import { Sandbox } from '@e2b/code-interpreter';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import { SCOPE_READ } from '../src/oauth-access.js';

const DEFAULT_DEV_URL = 'https://webflow-template-review-mcp-dev.createsomething.workers.dev';
const WRITE_TOOL_NAMES = new Set([
  'template_review_assign_self',
  'template_review_unassign_self',
  'template_review_assign_reviewer',
  'template_review_request_changes',
  'template_review_set_review_status',
  'template_review_save_agent_feedback',
  'template_review_save_draft_feedback',
  'template_review_complete_publishing',
  'template_review_update_asset_metadata',
  'template_review_update_asset_publishing',
  'template_review_update_version_review',
  'template_review_approve_version',
  'template_review_reject_version',
]);

function requiredEnv(name: 'MCP_API_KEY' | 'E2B_API_KEY'): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parseToolPayload(result: unknown): Record<string, unknown> {
  const content =
    result && typeof result === 'object' && Array.isArray((result as { content?: unknown }).content)
      ? (result as { content: unknown[] }).content
      : [];
  const text = content.find(
    (entry): entry is { type: 'text'; text: string } =>
      Boolean(entry && typeof entry === 'object' && (entry as { type?: unknown }).type === 'text'),
  )?.text;
  if (!text) throw new Error('Tool returned no JSON text content.');
  return JSON.parse(text) as Record<string, unknown>;
}

async function activeSandboxIds(apiKey: string): Promise<Set<string>> {
  const paginator = Sandbox.list({ apiKey });
  const ids = new Set<string>();
  while (paginator.hasNext) {
    for (const sandbox of await paginator.nextItems()) ids.add(sandbox.sandboxId);
  }
  return ids;
}

async function main() {
  const baseUrl = (process.env.TEMPLATE_REVIEW_DEV_URL ?? DEFAULT_DEV_URL).replace(/\/+$/, '');
  const mcpApiKey = requiredEnv('MCP_API_KEY');
  const e2bApiKey = requiredEnv('E2B_API_KEY');

  const health = (await (await fetch(`${baseUrl}/health`)).json()) as Record<string, any>;
  assert.equal(health.environment, 'development');
  assert.equal(health.readOnly, true);
  assert.deepEqual(health.auth?.modes?.oauth?.scopes, [SCOPE_READ]);
  assert.equal(health.auth?.modes?.cloudflareAccess?.configured, false);
  assert.equal(health.auth?.modes?.legacy?.configured, true);

  const metadata = (await (
    await fetch(`${baseUrl}/.well-known/oauth-protected-resource`)
  ).json()) as Record<string, unknown>;
  assert.deepEqual(metadata.scopes_supported, [SCOPE_READ]);

  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${mcpApiKey}`,
        'x-mcp-account-id': 'acct_wf_micah',
      },
    },
  });
  const client = new Client(
    { name: 'template-review-dev-verifier', version: '1.0.0' },
    { capabilities: {} },
  );

  const beforeSandboxes = await activeSandboxIds(e2bApiKey);
  let e2bSandboxId = '';

  try {
    await client.connect(transport);
    const listed = await client.listTools();
    const toolNames = listed.tools.map((tool) => tool.name);
    assert.ok(toolNames.includes('template_review_list_queue'));
    assert.ok(toolNames.includes('template_review_run_published_site_sandbox'));
    for (const writeTool of WRITE_TOOL_NAMES) {
      assert.equal(toolNames.includes(writeTool), false, `${writeTool} must not be registered`);
    }

    const queuePayload = parseToolPayload(
      await client.callTool({
        name: 'template_review_list_queue',
        arguments: { assigned: 'any', limit: 1 },
      }),
    ) as { ok?: boolean; data?: { count?: number } };
    assert.equal(queuePayload.ok, true);
    assert.equal(typeof queuePayload.data?.count, 'number');

    let writeDenied = false;
    try {
      await client.callTool({
        name: 'template_review_assign_self',
        arguments: { version_id: 'must-not-run' },
      });
    } catch (error) {
      writeDenied = /not found|unknown tool/i.test(error instanceof Error ? error.message : String(error));
    }
    assert.equal(writeDenied, true, 'known write tool must be unavailable');

    const e2bPayload = parseToolPayload(
      await client.callTool({
        name: 'template_review_run_published_site_sandbox',
        arguments: {
          published_url: 'https://example.com/',
          run_id: `template-review-dev-${Date.now()}`,
          max_pages: 1,
          max_network_requests: 25,
          timeout_ms: 120_000,
          viewports: [{ name: 'desktop', width: 1024, height: 768 }],
          include_screenshots: false,
        },
      }),
    ) as {
      ok?: boolean;
      data?: {
        status?: string;
        fetched_urls?: unknown[];
        cleanup?: { killed?: boolean };
        sandbox?: { id?: string };
      };
    };
    assert.equal(e2bPayload.ok, true);
    assert.equal(e2bPayload.data?.cleanup?.killed, true);
    assert.ok((e2bPayload.data?.fetched_urls?.length ?? 0) >= 1);
    e2bSandboxId = e2bPayload.data?.sandbox?.id ?? '';
    assert.ok(e2bSandboxId);

    const afterSandboxes = await activeSandboxIds(e2bApiKey);
    assert.equal(afterSandboxes.has(e2bSandboxId), false, 'completed E2B sandbox must not remain active');

    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          devUrl: baseUrl,
          environment: health.environment,
          readOnly: health.readOnly,
          scopesSupported: metadata.scopes_supported,
          toolCount: toolNames.length,
          writeToolCount: toolNames.filter((name) => WRITE_TOOL_NAMES.has(name)).length,
          queueRead: { ok: queuePayload.ok, returnedCount: queuePayload.data?.count },
          e2b: {
            status: e2bPayload.data?.status,
            fetchedUrlCount: e2bPayload.data?.fetched_urls?.length,
            cleanupKilled: e2bPayload.data?.cleanup?.killed,
            activeBefore: beforeSandboxes.size,
            activeAfter: afterSandboxes.size,
            completedSandboxStillActive: afterSandboxes.has(e2bSandboxId),
          },
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
