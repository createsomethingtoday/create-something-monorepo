import { expect, test } from '@playwright/test';

const ROUTES = ['/', '/services'];

for (const route of ROUTES) {
	test(`${route} keeps the Hub flow visible at 390x844`, async ({ page }) => {
		const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
		expect(response, `No response when loading route ${route}`).not.toBeNull();
		expect(response!.ok(), `Route ${route} returned HTTP ${response!.status()}`).toBeTruthy();

		const flow = page.locator('.mcp-viz-container').first();
		await expect(flow).toBeVisible();
		await flow.scrollIntoViewIfNeeded();
		await page.waitForTimeout(300);

		const result = await flow.evaluate((container) => {
			const bounds = container.getBoundingClientRect();
			const nodes = [...container.querySelectorAll<HTMLElement>('.node')].map((node) => {
				const rect = node.getBoundingClientRect();
				return {
					label: node.textContent?.replace(/\s+/g, ' ').trim() ?? 'unknown',
					withinBounds:
						rect.left >= bounds.left &&
						rect.right <= bounds.right &&
						rect.top >= bounds.top &&
						rect.bottom <= bounds.bottom
				};
			});

			return {
				nodeCount: nodes.length,
				outside: nodes.filter((node) => !node.withinBounds).map(({ label }) => label)
			};
		});

		expect(result.nodeCount, `Expected Hub flow nodes on ${route}`).toBeGreaterThan(0);
		expect(result.outside, `Hub flow clipped on ${route}: ${result.outside.join(', ')}`).toEqual([]);
	});
}
