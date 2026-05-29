import assert from 'node:assert/strict';
import test from 'node:test';

import { notionTestExports } from '../src/notion.ts';
import type { NotionPageSummary, TranscriptCandidate } from '../src/types.ts';
import { zoomTestExports } from '../src/zoom.ts';

const recurringSourceUrl = 'https://us06web.zoom.us/recording/management/detail?meeting_id=81386112202';

function page(id: string, title: string, date: string, sourceUrl: string | null) {
  return {
    id,
    url: `https://www.notion.so/${id}`,
    properties: {
      Item: {
        title: [{ plain_text: title }],
      },
      Date: {
        date: { start: date },
      },
      'Source URL': {
        url: sourceUrl,
      },
    },
  };
}

function candidate(patch: Partial<TranscriptCandidate> = {}): TranscriptCandidate {
  return {
    dedupKey: 'zoom-meeting-uuid:occurrence-a::transcript-a',
    canonicalMeetingKey: 'zoom-meeting-uuid:occurrence-a',
    meetingId: '81386112202',
    meetingUuid: 'occurrence-a',
    meetingTitle: 'HD Weekly Internal Ops',
    meetingDate: '2026-05-13',
    startTime: '2026-05-13T14:00:00Z',
    sourceUrl: `${recurringSourceUrl}#occurrence=occurrence-a`,
    originalSourceUrl: 'https://us06web.zoom.us/rec/download/transcript-a',
    transcriptDownloadUrl: 'https://us06web.zoom.us/rec/download/transcript-a',
    transcriptFileId: 'transcript-a',
    transcriptFileType: 'TRANSCRIPT',
    transcriptFileExtension: 'vtt',
    hostId: 'host-a',
    ...patch,
  };
}

test('source URL matching does not collapse recurring meetings across dates', () => {
  const match = notionTestExports.pickSourceUrlMatch(
    [
      page('last-week', 'HD Weekly Internal Ops', '2026-05-06', recurringSourceUrl),
      page('this-week', 'HD Weekly Internal Ops', '2026-05-13', recurringSourceUrl),
    ],
    candidate({ sourceUrl: recurringSourceUrl }),
  );

  assert.equal(match?.id, 'this-week');
});

test('source URL matching rejects a same-series page from a different date', () => {
  const match = notionTestExports.pickSourceUrlMatch(
    [page('last-week', 'HD Weekly Internal Ops', '2026-05-06', recurringSourceUrl)],
    candidate({ sourceUrl: recurringSourceUrl }),
  );

  assert.equal(match, null);
});

test('title and date fallback does not reuse a broad recurring Source URL for an occurrence-aware candidate', () => {
  const match = notionTestExports.pickTitleDateMatch(
    [page('possibly-corrupted', 'HD Weekly Internal Ops', '2026-05-13', recurringSourceUrl)],
    candidate(),
  );

  assert.equal(match, null);
});

test('D1 page hints must resolve to the same meeting title and date', () => {
  const staleHint: NotionPageSummary = {
    id: 'last-week',
    url: 'https://www.notion.so/last-week',
    title: 'HD Weekly Internal Ops',
    sourceUrl: recurringSourceUrl,
    date: '2026-05-06',
  };

  assert.equal(notionTestExports.isMatchingMeetingPageHint(staleHint, candidate()), false);
  assert.equal(
    notionTestExports.isMatchingMeetingPageHint({ ...staleHint, date: '2026-05-13' }, candidate()),
    true,
  );
});

test('canonical meeting key uses the Zoom occurrence UUID before reusable meeting ID', () => {
  const first = zoomTestExports.buildCanonicalMeetingKey({
    meetingId: '81386112202',
    meetingUuid: 'occurrence-a',
    meetingTitle: 'HD Weekly Internal Ops',
    meetingDate: '2026-05-13',
    startTime: '2026-05-13T14:00:00Z',
  });
  const second = zoomTestExports.buildCanonicalMeetingKey({
    meetingId: '81386112202',
    meetingUuid: 'occurrence-b',
    meetingTitle: 'HD Weekly Internal Ops',
    meetingDate: '2026-05-20',
    startTime: '2026-05-20T14:00:00Z',
  });

  assert.equal(first, 'zoom-meeting-uuid:occurrence-a');
  assert.equal(second, 'zoom-meeting-uuid:occurrence-b');
  assert.notEqual(first, second);
});

test('canonical meeting key falls back to start time when only reusable meeting ID is available', () => {
  const first = zoomTestExports.buildCanonicalMeetingKey({
    meetingId: '81386112202',
    meetingUuid: null,
    meetingTitle: 'HD Weekly Internal Ops',
    meetingDate: '2026-05-13',
    startTime: '2026-05-13T14:00:00Z',
  });
  const second = zoomTestExports.buildCanonicalMeetingKey({
    meetingId: '81386112202',
    meetingUuid: null,
    meetingTitle: 'HD Weekly Internal Ops',
    meetingDate: '2026-05-20',
    startTime: '2026-05-20T14:00:00Z',
  });

  assert.equal(first, 'zoom-meeting:81386112202:2026-05-13T14%3A00%3A00Z');
  assert.equal(second, 'zoom-meeting:81386112202:2026-05-20T14%3A00%3A00Z');
  assert.notEqual(first, second);
});

test('canonical source URL carries an occurrence fragment for Notion exact matching', () => {
  const first = zoomTestExports.buildCanonicalMeetingSourceUrl(
    '81386112202',
    'https://us06web.zoom.us/rec/download/transcript-a',
    'occurrence-a',
  );
  const second = zoomTestExports.buildCanonicalMeetingSourceUrl(
    '81386112202',
    'https://us06web.zoom.us/rec/download/transcript-b',
    'occurrence-b',
  );

  assert.equal(first, `${recurringSourceUrl}#occurrence=occurrence-a`);
  assert.equal(second, `${recurringSourceUrl}#occurrence=occurrence-b`);
  assert.notEqual(first, second);
});
