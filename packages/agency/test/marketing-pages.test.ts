import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  marketingPageMinimums,
  marketingPagePortfolio,
  scoreMarketingPage
} from '../src/lib/data/marketingPages.ts';

const packageRoot = new URL('..', import.meta.url).pathname;

function pageFileForRoute(route: string): string {
  const routePath = route === '/' ? '' : route.slice(1);
  return path.join(packageRoot, 'src/routes', routePath, '+page.svelte');
}

test('marketing portfolio covers the high-intent public funnel', () => {
  assert.ok(marketingPagePortfolio.length >= 24);

  for (const cluster of new Set(marketingPagePortfolio.map((entry) => entry.cluster))) {
    const entries = marketingPagePortfolio.filter((entry) => entry.cluster === cluster);
    assert.equal(
      entries.filter((entry) => entry.role === 'pillar').length,
      1,
      `${cluster} should have one pillar`
    );
  }
});

test('marketing portfolio owns every sitemap route and route-only page', () => {
  const searchRoutes = JSON.parse(
    readFileSync(path.join(packageRoot, 'src/lib/data/searchRoutes.json'), 'utf8')
  ) as Array<{ path: string }>;
  const portfolioPaths = new Set(marketingPagePortfolio.map((entry) => entry.path));
  const indexedPortfolioPaths = new Set(
    marketingPagePortfolio.filter((entry) => entry.decision === 'index').map((entry) => entry.path)
  );

  for (const route of searchRoutes) {
    assert.ok(portfolioPaths.has(route.path), `${route.path} is in sitemap but not portfolio`);
    assert.ok(
      indexedPortfolioPaths.has(route.path),
      `${route.path} is in sitemap but not indexable`
    );
  }

  for (const entry of marketingPagePortfolio.filter((entry) => entry.decision !== 'index')) {
    assert.ok(entry.routeTarget, `${entry.path} needs a routeTarget`);
    assert.ok(
      !searchRoutes.some((route) => route.path === entry.path),
      `${entry.path} should not be in sitemap`
    );
  }
});

test('Dify marketing cluster has one pillar and indexable support routes', () => {
  const difyPages = marketingPagePortfolio.filter((entry) => entry.cluster === 'dify');

  assert.equal(difyPages.filter((entry) => entry.role === 'pillar').length, 1);
  assert.deepEqual(difyPages.map((entry) => entry.path).sort(), [
    '/dify',
    '/dify/agent-eval-gates',
    '/dify/mcp-control-plane',
    '/dify/ship-dify-app-with-mcp-tools',
    '/dify/template-marketplace-proof'
  ]);
  assert.ok(difyPages.every((entry) => entry.decision === 'index'));
});

test('current marketing portfolio pages clear their route-decision strength threshold', () => {
  for (const entry of marketingPagePortfolio) {
    const source = readFileSync(pageFileForRoute(entry.path), 'utf8');
    const score = scoreMarketingPage(entry, source);

    assert.ok(
      score.percent >= marketingPageMinimums[entry.decision],
      `${entry.path} scored ${score.percent}`
    );
  }
});

test('internal-language drift lowers marketing page strength', () => {
  const entry = marketingPagePortfolio[0];
  const source = readFileSync(pageFileForRoute(entry.path), 'utf8');
  const cleanScore = scoreMarketingPage(entry, source, { plainLanguagePassed: true });
  const driftScore = scoreMarketingPage(entry, source, { plainLanguagePassed: false });

  assert.equal(cleanScore.percent - driftScore.percent, 12);
});
