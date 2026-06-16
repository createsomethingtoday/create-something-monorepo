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
