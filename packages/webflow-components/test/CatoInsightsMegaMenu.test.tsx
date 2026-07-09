import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CatoInsightDetail,
  CatoInsightCmsCard,
  CatoInsightsArchive,
  CatoInsightsHub,
  CatoInsightsMegaMenu,
  normalizeEndpointItems
} from '../src/components/cato/CatoInsights';
import { CatoNavigation } from '../src/components/cato/CatoNavigation';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
      aboutLabel="Company"
      whoWeAreLabel="Overview"
      leadershipLabel="Operators"
      boardLabel="Directors"
      insightsLabel="Signals"
      caseStudiesLabel="Customer work"
      riskRadarLabel="Risk view"
      mobileMenuLabel="Open"
      mobileMenuCloseLabel="Shut"
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

  assert.match(html, /Company/);
  assert.match(html, /Overview/);
  assert.match(html, /Operators/);
  assert.match(html, /Directors/);
  assert.match(html, /Signals/);
  assert.match(html, /Customer work/);
  assert.match(html, /Risk view/);
  assert.match(html, />Open<\/button>/);
  assert.match(html, /Launch feature/);
  assert.match(html, /Custom right-side title/);
  assert.match(html, /Custom right-side copy for the editor\./);
  assert.match(html, /Open the report/);
  assert.match(html, /href="\/resiliency-reports"/);
  assert.match(html, /Gowns and drapes alert/);
  assert.match(html, /cato-nav__trigger \{[^}]*padding: .5rem 1rem/);
  assert.match(html, /@media \(max-width: 767px\) \{[^}]*cato-nav__dropdown-item/);
  assert.match(html, /cato-nav__mega-panel \.cato-cc-mega-link span \{[^}]*display: none/);
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
      resiliencyCardTitle="Custom alert card"
      resiliencyCardSummary="Custom alert card summary."
      resiliencyCardCta="Open alerts"
      researchCardTitle="Custom research card"
      researchCardSummary="Custom research card summary."
      researchCardCta="Open research"
      newsroomCardTitle="Custom newsroom card"
      newsroomCardSummary="Custom newsroom card summary."
      newsroomCardCta="Open newsroom"
    />
  );

  assert.match(html, /href="\/custom-panel" target="_blank" rel="noreferrer"/);
  assert.match(html, /class="cato-cc-filter-list" role="radiogroup" aria-label="Filter insights"/);
  assert.doesNotMatch(html, /Use these filters to scan/);
  assert.doesNotMatch(html, /cato-cc-filter-note/);
  assert.match(
    html,
    /<button type="button" class="cato-cc-filter" data-active="true" aria-pressed="true" aria-checked="true" role="radio">/
  );
  assert.match(html, /class="cato-cc-filter-radio" aria-hidden="true"/);
  assert.match(html, /Review signals/);
  assert.match(html, /Custom alert card/);
  assert.match(html, /Custom alert card summary\./);
  assert.match(html, /Open alerts/);
  assert.match(html, /Custom research card/);
  assert.match(html, /Custom research card summary\./);
  assert.match(html, /Open research/);
  assert.match(html, /Custom newsroom card/);
  assert.match(html, /Custom newsroom card summary\./);
  assert.match(html, /Open newsroom/);
  assert.match(html, /class="cato-cc-card-grid cato-cc-card-grid--count-3" data-count="3"/);
  assert.match(html, /href="\/custom-resiliency" class="cato-cc-card" data-category="resiliency"/);
  assert.match(html, /href="\/custom-research" class="cato-cc-card" data-category="research"/);
  assert.match(html, /href="\/custom-newsroom" class="cato-cc-card" data-category="newsroom"/);
  assert.doesNotMatch(
    html,
    /href="\/custom-whitepapers" class="cato-cc-card" data-category="resources"/
  );
  assert.doesNotMatch(html, /Whitepapers/);
});

