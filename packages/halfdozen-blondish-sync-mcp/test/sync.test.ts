import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTicketTitle,
  mapHdStatusToOsStatus,
  normalizeFileUrl,
  readText,
  resolveTargetPages,
  syncHalfDozenStatusToSource,
  targetExtPageIdProperty,
} from '../src/sync.js';
import type { Env, NotionPage } from '../src/types.js';

const targetDataSourceId = '2a101918-7ac5-8074-bf06-000b97592481';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('buildTicketTitle mirrors source title exactly', () => {
  assert.equal(
    buildTicketTitle('i need a way to have an agent monitor my whatsapp threads'),
    'i need a way to have an agent monitor my whatsapp threads',
  );
  assert.equal(buildTicketTitle('Create Database for all Merch + data & sales'), 'Create Database for all Merch + data & sales');
  assert.equal(buildTicketTitle('  '), 'BLONDISH support ticket');
  assert.equal(buildTicketTitle('  ', 'Lightswitch'), 'Lightswitch support ticket');
});

test('mapHdStatusToOsStatus maps only approved reverse statuses', () => {
  assert.equal(mapHdStatusToOsStatus('Assigned'), 'Under Review');
  assert.equal(mapHdStatusToOsStatus('In Progress'), 'In Progress');
  assert.equal(mapHdStatusToOsStatus('Client Action'), 'Action Required');
  assert.equal(mapHdStatusToOsStatus('Complete'), 'Complete');
  assert.equal(mapHdStatusToOsStatus('Archive'), 'Archive');
  assert.equal(mapHdStatusToOsStatus('Roadblock'), 'Roadblock');
  assert.equal(mapHdStatusToOsStatus('Not Started'), null);
  assert.equal(mapHdStatusToOsStatus('Backburner'), null);
});

test('reverse sync applies a client status-map override before writing', async (t) => {
  const sourceDataSourceId = '65f01384-61f7-824d-a699-076d37f9c91c';
  const sourcePageId = '34101384-1111-2222-3333-444444444444';
  const targetPageId = '2a101384-aaaa-bbbb-cccc-000b97592481';
  const sourcePage: NotionPage = {
    id: sourcePageId,
    parent: { data_source_id: sourceDataSourceId },
    properties: {
      'Page ID': { type: 'unique_id', unique_id: { prefix: 'ST-ISH', number: 9 } },
      Status: { type: 'status', status: { name: 'In Progress' } },
    },
  };
  const targetPage: NotionPage = {
    id: targetPageId,
    parent: { data_source_id: targetDataSourceId },
    properties: {
      'External Page ID': { type: 'rich_text', rich_text: [{ plain_text: 'ST-ISH-9' }] },
      Status: { type: 'status', status: { name: 'Complete' } },
    },
  };
  const writes: unknown[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith(`/data_sources/${sourceDataSourceId}`)) {
      return jsonResponse({
        properties: {
          Status: { type: 'status', status: { options: [{ name: 'Completed' }] } },
        },
      });
    }
    if (url.endsWith(`/data_sources/${targetDataSourceId}`)) {
      return jsonResponse({
        properties: {
          Status: { type: 'status' },
          'External Page ID': { type: 'rich_text' },
        },
      });
    }
    if (url.endsWith(`/data_sources/${sourceDataSourceId}/query`)) {
      return jsonResponse({ results: [sourcePage], has_more: false });
    }
    if (url.endsWith(`/data_sources/${targetDataSourceId}/query`)) {
      return jsonResponse({ results: [targetPage], has_more: false });
    }
    if (url.endsWith(`/pages/${sourcePageId}`) && init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as { properties?: unknown };
      writes.push(body.properties);
      const statusName = (body as { properties?: { Status?: { status?: { name?: string } } } })
        .properties?.Status?.status?.name;
      return statusName === 'Completed'
        ? jsonResponse(sourcePage)
        : jsonResponse({ message: `Status option ${statusName} does not exist` }, 400);
    }
    return jsonResponse({ message: `Unexpected request: ${url}` }, 500);
  });

  const result = await syncHalfDozenStatusToSource({
    CLIENT_NOTION_API_KEY: 'client-token',
    HALFDOZEN_NOTION_API_KEY: 'hd-token',
    CLIENT_SUPPORT_TICKETS_DATA_SOURCE_ID: sourceDataSourceId,
    HALFDOZEN_TICKETS_DATA_SOURCE_ID: targetDataSourceId,
    CLIENT_OS_STATUS_PROPERTY: 'Status',
    CLIENT_OS_STATUS_MAP: '{"Complete":"Completed"}',
  } as Env, { targetPageIds: [sourcePageId] });

  assert.equal(result.ok, true);
  assert.equal(result.updated, 1);
  assert.deepEqual(writes, [{ Status: { status: { name: 'Completed' } } }]);
});

