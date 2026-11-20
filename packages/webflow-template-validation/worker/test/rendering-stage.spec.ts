import { createExecutionContext, env, runDurableObjectAlarm, runInDurableObject, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';

const SITE = 'https://example-template.webflow.io';

function stageTwoJob(jobId: string, overrides: Record<string, unknown> = {}) {
	const now = new Date().toISOString();
	return {
		jobId,
		correlationId: 'cs-rendering-stage-test',
		createdAt: now,
		startedAt: now,
		updatedAt: now,
		completedAt: null,
		status: 'running',
		progress: 70,
		message: 'Loading pages in a browser',
		fallbackUsed: false,
		request: { siteUrl: SITE, pageSlugs: [], designerData: {} },
		result: null,
		error: null,
		events: [],
		seq: 0,
		cancelRequested: false,
		pendingRendering: {
			// Not loadable, so the stage reports the check as unavailable without starting a browser.
			urls: ['not a url'],
			result: {
				url: SITE,
				success: true,
				categories: [{ category: 'Content & Accessibility', passed: true, issues: [] }],
				summary: { passedCategories: 1, failedCategories: 0, totalErrors: 0 }
			}
		},
		...overrides
	};
}

async function startStageTwo(jobId: string, job: unknown) {
	const stub = env.REVIEW_JOBS_DO.get(env.REVIEW_JOBS_DO.idFromName(`job:${jobId}`));
	await stub.fetch('https://internal/state', { method: 'PUT', body: JSON.stringify(job) });
	const scheduled = await stub.fetch('https://internal/render', { method: 'POST' });
	expect(scheduled.ok).toBe(true);
	// The alarm is due immediately; run it now unless the runtime already has.
	await runDurableObjectAlarm(stub);
}

async function readStatus(jobId: string) {
	for (let attempt = 0; ; attempt += 1) {
		const response = await worker.fetch(
			new Request(`https://validation-worker.createsomething.workers.dev/app-validator/review/${jobId}/status`),
			env,
			createExecutionContext()
		);
		expect(response.status).toBe(200);
		const status = (await response.json()) as any;
		if (status.status !== 'running' || attempt >= 20) return status;
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
}

describe('review job stage 2 (browser check in the Durable Object alarm)', () => {
	it('completes the job, adds the Browser Rendering category, and recounts the summary', async () => {
		const jobId = 'rendering-stage-completes';
		await startStageTwo(jobId, stageTwoJob(jobId));

		const status = await readStatus(jobId);
		expect(status.status).toBe('completed');
		expect(status.progress).toBe(100);
		const rendering = status.result.categories.find((category: any) => category.category === 'Browser Rendering');
		expect(rendering.passed).toBe(false);
		expect(rendering.issues.map((issue: any) => [issue.id, issue.severity])).toEqual([['rendering-unavailable', 'error']]);
		expect(status.result.summary).toMatchObject({ passedCategories: 1, failedCategories: 1, totalErrors: 1 });
	});

	it('leaves a cancelled job cancelled', async () => {
		const jobId = 'rendering-stage-cancelled';
		await startStageTwo(jobId, stageTwoJob(jobId, { status: 'cancelled', cancelRequested: true, message: 'Cancellation requested' }));

		const status = await readStatus(jobId);
		expect(status.status).toBe('cancelled');
		expect(status.result).toBeUndefined();
	});
});

describe('review job stage 1 cancellation', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('stays cancelled when the cancel arrives while the crawl is running', async () => {
		// Hold every site request until the cancel has been saved.
		let releaseCrawl: () => void = () => undefined;
		const crawlHeld = new Promise<void>((resolve) => {
			releaseCrawl = resolve;
		});
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				await crawlHeld;
				return new Response('<html><head><title>Home</title></head><body><h1>Home</h1></body></html>', {
					headers: { 'content-type': 'text/html' }
				});
			})
		);

		const ctx = createExecutionContext();
		const started = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/review/start', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					siteUrl: SITE,
					designerData: { variables: { collections: [] }, styles: [], components: [], pages: [], assets: [] }
				})
			}),
			env,
			ctx
		);
		const { jobId } = (await started.json()) as { jobId: string };

		// Wait for the job to reach the crawl, which is now held.
		for (let attempt = 0; attempt < 40; attempt += 1) {
			if ((await readStatus(jobId)).progress >= 55) break;
			await new Promise((resolve) => setTimeout(resolve, 25));
		}
		expect((await readStatus(jobId)).progress).toBe(55);

		const cancelled = await worker.fetch(
			new Request(`https://validation-worker.createsomething.workers.dev/app-validator/review/${jobId}/cancel`, { method: 'POST' }),
			env,
			createExecutionContext()
		);
		expect(cancelled.status).toBe(200);

		releaseCrawl();
		await waitOnExecutionContext(ctx);

		const status = await readStatus(jobId);
		expect(status.status).toBe('cancelled');
		expect(status.result ?? null).toBeNull();
	});
});

