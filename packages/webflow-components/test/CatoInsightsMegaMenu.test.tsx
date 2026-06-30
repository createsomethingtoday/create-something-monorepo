import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CatoInsightDetail,
  CatoInsightsArchive,
  CatoInsightsHub,
  CatoInsightsMegaMenu,
  normalizeEndpointItems
} from '../src/components/cato/CatoInsights';
import { CatoNavigation } from '../src/components/cato/CatoNavigation';

test('renders the reviewed mega menu browse options', () => {
  const html = renderToStaticMarkup(<CatoInsightsMegaMenu />);

  assert.match(html, /Resiliency Report Alerts/);
  assert.match(html, /Cato Research/);
  assert.match(html, /Newsroom/);
  assert.doesNotMatch(html, />Insights Home</);
  assert.doesNotMatch(html, /Resource Library/);
  assert.doesNotMatch(html, /Whitepapers/);
  assert.doesNotMatch(html, /Explore Our Insights/);
  assert.doesNotMatch(html, /Access Our Insights/);
  assert.match(html, /cato-cc-mega-title \{[^}]*margin: 0 0 4rem/);
  assert.match(html, /cato-cc-mega-home \{[^}]*display: block/);
  assert.match(html, /cato-cc-mega-title \+ .cato-cc-mega-home \{ margin-top: 1.75rem/);
  assert.match(
    html,
    /cato-cc-mega-feature-list \{[^}]*border-top: 1px solid rgba\(255,255,255,.16\)/
  );
  assert.doesNotMatch(html, /cato-cc-mega-feature-list \{[^}]*border-bottom/);
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

  assert.match(html, /Launch feature/);
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
  assert.match(html, /href="\/custom-insights" class="cato-cc-filter" data-active="true"/);
  assert.match(html, /Review signals/);
  assert.match(html, /class="cato-cc-card-grid" data-count="3"/);
  assert.match(html, /href="\/custom-resiliency" class="cato-cc-card" data-category="resiliency"/);
  assert.match(html, /href="\/custom-research" class="cato-cc-card" data-category="research"/);
  assert.match(html, /href="\/custom-newsroom" class="cato-cc-card" data-category="newsroom"/);
  assert.doesNotMatch(
    html,
    /href="\/custom-whitepapers" class="cato-cc-card" data-category="resources"/
  );
  assert.doesNotMatch(html, /Whitepapers/);
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
  assert.equal(item.date, 'May 7, 2026');
});
