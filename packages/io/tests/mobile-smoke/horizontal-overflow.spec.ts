import { expect, test } from '@playwright/test';

const ROUTES = ['/', '/papers', '/experiments'];
const MAX_OVERFLOW_PX = 0;

for (const route of ROUTES) {
	test(`${route} renders at 390x844 without horizontal overflow`, async ({ page }) => {
		const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
		expect(response, `No response when loading route ${route}`).not.toBeNull();
		expect(response!.ok(), `Route ${route} returned HTTP ${response!.status()}`).toBeTruthy();

		await page.waitForLoadState('networkidle');

		const metrics = await page.evaluate(() => {
			const htmlWidth = document.documentElement.scrollWidth;
			const bodyWidth = document.body ? document.body.scrollWidth : 0;
			const viewportWidth = window.innerWidth;
			const pageWidth = Math.max(htmlWidth, bodyWidth);
			return {
				viewportWidth,
				htmlWidth,
				bodyWidth,
				pageWidth,
				overflowPx: pageWidth - viewportWidth
			};
		});

		expect(
			metrics.overflowPx,
			[
				`Horizontal overflow detected on ${route}:`,
				`viewport=${metrics.viewportWidth}`,
				`html=${metrics.htmlWidth}`,
				`body=${metrics.bodyWidth}`,
				`overflow=${metrics.overflowPx}px`
			].join(' ')
		).toBeLessThanOrEqual(MAX_OVERFLOW_PX);
	});
}
