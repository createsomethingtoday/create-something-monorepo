import assert from 'node:assert/strict';
import test from 'node:test';

import { buildListToolDefinitions } from '../index.ts';

function makeRuntime(proxyToolNames: string[]) {
  const toolDefinitions = proxyToolNames.map((name) => ({
    name,
    description: `Tool ${name}`,
    inputSchema: { type: 'object', properties: {} },
  }));

  return {
    proxies: {
      toolDefinitions,
      routes: new Map(
        proxyToolNames.map((name) => [
          name,
          {
            proxyToolName: name,
            serverName: name.startsWith('halfdozen-operator-notion-mcp__')
              ? 'halfdozen-operator-notion-mcp'
              : 'composio-toolkit-notion',
            downstreamToolName: name.split('__')[1] ?? name,
            serverTags: [],
            call: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
          },
        ]),
      ),
      warnings: [],
    },
  } as any;
}

test('buildListToolDefinitions keeps unauthenticated tools/list management-only', async () => {
  const tools = await buildListToolDefinitions({
    request: { id: 1 },
    extra: {
      requestInfo: {
        headers: {},
      },
    },
    runtime: makeRuntime(['halfdozen-operator-notion-mcp__operator_notion_accounts']),
    env: {
      HUB_IDENTITY_MODE: 'compat',
      HUB_ALLOW_DIRECT_PROXY_TOOLS: 'true',
      HUB_DIRECT_PROXY_ALLOWED_PREFIXES: 'halfdozen-operator-notion-mcp__',
    } as any,
  });

  assert.equal(tools.some((tool) => tool.name === 'hub_status'), true);
  assert.equal(tools.some((tool) => tool.name === 'halfdozen-operator-notion-mcp__operator_notion_accounts'), false);
});

test('buildListToolDefinitions appends authenticated direct-allowed proxy tools', async () => {
  const tools = await buildListToolDefinitions({
    request: { id: 2 },
    extra: {
      requestInfo: {
        headers: {
          authorization: 'Bearer session_like_token',
        },
      },
    },
    runtime: makeRuntime([
      'halfdozen-operator-notion-mcp__operator_notion_accounts',
      'composio-toolkit-notion__notion_search',
    ]),
    env: {
      HUB_IDENTITY_MODE: 'compat',
      HUB_ALLOW_DIRECT_PROXY_TOOLS: 'true',
      HUB_DIRECT_PROXY_ALLOWED_PREFIXES: 'halfdozen-operator-notion-mcp__',
    } as any,
  });

  assert.equal(tools.some((tool) => tool.name === 'hub_status'), true);
  assert.equal(tools.some((tool) => tool.name === 'halfdozen-operator-notion-mcp__operator_notion_accounts'), true);
  assert.equal(tools.some((tool) => tool.name === 'composio-toolkit-notion__notion_search'), false);
});

test('buildListToolDefinitions treats mcp_access_token query transport as authenticated', async () => {
  const tools = await buildListToolDefinitions({
    request: { id: 3 },
    extra: {
      requestInfo: {
        headers: {},
        url: 'https://viv-blondish.mcp.createsomething.agency/mcp?mcp_access_token=mcpu_query_auth',
      },
    },
    runtime: makeRuntime(['halfdozen-operator-notion-mcp__operator_notion_accounts']),
    env: {
      HUB_IDENTITY_MODE: 'compat',
      HUB_ALLOW_DIRECT_PROXY_TOOLS: 'true',
      HUB_DIRECT_PROXY_ALLOWED_PREFIXES: 'halfdozen-operator-notion-mcp__',
    } as any,
  });

  assert.equal(tools.some((tool) => tool.name === 'hub_status'), true);
  assert.equal(tools.some((tool) => tool.name === 'halfdozen-operator-notion-mcp__operator_notion_accounts'), true);
});
