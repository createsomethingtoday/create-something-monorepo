import assert from 'node:assert/strict';
import test from 'node:test';

import { createTicketSyncMcpServer } from '../src/mcp.js';
import type { Env } from '../src/types.js';

const env = {
  SYNC_SERVER_NAME: 'halfdozen-cracked-sync-mcp',
  SYNC_CLIENT_SLUG: 'cracked',
  SYNC_CLIENT_DISPLAY_NAME: 'Cracked Live',
  SYNC_TOOL_PREFIX: 'cracked_sync',
} as Env;

function registeredToolNames(server: ReturnType<typeof createTicketSyncMcpServer>): string[] {
  return Object.keys((server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools);
}

function registeredToolDescription(server: ReturnType<typeof createTicketSyncMcpServer>, toolName: string): string {
  return (server as unknown as {
    _registeredTools: Record<string, { description?: string }>;
  })._registeredTools[toolName]?.description ?? '';
}

test('read-only OAuth sessions expose audit and planning tools but no writes', () => {
  const tools = registeredToolNames(createTicketSyncMcpServer(env, { allowWrites: false }));

  assert.deepEqual(tools, [
    'cracked_sync_preflight',
    'cracked_sync_audit',
    'cracked_sync_plan_source_to_hd_repairs',
  ]);
});

test('legacy and write-scoped sessions preserve the complete eight-tool contract', () => {
  const tools = registeredToolNames(createTicketSyncMcpServer(env));

  assert.deepEqual(tools, [
    'cracked_sync_preflight',
    'cracked_sync_audit',
    'cracked_sync_plan_source_to_hd_repairs',
    'cracked_sync_repair_missing_hd_rows',
    'cracked_sync_repair_external_url_drift',
    'cracked_sync_source_to_hd',
    'cracked_sync_hd_status_to_source',
    'cracked_sync_full',
  ]);
});

test('reverse-status tool tells agents to reuse identifiers from audit rows', () => {
  const description = registeredToolDescription(createTicketSyncMcpServer(env), 'cracked_sync_hd_status_to_source');

  assert.match(description, /target_page_id, source_page_id, or ext_page_id/);
  assert.match(description, /reverse_status_drifts/);
});
