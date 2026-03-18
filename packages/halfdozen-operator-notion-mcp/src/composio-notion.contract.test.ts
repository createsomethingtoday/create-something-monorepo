import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildComparablePropertyValue,
  buildWritablePropertiesPayload,
  buildWritablePropertyValue,
  ComposioNotionDispatcher,
  isSupportedSyncFieldType,
  normalizeDataSourceSchemaPayload,
  normalizeListDataSourcesPayload,
  normalizePageSnapshot,
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

test('normalize list data source payload handles search result format', () => {
  const payload = {
    results: [
      {
        object: 'data_source',
        id: 'ds_1',
        title: [{ plain_text: 'Half Dozen' }],
        url: 'https://example.com/ds_1',
      },
      {
        object: 'page',
        id: 'pg_ignored',
      },
    ],
    has_more: true,
    next_cursor: 'cursor_2',
  };

  const normalized = normalizeListDataSourcesPayload(payload);
  assert.equal(normalized.data_sources.length, 1);
  assert.equal(normalized.data_sources[0]?.id, 'ds_1');
  assert.equal(normalized.data_sources[0]?.title, 'Half Dozen');
  assert.equal(normalized.has_more, true);
  assert.equal(normalized.next_cursor, 'cursor_2');
});

test('normalize data source schema marks supported types', () => {
  const payload = {
    id: 'ds_9',
    title: [{ plain_text: 'CRM' }],
    properties: {
      Name: { id: 't1', type: 'title', title: {} },
      Status: { id: 's1', type: 'status', status: {} },
      FormulaThing: { id: 'f1', type: 'formula', formula: {} },
    },
  };

  const schema = normalizeDataSourceSchemaPayload(payload);
  assert.equal(schema.dataSourceId, 'ds_9');
  assert.equal(schema.properties.Name?.supported, true);
  assert.equal(schema.properties.Status?.supported, true);
  assert.equal(schema.properties.FormulaThing?.supported, false);
});

test('page snapshot normalization reads archive state', () => {
  const snapshot = normalizePageSnapshot({
    page: {
      id: 'p_1',
      in_trash: true,
      last_edited_time: '2026-03-16T10:00:00.000Z',
      properties: {
        Name: { title: [{ plain_text: 'Alpha' }] },
      },
    },
  });

  assert.equal(snapshot.id, 'p_1');
  assert.equal(snapshot.archived, true);
  assert.equal(snapshot.lastEditedTime, '2026-03-16T10:00:00.000Z');
});

test('comparable and writable property conversion is deterministic for supported types', () => {
  assert.equal(isSupportedSyncFieldType('title'), true);
  assert.equal(isSupportedSyncFieldType('relation'), false);

  const titleComparable = buildComparablePropertyValue('title', {
    title: [{ plain_text: 'Long'.repeat(800) }],
  });
  assert.equal(typeof titleComparable, 'string');

  const titleWritable = buildWritablePropertyValue('title', titleComparable);
  assert.equal(Array.isArray(titleWritable.title), true);
  assert.equal((titleWritable.title as unknown[]).length > 1, true);

  const multiComparable = buildComparablePropertyValue('multi_select', {
    multi_select: [{ name: 'B' }, { name: 'A' }, { name: 'A' }],
  });
  assert.deepEqual(multiComparable, ['A', 'B']);

  const multiWritable = buildWritablePropertyValue('multi_select', multiComparable);
  assert.deepEqual(multiWritable, {
    multi_select: [{ name: 'A' }, { name: 'B' }],
  });

  const dateComparable = buildComparablePropertyValue('date', {
    date: { start: '2026-03-17', end: null, time_zone: null },
  });
  assert.deepEqual(dateComparable, { start: '2026-03-17', end: null, time_zone: null });
  assert.deepEqual(buildWritablePropertyValue('date', dateComparable), {
    date: { start: '2026-03-17' },
  });
});

test('dispatcher helper methods call notion actions and normalize output', async () => {
  const executions: Array<{ slug: string; args: Record<string, unknown>; userId?: string }> = [];
  const fakeClient: ComposioNotionClientLike = {
    async getTools() {
      return sampleTools;
    },
    async executeTool(slug, args, userId) {
      executions.push({ slug, args, userId });
      if (slug === 'NOTION_LIST_DATABASES') {
        return {
          data: {
            results: [{ object: 'data_source', id: 'ds_alpha', title: [{ plain_text: 'Alpha DS' }] }],
            has_more: false,
            next_cursor: null,
          },
        };
      }
      if (slug === 'NOTION_GET_DATABASE') {
        return {
          result: {
            id: 'ds_alpha',
            title: [{ plain_text: 'Alpha DS' }],
            properties: {
              Name: { id: 'name', type: 'title', title: {} },
            },
          },
        };
      }
      if (slug === 'NOTION_QUERY_DATABASE') {
        return {
          results: [
            {
              id: 'page_1',
              archived: false,
              properties: { Name: { title: [{ plain_text: 'A' }] } },
            },
          ],
          has_more: false,
          next_cursor: null,
        };
      }
      if (slug === 'NOTION_CREATE_PAGE') {
        return { id: 'page_created' };
      }
      if (slug === 'NOTION_UPDATE_PAGE') {
        return { id: 'page_updated' };
      }
      if (slug === 'NOTION_ARCHIVE_PAGE') {
        return { id: 'page_archived', archived: true };
      }
      if (slug === 'NOTION_GET_PAGE') {
        return {
          id: 'page_1',
          archived: false,
          properties: { Name: { title: [{ plain_text: 'A' }] } },
        };
      }
      return { ok: true };
    },
  };

  const dispatcher = new ComposioNotionDispatcher('ignored', fakeClient);
  const listed = await dispatcher.listDataSources('sync_user');
  assert.equal(listed.data_sources[0]?.id, 'ds_alpha');

  const schema = await dispatcher.getDataSourceSchema('sync_user', 'ds_alpha');
  assert.equal(schema.dataSourceId, 'ds_alpha');
  assert.equal(schema.properties.Name?.type, 'title');

  const queried = await dispatcher.queryDataSourcePages('sync_user', 'ds_alpha');
  assert.equal(queried.results.length, 1);
  assert.equal(queried.results[0]?.id, 'page_1');

  const fetched = await dispatcher.getPage('sync_user', 'page_1');
  assert.equal(fetched.id, 'page_1');

  const created = await dispatcher.createPage('sync_user', 'ds_alpha', {
    Name: { title: [{ text: { content: 'New' } }] },
  });
  assert.equal(created.id, 'page_created');

  const updated = await dispatcher.updatePage('sync_user', 'page_1', {
    Name: { title: [{ text: { content: 'Updated' } }] },
  });
  assert.equal(updated.id, 'page_updated');

  const archived = await dispatcher.archivePage('sync_user', 'page_1');
  assert.equal(archived.id, 'page_archived');
  assert.equal(archived.archived, true);

  const writePayload = buildWritablePropertiesPayload([
    { field: 'Name', type: 'title', value: 'Example' },
    { field: 'Status', type: 'status', value: 'Done' },
  ]);
  assert.deepEqual(writePayload, {
    Name: { title: [{ type: 'text', text: { content: 'Example' } }] },
    Status: { status: { name: 'Done' } },
  });
});
