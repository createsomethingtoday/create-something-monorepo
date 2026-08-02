import assert from 'node:assert/strict';
import test from 'node:test';
import { parseStatusMap, resolveRuntimeConfig, toolName } from '../src/config.js';
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

test('resolveRuntimeConfig supports Cracked Live runtime config', () => {
  const env = {
    SYNC_SERVER_NAME: 'halfdozen-cracked-sync-mcp',
    SYNC_CLIENT_SLUG: 'cracked',
    SYNC_TENANT_SLUG: 'cracked-live',
    SYNC_CLIENT_DISPLAY_NAME: 'Cracked Live',
    SYNC_TOOL_PREFIX: 'cracked_sync',
    SYNC_CLIENT_LABEL: 'Cracked',
    CLIENT_SUPPORT_TICKETS_DATA_SOURCE_ID: 'a2cbfa48-c9e9-839c-8dac-073ab7fcf300',
    CLIENT_SUPPORT_TICKETS_DATA_SOURCE_TITLE: 'Support Tickets [OS]',
  } as Env;

  const config = resolveRuntimeConfig(env);

  assert.equal(config.serverName, 'halfdozen-cracked-sync-mcp');
  assert.equal(config.clientSlug, 'cracked');
  assert.equal(config.tenantSlug, 'cracked-live');
  assert.equal(config.clientDisplayName, 'Cracked Live');
  assert.equal(config.toolPrefix, 'cracked_sync');
  assert.equal(config.clientLabel, 'Cracked');
  assert.equal(config.sourceDataSourceId, 'a2cbfa48-c9e9-839c-8dac-073ab7fcf300');
  assert.equal(toolName(env, 'audit'), 'cracked_sync_audit');
});

test('parseStatusMap accepts explicit client status aliases and rejects invalid config', () => {
  assert.deepEqual(parseStatusMap('{"Complete":"Completed"}'), { Complete: 'Completed' });
  assert.throws(() => parseStatusMap('[]'), /must be a JSON object/);
  assert.throws(() => parseStatusMap('{"Complete":""}'), /non-empty string keys and values/);
  assert.throws(() => parseStatusMap('{"Backburner":"Later"}'), /cannot override unmapped Half Dozen status/);
});
