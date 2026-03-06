import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ComposioNotionDispatcher,
  resolveRouteForAction,
  type ComposioNotionClientLike,
  type PinnedNotionAction,
} from './composio-notion.js';
import type { ComposioToolDef } from '@create-something/composio-bridge';

function makeTool(
  slug: string,
  name: string,
  description: string,
  params: Record<string, unknown>,
): ComposioToolDef {
  return {
    slug,
    name,
    description,
    app: 'notion',
    parameters: {
      type: 'object',
      properties: params,
    },
  };
}

const sampleTools: ComposioToolDef[] = [
  makeTool('NOTION_SEARCH', 'Search', 'Search pages and data sources', { query: { type: 'string' } }),
  makeTool('NOTION_LIST_DATABASES', 'List databases', 'List database records', { page_size: { type: 'number' } }),
  makeTool('NOTION_GET_DATABASE', 'Get database', 'Retrieve database schema', { database_id: { type: 'string' } }),
  makeTool('NOTION_QUERY_DATABASE', 'Query database', 'Query database rows', { database_id: { type: 'string' }, filter: { type: 'object' } }),
  makeTool('NOTION_GET_PAGE', 'Get page', 'Retrieve page', { page_id: { type: 'string' } }),
  makeTool('NOTION_LIST_BLOCK_CHILDREN', 'List block children', 'List children blocks', { block_id: { type: 'string' } }),
  makeTool('NOTION_CREATE_PAGE', 'Create page', 'Create page in a database', { database_id: { type: 'string' }, properties: { type: 'object' } }),
  makeTool('NOTION_UPDATE_PAGE', 'Update page', 'Update page properties', { page_id: { type: 'string' }, properties: { type: 'object' } }),
  makeTool('NOTION_APPEND_BLOCKS', 'Append blocks', 'Append children blocks to page', { block_id: { type: 'string' }, children: { type: 'array' } }),
  makeTool('NOTION_ARCHIVE_PAGE', 'Archive page', 'Archive page', { page_id: { type: 'string' } }),
];

test('resolveRouteForAction finds expected route for each pinned action', () => {
  const expected: Array<[PinnedNotionAction, string]> = [
    ['search', 'NOTION_SEARCH'],
    ['list_databases', 'NOTION_LIST_DATABASES'],
    ['get_database', 'NOTION_GET_DATABASE'],
    ['query_database', 'NOTION_QUERY_DATABASE'],
    ['get_page', 'NOTION_GET_PAGE'],
    ['list_block_children', 'NOTION_LIST_BLOCK_CHILDREN'],
    ['create_page', 'NOTION_CREATE_PAGE'],
    ['update_page', 'NOTION_UPDATE_PAGE'],
    ['append_blocks', 'NOTION_APPEND_BLOCKS'],
    ['archive_page', 'NOTION_ARCHIVE_PAGE'],
    ['bulk_update', 'NOTION_UPDATE_PAGE'],
    ['bulk_archive', 'NOTION_ARCHIVE_PAGE'],
  ];

  for (const [action, slug] of expected) {
    const route = resolveRouteForAction(action, sampleTools);
    assert.ok(route, `expected route for ${action}`);
    assert.equal(route?.slug, slug);
  }
});

test('dispatcher strips control args and adapts ids', async () => {
  const executions: Array<{ slug: string; args: Record<string, unknown>; userId?: string }> = [];
  const fakeClient: ComposioNotionClientLike = {
    async getTools() {
      return sampleTools;
    },
    async executeTool(slug, args, userId) {
      executions.push({ slug, args, userId });
      return { ok: true };
    },
  };

  const dispatcher = new ComposioNotionDispatcher('ignored', fakeClient);
  await dispatcher.execute(
    'create_page',
    {
      workspace: 'client',
      entity_id: 'bad',
      account_id: 'bad',
      data_source_id: 'ds_123',
      properties: { Name: 'Test' },
    },
    'user_1',
  );

  assert.equal(executions.length, 1);
  assert.equal(executions[0]?.slug, 'NOTION_CREATE_PAGE');
  assert.equal(executions[0]?.userId, 'user_1');
  assert.equal(executions[0]?.args.workspace, undefined);
  assert.equal(executions[0]?.args.entity_id, undefined);
  assert.equal(executions[0]?.args.account_id, undefined);
  assert.equal(executions[0]?.args.database_id, 'ds_123');
});

test('bulk actions fan out per page id', async () => {
  const executions: Array<{ slug: string; args: Record<string, unknown>; userId?: string }> = [];
  const fakeClient: ComposioNotionClientLike = {
    async getTools() {
      return sampleTools;
    },
    async executeTool(slug, args, userId) {
      executions.push({ slug, args, userId });
      return { ok: true };
    },
  };

  const dispatcher = new ComposioNotionDispatcher('ignored', fakeClient);
  const updateResult = await dispatcher.execute(
    'bulk_update',
    { page_ids: ['p1', 'p2'], properties: { Status: 'Done' } },
    'user_2',
  );
  assert.equal(Array.isArray(updateResult.results), true);
  assert.equal(executions.length, 2);
  assert.equal(executions[0]?.slug, 'NOTION_UPDATE_PAGE');
  assert.equal(executions[1]?.slug, 'NOTION_UPDATE_PAGE');

  executions.length = 0;
  const archiveResult = await dispatcher.execute(
    'bulk_archive',
    { page_ids: ['p1', 'p2', 'p3'] },
    'user_3',
  );
  assert.equal(Array.isArray(archiveResult.results), true);
  assert.equal(executions.length, 3);
  assert.equal(executions[0]?.slug, 'NOTION_ARCHIVE_PAGE');
});
