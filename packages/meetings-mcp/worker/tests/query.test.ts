import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampInt,
  makeSnippet,
  normalizeFtsQuery,
  shapeMeetingRow,
  tokenizeQueryTerms,
  type MeetingRow,
} from '../lib/query.js';

test('clampInt enforces bounds and defaults', () => {
  assert.equal(clampInt(undefined, 20, 1, 100), 20);
  assert.equal(clampInt(999, 20, 1, 100), 100);
  assert.equal(clampInt(-5, 20, 1, 100), 1);
});

test('normalizeFtsQuery strips punctuation and quotes terms', () => {
  const normalized = normalizeFtsQuery('  budget, timeline!  ');
  assert.equal(normalized, '"budget" "timeline"');
});

test('normalizeFtsQuery rejects empty input', () => {
  assert.throws(() => normalizeFtsQuery('   $$$   '));
});

test('tokenizeQueryTerms extracts bounded searchable tokens', () => {
  const tokens = tokenizeQueryTerms(' alpha  beta "gamma" ');
  assert.deepEqual(tokens, ['alpha', 'beta', 'gamma']);
});

test('makeSnippet returns bounded excerpt around query term', () => {
  const snippet = makeSnippet(
    'alpha beta gamma delta epsilon zeta eta theta iota',
    'delta',
    20,
  );

  assert.ok(snippet.includes('delta'));
  assert.ok(snippet.length <= 26);
});

test('shapeMeetingRow parses arrays and truncates transcript', () => {
  const row: MeetingRow = {
    id: 'm_1',
    recorded_at: '2026-02-19T10:00:00.000Z',
    duration_seconds: 120,
    processed_at: '2026-02-19T10:05:00.000Z',
    title: 'Weekly Sync',
    transcript: 'abcdefghij',
    summary: 'Summary',
    action_items: '["ship feature"]',
    topics: '["roadmap"]',
    participants: '["Micah"]',
    project_id: 'p_1',
    property: 'agency',
    tags: '["client"]',
    audio_key: '2026-02-19/m_1.m4a',
    audio_size_bytes: 123,
    audio_format: 'm4a',
    status: 'completed',
    error_message: null,
    created_at: '2026-02-19T10:00:00.000Z',
    updated_at: '2026-02-19T10:05:00.000Z',
  };

  const shaped = shapeMeetingRow(row, { includeTranscript: true, maxTranscriptChars: 5 }) as {
    transcript: string | null;
    transcript_truncated: boolean;
    action_items: string[];
  };

  assert.equal(shaped.transcript, 'abcde');
  assert.equal(shaped.transcript_truncated, true);
  assert.deepEqual(shaped.action_items, ['ship feature']);
});
