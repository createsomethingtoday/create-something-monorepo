import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CatoInsightDetail } from '../src/components/cato/CatoInsights';

test('allows the Cato Insight Detail hero card to be edited from props', () => {
  const html = renderToStaticMarkup(
    <CatoInsightDetail
      title="Detail page title"
      summary="Detail page summary"
      heroCardLabel="Resiliency Report"
      heroCardTitle="Custom report card title"
      heroCardSummary="Custom hero card summary for editors."
      heroCardCta="Review the archive"
      heroCardHref="/resiliency-reports"
    />,
  );

  assert.match(html, /Detail page title/);
  assert.match(html, /Detail page summary/);
  assert.match(html, /Resiliency Report/);
  assert.match(html, /Custom report card title/);
  assert.match(html, /Custom hero card summary for editors\./);
  assert.match(html, /Review the archive/);
  assert.match(html, /href="\/resiliency-reports"/);
});

test('renders the launch alert detail layout with top takeaways and related rail', () => {
  const html = renderToStaticMarkup(<CatoInsightDetail slug="baxter-clearlink-continu-flo-iv-tubing-recall-shortage" />);

  assert.match(html, /Share/);
  assert.match(html, /Key takeaways/);
  assert.match(html, /Latest alerts/);
  assert.doesNotMatch(html, /Resource details/);
});

test('allows editors to control takeaways placement and related rail content', () => {
  const html = renderToStaticMarkup(
    <CatoInsightDetail
      title="Editable alert layout"
      takeawaysPlacement="sidebar"
      shareCtaLabel="Share alert"
      shareCtaHref="/share-alert"
      relatedRailTitle="Featured articles"
      relatedItemsJson={JSON.stringify([
        {
          title: 'Featured shortage update',
          href: '/featured-shortage-update',
          resourceType: 'Alert',
          date: 'June 23, 2026',
        },
      ])}
      showResourceDetails
    />,
  );

  assert.match(html, /Editable alert layout/);
  assert.match(html, /href="\/share-alert"/);
  assert.match(html, /Featured articles/);
  assert.match(html, /Featured shortage update/);
  assert.match(html, /Alert - June 23, 2026/);
  assert.match(html, /Resource details/);
});

test('renders the Insight Detail featured image from image props', () => {
  const html = renderToStaticMarkup(
    <CatoInsightDetail
      title="Image-backed alert"
      featuredImage={{ src: 'https://assets.example.com/alert-image.jpg', alt: 'Sterile supplies on a shelf' }}
      featuredImageAlt="Configured alt text"
      featuredImageCaption="Image courtesy of Cato Supply."
      featuredImageFit="contain"
    />,
  );

  assert.match(html, /class="cato-cc-featured-image"/);
  assert.match(html, /src="https:\/\/assets\.example\.com\/alert-image\.jpg"/);
  assert.match(html, /alt="Configured alt text"/);
  assert.match(html, /Image courtesy of Cato Supply\./);
  assert.match(html, /object-fit:contain/);
});
