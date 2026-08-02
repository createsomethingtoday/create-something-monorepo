import assert from 'node:assert/strict';
import test from 'node:test';

import type { ComposioToolDef } from '@create-something/composio-bridge';

import { projectToolkitTools } from '../tool-policy.js';
import { buildToolRoutes, dispatchToolRoute } from '../tool-routing.js';

function tool(slug: string): ComposioToolDef {
  return {
    slug,
    name: slug,
    description: `${slug} fixture`,
    app: 'google_search_console',
    parameters: {
      type: 'object',
      properties: {}
    }
  };
}

const discovered = [
  tool('GOOGLE_SEARCH_CONSOLE_LIST_SITES'),
  tool('GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY'),
  tool('GOOGLE_SEARCH_CONSOLE_ADD_SITE'),
  tool('GOOGLE_SEARCH_CONSOLE_DELETE_SITE'),
  tool('GOOGLE_SEARCH_CONSOLE_SUBMIT_SITEMAP')
];

test('public routes exclude discovered Google Search Console mutations', () => {
  const projection = projectToolkitTools('google_search_console', discovered);
  const routes = buildToolRoutes(
    projection.toolDefs,
    new Set(['connection_status', 'get_connect_link', 'toolkit_info'])
  );

  assert.deepEqual(
    routes.map((route) => route.toolName),
    ['google_search_console_list_sites', 'google_search_console_search_analytics_query']
  );
});

test('denied direct invocation returns Unknown tool without upstream execution', async () => {
  const projection = projectToolkitTools('google_search_console', discovered);
  const routes = buildToolRoutes(projection.toolDefs, new Set());
  let upstreamExecutions = 0;

  const dispatch = await dispatchToolRoute(
    routes,
    'google_search_console_submit_sitemap',
    async () => {
      upstreamExecutions += 1;
      return { success: true };
    }
  );

  assert.deepEqual(dispatch, {
    matched: false,
    message: 'Unknown tool "google_search_console_submit_sitemap".'
  });
  assert.equal(upstreamExecutions, 0);
});
