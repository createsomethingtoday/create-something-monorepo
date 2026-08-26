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

test('replaces an unhyphenated generic title suffix when adding the category', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Fleet Website Template"
      categoryNames="Transportation & Automotive, Technology"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /<h1 class="wfdt-title">Fleet - Transportation &amp; Automotive Website Template<\/h1>/);
  assert.doesNotMatch(html, /Fleet Website Template - Transportation/);
});

test('replaces the separator-inclusive generic title suffix when adding the category', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero templateName="Fleet - Website Template" categoryNames="Technology" enableAnalytics={false} />,
  );

  assert.match(html, /<h1 class="wfdt-title">Fleet - Technology Website Template<\/h1>/);
  assert.doesNotMatch(html, /Fleet - - Technology Website Template/);
});

test('preserves every segment of a generic preformatted hyphenated name', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Studio - Three Website Template"
      categoryNames="Technology"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /<h1 class="wfdt-title">Studio - Three - Technology Website Template<\/h1>/);
  assert.doesNotMatch(html, /Studio - Technology Website Template/);
});

test('replaces an existing category-qualified title suffix when rebuilding the title', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Fleet - Transportation Website Template"
      categoryNames="Transportation, Technology"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /<h1 class="wfdt-title">Fleet - Transportation Website Template<\/h1>/);
  assert.doesNotMatch(html, /Fleet - Transportation - Transportation/);
});

test('replaces a hyphenated category-qualified title suffix when rebuilding the title', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Shop - Retail & E-Commerce Website Template"
      categoryNames="Retail & E-Commerce, Technology"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /<h1 class="wfdt-title">Shop - Retail &amp; E-Commerce Website Template<\/h1>/);
  assert.doesNotMatch(html, /Shop - Retail &amp; E-Commerce - Retail/);
});

test('recognizes a raw source category alias while displaying its normalized category title', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Cinematic - Culture, Performance & Entertainment Website Template"
      categoryNames={'"Culture, Performance & Entertainment"'}
      enableAnalytics={false}
    />,
  );

  assert.match(html, /<h1 class="wfdt-title">Cinematic - Arts &amp; Entertainment Website Template<\/h1>/);
  assert.doesNotMatch(html, /Cinematic - Culture, Performance &amp; Entertainment - Arts/);
});

test('replaces a stale category-qualified title suffix when the title category changes', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Fleet - Transportation Website Template"
      titleCategoryName="Logistics"
      categoryNames="Transportation, Technology"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /<h1 class="wfdt-title">Fleet - Logistics Website Template<\/h1>/);
  assert.doesNotMatch(html, /Fleet - Transportation - Logistics/);
});

test('replaces a stale hyphenated category suffix when the title category changes', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Shop - Retail & E-Commerce Website Template"
      titleCategoryName="Technology"
      categoryNames="Technology"
      legacyTitleCategoryNames="Retail & E-Commerce"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /<h1 class="wfdt-title">Shop - Technology Website Template<\/h1>/);
  assert.doesNotMatch(html, /Shop - Retail &amp; E-Commerce - Technology/);
});

test('replaces a stale custom category suffix when the title category changes', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Fleet - Logistics Website Template"
      titleCategoryName="Technology"
      categoryNames="Technology"
      legacyTitleCategoryNames="Logistics"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /<h1 class="wfdt-title">Fleet - Technology Website Template<\/h1>/);
  assert.doesNotMatch(html, /Fleet - Logistics - Technology/);
});

test('preserves a hyphenated base name when replacing a stale category suffix', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Studio - Three - Logistics Website Template"
      titleCategoryName="Technology"
      categoryNames="Technology"
      legacyTitleCategoryNames="Logistics"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /<h1 class="wfdt-title">Studio - Three - Technology Website Template<\/h1>/);
  assert.doesNotMatch(html, /Studio - Technology Website Template/);
});

test('preserves a raw hyphenated template name', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Studio - Three"
      categoryNames="Technology"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /<h1 class="wfdt-title">Studio - Three - Technology Website Template<\/h1>/);
});

test('preserves a generic preformatted hyphenated name with an explicit title category', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero
      templateName="Studio - Three Website Template"
      titleCategoryName="Technology"
      categoryNames="Technology"
      enableAnalytics={false}
    />,
  );

  assert.match(html, /<h1 class="wfdt-title">Studio - Three - Technology Website Template<\/h1>/);
  assert.doesNotMatch(html, /Studio - Technology Website Template/);
});

test('uses the singular category name in the template title when no category list is available', () => {
  const html = renderToStaticMarkup(
    <TemplateDetailHero templateName="Fleet" categoryName="Transportation" enableAnalytics={false} />,
  );

  assert.match(html, /<h1 class="wfdt-title">Fleet - Transportation Website Template<\/h1>/);
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
