import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = process.env.NPG_UI_URL || 'http://127.0.0.1:4258';
const evidence = process.env.NPG_UI_EVIDENCE || '/tmp/npg-map-evidence';
await mkdir(evidence, { recursive: true });

// The sample has a known zero, an unknown count, two locales with a shared
// state, and a national search that must stay outside the state rollups.
const locales = [
  ['Springfield, MO', 3, 120, 0, 2],
  ['Columbia, MO', 1, 50, 0, 1],
  ['Arlington, TX', 6, 240, 1, 2],
  ['Portland, OR', 2, 0, 0, 0],
  ['NY', 2, 0, 2, 0],
  ['Atlanta, GA', 4, 175, 0, 3],
  ['Los Angeles, CA', 8, 310, 0, 5],
  ['Phoenix, AZ', 0, 0, 0, 1],
  ['Nationwide', 1, 500, 0, 1]
].map(([locale, searches, matchingResults, unknownResultCounts, exportsPrepared]) => ({
  locale,
  searches,
  matchingResults,
  unknownResultCounts,
  exportsRequested: exportsPrepared,
  exportsPrepared,
  latestSearchAt: null,
  sourceFetchedAt: null,
  incompleteSearches: 0
}));
function summary(rows) {
  const totals = {
    searches: 0,
    matchingResults: 0,
    unknownResultCounts: 0,
    exportsRequested: 0,
    exportsPrepared: 0
  };
  for (const row of rows) for (const key of Object.keys(totals)) totals[key] += row[key];
  return {
    scope: 'owner_private',
    generatedAt: 0,
    window: 'all_saved_history',
    locales: rows,
    totals,
    limitations: []
  };
}
const browser = await chromium.launch();
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width < 400 ? 640 : 900 } });
    const external = [];
    await page.route('**/*', (route) => {
      if (new URL(route.request().url()).origin !== new URL(base).origin) {
        external.push(route.request().url());
        return route.abort();
      }
      if (route.request().url().includes('view=market'))
        return route.fulfill({ json: summary(locales) });
      return route.continue();
    });
    await page.goto(base + '/?state=idle&__reset=1');
    if (width < 1025) await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'Market activity', exact: true }).click();
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    const states = page
      .getByRole('button', { name: /^Explore a state/ })
      .or(page.getByRole('combobox', { name: /^Explore a state/ }));
    async function chooseState(name) {
      await states.click();
      await page.getByRole('option', { name: new RegExp('^' + name) }).click();
    }
    await expect(states).toBeVisible();
    await expect(page.getByLabel('Activity outside state map', { exact: true })).toContainText(
      'Nationwide'
    );
    await expect(page.getByRole('button', { name: /^Missouri:/ })).toHaveCount(1);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false
    );
    assert.deepEqual(external, []);
    await page.screenshot({ path: evidence + '/overview-' + width + '.png' });
    await chooseState('Missouri');
    const detail = page.getByLabel('State activity', { exact: true });
    await expect(detail).toContainText('Springfield, MO');
    await expect(detail).toContainText('Columbia, MO');
    await expect(detail).toContainText('170');
    await expect(detail).not.toContainText('Nationwide');
    if (width === 1440) {
      await page.screenshot({ path: evidence + '/selected-desktop.png' });
      await page
        .getByRole('group', { name: /United States market activity/ })
        .screenshot({ path: evidence + '/map-graphic.png' });
    }
    await page.getByRole('button', { name: 'Most matches' }).click();
    await expect(page.getByRole('button', { name: /^New York:/ })).toHaveAccessibleName(/unknown/i);
    await expect(page.getByRole('button', { name: /^Oregon:/ })).toHaveAccessibleName(/0/);
    await page.getByRole('button', { name: 'Most exports' }).click();
    await chooseState('Arizona');
    await expect(detail).toContainText('Phoenix, AZ');
    await expect(page.getByRole('button', { name: /^Arizona:/ })).toHaveAccessibleName(/1/);
    await chooseState('Missouri');
    await page.getByRole('button', { name: 'Most searches' }).click();
    if (width === 1440) {
      const oregon = page.getByRole('button', { name: /^Oregon:/ });
      await oregon.click();
      await expect(detail).toContainText('Portland, OR');
      await chooseState('Missouri');
    }
    await page.getByRole('button', { name: 'List', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Locale comparison' })).toContainText(
      'Springfield, MO'
    );
    await page.close();
  }
  for (const mode of ['unmapped', 'chunk-unavailable']) {
    const page = await browser.newPage();
    await page.route('**/api?view=market', (route) =>
      route.fulfill({
        json: summary(
          mode === 'unmapped' ? locales.filter((row) => row.locale === 'Nationwide') : locales
        )
      })
    );
    if (mode === 'chunk-unavailable')
      await page.route('**/assets/MarketMap-*.js', (route) => route.abort());
    await page.goto(base + '/?state=idle&__reset=1');
    await page.getByRole('button', { name: 'Market activity', exact: true }).click();
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    if (mode === 'unmapped') {
      await expect(page.getByText('No state-level history yet', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Activity outside state map', { exact: true })).toContainText(
        'Nationwide'
      );
    } else {
      await expect(page.getByRole('alert')).toContainText('map could not be loaded');
      await page.getByRole('button', { name: 'List', exact: true }).click();
      await expect(page.getByRole('list', { name: 'Locale comparison' })).toContainText(
        'Springfield, MO'
      );
    }
    await page.close();
  }
  console.log(
    'Market map passed responsive drilldown, metric switching, off-map activity and list fallback.'
  );
} finally {
  await browser.close();
}
