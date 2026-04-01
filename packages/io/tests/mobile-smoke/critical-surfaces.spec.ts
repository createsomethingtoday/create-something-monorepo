import { expect, test, type Locator, type Page } from '@playwright/test';

type RouteExpectation = {
	route: string;
	heading: RegExp;
	assertCritical: (page: Page) => Locator;
};

const ROUTES: RouteExpectation[] = [
	{
		route: '/',
		heading: /Research for teams building automation they can defend\./i,
		assertCritical: (page) => page.getByRole('button', { name: /Read The Papers/i })
	},
	{
		route: '/papers',
		heading: /Research Papers/i,
		assertCritical: (page) => page.getByLabel(/Search papers/i)
	},
	{
		route: '/experiments',
		heading: /All Experiments/i,
		assertCritical: (page) => page.getByLabel(/Search experiments/i)
	}
];

for (const { route, heading, assertCritical } of ROUTES) {
	test(`${route} keeps the critical mobile surface visible at 390x844`, async ({ page }) => {
		const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
		expect(response, `No response when loading route ${route}`).not.toBeNull();
		expect(response!.ok(), `Route ${route} returned HTTP ${response!.status()}`).toBeTruthy();

		await expect(page.getByRole('heading', { name: heading })).toBeVisible();
		await expect(assertCritical(page)).toBeVisible();
	});
}
