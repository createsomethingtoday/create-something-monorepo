import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemplateDetailHero } from '../src/components/marketplace/TemplateDetailHero';

test('normalizes quoted comma-containing category names to the canonical category route', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Cinematicframe"
      templateSlug="cinematicframe-website-template"
      categoryNames={'"Culture, Performance & Entertainment"'}
      categoryLinks=""
      categoryBaseUrl="https://webflow.com/templates/category"
      creatorName="8AMDESIGN"
      browserPreviewUrl={{ href: 'https://cinematic-film-maker.webflow.io/' }}
      designerPreviewUrl={{ href: 'https://preview.webflow.com/preview/cinematic-film-maker' }}
      previewIframeUrl={{ href: 'https://cinematic-film-maker.webflow.io/' }}
      marketplaceTemplateId="69180a8e74cdd3f42f9cb2d2"
      price="$39 USD"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /Arts &amp; Entertainment/);
  assert.match(html, /https:\/\/webflow\.com\/templates\/category\/arts-and-entertainment-websites/);
  assert.doesNotMatch(html, /performance-and-entertainment-websites/);
  assert.doesNotMatch(html, /culture-websites/);
});

test('uses the first category name in the template title', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Fleet"
      categoryNames="Transportation & Automotive, Technology"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /<h1 class="wfdt-title">Fleet - Transportation &amp; Automotive Website Template<\/h1>/);
});

test('uses an explicit title category name instead of the breadcrumb categories', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Fleet"
      titleCategoryName="Logistics"
      categoryNames="Transportation & Automotive, Technology"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /<h1 class="wfdt-title">Fleet - Logistics Website Template<\/h1>/);
});

test('keeps the generic title when no category is available', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero templateName="Fleet" enableAnalytics={false} />,
  );

  assert.match(html, /<h1 class="wfdt-title">Fleet - Website Template<\/h1>/);
});
