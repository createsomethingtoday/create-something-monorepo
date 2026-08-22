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

	async function bookingSnapshot() {
		const details = page.locator('.summary-panel details');
		if (!(await details.evaluate((element) => element.hasAttribute('open')))) {
			await details.locator('summary').click();
		}
		const summary = await details.locator('pre').innerText();
		const href = await details.getByRole('link', { name: 'Use this in booking' }).getAttribute('href');
		if (!href) throw new Error('Booking URL is missing');
		const publicReference = summary.match(/^Map reference: (map_[a-zA-Z0-9]+)$/m)?.[1];
		const readiness = summary.match(/^Readiness: (.+) \((\d+)\/100\)$/m);
		if (!publicReference || !readiness) throw new Error('Visible booking summary is incomplete');
		const url = new URL(href, page.url());
		const session = url.searchParams.get('atlas_session_id');
		if (!session) throw new Error('Booking URL session is missing');
		const expectedPublicReference = `map_${
			session.replace(/[^a-zA-Z0-9]/g, '').slice(-16) || 'anonymous'
		}`;
		const expectedSlug = readiness[1]!.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
		expect(publicReference).toBe(expectedPublicReference);
		expect(url.searchParams.get('score')).toBe(readiness[2]);
		expect(url.searchParams.get('readiness')).toBe(expectedSlug);
		return { summary, session, score: readiness[2], href };
	}

	await check('route_and_responsive_render', async () => {
		let response = await page.goto('/map', { waitUntil: 'domcontentloaded' });
		expect(response?.status()).toBe(200);
		await page.evaluate(() => localStorage.clear());
		response = await page.reload({ waitUntil: 'domcontentloaded' });
		expect(response?.status()).toBe(200);
		await expect(page.getByRole('region', { name: 'Public Map workflow canvas' })).toBeVisible();
		await page.waitForTimeout(1_000);
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
		expect(overflow).toBeLessThanOrEqual(1);
	});

	let starterSession = '';
	await check('starter_booking_context', async () => {
		await page.locator('.starter-grid button').filter({ hasText: 'RevOps lead handoff' }).click();
		await expect(page.locator('.starter-panel .panel-title strong')).toHaveText('RevOps lead handoff loaded');
		const snapshot = await bookingSnapshot();
		starterSession = snapshot.session;
		expect(snapshot.summary).toContain('Readiness: Pilot candidate (100/100)');
	});

	await check('edit_booking_context', async () => {
		await page.getByLabel('Label').fill('Synthetic workflow record');
		const snapshot = await bookingSnapshot();
		expect(snapshot.summary).toContain('Synthetic workflow record');
		expect(snapshot.session).toBe(starterSession);
		const storedSummary = await page.evaluate(() => localStorage.getItem('create-something:workflow-mapping-warmup'));
		expect(storedSummary).toContain('Synthetic workflow record');
	});

	await check('restore_booking_context', async () => {
		await page.reload({ waitUntil: 'domcontentloaded' });
		await page.waitForFunction(() => {
			const raw = localStorage.getItem('create-something:public-atlas-canvas');
			if (!raw) return false;
			try {
				return JSON.parse(raw).nodes?.some((node: { label?: string }) => node.label === 'Synthetic workflow record');
			} catch {
				return false;
			}
		});
		const snapshot = await bookingSnapshot();
		expect(snapshot.summary).toContain('Synthetic workflow record');
		expect(snapshot.session).toBe(starterSession);
	});

	await check('reset_booking_context', async () => {
		await page.getByRole('button', { name: 'Reset' }).click();
		const snapshot = await bookingSnapshot();
		expect(snapshot.session).not.toBe(starterSession);
		expect(snapshot.summary).not.toContain('Synthetic workflow record');
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
