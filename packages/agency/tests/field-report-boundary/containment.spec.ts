import { expect, test } from '@playwright/test';

const MAX_GEOMETRY_DRIFT_PX = 1;

test('the boundary metric stays inside its status panel', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  const response = await page.goto('/field-reports/template-review#result-boundary', {
    waitUntil: 'domcontentloaded'
  });
  expect(response, 'The field report did not return a response.').not.toBeNull();
  expect(response!.ok(), `The field report returned HTTP ${response!.status()}.`).toBeTruthy();

  const boundaryTab = page.getByRole('tab', {
    name: '02 Boundary Promotion remains blocked',
    exact: true
  });
  await expect(boundaryTab).toHaveAttribute('aria-selected', 'true');

  const metric = page.locator('.failed-boundary__status strong');
  await expect(metric).toHaveText(/1\s*\/\s*2\s*missed/i);
  await page.locator('.failed-boundary').scrollIntoViewIfNeeded();

  const geometry = await page.evaluate(() => {
    const status = document.querySelector<HTMLElement>('.failed-boundary__status');
    const metricRoot = status?.querySelector<HTMLElement>('strong');
    const judgment = status?.nextElementSibling as HTMLElement | null;

    if (!status || !metricRoot || !judgment) {
      throw new Error('The failed-boundary status, metric, or judgment column is missing.');
    }

    const statusRect = status.getBoundingClientRect();
    const judgmentRect = judgment.getBoundingClientRect();
    const metricElements = [metricRoot, ...metricRoot.querySelectorAll<HTMLElement>('*')];
    const metricRects = metricElements
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);
    const metricLeft = Math.min(...metricRects.map((rect) => rect.left));
    const metricRight = Math.max(...metricRects.map((rect) => rect.right));
    const statusAndJudgmentShareRow =
      statusRect.top < judgmentRect.bottom && statusRect.bottom > judgmentRect.top;
    const htmlWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const viewportWidth = window.innerWidth;

    return {
      viewportWidth,
      statusLeft: statusRect.left,
      statusRight: statusRect.right,
      statusWidth: statusRect.width,
      statusScrollWidth: status.scrollWidth,
      metricLeft,
      metricRight,
      judgmentLeft: judgmentRect.left,
      leftEscapePx: Math.max(0, statusRect.left - metricLeft),
      rightEscapePx: Math.max(0, metricRight - statusRect.right),
      judgmentOverlapPx: statusAndJudgmentShareRow
        ? Math.max(0, metricRight - judgmentRect.left)
        : 0,
      pageOverflowPx: Math.max(htmlWidth, bodyWidth) - viewportWidth
    };
  });

  expect(
    geometry.leftEscapePx,
    `Metric escaped the left edge at ${geometry.viewportWidth}px: ${JSON.stringify(geometry)}`
  ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
  expect(
    geometry.rightEscapePx,
    `Metric escaped the right edge at ${geometry.viewportWidth}px: ${JSON.stringify(geometry)}`
  ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
  expect(
    geometry.judgmentOverlapPx,
    `Metric overlapped the judgment column at ${geometry.viewportWidth}px: ${JSON.stringify(geometry)}`
  ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
  expect(
    geometry.pageOverflowPx,
    `Page overflowed at ${geometry.viewportWidth}px: ${JSON.stringify(geometry)}`
  ).toBeLessThanOrEqual(0);
  expect(runtimeErrors, 'The rendered Field Report emitted browser errors.').toEqual([]);
});
