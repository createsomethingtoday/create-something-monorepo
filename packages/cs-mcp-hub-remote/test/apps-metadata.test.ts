import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HUB_OVERVIEW_RESOURCE_URI,
  HUB_RESOURCES,
  MANAGEMENT_TOOLS,
} from '../index.ts';

const HUB_OVERVIEW_TRIGGER_TOOL_NAMES = [
  'hub_status',
  'hub_search_proxy_tools',
  'hub_list_services',
  'hub_policy_status',
];

test('overview trigger tools include MCP App ui metadata', () => {
  for (const toolName of HUB_OVERVIEW_TRIGGER_TOOL_NAMES) {
    const tool = MANAGEMENT_TOOLS.find((entry) => entry.name === toolName);
    assert.ok(tool, `Expected tool definition for ${toolName}`);
    assert.equal(
      tool._meta?.ui?.resourceUri,
      HUB_OVERVIEW_RESOURCE_URI,
      `Expected ${toolName} to include ui metadata pointing to hub overview resource`,
    );
  }
});

test('hub overview ui resource is registered as html content', () => {
  const resource = HUB_RESOURCES.find((entry) => entry.uri === HUB_OVERVIEW_RESOURCE_URI);
  assert.ok(resource, 'Expected hub overview ui resource to be registered');
  assert.equal(resource.mimeType, 'text/html');
});