test('renders the client-shared hub hero and preview layout by default', () => {
  const html = renderToStaticMarkup(<CatoInsightsHub />);

  assert.match(html, /Supply Chain Insights to Protect Clinical Continuity/);
  assert.match(html, /Medline&#x27;s West Coast Medical-Surgical Hub Fire/);
  assert.match(html, /Access Report/);
  assert.match(html, /Actionable Supply Chain Insights for Healthcare Leaders/);
  assert.doesNotMatch(html, />Insights hub</);
  assert.match(html, /class="cato-cc-hero-art"/);
  assert.match(
    html,
    /src="https:\/\/cdn\.prod\.website-files\.com\/69241b6e09c89ae05c6116f8\/69b2b36f6a6bbaed0660690a_e522a933696d6b8c18fa189b5fa25012_tech-ng-element\.webp"/
  );
  assert.match(html, /class="cato-cc-filter" data-active="true"/);
  assert.match(html, /data-layout="split"/);
});

test('allows editors to override the hub featured panel props', () => {
  const html = renderToStaticMarkup(
    <CatoInsightsHub
      featuredPanelLabel="Featured now"
      featuredPanelTitle="Medline disruption"
      featuredPanelSummary="Old saved Webflow panel copy."
      featuredPanelCta="Access these reports"
    />
  );

  assert.match(html, /Featured now/);
  assert.match(html, /Medline disruption/);
  assert.match(html, /Old saved Webflow panel copy/);
  assert.match(html, /Access these reports/);
  assert.match(html, /data-layout="split"/);
});

test('keeps the hub preview header optional when explicitly hidden', () => {
  const html = renderToStaticMarkup(<CatoInsightsHub showPreviewHeader={false} />);

  assert.doesNotMatch(html, /Actionable Supply Chain Insights for Healthcare Leaders/);
});

test('uses the resiliency archive hero card as the subscription element', () => {
  const html = renderToStaticMarkup(<CatoInsightsArchive />);
  const archiveIndex = html.indexOf('Latest Resiliency Reports');
  const subscribeIndex = html.indexOf('Receive new Resiliency Report Alerts.');

  assert.ok(archiveIndex > -1);
  assert.ok(subscribeIndex > -1);
  assert.ok(subscribeIndex < archiveIndex);
  assert.match(html, /class="cato-cc-panel-subscribe"/);
  assert.doesNotMatch(html, />Archive</);
  assert.match(
    html,
    /cato-cc-panel\[data-subscribe=(?:&quot;|")true(?:&quot;|")\] \{ background: var\(--base-color-sky-blue--sky-blue-900, #235f6b\)/
  );
  assert.doesNotMatch(html, /Email alerts/);
  assert.doesNotMatch(html, /Work email address/);
  assert.doesNotMatch(html, /No spam\. Unsubscribe anytime\./);
  assert.match(html, /cato-cc-panel \.cato-cc-form-row \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(html, /cato-cc-panel \.cato-cc-input \{[^}]*width: 100%/);
  assert.match(html, /aria-label="Email address"/);
  assert.match(html, /class="cato-cc-subscribe-button" type="submit"/);
  assert.match(html, /cato-cc-panel \.cato-cc-subscribe-button \{[^}]*white-space: nowrap/);
  assert.match(html, /cato-cc-panel \.cato-cc-subscribe-button \{[^}]*background: rgba\(255,255,255,.1\)/);
  assert.doesNotMatch(html, /New report releases/);
  assert.doesNotMatch(html, /Supply disruption signals/);
  assert.doesNotMatch(html, /Procurement notes/);
  assert.doesNotMatch(html, /Subscribe for Resiliency Report Alerts\./);
  assert.doesNotMatch(html, /Want future alerts/);
  assert.doesNotMatch(html, /Subscribe once and receive/);
  assert.doesNotMatch(html, /Archive status/);
});

test('uses the same compact blue subscription panel on the Newsroom archive', () => {
  const html = renderToStaticMarkup(<CatoInsightsArchive categoryId="newsroom" />);

  assert.match(html, /Receive new Cato Newsroom updates\./);
  assert.match(html, /Get Cato launches, event notes, press updates, and milestones as they publish\./);
  assert.match(html, /class="cato-cc-panel-subscribe"/);
  assert.match(html, /data-category="newsroom" data-subscribe="true"/);
  assert.match(
    html,
    /cato-cc-panel\[data-subscribe=(?:&quot;|")true(?:&quot;|")\] \{ background: var\(--base-color-sky-blue--sky-blue-900, #235f6b\)/
  );
  assert.doesNotMatch(html, />Newsroom archive</);
});

test('uses the compact subscription CTA on every archive category', () => {
  const categories = [
    {
      id: 'resiliency',
      title: 'Receive new Resiliency Report Alerts.',
      summary:
        'Get healthcare supply risk signals, disruption reports, and sourcing notes as they publish.'
    },
    {
      id: 'research',
      title: 'Receive new Industry Research.',
      summary:
        'Get Cato research, procurement analysis, and resilience guidance as they publish.'
    },
    {
      id: 'resources',
      title: 'Receive new operational resources.',
      summary:
        'Get Cato guides, explainers, and supply gap response resources as they publish.'
    },
    {
      id: 'newsroom',
      title: 'Receive new Cato Newsroom updates.',
      summary:
        'Get Cato launches, event notes, press updates, and milestones as they publish.'
    }
  ] as const;

  for (const category of categories) {
    const html = renderToStaticMarkup(<CatoInsightsArchive categoryId={category.id} />);

    assert.match(html, new RegExp(escapeRegExp(category.title)));
    assert.match(html, new RegExp(escapeRegExp(category.summary)));
    assert.match(html, /class="cato-cc-panel-subscribe"/);
    assert.match(html, new RegExp(`data-category="${category.id}" data-subscribe="true"`));
  }
});

test('falls back to the archive info card when hero subscribe is disabled', () => {
  const html = renderToStaticMarkup(<CatoInsightsArchive showSubscribe={false} />);

  assert.match(html, /Built for recurring supply risk reports\./);
  assert.doesNotMatch(html, /class="cato-cc-panel-subscribe"/);
  assert.doesNotMatch(html, /Work email address/);
});

test('uses the refined visual defaults from the latest Cato feedback', () => {
  const hubHtml = renderToStaticMarkup(<CatoInsightsHub />);
  const navHtml = renderToStaticMarkup(<CatoNavigation />);

  assert.match(hubHtml, /class="cato-cc-hero-art"/);
  assert.match(hubHtml, /cato-cc-hero-art \{[^}]*left: -30rem/);
  assert.match(hubHtml, /cato-cc-hero::after \{[^}]*height: 18rem/);
  assert.doesNotMatch(hubHtml, /hero-v2_bg-element/);
  assert.doesNotMatch(hubHtml, /u-bg-slot/);
  assert.match(hubHtml, /background: linear-gradient\(105deg, var\(--cato-action-green-light\)/);
  assert.match(hubHtml, /cato-cc-card h3 \{[^}]*font-weight: 700/);
  assert.match(hubHtml, /@media \(max-width: 767px\) \{[\s\S]*\.cato-cc h1 \{ font-size: 2\.75rem/);
  assert.match(
    hubHtml,
    /@media \(max-width: 767px\) \{[\s\S]*\.cato-cc-card-grid\[data-count=(?:&quot;|")3(?:&quot;|")\][\s\S]*grid-template-columns: 1fr/
  );
  assert.match(hubHtml, /@media \(max-width: 767px\) \{[\s\S]*\.cato-cc-card p \{ display: none/);
  assert.match(hubHtml, /@media \(max-width: 767px\) \{[\s\S]*\.cato-cc-mega-link span \{ display: none/);
  assert.match(navHtml, /Board of Directors/);
  assert.match(navHtml, /cato-nav__cta \{[^}]*background: linear-gradient\(105deg, var\(--cato-nav-blue\)/);
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
  const [item, publishedAlias, dateObject, timestamp] = normalizeEndpointItems({
    items: [
      {
        fieldData: {
          name: 'Nasal Oral Endotracheal Tubes Backorders',
          slug: 'nasal-oral-ett-backorders',
          'resource-type': '0e5ef31b9a043353f4c9fc760c3c669b',
          'content-label': 'Resiliency Report',
          'publish-date': '2026-05-07T00:00:00.000Z'
        }
      },
      {
        fieldData: {
          name: 'Published alias item',
          slug: 'published-alias-item',
          'content-label': 'Industry Research',
          'published-on': '2026-06-23'
        }
      },
      {
        fieldData: {
          name: 'Date object item',
          slug: 'date-object-item',
          'content-label': 'Newsroom',
          publishedAt: new Date('2026-07-04T00:00:00.000Z')
        }
      },
      {
        fieldData: {
          name: 'Timestamp item',
          slug: 'timestamp-item',
          'content-label': 'Resiliency Report',
          createdAt: Date.UTC(2026, 0, 15)
        }
      }
    ]
  });

  assert.equal(item.resourceType, 'Resiliency Report');
  assert.equal(item.pill, 'Resiliency Report');
  assert.equal(item.date, 'May 7, 2026');
  assert.equal(publishedAlias.date, 'Jun 23, 2026');
  assert.equal(dateObject.date, 'Jul 4, 2026');
  assert.equal(timestamp.date, 'Jan 15, 2026');
});

test('formats Webflow-bound card dates and omits empty date metadata', () => {
  const dateHtml = renderToStaticMarkup(
    <CatoInsightCmsCard
      title="Bound CMS card"
      contentLabel="Resiliency Report"
      date="2026-06-23T00:00:00.000Z"
    />
  );
  const emptyDateHtml = renderToStaticMarkup(
    <CatoInsightCmsCard title="No date card" contentLabel="Resiliency Report" date="" />
  );

  assert.match(dateHtml, /Jun 23, 2026/);
  assert.doesNotMatch(emptyDateHtml, /<div class="cato-cc-meta"><\/div>/);
  assert.doesNotMatch(emptyDateHtml, /<span class="cato-cc-meta"><\/span>/);
});

test('formats related rail dates from JSON overrides', () => {
  const html = renderToStaticMarkup(
    <CatoInsightDetail
      slug="vascular-angiographic-dialysis-kits-shortages"
      relatedItemsJson={JSON.stringify([
        {
          title: 'Related date alias',
          href: '/insights/related-date-alias',
          resourceType: 'Resiliency Report',
          date: '2026-06-23T00:00:00.000Z'
        }
      ])}
    />
  );

  assert.match(html, /Resiliency Report - Jun 23, 2026/);
});
