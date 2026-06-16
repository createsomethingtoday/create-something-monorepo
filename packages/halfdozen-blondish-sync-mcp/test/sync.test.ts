import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTicketTitle,
  mapHdStatusToOsStatus,
  normalizeFileUrl,
  readText,
  targetExtPageIdProperty,
} from '../src/sync.js';
import type { NotionPage } from '../src/types.js';

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
