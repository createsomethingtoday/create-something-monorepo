import { expect, test } from '@playwright/test';

const routes = ['/', '/services', '/products', '/map', '/control', '/field-reports'];

for (const route of routes) {
	test(`${route} keeps the Playbook field between actions and proof at 390x844`, async ({ page }) => {
		const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
		expect(response, `No response when loading ${route}`).not.toBeNull();
		expect(response!.ok(), `${route} returned HTTP ${response!.status()}`).toBeTruthy();

		await page.waitForLoadState('networkidle');

		const geometry = await page.evaluate(() => {
			const hero = document.querySelector('.performance-campaign-opening');
			const actions = hero?.querySelector('.performance-campaign-opening__actions');
			const field = hero?.querySelector<HTMLElement>('[data-playbook-field]');
			const proof = hero?.querySelector('.performance-campaign-opening__proof');

			if (!hero || !actions || !field || !proof) {
				throw new Error('Playbook hero is missing its actions, field, or proof rail');
			}

			const rect = (element: Element) => {
				const box = element.getBoundingClientRect();
				return {
					top: box.top,
					bottom: box.bottom,
					left: box.left,
					right: box.right
				};
			};

			return {
				hero: rect(hero),
				actions: rect(actions),
				field: rect(field),
				proof: rect(proof),
				position: getComputedStyle(field).position
			};
		});

		expect(geometry.position, 'Field should be in document flow at mobile width').toBe('relative');
		expect(geometry.field.top, 'Field should start after the action stack').toBeGreaterThanOrEqual(
			geometry.actions.bottom - 1
		);
		expect(geometry.proof.top, 'Proof rail should follow the field').toBeGreaterThanOrEqual(
			geometry.field.bottom - 1
		);
		expect(geometry.field.left, 'Field should stay inside the hero').toBeGreaterThanOrEqual(
			geometry.hero.left - 1
		);
		expect(geometry.field.right, 'Field should stay inside the hero').toBeLessThanOrEqual(
			geometry.hero.right + 1
		);
	});
}
