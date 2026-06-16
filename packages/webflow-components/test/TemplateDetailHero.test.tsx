import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemplateDetailHero } from '../src/components/marketplace/TemplateDetailHero';

test('uses the first real category in the template detail title', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Wealthflow"
      templateSlug="wealthflow-website-template"
      categoryNames="Professional Services, Technology"
      creatorName="BRIX Templates"
      browserPreviewUrl={{ href: 'https://wealthflow.webflow.io/' }}
      designerPreviewUrl={{ href: 'https://preview.webflow.com/preview/wealthflow' }}
      marketplaceTemplateId="wealthflow"
      price="$169 USD"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /Wealthflow - Professional Services Website Template/);
  assert.doesNotMatch(html, /Wealthflow - Website Template/);
});

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
