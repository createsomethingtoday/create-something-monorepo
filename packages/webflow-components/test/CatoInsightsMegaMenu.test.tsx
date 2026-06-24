import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CatoInsightsMegaMenu } from '../src/components/cato/CatoInsights';
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
