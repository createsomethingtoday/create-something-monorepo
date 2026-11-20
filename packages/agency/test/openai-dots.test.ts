import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import routes from '../src/lib/data/searchRoutes.json';
import { marketingPagePortfolio } from '../src/lib/data/marketingPages';
import { agencyCoreMessaging } from '../src/lib/data/marketingCopy';
import { findResults } from '../src/lib/site-search/catalog';
import { getAgencyPageFoundation } from '../src/lib/data/agencyPageFoundations';
import { usesRouteOwnedAgencyPerformanceEnding } from '../src/lib/atlas/surface-policy';
import {
  schedulerHandoffContext,
  buildFirstPartySchedulerUrl
} from '../src/lib/scheduling/first-party';
import { getAgencyContentAssetAnalyticsMetadata } from '../src/lib/analytics/content-assets';
import { performancePageRegistry } from '../../../config/performance-pages/registry';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('personal dots is an indexable educational support guide in the workflow cluster', () => {
  const guide = marketingPagePortfolio.find((entry) => entry.path === '/openai-dots');
  assert.ok(guide);
  assert.equal(guide.cluster, 'workflow-library');
  assert.equal(guide.role, 'support');
  assert.equal(guide.funnelStage, 'understand');
  assert.equal(guide.decision, 'index');
  assert.deepEqual(
    routes.find((entry) => entry.path === guide.path),
    { path: guide.path, ...guide.search }
  );
  const performance = performancePageRegistry.find((group) => group.id === 'agency-openai-dots');
  assert.ok(performance);
  assert.ok(performance.sources.includes('packages/agency/src/routes/openai-dots/+page.svelte'));
  assert.equal(performance.status, 'pending'); // Rendering acceptance belongs to the parent.
});

test('site search finds the guide by product, character and permissions in the guides filter', () => {
  for (const query of ['OpenAI dots', 'Canon', 'permissions']) {
    assert.ok(
      findResults(query, 'guides').some((entry) => entry.id === '/openai-dots'),
      query
    );
  }
  assert.equal(
    findResults('OpenAI dots', 'all').filter((entry) => entry.id === '/openai-dots').length,
    1
  );
  for (const route of ['workflows', 'partners']) {
    assert.match(read(`src/routes/${route}/+page.svelte`), /href="\/openai-dots"/);
  }
});

test('closing booking action preserves accepted source, intent and lane into the scheduler', () => {
  const url = new URL(
    agencyCoreMessaging.openaiDotsMappingSessionHref,
    'https://createsomething.agency'
  );
  assert.equal(url.pathname, '/book');
  assert.deepEqual(schedulerHandoffContext(url.search), {
    source: 'openai-dots',
    intent: 'workflow-mapping',
    lane: 'workflow_infrastructure'
  });
  const scheduler = new URL(buildFirstPartySchedulerUrl(url.search));
  for (const key of ['source', 'intent', 'lane'])
    assert.equal(scheduler.searchParams.get(key), url.searchParams.get(key));
  assert.equal(usesRouteOwnedAgencyPerformanceEnding('/openai-dots'), true);
  const attribution = getAgencyContentAssetAnalyticsMetadata('/openai-dots');
  assert.equal(attribution?.contentPrimaryCta, 'book-mapping-session');
});

test('the measured ruler uses existing stable chapters, preserving home ownership', () => {
  const source = read('src/routes/openai-dots/+page.svelte');
  const foundation = getAgencyPageFoundation('/openai-dots');
  assert.ok(foundation);
  for (const chapter of foundation.chapters.slice(1, -1)) {
    assert.ok(source.includes(`id="${chapter.id}"`), chapter.id);
  }
  assert.equal(getAgencyPageFoundation('/'), null);
  assert.doesNotMatch(source, /<iframe|<header class="masthead"|<footer|motion-control|vendor\//);
});
