import { expect, test } from '@playwright/test';

const getBaseURL = () => test.info().project.use.baseURL ?? 'http://127.0.0.1:4173';

test('homepage hero keeps trust cues and CTA hierarchy visible at 390x844', async ({ page }) => {
	const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
	expect(response, 'No response when loading homepage hero').not.toBeNull();
	expect(response!.ok(), `Homepage returned HTTP ${response!.status()}`).toBeTruthy();

	const hero = page.locator('.hero-stage').first();
	await expect(hero.locator('.hero-title')).toBeVisible();
	await expect(hero.locator('a.btn-primary')).toContainText('Book Mapping Session');
	await expect(hero.locator('a.btn-ghost')).toContainText('See The Engagement Model');
	await expect(hero.locator('.hero-trust-cue')).toBeVisible();
	await expect(hero.locator('.hero-trust-cue__layer')).toHaveCount(3);
	await expect(hero.locator('.hero-artifact-chip')).toHaveCount(3);
});

test('homepage hero keeps content visible when reduced motion is requested', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });

	const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
	expect(response, 'No response when loading homepage hero with reduced motion').not.toBeNull();
	expect(response!.ok(), `Homepage returned HTTP ${response!.status()}`).toBeTruthy();

	const hero = page.locator('.hero-stage').first();
	await expect(hero.locator('.hero-title')).toBeVisible();
	await expect(hero.locator('.hero-signal-field__fallback')).toBeVisible();
	await expect(hero.locator('.hero-signal-field__canvas')).toBeHidden();
});

test('homepage hero renders without javascript', async ({ browser }) => {
	const context = await browser.newContext({
		javaScriptEnabled: false,
		viewport: { width: 390, height: 844 }
	});
	const page = await context.newPage();

	try {
		const response = await page.goto(`${getBaseURL()}/`, { waitUntil: 'load' });
		expect(response, 'No response when loading homepage hero without JavaScript').not.toBeNull();
		expect(response!.ok(), `Homepage returned HTTP ${response!.status()}`).toBeTruthy();

		const hero = page.locator('.hero-stage').first();
		await expect(hero.locator('.hero-title')).toBeVisible();
		await expect(hero.locator('a.btn-primary')).toBeVisible();
		await expect(hero.locator('.hero-trust-cue')).toBeVisible();
	} finally {
		await context.close();
	}
});
