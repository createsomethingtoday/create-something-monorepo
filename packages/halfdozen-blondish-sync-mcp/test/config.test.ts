import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRuntimeConfig, toolName } from '../src/config.js';
import type { Env } from '../src/types.js';

test('resolveRuntimeConfig preserves BLONDISH defaults', () => {
  const config = resolveRuntimeConfig({} as Env);

  assert.equal(config.serverName, 'halfdozen-blondish-sync-mcp');
  assert.equal(config.clientSlug, 'blondish');
  assert.equal(config.clientDisplayName, 'BLOND:ISH');
  assert.equal(config.toolPrefix, 'blondish_sync');
  assert.equal(toolName({} as Env, 'audit'), 'blondish_sync_audit');
  assert.equal(config.clientLabel, 'BLOND:ISH / Abracadabra');
});

test('resolveRuntimeConfig supports client-specific tool prefixes and labels', () => {
  const env = {
    SYNC_SERVER_NAME: 'halfdozen-c3-management-sync-mcp',
    SYNC_CLIENT_SLUG: 'c3-management',
    SYNC_TENANT_SLUG: 'c3-management',
    SYNC_CLIENT_DISPLAY_NAME: 'C3 Management',
    SYNC_TOOL_PREFIX: 'c3-management sync',
    SYNC_CLIENT_LABEL: 'C3 Denver',
    CLIENT_SUPPORT_TICKETS_DATA_SOURCE_TITLE: 'Support Tickets [OS]',
  } as Env;

  const config = resolveRuntimeConfig(env);

  assert.equal(config.serverName, 'halfdozen-c3-management-sync-mcp');
  assert.equal(config.clientSlug, 'c3-management');
  assert.equal(config.tenantSlug, 'c3-management');
  assert.equal(config.clientDisplayName, 'C3 Management');
  assert.equal(config.toolPrefix, 'c3_management_sync');
  assert.equal(config.clientLabel, 'C3 Denver');
  assert.equal(toolName(env, 'repair_missing_hd_rows'), 'c3_management_sync_repair_missing_hd_rows');
});
