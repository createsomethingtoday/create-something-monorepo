import { expect, test, type Locator, type Page } from '@playwright/test';

type RouteExpectation = {
	route: string;
	heading: RegExp;
	critical: (page: Page) => Locator;
};

const ROUTES: RouteExpectation[] = [
	{
		route: '/',
		heading: /Less, But Better/i,
		critical: (page) => page.getByRole('link', { name: /Meet the Masters/i })
	},
	{
		route: '/patterns',
		heading: /^Patterns$/i,
		critical: (page) => page.getByRole('heading', { name: /Where to Start/i })
	},
	{
		route: '/masters',
		heading: /Masters/i,
		critical: (page) =>
			page.getByText(/Curated creators who proved that simplicity is the ultimate sophistication\./i)
	}
];

for (const { route, heading, critical } of ROUTES) {
	test(`${route} keeps the critical mobile surface visible at 390x844`, async ({ page }) => {
		const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
		expect(response, `No response when loading route ${route}`).not.toBeNull();
		expect(response!.ok(), `Route ${route} returned HTTP ${response!.status()}`).toBeTruthy();

		await expect(page.getByRole('heading', { name: heading })).toBeVisible();
		await expect(critical(page)).toBeVisible();
	});
}
