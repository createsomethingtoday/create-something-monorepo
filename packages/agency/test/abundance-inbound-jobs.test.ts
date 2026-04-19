import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeInboundJobDedupeKey,
  normalizeInboundJobInput,
  toInboundJobsCsv
} from '../src/lib/server/abundance-inbound-jobs.ts';
import type { InboundJob } from '../src/lib/types/abundance.ts';

test('normalizeInboundJobInput JSON-encodes string raw payload values', () => {
  const normalized = normalizeInboundJobInput({
    source_agent: ' scout-alpha ',
    title: ' ICU RN ',
    raw_payload: '  source text  '
  });

  assert.equal(normalized.source_agent, 'scout-alpha');
  assert.equal(normalized.title, 'ICU RN');
  assert.equal(JSON.parse(normalized.raw_payload), 'source text');
});

test('computeInboundJobDedupeKey ignores tracking params and query ordering', () => {
  const left = computeInboundJobDedupeKey({
    job_url: 'HTTPS://Example.com/jobs/RN-123?utm_source=meta&b=2&a=1',
    title: 'ignored',
    employer: 'ignored',
    location: 'ignored'
  });
  const right = computeInboundJobDedupeKey({
    job_url: 'https://example.com/jobs/RN-123?a=1&b=2&utm_campaign=spring',
    title: 'ignored',
    employer: 'ignored',
    location: 'ignored'
  });

  assert.equal(left, right);
});

test('computeInboundJobDedupeKey falls back to normalized metadata when no URL exists', () => {
  const left = computeInboundJobDedupeKey({
    external_job_id: ' ABC-123 ',
    title: 'Travel Nurse',
    employer: 'Mercy West',
    location: 'Dallas, TX'
  });
  const right = computeInboundJobDedupeKey({
    external_job_id: 'abc-123',
    title: 'travel nurse',
    employer: 'mercy west',
    location: 'dallas, tx'
  });

  assert.equal(left, right);
});

test('toInboundJobsCsv writes raw string payloads without double JSON encoding', () => {
  const csv = toInboundJobsCsv([
    createInboundJob({
      raw_payload: 'poster, rn'
    })
  ]);

  const row = csv.split('\n')[1] ?? '';
  assert.match(row, /,"poster, rn"$/);
  assert.equal(row.includes('"""poster, rn"""'), false);
});

function createInboundJob(overrides: Partial<InboundJob> = {}): InboundJob {
  return {
    id: 'abj_test',
    source_agent: 'scout-alpha',
    source_agents: ['scout-alpha'],
    source_run_id: null,
    source_system: 'manual',
    external_job_id: null,
    job_url: 'https://example.com/jobs/RN-123',
    employer: 'Mercy West',
    location: 'Dallas, TX',
    title: 'Travel Nurse',
    status: 'new',
    dedupe_key: 'dedupe-key',
    raw_payload: { title: 'Travel Nurse' },
    notes: null,
    seen_count: 1,
    ingested_at: '2026-04-18T00:00:00.000Z',
    last_seen_at: '2026-04-18T00:00:00.000Z',
    reviewed_at: null,
    updated_at: '2026-04-18T00:00:00.000Z',
    ...overrides
  };
}
