import { expect, test } from '@playwright/test';

const routes = ['/', '/map', '/control'];

for (const route of routes) {
  test(`${route} keeps the Playbook field between actions and proof at 390x844`, async ({
    page
  }) => {
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

const macroHeroRoutes = [
  ['/services', 'playbook-how-it-works-approval-gate-mobile.webp'],
  ['/practice', 'playbook-practice-calibration-rig-mobile.webp'],
  ['/stack', 'playbook-what-you-keep-ownership-stack-mobile.webp'],
  ['/products', 'playbook-products-three-path-junction-mobile.webp'],
  ['/field-reports', 'playbook-field-reports-evidence-receipt-mobile.webp']
] as const;

for (const [route, mobileAsset] of macroHeroRoutes) {
  test(`${route} loads its authored portrait Playbook hero at 390x844`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response, `No response when loading ${route}`).not.toBeNull();
    expect(response!.ok(), `${route} returned HTTP ${response!.status()}`).toBeTruthy();

    const heroImage = page.locator('.performance-campaign-opening__media img');
    await expect(heroImage).toBeVisible();
    await expect(heroImage).toHaveAttribute('alt', /AI agent/i);
    await expect
      .poll(() => heroImage.evaluate((image: HTMLImageElement) => image.currentSrc))
      .toContain(mobileAsset);

    const geometry = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    }));

    expect(geometry.documentWidth, `${route} introduced horizontal overflow`).toBeLessThanOrEqual(
      geometry.viewportWidth + 1
    );
  });
}
