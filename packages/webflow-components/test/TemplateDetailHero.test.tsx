import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemplateDetailHero } from '../src/components/marketplace/TemplateDetailHero';

describe('TemplateDetailHero', () => {
  it('uses the first category name in the visible detail title', () => {
    const markup = renderToStaticMarkup(
      <TemplateDetailHero
        templateName="Wealthflow"
        categoryNames="Professional Services, Technology"
        showPreviewIframe={false}
        enableAnalytics={false}
      />,
    );

    assert.match(markup, /<h1 class="wfdt-title">Wealthflow - Professional Services Website Template<\/h1>/);
    assert.doesNotMatch(markup, /<h1 class="wfdt-title">Wealthflow - Website Template<\/h1>/);
  });

  it('keeps the category-free fallback when no category is available', () => {
    const markup = renderToStaticMarkup(
      <TemplateDetailHero
        templateName="Wealthflow"
        categoryName=""
        showPreviewIframe={false}
        enableAnalytics={false}
      />,
    );

    assert.match(markup, /<h1 class="wfdt-title">Wealthflow - Website Template<\/h1>/);
  });
});
