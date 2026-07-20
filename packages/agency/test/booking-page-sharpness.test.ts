import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';
import { schedulerPage } from '../../../apps/create-something-scheduler/src/ui/page.ts';

const routeSource = 'packages/agency/src/routes/book/+page.svelte';
const route = readFileSync(new URL('../src/routes/book/+page.svelte', import.meta.url), 'utf8');
const scheduler = schedulerPage({ nonce: 'sharpness-test' });
const schedulerBody = scheduler.slice(
  scheduler.indexOf('<body'),
  scheduler.indexOf('<script nonce="sharpness-test">')
);

test('registers booking as its own migrated tool contract', () => {
  const cohort = performancePageRegistry.find(
    (candidate) => candidate.id === 'agency-booking-tool'
  );
  assert.equal(cohort?.status, 'migrated');
  assert.equal(cohort?.contract?.archetype, 'tool');
  assert.deepEqual(cohort?.sources, [routeSource]);
  assert.match(cohort?.contract?.decision ?? '', /choose.+time/i);
  assert.match(cohort?.contract?.primaryProof.description ?? '', /calendar.+meet.+receipt/i);
  assert.match(cohort?.contract?.handoff.action ?? '', /choose.+time/i);

  const pendingTools = performancePageRegistry.find(
    (candidate) => candidate.id === 'agency-public-tools'
  );
  assert.equal(pendingTools?.sources.includes(routeSource), false);
});

test('puts one plain booking action before the scheduler without a second task spine', () => {
  assert.doesNotMatch(route, /<main\b/);
  assert.doesNotMatch(route, /PerformanceConversionHandoff/);
  assert.equal((route.match(/<h1\b/g) ?? []).length, 1);
  assert.match(route, /<h1[^>]*>[\s\S]*?(choose|book)[\s\S]*?time[\s\S]*?<\/h1>/i);
  assert.match(route, /\b(you|your)\b/i);
  assert.match(route, /\b(choose|pick)\b/i);
  assert.match(route, /calendar event/i);
  assert.match(route, /Google Meet/i);
  assert.match(route, /booking receipt/i);
  assert.doesNotMatch(
    route,
    /build decision|owned scheduler|controlled path|decision owner|audit trail|conflict-checked scheduling policy|commit with explicit intent/i
  );
  assert.equal((route.match(/Time[\s\S]*Details[\s\S]*Confirm/g) ?? []).length, 0);
});

test('renders the iframe only after hydration and gives disabled JavaScript an honest recovery', () => {
  assert.match(route, /let javascriptReady = false/);
  assert.match(route, /\{#if javascriptReady\}[\s\S]*<iframe/);
  assert.match(route, /normalizeSchedulerHeightMessage/);
  assert.match(route, /style:height=/);
  assert.match(route, /<noscript>[\s\S]*JavaScript[\s\S]*href="\/contact"/i);
  assert.match(route, /contact[\s\S]*arrange a time/i);
  assert.match(route, /open the scheduler in a new tab/i);
});

test('keeps the scheduler task spine but removes its report-like chrome and vocabulary', () => {
  assert.equal((schedulerBody.match(/<main\b/g) ?? []).length, 1);
  assert.match(schedulerBody, /<h1>Choose a time<\/h1>/);
  assert.equal((schedulerBody.match(/01 · Time/g) ?? []).length, 1);
  assert.equal((schedulerBody.match(/02 · Details/g) ?? []).length, 1);
  assert.equal((schedulerBody.match(/03 · Confirm/g) ?? []).length, 1);
  assert.doesNotMatch(schedulerBody, /system-bar|hero-spec|proof-footer/);
  assert.doesNotMatch(
    schedulerBody,
    /controlled interfaces|workflow mapping \/ v2|decision owner|explicit intent|receipt issued|fail closed/i
  );
  assert.match(schedulerBody, /\b(you|your)\b/i);
  assert.match(schedulerBody, /\b(choose|pick)\b/i);
  assert.match(schedulerBody, /Google Calendar/i);
  assert.match(schedulerBody, /Google Meet/i);
  assert.match(schedulerBody, /receipt/i);
  assert.match(scheduler, /ResizeObserver/);
  assert.match(scheduler, /create-something:scheduler-height/);
});