test('targetExtPageIdProperty prefers External Page ID when both aliases exist', () => {
  assert.equal(targetExtPageIdProperty({ 'External Page ID': { type: 'rich_text' }, 'Ext Page ID': { type: 'rich_text' } }), 'External Page ID');
  assert.equal(targetExtPageIdProperty({ 'Ext Page ID': { type: 'rich_text' } }), 'Ext Page ID');
  assert.equal(targetExtPageIdProperty({ Ticket: { type: 'title' } }), null);
});

test('normalizeFileUrl drops unstable signed URL params', () => {
  assert.equal(
    normalizeFileUrl('https://example.com/file.pdf?X-Amz-Signature=abc&x-id=GetObject&stable=1'),
    'https://example.com/file.pdf?stable=1',
  );
});

test('readText handles Notion unique id, title, status, people, and files', () => {
  const page: NotionPage = {
    id: 'page-a',
    properties: {
      Ticket: { type: 'title', title: [{ plain_text: 'Ticket title' }] },
      Status: { type: 'status', status: { name: 'Assigned' } },
      'Page ID': { type: 'unique_id', unique_id: { prefix: 'ST-ISH', number: 25 } },
      Owner: { type: 'people', people: [{ name: 'FG', person: { email: 'fillip@halfdozen.co' } }] },
      Files: { type: 'files', files: [{ name: 'brief.pdf', external: { url: 'https://example.com/brief.pdf' } }] },
    },
  };

  assert.equal(readText(page, 'Ticket'), 'Ticket title');
  assert.equal(readText(page, 'Status'), 'Assigned');
  assert.equal(readText(page, 'Page ID'), 'ST-ISH-25');
  assert.equal(readText(page, 'Owner'), 'FG (fillip@halfdozen.co)');
  assert.equal(readText(page, 'Files'), 'brief.pdf');
});

test('resolveTargetPages accepts the source Page ID surfaced by an audit', async (t) => {
  const targetPage: NotionPage = {
    id: '2a101384-aaaa-bbbb-cccc-000b97592481',
    parent: { data_source_id: targetDataSourceId },
    properties: {
      'External Page ID': {
        type: 'rich_text',
        rich_text: [{ plain_text: 'ST-ISH-9' }],
      },
    },
  };
  const requests: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith(`/data_sources/${targetDataSourceId}/query`)) {
      return jsonResponse({ results: [targetPage], has_more: false });
    }
    return jsonResponse({ message: 'path failed validation: path.page_id should be a valid uuid' }, 400);
  });

  const pages = await resolveTargetPages(
    { HALFDOZEN_NOTION_API_KEY: 'hd-token' } as Env,
    targetDataSourceId,
    'External Page ID',
    ['ST-ISH-9'],
  );

  assert.deepEqual(pages.map((page) => page.id), [targetPage.id]);
  assert.deepEqual(requests, [`https://api.notion.com/v1/data_sources/${targetDataSourceId}/query`]);
});

test('resolveTargetPages accepts the source_page_id UUID surfaced by an audit', async (t) => {
  const sourcePage: NotionPage = {
    id: '34101384-1111-2222-3333-444444444444',
    properties: {
      'Page ID': { type: 'unique_id', unique_id: { prefix: 'ST-ISH', number: 9 } },
    },
  };
  const targetPage: NotionPage = {
    id: '2a101384-aaaa-bbbb-cccc-000b97592481',
    parent: { data_source_id: targetDataSourceId },
    properties: {
      'External Page ID': { type: 'rich_text', rich_text: [{ plain_text: 'ST-ISH-9' }] },
    },
  };
  const requests: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith(`/data_sources/${targetDataSourceId}/query`)) {
      return jsonResponse({ results: [targetPage], has_more: false });
    }
    return jsonResponse({ message: 'unexpected direct page lookup' }, 500);
  });

  const pages = await resolveTargetPages(
    { HALFDOZEN_NOTION_API_KEY: 'hd-token' } as Env,
    targetDataSourceId,
    'External Page ID',
    [sourcePage.id],
    [sourcePage],
  );

  assert.deepEqual(pages.map((page) => page.id), [targetPage.id]);
  assert.deepEqual(requests, [`https://api.notion.com/v1/data_sources/${targetDataSourceId}/query`]);
});
