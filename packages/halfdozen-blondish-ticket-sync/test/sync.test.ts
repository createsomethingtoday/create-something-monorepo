import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildConciseTicketSummary,
  extractWebhookPageIds,
  mapHdStatusToOsStatus,
  normalizeFileUrl,
} from '../src/sync.js';

test('buildConciseTicketSummary limits combined title/details to six words', () => {
  assert.equal(
    buildConciseTicketSummary('Need guestlist support today', 'Cannot find the latest RSVP exports'),
    'Need guestlist support today Cannot find',
  );
  assert.equal(
    buildConciseTicketSummary('Create Database for all Merch + data & sales', ''),
    'Create Database for all Merch data',
  );
});

test('mapHdStatusToOsStatus maps only approved reverse statuses', () => {
  assert.equal(mapHdStatusToOsStatus('Assigned'), 'Under Review');
  assert.equal(mapHdStatusToOsStatus('Client Action'), 'Action Required');
  assert.equal(mapHdStatusToOsStatus('Not Started'), null);
});

test('extractWebhookPageIds reads page entity and page block ids', () => {
  assert.deepEqual(
    extractWebhookPageIds({
      type: 'page.properties_updated',
      entity: { id: 'page-a', type: 'page' },
      data: {
        updated_blocks: [
          { id: 'page-b', type: 'child_page' },
          { id: 'block-b', type: 'paragraph' },
        ],
      },
    }),
    ['page-a', 'page-b'],
  );
  assert.deepEqual(
    extractWebhookPageIds({
      type: 'data_source.schema_updated',
      entity: { id: 'source-ds', type: 'data_source' },
      data: { updated_blocks: [{ id: 'block-a', type: 'paragraph' }] },
    }),
    [],
  );
});

test('normalizeFileUrl drops unstable signed URL params', () => {
  assert.equal(
    normalizeFileUrl('https://example.com/file.pdf?X-Amz-Signature=abc&x-id=GetObject&stable=1'),
    'https://example.com/file.pdf?stable=1',
  );
});