describe('Durable Object state storage', () => {
	function stubFor(name: string) {
		return env.REVIEW_JOBS_DO.get(env.REVIEW_JOBS_DO.idFromName(name));
	}

	async function put(name: string, value: unknown) {
		const response = await stubFor(name).fetch('https://internal/state', { method: 'PUT', body: JSON.stringify(value) });
		expect(response.ok).toBe(true);
	}

	async function get(name: string) {
		const response = await stubFor(name).fetch('https://internal/state', { method: 'GET' });
		return response.status === 404 ? null : await response.json();
	}

	it('round-trips a record larger than one 128 KiB value, including non-ASCII text', async () => {
		const big = { jobId: 'big', result: { notes: 'Café ✓ '.repeat(60_000) } };
		await put('state-big', big);
		expect(await get('state-big')).toEqual(big);

		// A smaller write replaces it and leaves no stale chunks behind.
		await put('state-big', { jobId: 'big', result: null });
		expect(await get('state-big')).toEqual({ jobId: 'big', result: null });
		await runInDurableObject(stubFor('state-big'), async (_instance, state) => {
			expect(await state.storage.get('state:chunks')).toBe(1);
			expect(await state.storage.get('state:1')).toBeUndefined();
		});
	});

	it('still reads records stored before chunking, and deletes them', async () => {
		await runInDurableObject(stubFor('state-legacy'), async (_instance, state) => {
			await state.storage.put('state', { siteId: 'legacy', status: 'active' });
		});
		expect(await get('state-legacy')).toEqual({ siteId: 'legacy', status: 'active' });

		await stubFor('state-legacy').fetch('https://internal/state', { method: 'DELETE' });
		expect(await get('state-legacy')).toBeNull();
	});
});

describe('validation start limit (strict, per network address)', () => {
	const START_URL = 'https://validation-worker.createsomething.workers.dev/app-validator/review/start';
	// No designerData: a request that passes the limit stops at 400 and starts no job.
	const start = (address?: string) =>
		worker.fetch(
			new Request(START_URL, {
				method: 'POST',
				headers: { 'content-type': 'application/json', ...(address ? { 'CF-Connecting-IP': address } : {}) },
				body: JSON.stringify({ siteUrl: 'https://example.webflow.io' })
			}),
			env,
			createExecutionContext()
		);

	it('lets exactly 10 starts through in one minute, then answers 429, for that address only', async () => {
		const statuses: number[] = [];
		for (let i = 0; i < 12; i += 1) statuses.push((await start('203.0.113.50')).status);
		expect(statuses).toEqual([...Array(10).fill(400), 429, 429]);

		const refused = await start('203.0.113.50');
		expect(refused.headers.get('Retry-After')).toBe('60');
		expect(((await refused.json()) as { reason: string }).reason).toBe('rate_limited');

		expect((await start('203.0.113.51')).status).toBe(400);
		expect((await start()).status).toBe(400);
	});

	it('holds the limit when 20 starts arrive at the same moment', async () => {
		const responses = await Promise.all(Array.from({ length: 20 }, () => start('203.0.113.70')));
		const statuses = responses.map((response) => response.status);
		expect(statuses.filter((status) => status === 400)).toHaveLength(10);
		expect(statuses.filter((status) => status === 429)).toHaveLength(10);
	});

	it('applies the same count to the legacy /validate route', async () => {
		for (let i = 0; i < 10; i += 1) await start('203.0.113.60');
		const legacy = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/validate', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.60' },
				body: '{}'
			}),
			env,
			createExecutionContext()
		);
		expect(legacy.status).toBe(429);
	});
});
