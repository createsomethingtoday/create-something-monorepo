import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../src/index.ts';
import type { Env } from '../src/types.ts';
import { inspectMeetingRecordings } from '../src/zoom.ts';

function mockDb(): D1Database {
  return {
    prepare() {
      return {
        bind() {
          return this;
        },
        async run() {
          return { success: true, meta: {} };
        },
      };
    },
  } as unknown as D1Database;
}

test('recording inspection uses the scheduler GET path and keeps non-transcript occurrences visible', async (t) => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string }> = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, method: init?.method ?? 'GET' });

    if (url.startsWith('https://zoom.us/oauth/token?')) {
      return Response.json({ access_token: 'test-access-token' });
    }

    if (url.startsWith('https://api.zoom.us/v2/accounts/me/recordings?')) {
      return Response.json({
        meetings: [
          {
            id: 87210304877,
            uuid: 'target-occurrence',
            topic: 'Leah recurring meeting',
            start_time: '2026-09-01T15:00:00Z',
            recording_count: 2,
            recording_files: [
              {
                id: 'video-file',
                file_type: 'MP4',
                file_extension: 'MP4',
                recording_type: 'shared_screen_with_speaker_view',
                status: 'completed',
                download_url: 'https://zoom.us/secret-video-download',
              },
              {
                id: 'chat-file',
                file_type: 'CHAT',
                file_extension: 'TXT',
                recording_type: 'chat_file',
                status: 'completed',
                download_url: 'https://zoom.us/secret-chat-download',
              },
            ],
          },
          {
            id: 11111111111,
            uuid: 'other-occurrence',
            topic: 'Other meeting',
            start_time: '2026-09-02T15:00:00Z',
            recording_files: [],
          },
        ],
        next_page_token: '',
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await inspectMeetingRecordings(
    {
      ZOOM_ACCOUNT_ID: 'account-id',
      ZOOM_CLIENT_ID: 'client-id',
      ZOOM_CLIENT_SECRET: 'client-secret',
      ZOOM_PAGE_SIZE: '100',
    } as Env,
    '87210304877',
    { from: '2026-08-30', to: '2026-09-03' },
  );

  assert.equal(requests[1]?.method, 'GET');
  assert.match(requests[1]?.url ?? '', /\/accounts\/me\/recordings\?/);
  assert.equal(result.meetingsScanned, 2);
  assert.equal(result.occurrences.length, 1);
  assert.equal(result.occurrences[0]?.meetingId, '87210304877');
  assert.equal(result.occurrences[0]?.transcriptFileCount, 0);
  assert.deepEqual(
    result.occurrences[0]?.recordingFiles.map((file) => file.fileType),
    ['MP4', 'CHAT'],
  );
  assert.equal(JSON.stringify(result).includes('secret-video-download'), false);
  assert.equal(JSON.stringify(result).includes('test-access-token'), false);
});

test('GET recording inspection requires the sync key and returns sanitized metadata', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.startsWith('https://zoom.us/oauth/token?')) {
      return Response.json({ access_token: 'test-access-token' });
    }
    if (url.startsWith('https://api.zoom.us/v2/accounts/me/recordings?')) {
      return Response.json({
        meetings: [{
          id: 87210304877,
          uuid: 'target-occurrence',
          topic: 'Leah recurring meeting',
          start_time: '2026-09-01T15:00:00Z',
          recording_files: [{
            id: 'video-file',
            file_type: 'MP4',
            download_url: 'https://zoom.us/secret-video-download',
          }],
        }],
        next_page_token: '',
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const env = {
    DB: mockDb(),
    SYNC_API_KEY: 'sync-key',
    ZOOM_ACCOUNT_ID: 'account-id',
    ZOOM_CLIENT_ID: 'client-id',
    ZOOM_CLIENT_SECRET: 'client-secret',
  } as Env;
  const executionContext = {} as ExecutionContext;

  const unauthorized = await worker.fetch(
    new Request('https://worker.example/recordings/87210304877?from=2026-08-30&to=2026-09-03'),
    env,
    executionContext,
  );
  assert.equal(unauthorized.status, 401);

  const response = await worker.fetch(
    new Request('https://worker.example/recordings/87210304877?from=2026-08-30&to=2026-09-03', {
      headers: { Authorization: 'Bearer sync-key' },
    }),
    env,
    executionContext,
  );
  const body = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(JSON.stringify(body).includes('secret-video-download'), false);
  assert.equal(JSON.stringify(body).includes('test-access-token'), false);
});

test('recording inspection rejects ranges wider than Zoom supports', async () => {
  await assert.rejects(
    inspectMeetingRecordings(
      {
        ZOOM_ACCOUNT_ID: 'account-id',
        ZOOM_CLIENT_ID: 'client-id',
        ZOOM_CLIENT_SECRET: 'client-secret',
      } as Env,
      '87210304877',
      { from: '2026-07-01', to: '2026-09-03' },
    ),
    /at most 30 days apart/,
  );
});
