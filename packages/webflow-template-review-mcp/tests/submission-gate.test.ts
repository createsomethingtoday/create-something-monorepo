import assert from 'node:assert/strict';
import test from 'node:test';
import { readSubmissionGateStatus } from '../src/submission-gate.js';
import { runPublishedSiteValidation } from '../src/validation.js';

const SITE = 'https://example-template.webflow.io/';
const SITE_ID = 'a'.repeat(24);
const OTHER_SITE_ID = 'b'.repeat(24);

function page(options: { published?: string; siteId?: string; bridgeSiteId?: string } = {}) {
  const published = options.published === undefined ? 'Tue Nov 24 2026 18:00:00 GMT+0000 (Coordinated Universal Time)' : options.published;
  const bridge = options.bridgeSiteId ? `<script>window.__WF_REVIEW_BRIDGE = { siteId: "${options.bridgeSiteId}", version: "0.3.0" };</script>` : '';
  return `<!DOCTYPE html>${published ? `<!-- Last Published: ${published} -->` : ''}<html data-wf-site="${options.siteId ?? SITE_ID}"><head>${bridge}</head><body></body></html>`;
}

function stored(overrides: Record<string, unknown> = {}) {
  return {
    status: 'available',
    passed: true,
    siteId: SITE_ID,
    submittedAt: '2026-11-24T18:05:00.000Z',
    workerVersion: '2.20.0',
    summary: { totalErrors: 0, failedCategories: 0, totalCategories: 6, score: 100, passed: true },
    scope: { selectedChecks: ['designer', 'assets', 'content'], pageScope: 'all', publishedChecks: 'full' },
    ...overrides
  };
}

function fetcher(html: string, latest: unknown, latestStatus = 200) {
  const requests: string[] = [];
  const fn = (async (input: unknown) => {
    const url = String(input);
    requests.push(url);
    if (url.includes('/app-validator/submission/latest')) {
      return new Response(JSON.stringify(latest), { status: latestStatus, headers: { 'content-type': 'application/json' } });
    }
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
  }) as unknown as typeof fetch;
  return { fn, requests };
}

test('a pass run after the last publish is current, and the lookup uses the site id of the page', async () => {
  const { fn, requests } = fetcher(page(), stored());
  const report = await readSubmissionGateStatus(SITE, { fetcher: fn });
  assert.equal(report.status, 'current');
  assert.equal(report.lastPublishedAt, '2026-11-24T18:00:00.000Z');
  assert.equal(report.result?.rulesetVersion, '2.20.0');
  assert.equal(new URL(requests[1]).searchParams.get('siteId'), SITE_ID);
});

test('a site published after the run is stale, with the gap in hours', async () => {
  const { fn } = fetcher(page({ published: 'Thu Nov 26 2026 16:35:00 GMT+0000 (Coordinated Universal Time)' }), stored());
  const report = await readSubmissionGateStatus(SITE, { fetcher: fn });
  assert.equal(report.status, 'stale');
  assert.equal(report.hoursPublishedAfterRun, 46.5);
  assert.match(report.summary, /published 46\.5 hour\(s\) after the latest stored Validator run/);
});

test('a failed run and a partial run are named before the age of the run', async () => {
  const late = page({ published: 'Thu Nov 26 2026 16:35:00 GMT+0000 (Coordinated Universal Time)' });
  const failed = stored({ passed: false, summary: { totalErrors: 3, failedCategories: 1, totalCategories: 6, score: 83, passed: false } });
  assert.equal((await readSubmissionGateStatus(SITE, { fetcher: fetcher(late, failed).fn })).status, 'failed');
  const partial = stored({ scope: { selectedChecks: ['designer', 'assets', 'content'], pageScope: 'current', publishedChecks: 'full' } });
  assert.equal((await readSubmissionGateStatus(SITE, { fetcher: fetcher(late, partial).fn })).status, 'partial');
});

test('a Validator script that names another site is a site mismatch, and no result is read', async () => {
  const { fn, requests } = fetcher(page({ bridgeSiteId: OTHER_SITE_ID }), stored());
  const report = await readSubmissionGateStatus(SITE, { fetcher: fn });
  assert.equal(report.status, 'site_mismatch');
  assert.equal(requests.length, 1);
});

test('no stored result, an unreadable page and a page without a publish time each have a status', async () => {
  assert.equal((await readSubmissionGateStatus(SITE, { fetcher: fetcher(page(), { status: 'missing' }, 404).fn })).status, 'no_result');
  const down = (async () => new Response('', { status: 503 })) as unknown as typeof fetch;
  assert.equal((await readSubmissionGateStatus(SITE, { fetcher: down })).status, 'unavailable');
  const throws = (async () => {
    throw new Error('network');
  }) as unknown as typeof fetch;
  assert.equal((await readSubmissionGateStatus(SITE, { fetcher: throws })).status, 'unavailable');
  const noStamp = await readSubmissionGateStatus(SITE, { fetcher: fetcher(page({ published: '' }), stored()).fn });
  assert.equal(noStamp.status, 'current');
  assert.match(noStamp.summary, /no publish time/);
});

test('the published-site validation result carries the gate status', async () => {
  const { fn } = fetcher(page({ published: 'Thu Nov 26 2026 16:35:00 GMT+0000 (Coordinated Universal Time)' }), stored());
  const result = await runPublishedSiteValidation({ published_url: SITE, checks: ['gsap_custom_code'] }, { fetcher: fn });
  assert.equal(result.submissionGate?.status, 'stale');
});
