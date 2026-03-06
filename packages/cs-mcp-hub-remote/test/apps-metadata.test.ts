import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HUB_AUTH_WORKFLOW_RESOURCE_URI,
  HUB_OVERVIEW_RESOURCE_URI,
  HUB_RESOURCES,
  MANAGEMENT_TOOLS,
} from '../index.ts';

const TOOL_RESOURCE_EXPECTATIONS = [
  ['hub_status', HUB_OVERVIEW_RESOURCE_URI],
  ['hub_search_proxy_tools', HUB_AUTH_WORKFLOW_RESOURCE_URI],
  ['hub_execute_proxy_tool', HUB_AUTH_WORKFLOW_RESOURCE_URI],
  ['hub_list_services', HUB_OVERVIEW_RESOURCE_URI],
  ['hub_policy_status', HUB_OVERVIEW_RESOURCE_URI],
] as const;

test('overview trigger tools include MCP App ui metadata', () => {
  for (const [toolName, resourceUri] of TOOL_RESOURCE_EXPECTATIONS) {
    const tool = MANAGEMENT_TOOLS.find((entry) => entry.name === toolName);
    assert.ok(tool, `Expected tool definition for ${toolName}`);
    assert.equal(
      tool._meta?.ui?.resourceUri,
      resourceUri,
      `Expected ${toolName} to include ui metadata pointing to ${resourceUri}`,
    );
  }
});

test('hub overview ui resource is registered as html content', () => {
  const resource = HUB_RESOURCES.find((entry) => entry.uri === HUB_OVERVIEW_RESOURCE_URI);
  assert.ok(resource, 'Expected hub overview ui resource to be registered');
  assert.equal(resource.mimeType, 'text/html');
});

test('hub auth workflow ui resource is registered as html content', () => {
  const resource = HUB_RESOURCES.find((entry) => entry.uri === HUB_AUTH_WORKFLOW_RESOURCE_URI);
  assert.ok(resource, 'Expected hub auth workflow ui resource to be registered');
  assert.equal(resource.mimeType, 'text/html');
});
