// Synthetic HTTP fixtures; no live account or paid provider dispatch.
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const base = process.env.NPG_UI_URL || 'http://127.0.0.1:4258';
const evidence = process.env.NPG_UI_EVIDENCE || '/tmp/npg-market-evidence';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 640 } });
    await page.goto(base + '/?state=idle&__reset=1');
    if (width < 1025) await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'Market activity', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Market activity', exact: true })).toBeFocused();
    await expect(page.getByRole('heading', { name: 'Compare locales' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Locale comparison' })).toContainText(
      'Springfield, MO'
    );
    const rows = page.getByRole('list', { name: 'Locale comparison' }).getByRole('listitem');
    const visibleRow = await rows.nth(width === 1440 ? 1 : 0).boundingBox();
    assert(visibleRow && visibleRow.y + 70 < 640, 'comparison metrics must appear above fold');
    await page.getByRole('button', { name: 'Most exports' }).click();
    await expect(
      page.getByRole('list', { name: 'Locale comparison' }).getByRole('listitem').first()
    ).toContainText('Columbia, MO');
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false
    );
    await page.screenshot({ path: `${evidence}/market-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Back to conversations' }).click();
    await expect(page.getByRole('textbox', { name: 'Your question' })).toBeVisible();
    await page.close();
  }
  {
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    await page.goto(base + '/?state=idle&__reset=1');
    await page.locator('.history-item').first().click();

    const originalId = '0d0822cf-c2ac-4713-a6ba-fef887b7bccc';
    const nextId = '2d0822cf-c2ac-4713-a6ba-fef887b7bccc';
    const originalView = await page.evaluate(
      async (id) => (await fetch('/delivery/abundance/healthcare-analyst/api?id=' + id)).json(),
      originalId
    );
    let createdResearch = false;
    await page.route('**/healthcare-analyst/api*', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('view') === 'market') return route.continue();
      if (route.request().method() === 'POST' && route.request().postDataJSON().type === 'create') {
        createdResearch = true;
        return route.fulfill({
          json: { id: nextId, version: 0, status: 'idle', messages: [], sources: [], pending: null }
        });
      }
      if (url.searchParams.get('id') === originalId) return route.fulfill({ json: originalView });
      if (createdResearch && !url.searchParams.has('id'))
        return route.fulfill({
          json: {
            conversations: [
              { id: nextId, title: 'New research', status: 'idle', updated_at: Date.now() },
              {
                id: originalId,
                title: 'Find NPs near Springfield, MO, and keep the complete CSV.',
                status: 'idle',
                updated_at: Date.now()
              }
            ]
          }
        });
      return route.continue();
    });
    await page.getByRole('textbox', { name: 'Your question' }).fill('Keep this original draft');
    await page.getByRole('button', { name: 'Market activity', exact: true }).click();
    await page.getByRole('button', { name: 'Research Springfield, MO', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Your question' })).toHaveText(
      'Find nurse practitioners in Springfield, MO. Show registry coverage and include the complete sourcing CSV.'
    );
    await expect(page.getByRole('textbox', { name: 'Your question' })).toBeFocused();
    assert(
      await page.evaluate(() =>
        Object.values(JSON.parse(sessionStorage.getItem('npg-drafts:fixture') || '{}')).includes(
          'Keep this original draft'
        )
      ),
      'original conversation draft remains saved'
    );
    await page
      .locator('.history-item')
      .filter({ hasText: 'Find NPs near Springfield, MO, and keep the complete CSV.' })
      .click();
    await expect(page.getByRole('textbox', { name: 'Your question' })).toHaveText(
      'Keep this original draft'
    );
    await page.close();
  }
  for (const mode of ['empty', 'error']) {
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    if (mode === 'error')
      await page.route('**/api?view=market', (route) =>
        route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
      );
    await page.goto(base + '/?state=' + (mode === 'empty' ? 'new' : 'idle') + '&__reset=1');
    await page.getByRole('button', { name: 'Market activity', exact: true }).click();
    await expect(
      page.getByText(mode === 'empty' ? 'No saved market activity yet' : 'Activity unavailable', {
        exact: true
      })
    ).toBeVisible();
    if (mode === 'error')
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await page.close();
  }
  console.log(
    'Market comparison: four responsive viewports, sorting, focus, back, empty and error passed.'
  );
} finally {
  await browser.close();
}
