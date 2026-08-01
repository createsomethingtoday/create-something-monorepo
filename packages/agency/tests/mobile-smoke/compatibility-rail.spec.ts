import { expect, test } from '@playwright/test';

test('homepage compatibility action follows readable copy at 390x844', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response, 'No response when loading the homepage').not.toBeNull();
  expect(response!.ok(), `Homepage returned HTTP ${response!.status()}`).toBeTruthy();

  await page.waitForLoadState('networkidle');

  const geometry = await page.locator('.compatibility-rail__header').evaluate((header) => {
    const copy = header.firstElementChild;
    const action = header.querySelector('.compatibility-rail__catalog-link');
    if (!(copy instanceof HTMLElement) || !(action instanceof HTMLElement)) {
      throw new Error('Compatibility copy or directory action is missing');
    }

    const headerBox = header.getBoundingClientRect();
    const copyBox = copy.getBoundingClientRect();
    const actionBox = action.getBoundingClientRect();

    return {
      columnCount: getComputedStyle(header).gridTemplateColumns.trim().split(/\s+/).length,
      headerWidth: headerBox.width,
      copyWidth: copyBox.width,
      copyBottom: copyBox.bottom,
      actionTop: actionBox.top,
      actionLeft: actionBox.left,
      actionRight: actionBox.right,
      headerLeft: headerBox.left,
      headerRight: headerBox.right
    };
  });

  expect(geometry.columnCount, 'Compatibility header should collapse to one mobile column').toBe(1);
  expect(
    geometry.copyWidth,
    'Compatibility copy should retain the full readable mobile measure'
  ).toBeGreaterThanOrEqual(geometry.headerWidth * 0.8);
  expect(geometry.actionTop, 'Directory action should follow the copy').toBeGreaterThanOrEqual(
    geometry.copyBottom - 1
  );
  expect(geometry.actionLeft).toBeGreaterThanOrEqual(geometry.headerLeft - 1);
  expect(geometry.actionRight).toBeLessThanOrEqual(geometry.headerRight + 1);
});

test('compatibility header changes composition at the intended 800px threshold', async ({
  page
}) => {
  await page.setViewportSize({ width: 801, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });

  const header = page.locator('.compatibility-rail__header');
  await expect
    .poll(() => header.evaluate((element) => getComputedStyle(element).gridTemplateColumns))
    .toMatch(/\s/);

  await page.setViewportSize({ width: 800, height: 900 });

  const geometry = await header.evaluate((element) => {
    const copy = element.firstElementChild;
    const action = element.querySelector('.compatibility-rail__catalog-link');
    if (!(copy instanceof HTMLElement) || !(action instanceof HTMLElement)) {
      throw new Error('Compatibility copy or directory action is missing');
    }

    return {
      columnCount: getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length,
      copyBottom: copy.getBoundingClientRect().bottom,
      actionTop: action.getBoundingClientRect().top
    };
  });

  expect(geometry.columnCount).toBe(1);
  expect(geometry.actionTop).toBeGreaterThanOrEqual(geometry.copyBottom - 1);
});
