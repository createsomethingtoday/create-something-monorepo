import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import routes from '../src/lib/data/searchRoutes.json';
import { marketingPagePortfolio, scoreMarketingPage } from '../src/lib/data/marketingPages';
import { agencyCoreMessaging } from '../src/lib/data/marketingCopy';
import { findResults } from '../src/lib/site-search/catalog';
import { getAgencyPageFoundation } from '../src/lib/data/agencyPageFoundations';
import { usesRouteOwnedAgencyPerformanceEnding } from '../src/lib/atlas/surface-policy';
import {
  schedulerHandoffContext,
  buildFirstPartySchedulerUrl
} from '../src/lib/scheduling/first-party';
import { getAgencyContentAssetAnalyticsMetadata } from '../src/lib/analytics/content-assets';
import { dentalAgentFaqs, dentalAgentService, dentalDemoHref } from '../src/lib/data/dentalAgents';
import { performancePageRegistry } from '../../../config/performance-pages/registry';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const source = read('src/routes/dental-ai-agents/+page.svelte');

test('dental service is discoverable through the sitemap, portfolio and public site search', () => {
  const page = marketingPagePortfolio.find((entry) => entry.path === '/dental-ai-agents');
  assert.ok(page);
  assert.equal(page.decision, 'index');
  assert.equal(page.cluster, 'business-use-case');
  assert.deepEqual(
    routes.find((entry) => entry.path === page.path),
    { path: page.path, ...page.search }
  );
  assert.ok(scoreMarketingPage(page, source).percent >= 75);
  for (const query of ['dental', 'dentist', 'OpenAI dental', 'front desk', 'AI chatbot']) {
    assert.equal(
      findResults(query, 'all').filter((entry) => entry.id === page.path).length,
      1,
      query
    );
  }
  for (const route of ['partners', 'workflows'])
    assert.match(read(`src/routes/${route}/+page.svelte`), /href="\/dental-ai-agents"/);
});

test('native scheduler handoff retains dental campaign context and consent-aware content attribution', () => {
  const url = new URL(
    agencyCoreMessaging.dentalAgentsMappingSessionHref,
    'https://createsomething.agency'
  );
  assert.equal(url.pathname, '/book');
  assert.deepEqual(schedulerHandoffContext(url.search), {
    source: 'dental-ai-agents',
    intent: 'workflow-mapping',
    lane: 'workflow_infrastructure'
  });
  const scheduler = new URL(buildFirstPartySchedulerUrl(url.search));
  for (const key of ['source', 'intent', 'lane'])
    assert.equal(scheduler.searchParams.get(key), url.searchParams.get(key));
  const attribution = getAgencyContentAssetAnalyticsMetadata('/dental-ai-agents');
  assert.equal(attribution?.contentPrimaryCta, 'book-mapping-session');
  assert.equal(usesRouteOwnedAgencyPerformanceEnding('/dental-ai-agents'), true);
});

test('ruler destinations exist and the commercial page stays within four authored chapters', () => {
  const foundation = getAgencyPageFoundation('/dental-ai-agents');
  assert.ok(foundation);
  for (const chapter of foundation.chapters.slice(1, -1))
    assert.ok(source.includes(`id="${chapter.id}"`), chapter.id);
  assert.equal((source.match(/<section\s/g) ?? []).length, 4);
  assert.ok(performancePageRegistry.some((group) => group.id === 'agency-dental-ai-agents'));
  assert.doesNotMatch(source, /<iframe|<header|<footer|<form/);
});

test('visible FAQs and service schema share copy without impersonating the fictional clinic', () => {
  assert.ok(dentalAgentFaqs.length >= 6);
  assert.match(source, /faqItems=\{dentalAgentFaqs\}/);
  assert.match(source, /#each dentalAgentFaqs as faq/);
  assert.match(dentalAgentService.name, /integration for dental practices/);
  assert.doesNotMatch(
    JSON.stringify(dentalAgentService),
    /"@type":"Dentist"|aggregateRating|reviewRating/
  );
  assert.match(
    dentalAgentFaqs.find((faq) => faq.question.includes('SEO'))!.answer,
    /not guaranteed/
  );
  assert.match(
    dentalAgentFaqs.find((faq) => faq.question.includes('patient information'))!.answer,
    /not a compliance determination/
  );
  assert.match(dentalAgentFaqs[4].answer, /public demonstration/);
  assert.match(source, /not dental care/);
  assert.doesNotMatch(source, /api\.openai\.com|sk-[a-zA-Z0-9]{20,}/);
});

test('visitors can open the public dental site from the hero and demonstration proof', () => {
  assert.equal(
    new URL(dentalDemoHref).hostname,
    'lumen-dental-agent.createsomethingltd.chatgpt.site'
  );
  assert.match(source, /href=\{dentalDemoHref\}/);
  assert.ok((source.match(/data-dental-demo-link/g) ?? []).length >= 3);
  assert.match(source, /Explore the dental demo/);
  assert.doesNotMatch(source, /owner-private|Request a guided demonstration/);
});
