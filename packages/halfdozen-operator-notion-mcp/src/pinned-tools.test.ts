import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractPinnedToolNameFromRequest,
  listPinnedToolNames,
  resolvePinnedToolConfig,
  resolvePinnedToolName,
} from './pinned-tools.js';

test('resolvePinnedToolConfig preserves legacy tool and merges configured client tools', () => {
  const config = resolvePinnedToolConfig({
    pinnedClientToolName: 'blondish_notion',
    pinnedClientToolNames:
      'blondish_notion,c3_denver_notion,cracked_notion,kk_management_notion,hd_client_key_notion,six_notion',
  });

  assert.deepEqual(listPinnedToolNames(config), [
    'halfdozen_notion',
    'blondish_notion',
    'c3_denver_notion',
    'cracked_notion',
    'kk_management_notion',
    'hd_client_key_notion',
    'six_notion',
  ]);
});

test('resolvePinnedToolName accepts natural-language aliases for configured tools', () => {
  const config = resolvePinnedToolConfig({
    pinnedClientToolNames:
      'blondish_notion,c3_denver_notion,cracked_notion,kk_management_notion,hd_client_key_notion,six_notion',
  });

  assert.equal(resolvePinnedToolName('Half Dozen', config), 'halfdozen_notion');
  assert.equal(resolvePinnedToolName('BLOND:ISH', config), 'blondish_notion');
  assert.equal(resolvePinnedToolName('C3 Denver', config), 'c3_denver_notion');
  assert.equal(resolvePinnedToolName('Cracked', config), 'cracked_notion');
  assert.equal(resolvePinnedToolName('KK Management', config), 'kk_management_notion');
  assert.equal(resolvePinnedToolName('HD Client Key', config), 'hd_client_key_notion');
  assert.equal(resolvePinnedToolName('Six', config), 'six_notion');
});

test('extractPinnedToolNameFromRequest finds configured pinned tools inside operator requests', () => {
  const config = resolvePinnedToolConfig({
    pinnedClientToolNames:
      'blondish_notion,c3_denver_notion,cracked_notion,kk_management_notion,hd_client_key_notion,six_notion',
  });

  assert.equal(
    extractPinnedToolNameFromRequest('Pin KK Management to this new workspace.', config),
    'kk_management_notion',
  );
  assert.equal(
    extractPinnedToolNameFromRequest('Use BLOND:ISH for the client workspace.', config),
    'blondish_notion',
  );
  assert.equal(
    extractPinnedToolNameFromRequest('Route this workspace to Six.', config),
    'six_notion',
  );
});
