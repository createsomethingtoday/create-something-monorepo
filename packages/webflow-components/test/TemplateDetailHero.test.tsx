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

test('renders reviewer pick reason only when provided', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="LeadCraft"
      reviewerPickReason="Consulting-focused template with strong trust signals."
      enableAnalytics={false}
    />,
  );

  assert.match(html, /Reviewer pick/);
  assert.match(html, /Consulting-focused template with strong trust signals\./);

  const blankHtml = renderToStaticMarkup(<TemplateDetailHero templateName="Plain" enableAnalytics={false} />);
  assert.doesNotMatch(blankHtml, /Reviewer pick/);
});

test('uses the first specific category in the template detail title', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Greensign"
      categoryName="Templates"
      categoryNames="Environment, Professional Services"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /Greensign - Environment Website Template/);
  assert.doesNotMatch(html, /Greensign - Website Template/);

  const genericHtml = renderToStaticMarkup(
    <TemplateDetailHero templateName="Plain" categoryName="Templates" enableAnalytics={false} />,
  );
  assert.match(genericHtml, /Plain - Website Template/);
});
