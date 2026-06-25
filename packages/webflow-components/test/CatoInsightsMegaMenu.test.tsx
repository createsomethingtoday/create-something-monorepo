import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CatoInsightDetail, CatoInsightsHub, CatoInsightsMegaMenu } from '../src/components/cato/CatoInsights';
import { CatoNavigation } from '../src/components/cato/CatoNavigation';

test('renders the launch mega menu with three browse options and separated feature rows', () => {
  const html = renderToStaticMarkup(<CatoInsightsMegaMenu />);

  assert.match(html, /Resiliency Report Alerts/);
  assert.match(html, /Cato Research/);
  assert.match(html, /Newsroom/);
  assert.doesNotMatch(html, /Insights Home/);
  assert.doesNotMatch(html, /Whitepapers/);
  assert.match(html, /cato-cc-mega-feature-item-title/);
  assert.match(html, /cato-cc-mega-feature-item-meta/);
  assert.match(html, /class="cato-cc-mega-feature-item-title"[^>]*>Vascular, Angiographic, and Dialysis Kits Shortages<\/strong><div class="cato-cc-mega-feature-item-meta">/);
  assert.match(html, /May 26, 2026/);
});

test('renders editable text overrides in the standalone mega menu', () => {
  const html = renderToStaticMarkup(
    <CatoInsightsMegaMenu
      introKicker="Resource center"
      heading="Custom insights heading"
      summary="Custom insights summary"
      introCtaLabel="See all resources"
      browseKicker="Choose a section"
      resiliencyMenuTitle="Custom alerts"
      resiliencyMenuSummary="Custom alert summary"
      researchMenuTitle="Custom research"
      researchMenuSummary="Custom research summary"
      newsroomMenuTitle="Custom newsroom"
      newsroomMenuSummary="Custom newsroom summary"
      featureLabel="Pinned"
      featureTitle="Custom feature title"
      featureSummary="Custom feature summary"
      featureCta="Custom feature CTA"
      featureItemOneTitle="Custom item one"
      featureItemOneMeta="Custom meta one"
      featureItemTwoTitle="Custom item two"
      featureItemTwoMeta="Custom meta two"
      featureItemThreeTitle="Custom item three"
      featureItemThreeMeta="Custom meta three"
    />,
  );

  for (const value of [
    'Resource center',
    'Custom insights heading',
    'Custom insights summary',
    'See all resources',
    'Choose a section',
    'Custom alerts',
    'Custom alert summary',
    'Custom research',
    'Custom research summary',
    'Custom newsroom',
    'Custom newsroom summary',
    'Pinned',
    'Custom feature title',
    'Custom feature summary',
    'Custom feature CTA',
    'Custom item one',
    'Custom meta one',
    'Custom item two',
    'Custom meta two',
    'Custom item three',
    'Custom meta three',
  ]) {
    assert.match(html, new RegExp(value));
  }
});

test('passes mega menu text overrides through Cato Navigation', () => {
  const html = renderToStaticMarkup(
    <CatoNavigation
      heading="Navigation menu heading"
      introCtaLabel="Navigation menu CTA"
      browseKicker="Navigation browse label"
      featureItemOneTitle="Navigation item one"
      featureItemOneMeta="Navigation meta one"
    />,
  );

  assert.match(html, /Navigation menu heading/);
  assert.match(html, /Navigation menu CTA/);
  assert.match(html, /Navigation browse label/);
  assert.match(html, /Navigation item one/);
  assert.match(html, /Navigation meta one/);
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

test('renders Cato Insight Detail with recent editor controls', () => {
  const html = renderToStaticMarkup(
    <CatoInsightDetail
      title="Detail title override"
      summary="Detail summary override"
      heroCardLabel="Custom report label"
      heroCardTitle="Custom hero card title"
      heroCardSummary="Custom hero card summary"
      heroCardCta="Open archive"
      heroCardLink={{ href: '/custom-archive', target: '_blank' }}
      featuredImageUrl="/featured-report.png"
      featuredImageAlt="Featured report alt"
      featuredImageCaption="Featured report caption"
      featuredImageFit="cover"
      takeawaysPlacement="both"
      shareCtaLabel="Share this report"
      shareCtaLink={{ href: '/share-report' }}
      relatedRailTitle="More alerts"
      relatedItemsJson='[{"title":"Related item","href":"/related-item","meta":"Resiliency Report","summary":"Related summary"}]'
      showRelatedRail
      showResourceDetails
    />,
  );

  assert.match(html, /Custom report label/);
  assert.match(html, /Custom hero card title/);
  assert.match(html, /Custom hero card summary/);
  assert.match(html, /href="\/custom-archive" target="_blank" rel="noreferrer"/);
  assert.match(html, /src="\/featured-report.png" alt="Featured report alt"/);
  assert.match(html, /Featured report caption/);
  assert.match(html, /data-fit="cover"/);
  assert.match(html, /Share this report/);
  assert.match(html, /More alerts/);
  assert.match(html, /Related item/);
  assert.match(html, /Resource details/);
  assert.equal((html.match(/Key takeaways/g) || []).length, 2);
});
