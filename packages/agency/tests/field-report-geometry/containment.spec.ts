import { expect, test } from '@playwright/test';

const MAX_GEOMETRY_DRIFT_PX = 1;

test('the result metrics stay inside their evidence cells', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  const response = await page.goto('/field-reports/template-review#result-result', {
    waitUntil: 'domcontentloaded'
  });
  expect(response, 'The field report did not return a response.').not.toBeNull();
  expect(response!.ok(), `The field report returned HTTP ${response!.status()}.`).toBeTruthy();

  const result = page.locator('.field-result');
  await expect(result).toBeVisible();
  await expect(result.locator('dd')).toHaveText(['49 / 50', 'Blocked', 'Unmeasured']);
  await result.scrollIntoViewIfNeeded();

  const geometry = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('.field-result');
    const cells = [...document.querySelectorAll<HTMLElement>('.field-result__metrics > div')];

    if (!panel || cells.length !== 3) {
      throw new Error('The Result panel or its three metric cells are missing.');
    }

    const panelRect = panel.getBoundingClientRect();
    const metrics = cells.map((cell, index) => {
      const value = cell.querySelector<HTMLElement>('dd');
      if (!value) throw new Error(`Result metric ${index + 1} is missing its value.`);

      const cellRect = cell.getBoundingClientRect();
      const valueRects = [value, ...value.querySelectorAll<HTMLElement>('*')]
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0);
      const valueLeft = Math.min(...valueRects.map((rect) => rect.left));
      const valueRight = Math.max(...valueRects.map((rect) => rect.right));

      return {
        label: value.textContent?.trim() ?? `metric ${index + 1}`,
        cellLeft: cellRect.left,
        cellRight: cellRect.right,
        cellWidth: cellRect.width,
        cellScrollWidth: cell.scrollWidth,
        valueLeft,
        valueRight,
        leftEscapePx: Math.max(0, cellRect.left - valueLeft),
        rightEscapePx: Math.max(0, valueRight - cellRect.right),
        panelLeftEscapePx: Math.max(0, panelRect.left - valueLeft),
        panelRightEscapePx: Math.max(0, valueRight - panelRect.right)
      };
    });
    const htmlWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const viewportWidth = window.innerWidth;

    return {
      viewportWidth,
      panelLeft: panelRect.left,
      panelRight: panelRect.right,
      metrics,
      pageOverflowPx: Math.max(htmlWidth, bodyWidth) - viewportWidth
    };
  });

  for (const metric of geometry.metrics) {
    expect(
      metric.leftEscapePx,
      `${metric.label} escaped its cell left edge at ${geometry.viewportWidth}px: ${JSON.stringify(metric)}`
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
    expect(
      metric.rightEscapePx,
      `${metric.label} escaped its cell right edge at ${geometry.viewportWidth}px: ${JSON.stringify(metric)}`
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
    expect(
      metric.panelLeftEscapePx,
      `${metric.label} escaped the Result panel left edge at ${geometry.viewportWidth}px: ${JSON.stringify(metric)}`
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
    expect(
      metric.panelRightEscapePx,
      `${metric.label} escaped the Result panel right edge at ${geometry.viewportWidth}px: ${JSON.stringify(metric)}`
    ).toBeLessThanOrEqual(MAX_GEOMETRY_DRIFT_PX);
  }
  expect(
    geometry.pageOverflowPx,
    `Page overflowed at ${geometry.viewportWidth}px: ${JSON.stringify(geometry)}`
  ).toBeLessThanOrEqual(0);
  expect(runtimeErrors, 'The rendered Field Report emitted browser errors.').toEqual([]);
});

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

  const boundary = page.locator('.failed-boundary');
  await expect(boundary).toBeVisible();
  const metric = page.locator('.failed-boundary__status strong');
  await expect(metric).toHaveText(/1\s*\/\s*2\s*missed/i);
  await boundary.scrollIntoViewIfNeeded();

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
