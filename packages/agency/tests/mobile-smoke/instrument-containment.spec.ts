import { expect, test } from '@playwright/test';

/**
 * `.waterway__scene` clips its contents (`overflow: hidden`), so a card that escapes the
 * scene is silently cut rather than pushing the page wide — invisible to the page-level
 * horizontal-overflow smoke. This asserts element-level containment at mobile width.
 *
 * Replaces hub-flow.spec.ts, which asserted `.mcp-viz-container`: that visualization was
 * removed from these routes in 38c780e92 and now survives only as unreferenced components.
 */
test('/services keeps the governed pipeline instrument inside its clipping scene at 390x844', async ({
	page
}) => {
	const response = await page.goto('/services', { waitUntil: 'domcontentloaded' });
	expect(response, 'No response when loading /services').not.toBeNull();
	expect(response!.ok(), `/services returned HTTP ${response!.status()}`).toBeTruthy();

	const figure = page.locator('.waterway__figure');
	await expect(figure).toBeVisible();
	await figure.scrollIntoViewIfNeeded();
	await page.waitForTimeout(400);

	const escaped = await page.evaluate(() => {
		const scene = document.querySelector('.waterway__scene');
		if (!scene) return ['missing .waterway__scene'];
		const bounds = scene.getBoundingClientRect();
		const tolerance = 1;
		const selectors = ['.waterway__flow-readout', '.waterway__milestones > li', '.pipeline-canvas'];
		const problems: string[] = [];

		for (const selector of selectors) {
			for (const node of Array.from(document.querySelectorAll(selector))) {
				const styles = getComputedStyle(node);
				if (styles.display === 'none' || styles.visibility === 'hidden') continue;
				const rect = node.getBoundingClientRect();
				if (rect.width === 0 && rect.height === 0) continue;
				if (
					rect.left < bounds.left - tolerance ||
					rect.right > bounds.right + tolerance ||
					rect.top < bounds.top - tolerance ||
					rect.bottom > bounds.bottom + tolerance
				) {
					problems.push(
						`${selector} escapes scene: ` +
							`el[${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.right)},${Math.round(rect.bottom)}] ` +
							`scene[${Math.round(bounds.left)},${Math.round(bounds.top)},${Math.round(bounds.right)},${Math.round(bounds.bottom)}]`
					);
				}
			}
		}
		return problems;
	});

	expect(escaped, `Pipeline instrument clipped on /services: ${escaped.join('; ')}`).toEqual([]);
});

test('/services keeps the Control operating ledger inside the figure at 390x844', async ({
	page
}) => {
	await page.goto('/services', { waitUntil: 'domcontentloaded' });

	const controlChapter = page
		.locator('.waterway__controls button')
		.filter({ hasText: /control/i })
		.first();
	await controlChapter.scrollIntoViewIfNeeded();
	await controlChapter.click();
	await page.waitForTimeout(400);

	const ledger = page.locator('[data-control-ledger]');
	await expect(ledger).toBeVisible();

	const overflow = await page.evaluate(() => {
		const figure = document.querySelector('.waterway__figure');
		const ledger = document.querySelector('[data-control-ledger]');
		if (!figure || !ledger) return 'missing figure or ledger';
		const figureBox = figure.getBoundingClientRect();
		const ledgerBox = ledger.getBoundingClientRect();
		if (ledgerBox.left < figureBox.left - 1 || ledgerBox.right > figureBox.right + 1) {
			return `ledger[${Math.round(ledgerBox.left)},${Math.round(ledgerBox.right)}] figure[${Math.round(figureBox.left)},${Math.round(figureBox.right)}]`;
		}
		return null;
	});

	expect(overflow, `Control ledger overflows the figure: ${overflow}`).toBeNull();
});
