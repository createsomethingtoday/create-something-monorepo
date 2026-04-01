import { expect, test, type Locator, type Page } from '@playwright/test';

type RouteExpectation = {
	route: string;
	heading: RegExp;
	critical: (page: Page) => Locator;
};

const ROUTES: RouteExpectation[] = [
	{
		route: '/',
		heading: /A public workbench for trying the runtime in the open\./i,
		critical: (page) => page.getByRole('button', { name: /Open The Playground/i })
	},
	{
		route: '/praxis',
		heading: /Integration Praxis/i,
		critical: (page) => page.getByRole('button', { name: /^Run$/i })
	},
	{
		route: '/motion',
		heading: /Motion Ontology/i,
		critical: (page) => page.getByRole('button', { name: /Analyze Motion/i })
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
