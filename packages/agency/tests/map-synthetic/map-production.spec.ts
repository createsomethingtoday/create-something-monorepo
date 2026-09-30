import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

type Check = { id: string; ok: boolean; detail?: string; duration_ms?: number };

test('credential-free Map production workflow remains coherent', async ({ page, request }, testInfo) => {
	const checks: Check[] = [];
	const consoleFailures: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error') consoleFailures.push(message.text());
	});
	page.on('pageerror', (cause) => consoleFailures.push(cause.message));

	async function check(id: string, operation: () => Promise<void>) {
		const started = Date.now();
		try {
			await operation();
			checks.push({ id, ok: true, duration_ms: Date.now() - started });
		} catch (cause) {
			checks.push({
				id,
				ok: false,
				detail: cause instanceof Error ? cause.message : String(cause),
				duration_ms: Date.now() - started
			});
		}
	}

	const draw = page.frameLocator('iframe[title="Draw — CREATE SOMETHING workflow mapping canvas"]');

	await check('route_and_responsive_render', async () => {
		const response = await page.goto('/map', { waitUntil: 'domcontentloaded' });
		expect(response?.status()).toBe(200);
		await expect(page.getByRole('heading', { name: 'The canvas we use for mapping.' })).toBeVisible();
		await page.locator('iframe').scrollIntoViewIfNeeded();
		await expect(draw.getByRole('region', { name: 'Mapping canvas workbench' })).toBeVisible();
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
		expect(overflow).toBeLessThanOrEqual(1);
	});

	await check('draw_edit_and_restore', async () => {
		const title = draw.getByRole('textbox', { name: 'Canvas title' });
		await title.fill('Synthetic workflow map');
		await title.blur();
		await expect(title).toHaveValue('Synthetic workflow map');
		// Poll the app's persistence instead of racing its local save debounce.
		await expect.poll(async () => {
			const frame = page.frames().find((candidate) => candidate.url().includes('draw.createsomething.agency'));
			return frame?.evaluate(() => Object.values(localStorage).some((value) => value.includes('Synthetic workflow map')));
		}).toBe(true);
		await page.reload({ waitUntil: 'domcontentloaded' });
		await page.locator('iframe').scrollIntoViewIfNeeded();
		await expect(draw.getByRole('textbox', { name: 'Canvas title' })).toHaveValue('Synthetic workflow map');
	});

	await check('mapping_session_handoff', async () => {
		const booking = page.locator('main').getByRole('link', { name: 'Book a mapping session', exact: true });
		const href = await booking.getAttribute('href');
		expect(href).toBeTruthy();
		const url = new URL(href!, page.url());
		expect(url.pathname).toBe('/book');
		expect(url.searchParams.get('intent')).toBe('workflow-mapping');
		await expect(page.getByRole('link', { name: 'Open full canvas' })).toHaveAttribute('href', 'https://draw.createsomething.agency/');
		await expect(page.getByRole('link', { name: 'Open saved Map workspace' })).toHaveAttribute('href', '/map/workspace');
	});

	await check('mapping_agent_non_mutating_boundary', async () => {
		const getResponse = await request.get('/api/atlas/public-agent');
		expect(getResponse.status()).toBe(405);
		const rejectedPost = await request.post('/api/atlas/public-agent', { data: {} });
		expect(rejectedPost.status()).toBe(400);
	});

	if (process.env.MAP_SYNTHETIC_REQUIRE_HEALTH !== 'false') {
		await check('map_health', async () => {
			const response = await request.get('/api/map/health');
			expect(response.status()).toBe(200);
			const body = await response.json();
			expect(body.status).toBe('ready');
		});
	}

	await check('console_health', async () => {
		expect(consoleFailures).toEqual([]);
	});

	const receipt = {
		schema_version: 1,
		checked_at: new Date().toISOString(),
		base_url: process.env.MAP_SYNTHETIC_BASE_URL ?? 'https://createsomething.agency',
		viewport: testInfo.project.name,
		label: 'map-production-synthetic',
		customer_data_used: false,
		agent_mutation_used: false,
		booking_submitted: false,
		ok: checks.every((candidate) => candidate.ok),
		checks
	};
	await mkdir('artifacts/map-synthetic', { recursive: true });
	await writeFile(
		`artifacts/map-synthetic/receipt-${testInfo.project.name}.json`,
		JSON.stringify(receipt, null, 2)
	);
	expect(checks.filter((candidate) => !candidate.ok), JSON.stringify(receipt, null, 2)).toEqual([]);
});
