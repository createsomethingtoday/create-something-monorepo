import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CatoInsightCmsCard,
  CatoInsightDetail,
  CatoInsightsArchive,
  CatoInsightsArchiveShell,
  CatoInsightsHub,
  CatoInsightsMegaMenu,
  normalizeEndpointItems,
  resolveCatoItemsEndpointUrl
} from '../src/components/cato/CatoInsights';
import { CatoNavigation } from '../src/components/cato/CatoNavigation';

test('renders the reviewed mega menu browse options', () => {
  const html = renderToStaticMarkup(<CatoInsightsMegaMenu />);

  assert.match(html, /Resiliency Report Alerts/);
  assert.match(html, /Industry Research/);
  assert.match(html, /Newsroom/);
  assert.doesNotMatch(html, />Insights Home</);
  assert.doesNotMatch(html, /Resource Library/);
  assert.doesNotMatch(html, /Whitepapers/);
  assert.doesNotMatch(html, /Explore Our Insights/);
  assert.doesNotMatch(html, /Access Our Insights/);
  assert.match(html, /cato-cc-mega-inner \{[^}]*min-height: 18\.5rem/);
  assert.match(html, /cato-cc-mega-inner \{[^}]*padding: 1\.75rem 2\.5rem 2rem/);
  assert.match(html, /cato-cc-mega-title \{[^}]*margin: 0 0 2rem/);
  assert.match(html, /cato-cc-mega-home \{[^}]*display: block/);
  assert.match(html, /cato-cc-mega-title \+ .cato-cc-mega-home \{ margin-top: 1.75rem/);
  assert.match(html, /cato-cc-mega-feature \{[^}]*min-height: 11\.5rem/);
  assert.match(html, /cato-cc-mega-feature-list \{[^}]*border: 0/);
  assert.doesNotMatch(html, /cato-cc-mega-feature-list \{[^}]*border-top/);
  assert.doesNotMatch(html, /class="cato-cc-pill">Featured/);
});

test('only renders the right-side mega menu feature CTA when explicitly enabled', () => {
  const hiddenHtml = renderToStaticMarkup(
    <CatoInsightsMegaMenu featureCta="Access Our Insights" />
  );
  const visibleHtml = renderToStaticMarkup(
    <CatoInsightsMegaMenu featureCta="Access Our Insights" showFeatureCta />
  );

  assert.doesNotMatch(hiddenHtml, /Access Our Insights/);
  assert.match(visibleHtml, /Access Our Insights/);
});

test('allows editors to customize the right-side mega menu feature through navigation props', () => {
  const html = renderToStaticMarkup(
    <CatoNavigation
      featureLabel="Launch feature"
      featureTitle="Custom right-side title"
      featureSummary="Custom right-side copy for the editor."
      featureCta="Open the report"
      showFeatureCta
      featureHref="/resiliency-reports"
      featureItemsJson={JSON.stringify([
        { title: 'Gowns and drapes alert', resourceType: 'Resiliency Report' }
      ])}
    />
  );

  assert.doesNotMatch(html, /Launch feature/);
  assert.match(html, /Custom right-side title/);
  assert.match(html, /Custom right-side copy for the editor\./);
  assert.match(html, /Open the report/);
  assert.match(html, /href="\/resiliency-reports"/);
  assert.match(html, /Gowns and drapes alert/);
  assert.match(html, /cato-nav__trigger \{[^}]*padding: .5rem 1rem/);
});

test('renders Cato Insights Hub with editable Webflow link overrides', () => {
  const html = renderToStaticMarkup(
    <CatoInsightsHub
      showFilterRail
      featuredPanelCta="Review signals"
      featuredPanelLink={{ href: '/custom-panel', target: '_blank' }}
      insightsHomeLink={{ href: '/custom-insights' }}
      resiliencyLink={{ href: '/custom-resiliency' }}
      researchLink={{ href: '/custom-research' }}
      whitepapersLink={{ href: '/custom-whitepapers' }}
      newsroomLink={{ href: '/custom-newsroom' }}
    />
  );

  assert.match(html, /href="\/custom-panel" target="_blank" rel="noreferrer"/);
  assert.match(
    html,
    /<div class="cato-cc-filter-list" role="radiogroup" aria-label="Filter insights">/
  );
  assert.match(
    html,
    /<button type="button" class="cato-cc-filter" data-active="true" aria-pressed="true" aria-checked="true" role="radio"><span class="cato-cc-filter-label"><span class="cato-cc-filter-radio" aria-hidden="true"><\/span><span>All insights<\/span><\/span>/
  );
  assert.match(
    html,
    /<button type="button" class="cato-cc-filter" data-category="resiliency" aria-pressed="false" aria-checked="false" role="radio">/
  );
  assert.match(html, /<span>Resiliency Report Alerts<\/span>/);
  assert.match(html, /<span>Industry Research<\/span>/);
  assert.match(html, /<span>Newsroom<\/span>/);
  assert.doesNotMatch(html, /Use these filters to scan current reports/);
  assert.doesNotMatch(html, /href="\/custom-insights" class="cato-cc-filter"/);
  assert.match(html, /Review signals/);
  assert.doesNotMatch(html, /cato-cc-panel-label/);
  assert.match(html, /class="cato-cc-card-grid cato-cc-card-grid--count-3" data-count="3"/);
  assert.match(html, /href="\/custom-resiliency" class="cato-cc-card" data-category="resiliency"/);
  assert.match(html, /href="\/custom-research" class="cato-cc-card" data-category="research"/);
  assert.match(html, /href="\/custom-newsroom" class="cato-cc-card" data-category="newsroom"/);
  assert.match(html, /class="cato-cc-pill">Resiliency Report Alerts<\/span>/);
  assert.match(html, /class="cato-cc-pill">Newsroom<\/span>/);
  assert.doesNotMatch(
    html,
    /href="\/custom-whitepapers" class="cato-cc-card" data-category="resources"/
  );
  assert.doesNotMatch(html, /Whitepapers/);
  assert.doesNotMatch(html, />Insights</);
  assert.doesNotMatch(html, /Insights hub/);
});

test('allows each component instance to rename visible category labels', () => {
  const hubHtml = renderToStaticMarkup(
    <CatoInsightsHub
      showFilterRail
      resiliencyCategoryLabel="Supply Risk Alerts"
      researchCategoryLabel="Market Research"
      newsroomCategoryLabel="Company Updates"
    />
  );
  const cardHtml = renderToStaticMarkup(
    <CatoInsightsMegaMenu
      resiliencyCategoryLabel="Supply Risk Alerts"
      researchCategoryLabel="Market Research"
      newsroomCategoryLabel="Company Updates"
    />
  );
  const cmsCardHtml = renderToStaticMarkup(
    <CatoInsightCmsCard
      title="Backorder signal"
      contentLabel="Resiliency Report"
      resiliencyCategoryLabel="Supply Risk Alerts"
    />
  );
  const detailHtml = renderToStaticMarkup(
    <CatoInsightDetail
      slug="nasal-oral-ett-backorders"
      resiliencyCategoryLabel="Supply Risk Alerts"
    />
  );

  assert.match(hubHtml, /<span>Supply Risk Alerts<\/span>/);
  assert.match(hubHtml, /<span>Market Research<\/span>/);
  assert.match(hubHtml, /<span>Company Updates<\/span>/);
  assert.match(hubHtml, /class="cato-cc-pill">Supply Risk Alerts<\/span>/);
  assert.match(cardHtml, /<strong>Supply Risk Alerts<\/strong>/);
  assert.match(cardHtml, /<strong>Market Research<\/strong>/);
  assert.match(cardHtml, /<strong>Company Updates<\/strong>/);
  assert.match(cmsCardHtml, /class="cato-cc-pill">Supply Risk Alerts<\/span>/);
  assert.match(detailHtml, /Back to Supply Risk Alerts/);
  assert.match(detailHtml, /class="cato-cc-pill">Supply Risk Alerts<\/span>/);
});

test('resolves relative Cato endpoint props to the Worker origin', () => {
  assert.equal(
    resolveCatoItemsEndpointUrl('/api/cato/insights?category=resiliency'),
    'https://cato-supply-insights-cms.createsomething.workers.dev/api/cato/insights?category=resiliency'
  );
  assert.equal(
    resolveCatoItemsEndpointUrl('api/cato/insights?category=resiliency'),
    'https://cato-supply-insights-cms.createsomething.workers.dev/api/cato/insights?category=resiliency'
  );
  assert.equal(
    resolveCatoItemsEndpointUrl('?category=resiliency'),
    'https://cato-supply-insights-cms.createsomething.workers.dev/api/cato/insights?category=resiliency'
  );
  assert.equal(
    resolveCatoItemsEndpointUrl(
      'https://cato-insights-cms.createsomething.workers.dev/api/cato/insights?category=research'
    ),
    'https://cato-supply-insights-cms.createsomething.workers.dev/api/cato/insights?category=research'
  );
  assert.equal(
    resolveCatoItemsEndpointUrl('https://example.com/custom.json'),
    'https://example.com/custom.json'
  );
});

test('falls back from placeholder featured panel links to the reports archive', () => {
  const html = renderToStaticMarkup(
    <CatoInsightsHub
      featuredPanelCta="Access these reports"
      featuredPanelLink={{ href: '#' }}
      resiliencyLink={{ href: '/resiliency-reports' }}
    />
  );

  assert.match(html, /class="cato-cc-panel-link" href="\/resiliency-reports"/);
  assert.match(html, /Access these reports/);
});

test('shows resiliency archive entries before the subscribe block', () => {
  const html = renderToStaticMarkup(<CatoInsightsArchive />);
  const archiveIndex = html.indexOf('Latest Resiliency Reports');
  const subscribeIndex = html.indexOf('Subscribe for Resiliency Report Alerts.');

  assert.ok(archiveIndex > -1);
  assert.ok(subscribeIndex > -1);
  assert.ok(archiveIndex < subscribeIndex);
  assert.match(html, /class="cato-cc-cms-grid cato-cc-archive-list"/);
  assert.match(html, /class="cato-cc-pill">Resiliency Report Alerts<\/span>/);
  assert.doesNotMatch(html, /class="cato-cc-pill">Resiliency Report<\/span>/);
  assert.doesNotMatch(html, /Archive status/);
  assert.doesNotMatch(html, /<p class="cato-cc-eyebrow">Insights<\/p>/);
});

test('suppresses stale hero eyebrow markup on archive pages', () => {
  const html = renderToStaticMarkup(<CatoInsightsArchiveShell categoryId="research" />);

  assert.match(
    html,
    /cato-cc-hero-grid (?:>|&gt;) \.cato-cc-copy (?:>|&gt;) \.cato-cc-eyebrow \{ display: none; \}/
  );
  assert.doesNotMatch(html, /<p class="cato-cc-eyebrow">Insights<\/p>/);
  assert.match(html, /<p class="cato-cc-eyebrow">Research archive<\/p>/);
});

test('uses the refined visual defaults from the latest Cato feedback', () => {
  const hubHtml = renderToStaticMarkup(<CatoInsightsHub />);
  const navHtml = renderToStaticMarkup(<CatoNavigation />);

  assert.match(
    hubHtml,
    /--cato-green-mid: var\(--base-color-green--green-800, #0d5b3c\)/
  );
  assert.match(
    hubHtml,
    /--cato-green-bright: var\(--base-color-green--green-400, #46b78a\)/
  );
  assert.match(hubHtml, /69b2b36f6a6bbaed0660690a_e522a933696d6b8c18fa189b5fa25012_tech-ng-element\.webp/);
  assert.match(hubHtml, /class="cato-cc-hero-art"/);
  assert.match(hubHtml, /cato-cc-hero-art \{[^}]*width: clamp\(54rem, 82vw, 78rem\)/);
  assert.match(hubHtml, /cato-cc-hero-art \{[^}]*left: -30rem/);
  assert.match(hubHtml, /cato-cc-hero-art \{[^}]*right: auto/);
  assert.match(hubHtml, /cato-cc-hero-art \{[^}]*opacity: \.4/);
  assert.match(
    hubHtml,
    /cato-cc-hero\[data-variant=&quot;detail&quot;\] \.cato-cc-hero-art \{[^}]*opacity: \.24/
  );
  assert.match(
    hubHtml,
    /cato-cc-hero::after \{[^}]*background: linear-gradient\(180deg, rgba\(251,249,244,0\) 0%, var\(--cato-bg-soft\) 82%\)/
  );
  assert.match(hubHtml, /cato-cc-container \{[^}]*width: min\(100%, 88rem\)/);
  assert.match(hubHtml, /cato-cc-section \{[^}]*padding: 1\.5rem 2rem/);
  assert.match(hubHtml, /cato-cc-section--compact \{[^}]*padding-top: 1rem/);
  assert.match(hubHtml, /cato-cc-panel-link \{[^}]*display: inline-flex/);
  assert.doesNotMatch(hubHtml, /cato-cc-panel-label/);
  assert.match(
    hubHtml,
    /cato-cc-card-grid \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/
  );
  assert.match(
    hubHtml,
    /cato-cc-card-grid\[data-count=(?:"|&quot;)3(?:"|&quot;)\] \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/
  );
  assert.match(hubHtml, /-webkit-line-clamp: 3/);
  assert.match(hubHtml, /cato-cc-cms-card p \{[^}]*min-height: 4\.5em; max-height: 4\.5em/);
  assert.match(
    hubHtml,
    /cato-cc-system-band\[data-archive=(?:"|&quot;)true(?:"|&quot;)\], \.cato-cc-archive-panel \{[^}]*grid-template-columns: 1fr/
  );
  assert.match(
    hubHtml,
    /cato-cc-system-band\[data-archive=(?:"|&quot;)true(?:"|&quot;)\] \.cato-cc-system-copy, \.cato-cc-archive-panel \.cato-cc-system-copy \{ max-width: 54rem/
  );
  assert.match(
    hubHtml,
    /cato-cc-archive-list \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/
  );
  assert.match(
    hubHtml,
    /cato-cc-archive-list \.cato-cc-cms-card \{[^}]*min-height: 13rem; padding: 1\.15rem; background: var\(--cato-bg\)/
  );
  assert.match(
    hubHtml,
    /cato-cc-archive-list \.cato-cc-cms-card\[data-category\] \.cato-cc-pill \{[^}]*color: var\(--cato-card-accent\)/
  );
  assert.match(
    hubHtml,
    /cato-cc-archive-list \.cato-cc-cms-card\[data-category\] h3 \{[^}]*color: var\(--cato-card-accent\)/
  );
  assert.match(
    hubHtml,
    /background: linear-gradient\(105deg, var\(--cato-action-green-light\), var\(--cato-action-green\)\)/
  );
  assert.match(navHtml, /cato-nav \{[^}]*min-height: 5rem/);
  assert.match(navHtml, /cato-nav__mega-panel::before \{[^}]*height: \.85rem/);
  assert.match(navHtml, /cato-nav__cta \{[^}]*background: linear-gradient\(105deg, var\(--cato-nav-blue\), var\(--cato-nav-blue-soft\) 49%, var\(--cato-nav-blue-mid\)\)/);
  assert.match(navHtml, /href="\/board-of-directors" class="cato-nav__dropdown-item">Board of Directors/);
});

test('falls back from placeholder About dropdown page links to default routes', () => {
  const html = renderToStaticMarkup(
    <CatoNavigation leadershipLink={{ href: '#' }} boardLink={{ href: '#' }} />
  );

  assert.match(html, /href="\/leadership" class="cato-nav__dropdown-item">Leadership/);
  assert.match(html, /href="\/board-of-directors" class="cato-nav__dropdown-item">Board of Directors/);
  assert.doesNotMatch(html, /href="#" class="cato-nav__dropdown-item">Leadership/);
});

test('renders Insight Detail related rail with current dates and collection links', () => {
  const html = renderToStaticMarkup(
    <CatoInsightDetail
      slug="vascular-angiographic-dialysis-kits-shortages"
      title="Vascular, Angiographic, and Dialysis Kits Shortages"
    />
  );

  assert.match(html, /href="\/insights\/nasal-oral-ett-backorders"/);
  assert.match(html, /Nasal Oral Endotracheal Tubes Backorders/);
  assert.match(html, /Resiliency Report - May 7, 2026/);
  assert.match(html, /href="\/insights\/neurosponges-disruption"/);
  assert.match(html, /Resiliency Report - May 1, 2026/);
  assert.doesNotMatch(html, /href="\/nasal-oral-ett-backorders"/);
  assert.doesNotMatch(html, /Resiliency Report - May 26, 2026/);
});

test('normalizes endpoint resource labels from CMS content labels', () => {
  const [item] = normalizeEndpointItems({
    items: [
      {
        fieldData: {
          name: 'Nasal Oral Endotracheal Tubes Backorders',
          slug: 'nasal-oral-ett-backorders',
          'resource-type': '0e5ef31b9a043353f4c9fc760c3c669b',
          'content-label': 'Resiliency Report',
          'publish-date': '2026-05-07T00:00:00.000Z'
        }
      }
    ]
  });

  assert.equal(item.resourceType, 'Resiliency Report');
  assert.equal(item.pill, 'Resiliency Report');
  assert.equal(item.category, 'resiliency');
  assert.equal(item.date, 'May 7, 2026');
});

test('normalizes alert archive category labels to the resiliency palette', () => {
  const [item] = normalizeEndpointItems({
    items: [
      {
        fieldData: {
          name: 'Vascular, Angiographic, and Dialysis Kits Shortages',
          slug: 'vascular-angiographic-dialysis-kits-shortages',
          category: 'Resiliency Report Alerts',
          'content-label': 'Alert',
          summary: 'Shortage pressure is affecting active care pathways.',
          'publish-date': '2026-05-14T00:00:00.000Z'
        }
      }
    ]
  });

  const html = renderToStaticMarkup(
    <CatoInsightsArchive itemsJson={JSON.stringify([item])} categoryId="resiliency" />
  );

  assert.equal(item.category, 'resiliency');
  assert.match(html, /class="cato-cc-cms-card"[^>]*data-category="resiliency"/);
  assert.match(html, /class="cato-cc-pill">Resiliency Report Alerts<\/span>/);
});
