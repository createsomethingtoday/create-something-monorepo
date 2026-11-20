/**
 * Client for the GSAP crawl worker the Marketplace submission form uses.
 * Mirrors startPublishedUrlValidation / continuePublishedUrlValidation and
 * summarizeWorkerResponse in
 * webflow-template-submission-form/lib/intake/published-url.ts.
 * No auth header is sent; the form's public-URL path sends none either.
 */

import type { ValidationIssue } from './worker-client.ts';

export const GSAP_WORKER_URL = 'https://gsap-validation-worker.createsomething.workers.dev/crawlWebsite';
const START_OPTIONS = { maxDepth: 10, maxPages: 1000, async: true } as const;
const POLL_INTERVAL_MS = 2_000;
const REQUEST_TIMEOUT_MS = 45_000;

type PageResult = {
	url?: string;
	success?: boolean;
	passed?: boolean;
	error?: string;
	summary?: {
		validGsapCount?: number;
		legacyIx2Detected?: boolean;
		unicornStudioDetected?: boolean;
	};
	details?: {
		flaggedCode?: Array<{ message?: string; policy?: string }>;
		securityRisks?: Array<{ message?: string; flaggedCode?: string[] }>;
	};
};

export type GsapOutcome =
	| {
			status: 'complete';
			instanceId: string;
			passed: boolean;
			gsapDetected: boolean;
			legacyIx2Detected: boolean;
			unicornStudioDetected: boolean;
			pageCount: number;
			analyzedCount: number;
			failedCount: number;
			incomplete: boolean;
			issues: ValidationIssue[];
			raw: Record<string, unknown>;
	  }
	| { status: 'unavailable'; reason: string };

async function post(payload: Record<string, unknown>): Promise<Record<string, any>> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(GSAP_WORKER_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
			signal: controller.signal
		});
		const data = (await response.json().catch(() => null)) as Record<string, any> | null;
		if (!response.ok) {
			throw new Error(typeof data?.error === 'string' ? `HTTP ${response.status}: ${data.error}` : `HTTP ${response.status}`);
		}
		if (!data) throw new Error('invalid JSON response');
		return data;
	} finally {
		clearTimeout(timer);
	}
}

export async function runGsapCrawl(url: string, timeoutMs: number): Promise<GsapOutcome> {
	try {
		const start = await post({ url, ...START_OPTIONS });
		if (typeof start.instanceId !== 'string') {
			return { status: 'unavailable', reason: 'worker did not return a workflow instance' };
		}
		const instanceId = start.instanceId;
		const deadline = Date.now() + timeoutMs;
		let failures = 0;
		while (Date.now() < deadline) {
			await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
			let data: Record<string, any>;
			try {
				data = await post({ url, instanceId });
				failures = 0;
			} catch (error) {
				if (++failures >= 3) throw error;
				continue;
			}
			if (data.success === true && Array.isArray(data.pageResults)) return summarize(instanceId, data);
			const status = typeof data.status === 'string' ? data.status : 'running';
			if (status === 'complete' && data.output && typeof data.output === 'object') {
				return summarize(instanceId, data.output);
			}
			if (status === 'errored' || status === 'error' || status === 'terminated') {
				return { status: 'unavailable', reason: typeof data.error === 'string' ? data.error : `workflow ${status}` };
			}
		}
		return { status: 'unavailable', reason: `crawl still running after ${Math.round(timeoutMs / 1000)}s (instance ${instanceId})` };
	} catch (error) {
		return { status: 'unavailable', reason: error instanceof Error ? error.message : String(error) };
	}
}

function summarize(instanceId: string, data: Record<string, any>): GsapOutcome {
	if (data.success !== true) {
		return { status: 'unavailable', reason: typeof data.error === 'string' ? data.error : 'invalid crawl response' };
	}
	const pages: PageResult[] = Array.isArray(data.pageResults) ? data.pageResults : [];
	const site = (data.siteResults ?? {}) as Record<string, any>;
	const crawl = (data.crawlStats ?? {}) as Record<string, any>;
	const analyzedCount = typeof site.analyzedCount === 'number' ? site.analyzedCount : pages.filter((p) => p.success !== false).length;
	const requestFailures = pages.filter((p) => p.success === false);
	const validationFailures = pages.filter((p) => p.success !== false && p.passed === false);
	const failedCount = typeof site.failedCount === 'number' ? site.failedCount : requestFailures.length + validationFailures.length;
	const pageCount = typeof site.pageCount === 'number' ? site.pageCount : pages.length;
	const incomplete = site.incomplete === true || crawl.partial === true || crawl.truncatedByPageLimit === true;
	const passed = data.passed === true && failedCount === 0 && analyzedCount === pageCount && pageCount > 0 && !incomplete;
	const gsapDetected = pages.some((p) => (p.summary?.validGsapCount || 0) > 0);
	const legacyIx2Detected = pages.some(
		(p) =>
			p.summary?.legacyIx2Detected === true ||
			p.details?.flaggedCode?.some((f) => f.policy === 'ix2-rejected' || /legacy webflow ix2/i.test(f.message || ''))
	);
	const unicornStudioDetected = pages.some(
		(p) =>
			p.summary?.unicornStudioDetected === true ||
			p.details?.flaggedCode?.some((f) => f.policy === 'custom-code-third-party-unicorn-studio' || /unicorn studio/i.test(f.message || ''))
	);

	// One issue per distinct message. Every crawl failure blocks the form, so
	// each one carries a policy marker or error severity.
	const issues: ValidationIssue[] = [];
	const seen = new Set<string>();
	const add = (id: string, message: string, policy?: string) => {
		if (!message || seen.has(message)) return;
		seen.add(message);
		issues.push({ id, severity: 'error', message, details: policy ? { policy } : undefined });
	};
	if (!passed) {
		if (pageCount === 0 || analyzedCount === 0) add('gsap-crawl-no-pages', 'No published pages were crawled. Confirm the site is public.');
		if (incomplete) add('gsap-crawl-incomplete', 'The full published-site crawl did not finish.');
		for (const page of requestFailures.slice(0, 5)) add('gsap-crawl-page-fetch-failed', `${page.url ?? 'page'} could not be fetched (${page.error ?? 'unknown error'})`);
		for (const page of validationFailures) {
			for (const flagged of page.details?.flaggedCode ?? []) add('gsap-crawl-flagged-code', `${flagged.message ?? 'Flagged code'} (${page.url ?? 'page'})`, flagged.policy);
			for (const risk of page.details?.securityRisks ?? []) add('gsap-crawl-security-risk', `Custom code flagged as a security risk on ${page.url ?? 'a page'}: ${risk.message ?? (risk.flaggedCode ?? []).join(', ')}`);
		}
		if (issues.length === 0) add('gsap-crawl-failed', 'The published site did not pass the GSAP crawl checks.');
	}

	return {
		status: 'complete',
		instanceId,
		passed,
		gsapDetected,
		legacyIx2Detected,
		unicornStudioDetected,
		pageCount,
		analyzedCount,
		failedCount,
		incomplete,
		issues,
		raw: data
	};
}
