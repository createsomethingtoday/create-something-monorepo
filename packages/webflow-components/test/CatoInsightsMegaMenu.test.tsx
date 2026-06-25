import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CatoInsightsHub, CatoInsightsMegaMenu } from '../src/components/cato/CatoInsights';
import { CatoNavigation } from '../src/components/cato/CatoNavigation';

test('renders the launch mega menu with three browse options', () => {
  const html = renderToStaticMarkup(<CatoInsightsMegaMenu />);

  assert.match(html, /Resiliency Report Alerts/);
  assert.match(html, /Cato Research/);
  assert.match(html, /Newsroom/);
  assert.doesNotMatch(html, />Insights Home</);
  assert.doesNotMatch(html, /Resource Library/);
  assert.doesNotMatch(html, /Whitepapers/);
});

test('allows editors to customize the right-side mega menu feature through navigation props', () => {
  const html = renderToStaticMarkup(
    <CatoNavigation
      featureLabel="Launch feature"
      featureTitle="Custom right-side title"
      featureSummary="Custom right-side copy for the editor."
      featureCta="Open the report"
      featureHref="/resiliency-reports"
      featureItemsJson={JSON.stringify([
        { title: 'Gowns and drapes alert', resourceType: 'Resiliency Report' },
      ])}
    />,
  );

  assert.match(html, /Launch feature/);
  assert.match(html, /Custom right-side title/);
  assert.match(html, /Custom right-side copy for the editor\./);
  assert.match(html, /Open the report/);
  assert.match(html, /href="\/resiliency-reports"/);
  assert.match(html, /Gowns and drapes alert/);
});

test('renders Cato Insights Hub with editable Webflow link overrides and hides launch-gated Whitepapers', () => {
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
    />,
  );

  assert.match(html, /href="\/custom-panel" target="_blank" rel="noreferrer"/);
  assert.match(html, /href="\/custom-insights" class="cato-cc-filter" data-active="true"/);
  assert.match(html, /class="cato-cc-card-grid" data-count="3"/);
  assert.match(html, /href="\/custom-resiliency" class="cato-cc-card" data-category="resiliency"/);
  assert.match(html, /href="\/custom-research" class="cato-cc-card" data-category="research"/);
  assert.match(html, /href="\/custom-newsroom" class="cato-cc-card" data-category="newsroom"/);
  assert.doesNotMatch(html, /href="\/custom-whitepapers"/);
  assert.doesNotMatch(html, /data-category="resources"/);
  assert.doesNotMatch(html, /Whitepaper/);
});
