import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const root = new URL('../../../', import.meta.url);

async function source(path: string): Promise<string> {
  return readFile(new URL(path, root), 'utf8');
}

test('ltd-public-tools is one migrated two-route tool cohort', () => {
  const tools = performancePageRegistry.find((group) => group.id === 'ltd-public-tools');

  assert.equal(tools?.status, 'migrated');
  assert.equal(tools?.contract?.archetype, 'tool');
  assert.deepEqual(tools?.sources, [
    'packages/ltd/src/routes/brand/+page.svelte',
    'packages/ltd/src/routes/taste/insights/+page.svelte'
  ]);
});

test('both LTD public tools expose three chapters under the layout main', async () => {
  for (const route of ['brand', 'taste/insights']) {
    const page = await source(`packages/ltd/src/routes/${route}/+page.svelte`);

    assert.equal(
      (page.match(/data-performance-chapter=/g) ?? []).length,
      3,
      `${route} should expose exactly three tool chapters`
    );
    assert.match(page, /data-performance-chapter="task-state"/);
    assert.match(page, /data-performance-chapter="workspace"/);
    assert.match(page, /data-performance-chapter="decision-receipt"/);
    assert.doesNotMatch(page, /<main(?:\s|>)/);
    assert.doesNotMatch(page, /\bthe page\b/i);
  }
});

test('Brand preserves every source asset as a direct SVG download with a no-JavaScript path', async () => {
  const page = await source('packages/ltd/src/routes/brand/+page.svelte');
  const endpoint = await source('packages/ltd/src/routes/brand/[asset].svg/+server.ts');
  const assets = [
    'icon-with-bg',
    'icon-circular',
    'icon-only',
    'wordmark-white',
    'wordmark-black',
    'lockup-horizontal-light',
    'lockup-horizontal-dark',
    'lockup-stacked-light',
    'lockup-stacked-dark'
  ];

  for (const asset of assets) {
    assert.match(page, new RegExp(asset));
    assert.match(endpoint, new RegExp(`'${asset}'`));
  }

  assert.match(page, /download=\{asset\.file\}|download=\{[^}]*\.file\}/);
  assert.match(page, /Download SVG/);
  assert.match(page, /<noscript>/);
  assert.match(page, /direct download links|downloads remain available/i);
  assert.match(endpoint, /Content-Disposition/);
  assert.match(endpoint, /Asset not found/);
});

test('Brand names theme-dependent token truth and reports copy results', async () => {
  const page = await source('packages/ltd/src/routes/brand/+page.svelte');

  for (const token of [
    '--color-performance-bg-pure',
    '--color-performance-bg-elevated',
    '--color-performance-bg-surface',
    '--color-performance-fg-primary'
  ]) {
    assert.match(page, new RegExp(token));
  }

  assert.match(page, /Dark theme/);
  assert.match(page, /Light theme/);
  assert.match(page, /theme and property|property and theme/i);
  assert.match(page, /Copied/);
  assert.match(page, /Could not copy/);
  assert.match(page, /href="\/canon/);
  assert.match(page, /Usage Guidelines/);
});

test('Taste insights keeps every evidence family while exposing sign-in, retry, and study handoffs', async () => {
  const page = await source('packages/ltd/src/routes/taste/insights/+page.svelte');
  const server = await source('packages/ltd/src/routes/taste/insights/+page.server.ts');

  for (const evidence of [
    'Taste Profile',
    'Time per Channel',
    'Most-Studied References',
    'Activity (Last 30 Days)',
    'Collection Growth',
    'Share Profile'
  ]) {
    assert.match(page, new RegExp(evidence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(page, /href="\/login\?redirect=\/taste\/insights"/);
  assert.match(page, /href="\/taste\/insights"/);
  assert.match(page, /href="\/taste#source-channels"/);
  assert.match(page, /All recorded activity/);
  assert.match(page, /Last 30 days/);
  assert.match(page, /<noscript>/);
  assert.match(server, /errorKind:\s*'signed-out'/);
  assert.match(server, /errorKind:\s*'unavailable'/);
  assert.doesNotMatch(page, />Database not available</);
  assert.doesNotMatch(page, />Failed to load insights</);
});

test('Taste date-only values remain stable across reader timezones and activity has explicit semantics', async () => {
  const { formatDateOnly } = await import('../src/lib/taste/insights.ts');
  assert.equal(formatDateOnly('2026-07-17'), 'Jul 17');

  const page = await source('packages/ltd/src/routes/taste/insights/+page.svelte');
  assert.match(page, /formatDateOnly/);
  assert.match(page, /role="list"/);
  assert.match(page, /role="listitem"/);
  assert.match(page, /aria-label=/);
  assert.match(page, /Next study/);
});
