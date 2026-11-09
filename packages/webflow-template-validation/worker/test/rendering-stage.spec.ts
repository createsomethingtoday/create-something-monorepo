import { createExecutionContext, env, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
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
