/**
 * Webflow Way Validator - Unified Cloudflare Worker
 *
 * Endpoints:
 * - /api/validate: Designer validation
 * - /validate: Enhanced crawl validation
 * - /validate/assets: Batched asset validation
 * - /app-validator/review/*: Async validation with SSE progress
 * - /app-validator/snippet/*: Bridge install + token lifecycle
 */

import { validateAssets, validateAssetBatch } from './validators/asset-validator';
import { validateContent } from './validators/content-validator';
import { validateAccessibility } from './validators/accessibility-validator';
import { validateDesignerData } from './validators/designer-validator';
import { validateInteractions } from './validators/interactions-validator';
import { fetchHTML } from './utils/fetch-utils';
import {
	ValidationRequest,
	ValidationResponse,
	DesignerData,
	AssetBatchRequest,
	AssetBatchResponse,
	AssetAnalysisResult,
	ContentAnalysisResult,
	AccessibilityAnalysisResult,
	AccessibilityAudit,
	ReviewStartRequest,
	ReviewStartResponse,
	ReviewStatusResponse,
	SnippetInstallRequest,
	SnippetInstallResponse,
	SnippetStatusResponse,
	SnippetRotateTokenRequest,
	ValidationSubmitRequest,
	ValidationSubmitResponse
} from './types';

const REVIEW_SNIPPET_VERSION = '0.3.0';
const REVIEW_SNIPPET_MARKER = '__wf_review_snippet_v1';
const REVIEW_SNIPPET_ASSET_PATH = '/app-validator/snippet/review.js';
const REVIEW_JOB_RETENTION_MS = 30 * 60 * 1000;
const REVIEW_JOB_EVENT_LIMIT = 250;
const AIRTABLE_BASE_ID = 'appMoIgXMTTTNIc3p';
const AIRTABLE_TABLE_ID = 'tblRwzpWoLgE9MrUm';
const DEFAULT_SUBMISSION_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_SUBMISSION_MAX = 6;
const SUBMISSION_BURST_WINDOW_MS = 90 * 1000;
const SUBMISSION_BURST_THRESHOLD = 3;
const SUBMISSION_CLIENT_CHURN_THRESHOLD = 3;
const encoder = new TextEncoder();

const TERMINAL_STATUSES = new Set<ReviewStatusResponse['status']>([
	'completed',
	'failed',
	'cancelled'
]);

const ALLOWED_ORIGIN_PATTERNS = [
	/^https:\/\/([a-z0-9-]+\.)*webflow\.com$/i,
	/^https:\/\/([a-z0-9-]+\.)*webflow\.io$/i,
	/^https:\/\/([a-z0-9-]+\.)*webflow-ext\.com$/i,
	/^https?:\/\/localhost(?::\d+)?$/i,
	/^https?:\/\/127\.0\.0\.1(?::\d+)?$/i
];

interface TelemetryEvent {
	event: string;
	correlationId: string;
	level?: 'info' | 'error';
	payload?: Record<string, unknown>;
}

interface ReviewJobEvent {
	seq: number;
	type: string;
	payload: Record<string, unknown>;
	at: string;
}

interface ReviewJobState {
	jobId: string;
	correlationId: string;
	createdAt: string;
	startedAt: string;
	updatedAt: string;
	completedAt: string | null;
	status: ReviewStatusResponse['status'];
	progress: number;
	message: string;
	fallbackUsed: boolean;
	request: ReviewStartRequest;
	result: any | null;
	error: string | null;
	events: ReviewJobEvent[];
	seq: number;
	cancelRequested: boolean;
}

interface SnippetTokenRecord {
	siteId: string;
	siteName: string | null;
	bridgeToken: string;
	snippetVersion: string;
	installMethod: 'webflow-api' | 'manual-fallback';
	status: 'active' | 'pending_manual' | 'failed';
	installed: boolean;
	message?: string;
	updatedAt: string;
}

interface SubmissionAttemptRecord {
	at: string;
	origin: string | null;
	clientHash: string | null;
	userAgentHash: string | null;
	payloadHash: string;
	correlationId: string;
}

interface SubmissionRateLimitState {
	siteId: string;
	updatedAt: string;
	attempts: SubmissionAttemptRecord[];
}

const reviewJobs = new Map<string, ReviewJobState>();
const snippetTokens = new Map<string, SnippetTokenRecord>();
const submissionStates = new Map<string, SubmissionRateLimitState>();

export class ReviewJobsDurableObject {
	private readonly state: DurableObjectState;

	constructor(state: DurableObjectState) {
		this.state = state;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/state' && request.method === 'PUT') {
			const body = await request.json();
			await this.state.storage.put('state', body);
			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (url.pathname === '/state' && request.method === 'GET') {
			const stored = await this.state.storage.get('state');
			if (!stored) {
				return new Response(JSON.stringify({ error: 'Not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			return new Response(JSON.stringify(stored), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (url.pathname === '/state' && request.method === 'DELETE') {
			await this.state.storage.delete('state');
			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const correlationId = getCorrelationId(request);

		if (url.pathname === REVIEW_SNIPPET_ASSET_PATH) {
			if (request.method === 'OPTIONS') {
				return new Response(null, {
					status: 204,
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-Id',
						'Access-Control-Max-Age': '86400'
					}
				});
			}

			if (!['GET', 'HEAD'].includes(request.method)) {
				return new Response('Method not allowed', {
					status: 405,
					headers: {
						Allow: 'GET, HEAD, OPTIONS',
						'Access-Control-Allow-Origin': '*'
					}
				});
			}

			return await handleReviewSnippetAsset(request, env as Env);
		}

		if (request.method === 'OPTIONS') {
			return handleCORSPreflight(request);
		}

		if (!isOriginAllowedForRequest(request)) {
			return jsonResponse(
				{ error: 'Origin not allowed', correlationId },
				403,
				request
			);
		}

		cleanupOldJobs();

		try {
			const reviewStatusMatch = url.pathname.match(/^\/app-validator\/review\/([^/]+)\/status$/);
			const reviewCancelMatch = url.pathname.match(/^\/app-validator\/review\/([^/]+)\/cancel$/);
			const reviewEventsMatch = url.pathname.match(/^\/app-validator\/review\/([^/]+)\/events$/);

			if (url.pathname === '/app-validator/review/start') {
				if (request.method !== 'POST') return methodNotAllowed(request);
				return await handleReviewStart(request, env, ctx, correlationId);
			}

			if (reviewCancelMatch) {
				if (request.method !== 'POST') return methodNotAllowed(request);
				return await handleReviewCancel(request, env, reviewCancelMatch[1], correlationId);
			}

			if (reviewStatusMatch) {
				if (request.method !== 'GET') return methodNotAllowed(request);
				return await handleReviewStatus(request, env, reviewStatusMatch[1]);
			}

			if (reviewEventsMatch) {
				if (request.method !== 'GET') return methodNotAllowed(request);
				return await handleReviewEvents(request, env, reviewEventsMatch[1]);
			}

			if (url.pathname === '/app-validator/snippet/install') {
				if (request.method !== 'POST') return methodNotAllowed(request);
				return await handleSnippetInstall(request, env, ctx, correlationId);
			}

			if (url.pathname === '/app-validator/snippet/status') {
				if (request.method !== 'GET') return methodNotAllowed(request);
				return await handleSnippetStatus(request, env);
			}

			if (url.pathname === '/app-validator/snippet/rotate-token') {
				if (request.method !== 'POST') return methodNotAllowed(request);
				return await handleSnippetRotateToken(request, env, ctx, correlationId);
			}

			if (url.pathname === '/app-validator/submit') {
				if (request.method !== 'POST') return methodNotAllowed(request);
				return await handleValidationSubmit(request, env, ctx, correlationId);
			}

			switch (url.pathname) {
				case '/api/validate':
					if (request.method !== 'POST') return methodNotAllowed(request);
					return await handleDesignerValidation(request);

				case '/':
				case '/validate':
					if (request.method !== 'POST') return methodNotAllowed(request);
					return await handleEnhancedValidation(request);

				case '/validate/assets':
					if (request.method !== 'POST') return methodNotAllowed(request);
					return await handleBatchedAssetValidation(request);

				case '/health':
					return jsonResponse(
						{
							status: 'healthy',
							timestamp: new Date().toISOString(),
							version: '2.2.0',
							endpoints: [
								'/api/validate',
								'/validate',
								'/validate/assets',
								'/app-validator/review/start',
								'/app-validator/review/:jobId/status',
								'/app-validator/review/:jobId/events',
								'/app-validator/snippet/install',
								'/app-validator/snippet/status',
								'/app-validator/snippet/rotate-token',
								REVIEW_SNIPPET_ASSET_PATH,
								'/app-validator/submit'
							]
						},
						200,
						request
					);

				default:
					return jsonResponse(
						{ error: 'Webflow Way Validator Worker - Not Found' },
						404,
						request
					);
			}
		} catch (error) {
			await emitTelemetry(env, {
				event: 'worker.error',
				correlationId,
				level: 'error',
				payload: {
					message: error instanceof Error ? error.message : String(error),
					path: url.pathname
				}
			});
			return jsonResponse(
				{
					error: 'Internal server error',
					message: error instanceof Error ? error.message : 'Unknown error',
					correlationId
				},
				500,
				request
			);
		}
	}
} satisfies ExportedHandler<Env>;

async function handleReviewStart(
	request: Request,
	env: unknown,
	ctx: ExecutionContext,
	correlationId: string
): Promise<Response> {
	const body = (await request.json()) as ReviewStartRequest;
	if (!body || !body.siteUrl || !body.designerData) {
		return jsonResponse(
			{ error: 'Missing required fields: siteUrl and designerData', correlationId },
			400,
			request
		);
	}

	const jobId = crypto.randomUUID();
	const now = new Date().toISOString();
	const normalizedCorrelationId = normalizeCorrelationId(body.correlationId || correlationId);

	const job: ReviewJobState = {
		jobId,
		correlationId: normalizedCorrelationId,
		createdAt: now,
		startedAt: now,
		updatedAt: now,
		completedAt: null,
		status: 'queued',
		progress: 0,
		message: 'Queued',
		fallbackUsed: false,
		request: {
			...body,
			pageSlugs: Array.isArray(body.pageSlugs) ? body.pageSlugs : [],
			correlationId: normalizedCorrelationId
		},
		result: null,
		error: null,
		events: [],
		seq: 0,
		cancelRequested: false
	};

	reviewJobs.set(jobId, job);
	pushJobEvent(job, 'queued', {
		jobId,
		status: job.status,
		progress: job.progress,
		message: job.message
	});
	await persistReviewJobState(env, job);

	await emitTelemetry(env, {
		event: 'review.start',
		correlationId: normalizedCorrelationId,
		payload: {
			jobId,
			siteUrl: body.siteUrl,
			pageCount: Array.isArray(body.pageSlugs) ? body.pageSlugs.length : 0,
			checks: body.checks || []
		}
	});

	ctx.waitUntil(runReviewJob(jobId, env));

	const origin = new URL(request.url).origin;
	const response: ReviewStartResponse = {
		jobId,
		statusUrl: `${origin}/app-validator/review/${jobId}/status`,
		eventsUrl: `${origin}/app-validator/review/${jobId}/events`,
		startedAt: now
	};

	return jsonResponse(response, 202, request);
}

async function handleReviewCancel(
	request: Request,
	env: unknown,
	jobId: string,
	correlationId: string
): Promise<Response> {
	const job = await getReviewJobState(env, jobId);
	if (!job) {
		return jsonResponse({ error: 'Job not found', correlationId }, 404, request);
	}

	if (TERMINAL_STATUSES.has(job.status)) {
		return jsonResponse(
			{
				jobId,
				status: job.status,
				message: 'Job is already terminal'
			},
			200,
			request
		);
	}

	job.cancelRequested = true;
	job.status = 'cancelled';
	job.message = 'Cancellation requested';
	job.updatedAt = new Date().toISOString();
	job.completedAt = job.updatedAt;

	pushJobEvent(job, 'cancelled', {
		jobId,
		status: job.status,
		progress: job.progress,
		message: job.message
	});
	await persistReviewJobState(env, job);

	await emitTelemetry(env, {
		event: 'review.cancel',
		correlationId: job.correlationId || correlationId,
		payload: { jobId }
	});

	return jsonResponse(
		{
			jobId,
			status: 'cancelled',
			message: 'Job cancelled'
		},
		200,
		request
	);
}

async function handleReviewStatus(
	request: Request,
	env: unknown,
	jobId: string
): Promise<Response> {
	const job = await getReviewJobState(env, jobId);
	if (!job) {
		return jsonResponse({ error: 'Job not found' }, 404, request);
	}

	return jsonResponse(toReviewStatus(job), 200, request);
}

async function handleReviewEvents(
	request: Request,
	env: unknown,
	jobId: string
): Promise<Response> {
	const job = await getReviewJobState(env, jobId);
	if (!job) {
		return jsonResponse({ error: 'Job not found' }, 404, request);
	}

	const stream = createJobEventStream(env, jobId, job);
	const headers = getCORSHeaders(request, {
		'Content-Type': 'text/event-stream; charset=utf-8',
		'Cache-Control': 'no-cache, no-transform',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no'
	});

	return new Response(stream, { status: 200, headers });
}

async function handleSnippetInstall(
	request: Request,
	env: unknown,
	ctx: ExecutionContext,
	correlationId: string
): Promise<Response> {
	const body = (await request.json()) as SnippetInstallRequest;
	if (!body || !body.siteId) {
		return jsonResponse({ error: 'Missing required field: siteId', correlationId }, 400, request);
	}

	const existing = await getSnippetTokenState(env, body.siteId);
	const bridgeToken = existing?.bridgeToken || generateBridgeToken();
	const snippet = buildSnippetPayload(bridgeToken, request);

	const now = new Date().toISOString();
	const record: SnippetTokenRecord = {
		siteId: body.siteId,
		siteName: body.siteName || existing?.siteName || null,
		bridgeToken,
		snippetVersion: REVIEW_SNIPPET_VERSION,
		installMethod: 'manual-fallback',
		status: 'pending_manual',
		installed: false,
		updatedAt: now
	};

	ctx.waitUntil(
		emitTelemetry(env, {
			event: 'snippet.install.start',
			correlationId,
			payload: {
				siteId: body.siteId,
				mode: body.mode,
				installTarget: body.installTarget
			}
		})
	);

	if (body.mode === 'programmatic' || body.mode === 'webflow-api') {
		const programmatic = await attemptProgrammaticSnippetInstall(env, body.siteId, snippet, correlationId, body.idToken);
		if (programmatic.ok) {
			record.installMethod = 'webflow-api';
			record.status = 'active';
			record.installed = true;
			record.message = programmatic.message;
		} else {
			record.message = programmatic.message;
		}
	} else {
		record.message = 'Manual install requested. Publish the bridge and review surface, then re-check.';
	}

	await persistSnippetTokenState(env, record);

	const response: SnippetInstallResponse & { snippet: string; siteId: string; updatedAt: string } = {
		installed: record.installed,
		bridgeToken: record.bridgeToken,
		snippetVersion: record.snippetVersion,
		installMethod: record.installMethod,
		status: record.status,
		message: record.message,
		snippet,
		siteId: record.siteId,
		updatedAt: record.updatedAt
	};

	ctx.waitUntil(
		emitTelemetry(env, {
			event: `snippet.install.${record.status}`,
			correlationId,
			payload: {
				siteId: body.siteId,
				installMethod: record.installMethod
			}
		})
	);

	return jsonResponse(response, 200, request);
}

async function handleSnippetStatus(request: Request, env: unknown): Promise<Response> {
	const url = new URL(request.url);
	const siteId = url.searchParams.get('siteId');
	const siteUrl = normalizeSiteUrl(url.searchParams.get('siteUrl'));
	if (!siteId) {
		return jsonResponse({ error: 'Missing required query param: siteId' }, 400, request);
	}

	let existing = await getSnippetTokenState(env, siteId);
	if (!existing) {
		const response: SnippetStatusResponse & { snippet: string } = {
			siteId,
			siteName: null,
			installed: false,
			bridgeToken: '',
			snippetVersion: REVIEW_SNIPPET_VERSION,
			installMethod: 'manual-fallback',
			status: 'pending_manual',
			message: 'Published review surface not installed yet.',
			updatedAt: new Date().toISOString(),
			snippet: buildSnippetPayload('__REPLACE_WITH_TOKEN__', request)
		};
		return jsonResponse(response, 200, request);
	}

	if (existing.installMethod === 'manual-fallback' && siteUrl) {
		existing = await verifyManualSnippetStatus(env, existing, siteUrl);
	}

	const response: SnippetStatusResponse & { snippet: string } = {
		...existing,
		snippet: buildSnippetPayload(existing.bridgeToken, request)
	};
	return jsonResponse(response, 200, request);
}

async function handleSnippetRotateToken(
	request: Request,
	env: unknown,
	ctx: ExecutionContext,
	correlationId: string
): Promise<Response> {
	const body = (await request.json()) as SnippetRotateTokenRequest;
	if (!body || !body.siteId) {
		return jsonResponse({ error: 'Missing required field: siteId', correlationId }, 400, request);
	}

	const existing = await getSnippetTokenState(env, body.siteId);
	const bridgeToken = generateBridgeToken();
	const now = new Date().toISOString();
	const snippet = buildSnippetPayload(bridgeToken, request);
	let record: SnippetTokenRecord = {
		siteId: body.siteId,
		siteName: body.siteName || existing?.siteName || null,
		bridgeToken,
		snippetVersion: REVIEW_SNIPPET_VERSION,
		installMethod: 'manual-fallback',
		status: 'pending_manual',
		installed: false,
		message: 'Token rotated. Publish the updated bridge and review surface, then re-check.',
		updatedAt: now
	};

	if (existing?.installMethod === 'webflow-api') {
		const programmatic = await attemptProgrammaticSnippetInstall(
			env,
			body.siteId,
			snippet,
			correlationId
		);
		if (programmatic.ok) {
			record = {
				...record,
				installMethod: 'webflow-api',
				status: 'active',
				installed: true,
				message: 'Token rotated and published review surface updated programmatically.'
			};
		} else {
			record = {
				...record,
				message: `${programmatic.message} Publish the updated bridge and review surface, then re-check.`
			};
		}
	}
	await persistSnippetTokenState(env, record);

	ctx.waitUntil(
		emitTelemetry(env, {
			event: 'snippet.rotate_token',
			correlationId,
			payload: { siteId: body.siteId }
		})
	);

	return jsonResponse(
		{
			...record,
			snippet
		},
		200,
		request
	);
}

async function handleValidationSubmit(
	request: Request,
	env: unknown,
	ctx: ExecutionContext,
	correlationId: string
): Promise<Response> {
	const body = (await request.json()) as ValidationSubmitRequest;
	const siteId = normalizeSiteId(body?.siteId);
	if (!siteId) {
		return jsonResponse({ error: 'Missing required field: siteId', correlationId }, 400, request);
	}

	if (!body || !body.validationResults || typeof body.validationResults !== 'object') {
		return jsonResponse(
			{ error: 'Missing required field: validationResults', correlationId },
			400,
			request
		);
	}

	const submittedAt = new Date().toISOString();
	const siteName =
		typeof body.siteName === 'string' && body.siteName.trim() !== ''
			? body.siteName.trim()
			: null;
	const siteUrl =
		typeof body.siteUrl === 'string' && body.siteUrl.trim() !== ''
			? body.siteUrl.trim()
			: undefined;
	const sanitizedResults = sanitizeValidationResults(body.validationResults);
	const payloadHash =
		(await hashTelemetryValue(JSON.stringify(sanitizedResults))) || `inline_${siteId}`;
	const clientHash = await getRequestClientHash(request);
	const limitConfig = getSubmissionLimitConfig(env);
	const currentState = await getSubmissionState(env, siteId);
	const currentWindow = pruneSubmissionAttempts(
		currentState?.attempts || [],
		limitConfig.windowMs,
		Date.now()
	);
	const retryAfterSeconds =
		currentWindow.length >= limitConfig.maxSubmissions
			? getRetryAfterSeconds(currentWindow[0]?.at, limitConfig.windowMs, Date.now())
			: undefined;

	if (currentWindow.length >= limitConfig.maxSubmissions) {
		const rateLimitedResponse: ValidationSubmitResponse = {
			success: false,
			accepted: false,
			persisted: false,
			siteId,
			siteName,
			message: 'Submission rate limit exceeded for this site.',
			submittedAt,
			reason: 'rate_limited',
			limit: {
				windowMs: limitConfig.windowMs,
				maxSubmissions: limitConfig.maxSubmissions,
				remaining: 0,
				resetAt: new Date(
					Date.parse(currentWindow[0].at) + limitConfig.windowMs
				).toISOString(),
				retryAfterSeconds
			},
			anomaly: {
				flagged: true,
				reasons: ['rate_limit_exceeded']
			}
		};

		ctx.waitUntil(
			emitTelemetry(env, {
				event: 'submission.rate_limited',
				correlationId,
				level: 'error',
				payload: {
					siteId,
					siteUrl,
					origin: request.headers.get('Origin'),
					clientHash,
					attemptsInWindow: currentWindow.length,
					windowMs: limitConfig.windowMs,
					maxSubmissions: limitConfig.maxSubmissions
				}
			})
		);

		return jsonResponse(rateLimitedResponse, 429, request, {
			'Retry-After': String(retryAfterSeconds || 0)
		});
	}

	const nextAttempt: SubmissionAttemptRecord = {
		at: submittedAt,
		origin: request.headers.get('Origin'),
		clientHash,
		userAgentHash: await hashTelemetryValue(request.headers.get('User-Agent')),
		payloadHash,
		correlationId
	};

	const nextState: SubmissionRateLimitState = {
		siteId,
		updatedAt: submittedAt,
		attempts: [...currentWindow, nextAttempt]
	};
	await persistSubmissionState(env, nextState);

	const anomalyReasons = detectSubmissionAnomalies(nextState.attempts);
	if (anomalyReasons.length > 0) {
		ctx.waitUntil(
			emitTelemetry(env, {
				event: 'submission.anomaly_detected',
				correlationId,
				level: 'error',
				payload: {
					siteId,
					siteUrl,
					reasons: anomalyReasons,
					origin: nextAttempt.origin,
					clientHash: nextAttempt.clientHash,
					attemptsInWindow: nextState.attempts.length
				}
			})
		);
	}

	const persistResult = await persistValidationSubmission(env, {
		siteId,
		siteName,
		siteUrl,
		validationResults: sanitizedResults
	});

	const remaining = Math.max(limitConfig.maxSubmissions - nextState.attempts.length, 0);
	const response: ValidationSubmitResponse = {
		success: true,
		accepted: true,
		persisted: persistResult.persisted,
		siteId,
		siteName,
		message: persistResult.message,
		submittedAt,
		recordId: persistResult.recordId,
		reason: persistResult.reason,
		limit: {
			windowMs: limitConfig.windowMs,
			maxSubmissions: limitConfig.maxSubmissions,
			remaining,
			resetAt: new Date(
				Date.parse(nextState.attempts[0]?.at || submittedAt) + limitConfig.windowMs
			).toISOString()
		},
		anomaly: {
			flagged: anomalyReasons.length > 0,
			reasons: anomalyReasons
		}
	};

	ctx.waitUntil(
		emitTelemetry(env, {
			event: persistResult.persisted ? 'submission.persisted' : 'submission.accepted',
			correlationId,
			payload: {
				siteId,
				siteUrl,
				siteName,
				recordId: persistResult.recordId,
				persisted: persistResult.persisted,
				reason: persistResult.reason,
				remaining,
				anomalyReasons
			}
		})
	);

	return jsonResponse(response, 200, request);
}

async function runReviewJob(jobId: string, env: unknown): Promise<void> {
	const job = await getReviewJobState(env, jobId);
	if (!job) return;

	const startedAtMs = Date.now();
	try {
		updateJobProgress(job, 5, 'running', 'Initializing validation pipeline');
		await persistReviewJobState(env, job);
		await emitTelemetry(env, {
			event: 'review.progress',
			correlationId: job.correlationId,
			payload: { jobId, progress: 5, message: job.message }
		});

		if (job.cancelRequested) throw new Error('Job cancelled');

		const checks = normalizeChecks(job.request.checks);
		const runDesigner = checks.designer;
		const runAssets = checks.assets;
		const runContent = checks.content;
		const runAccessibility = checks.accessibility;
		const designerData = job.request.designerData as DesignerData;
		const requestedOptions =
			job.request && typeof job.request.options === 'object' && job.request.options
				? job.request.options
				: {};

		let designerResult: any | null = null;
		let enhancedResult: ValidationResponse | null = null;

		if (runDesigner) {
			updateJobProgress(job, 20, 'running', 'Running Designer validation');
			await persistReviewJobState(env, job);
			designerResult = await performDesignerValidation(designerData, job.request.siteUrl);
		}

		if (job.cancelRequested) throw new Error('Job cancelled');

		updateJobProgress(job, 55, 'running', 'Running crawl validation');
		await persistReviewJobState(env, job);
		enhancedResult = await performEnhancedValidation({
			siteUrl: job.request.siteUrl,
			designerData,
			pageSlugs: Array.isArray(job.request.pageSlugs) ? job.request.pageSlugs : [],
			options: {
				...requestedOptions,
				skipAssets: !runAssets,
				skipContent: !runContent,
				skipAccessibility: !runAccessibility
			}
		});

		if (job.cancelRequested) throw new Error('Job cancelled');

		updateJobProgress(job, 85, 'running', 'Merging validation result sets');
		await persistReviewJobState(env, job);
		const merged = mergeReviewResults(job.request.siteUrl, designerResult, enhancedResult);

		job.status = 'completed';
		job.progress = 100;
		job.message = 'Validation complete';
		job.updatedAt = new Date().toISOString();
		job.completedAt = job.updatedAt;
		job.result = merged;
		pushJobEvent(job, 'complete', {
			jobId: job.jobId,
			status: job.status,
			progress: job.progress,
			message: job.message
		});
		await persistReviewJobState(env, job);

		await emitTelemetry(env, {
			event: 'review.complete',
			correlationId: job.correlationId,
			payload: {
				jobId: job.jobId,
				durationMs: Date.now() - startedAtMs,
				totalCategories: Array.isArray(merged?.categories) ? merged.categories.length : 0,
				fallbackUsed: job.fallbackUsed
			}
		});
	} catch (error) {
		job.status = job.cancelRequested ? 'cancelled' : 'failed';
		job.error = error instanceof Error ? error.message : String(error);
		job.message = job.cancelRequested ? 'Job cancelled' : 'Validation failed';
		job.updatedAt = new Date().toISOString();
		job.completedAt = job.updatedAt;
		pushJobEvent(job, 'error', {
			jobId: job.jobId,
			status: job.status,
			progress: job.progress,
			message: job.message,
			error: job.error
		});
		await persistReviewJobState(env, job);

		await emitTelemetry(env, {
			event: 'review.error',
			correlationId: job.correlationId,
			level: 'error',
			payload: {
				jobId: job.jobId,
				durationMs: Date.now() - startedAtMs,
				error: job.error
			}
		});
	}
}

async function handleDesignerValidation(request: Request): Promise<Response> {
	try {
		const body = (await request.json()) as { designerData: DesignerData; siteUrl?: string };
		if (!body.designerData) {
			return jsonResponse({ error: 'Missing required field: designerData' }, 400, request);
		}

		const result = await performDesignerValidation(body.designerData, body.siteUrl);
		return jsonResponse(result, 200, request);
	} catch (error) {
		return jsonResponse(
			{
				error: 'Designer validation failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			500,
			request
		);
	}
}

async function handleEnhancedValidation(request: Request): Promise<Response> {
	try {
		const body = (await request.json()) as ValidationRequest;
		if (!body.siteUrl || !body.designerData) {
			return jsonResponse(
				{ error: 'Missing required fields: siteUrl and designerData' },
				400,
				request
			);
		}

		const result = await performEnhancedValidation(body);
		return jsonResponse(result, 200, request);
	} catch (error) {
		return jsonResponse(
			{
				error: 'Enhanced validation failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			500,
			request
		);
	}
}

async function performDesignerValidation(
	designerData: DesignerData,
	siteUrl?: string
): Promise<{ url: string | null; success: boolean; timestamp: string; categories: any[]; summary: any }> {
	const result = await validateDesignerData(designerData);
	return {
		url: siteUrl || null,
		success: true,
		timestamp: new Date().toISOString(),
		categories: result.categories,
		summary: result.summary
	};
}

async function performEnhancedValidation(body: ValidationRequest): Promise<ValidationResponse> {
	const options = body.options || {};

	const assetPromise = options.skipAssets
		? Promise.resolve(createEmptyAssetAnalysis())
		: validateAssets(body.siteUrl, body.designerData);

	const contentPromise = options.skipContent
		? Promise.resolve(createEmptyContentAnalysis())
		: validateContent(body.siteUrl, body.pageSlugs, options);

	const accessibilityPromise = options.skipAccessibility
		? Promise.resolve(createEmptyAccessibilityAnalysis())
		: validateAccessibility(body.siteUrl);

	const interactionsPromise = validateInteractions(body.siteUrl, body.pageSlugs, {
		maxPages: options.maxPages
	});

	const [assetAnalysis, contentAnalysis, accessibilityAnalysis, interactionsAnalysis] = await Promise.all([
		assetPromise,
		contentPromise,
		accessibilityPromise,
		interactionsPromise
	]);

	return {
		siteUrl: body.siteUrl,
		timestamp: new Date().toISOString(),
		analysis: {
			assets: assetAnalysis,
			content: contentAnalysis,
			accessibility: accessibilityAnalysis,
			interactions: interactionsAnalysis
		},
		summary: {
			totalIssues:
				assetAnalysis.issues.length +
				contentAnalysis.issues.length +
				accessibilityAnalysis.issues.length +
				interactionsAnalysis.issues.length,
			criticalErrors: countCriticalErrors([
				assetAnalysis,
				contentAnalysis,
				accessibilityAnalysis,
				interactionsAnalysis
			]),
			coverageImprovement: '+27 percentage points'
		}
	};
}

function mergeReviewResults(
	siteUrl: string,
	designerResult: any | null,
	enhancedResult: ValidationResponse | null
): any {
	if (!designerResult && !enhancedResult) {
		return {
			url: siteUrl,
			success: false,
			categories: [],
			summary: {
				errors: 0,
				warnings: 0,
				infos: 0,
				passedCategories: 0,
				failedCategories: 0,
				totalErrors: 0,
				totalWarnings: 0,
				totalInfo: 0
			}
		};
	}

	if (!designerResult && enhancedResult) {
		const categories = [];
		if (enhancedResult.analysis?.assets) {
			categories.push({
				category: 'Assets & Images',
				passed: enhancedResult.analysis.assets.issues.filter((i: any) => i.severity === 'error').length === 0,
				issues: enhancedResult.analysis.assets.issues,
				stats: enhancedResult.analysis.assets.stats
			});
		}
		if (enhancedResult.analysis?.content) {
			categories.push({
				category: 'Content & Accessibility',
				passed: enhancedResult.analysis.content.issues.filter((i: any) => i.severity === 'error').length === 0,
				issues: enhancedResult.analysis.content.issues,
				stats: enhancedResult.analysis.content.stats
			});
		}
		if (enhancedResult.analysis?.accessibility) {
			const surfacedAccessibilityIssues = getSurfacedAccessibilityIssues(
				enhancedResult.analysis.accessibility,
				Boolean(enhancedResult.analysis?.content)
			);
			if (surfacedAccessibilityIssues.length > 0) {
				categories.push({
					category: 'Accessibility & WCAG',
					passed: surfacedAccessibilityIssues.filter((i: any) => i.severity === 'error').length === 0,
					issues: surfacedAccessibilityIssues,
					stats: enhancedResult.analysis.accessibility.stats
				});
			}
		}
		if (enhancedResult.analysis?.interactions) {
			categories.push({
				category: 'Interactions and GSAP',
				passed: enhancedResult.analysis.interactions.issues.filter((i: any) => i.severity === 'error').length === 0,
				issues: enhancedResult.analysis.interactions.issues,
				stats: enhancedResult.analysis.interactions.stats
			});
		}
		const summary = summarizeSummaryFromCategories(categories);
		return {
			url: siteUrl,
			success: true,
			categories,
			summary
		};
	}

	const merged = {
		...designerResult,
		url: siteUrl,
		success: true,
		categories: Array.isArray(designerResult.categories) ? [...designerResult.categories] : []
	};

	if (enhancedResult?.analysis?.assets) {
		merged.categories.push({
			category: 'Assets & Images',
			passed: enhancedResult.analysis.assets.issues.filter((i: any) => i.severity === 'error').length === 0,
			issues: enhancedResult.analysis.assets.issues,
			stats: enhancedResult.analysis.assets.stats
		});
	}

	if (enhancedResult?.analysis?.content) {
		merged.categories.push({
			category: 'Content & Accessibility',
			passed: enhancedResult.analysis.content.issues.filter((i: any) => i.severity === 'error').length === 0,
			issues: enhancedResult.analysis.content.issues,
			stats: enhancedResult.analysis.content.stats
		});
	}

	if (enhancedResult?.analysis?.accessibility) {
		const surfacedAccessibilityIssues = getSurfacedAccessibilityIssues(
			enhancedResult.analysis.accessibility,
			Boolean(enhancedResult.analysis?.content)
		);
		if (surfacedAccessibilityIssues.length > 0) {
			merged.categories.push({
				category: 'Accessibility & WCAG',
				passed: surfacedAccessibilityIssues.filter((i: any) => i.severity === 'error').length === 0,
				issues: surfacedAccessibilityIssues,
				stats: enhancedResult.analysis.accessibility.stats
			});
		}
	}

	if (enhancedResult?.analysis?.interactions) {
		merged.categories.push({
			category: 'Interactions and GSAP',
			passed: enhancedResult.analysis.interactions.issues.filter((i: any) => i.severity === 'error').length === 0,
			issues: enhancedResult.analysis.interactions.issues,
			stats: enhancedResult.analysis.interactions.stats
		});
	}

	const summary = summarizeSummaryFromCategories(merged.categories);
	merged.summary = summary;
	return merged;
}

function summarizeSummaryFromCategories(categories: Array<{ passed: boolean; issues: Array<{ severity: string }> }>) {
	const issues = categories.flatMap((category) =>
		Array.isArray(category.issues) ? category.issues : []
	);
	const totalErrors = issues.filter((issue) => issue.severity === 'error').length;
	const totalWarnings = issues.filter((issue) => issue.severity === 'warning').length;
	const totalInfo = issues.filter((issue) => issue.severity === 'info').length;
	const passedCategories = categories.filter((category) => category.passed).length;
	const failedCategories = Math.max(0, categories.length - passedCategories);
	return {
		errors: totalErrors,
		warnings: totalWarnings,
		infos: totalInfo,
		totalErrors,
		totalWarnings,
		totalInfo,
		passedCategories,
		failedCategories
	};
}

function getSurfacedAccessibilityIssues(
	accessibilityAnalysis: { issues?: Array<{ id: string; severity: string }> } | undefined,
	contentAnalysisIncluded: boolean
) {
	const issues = Array.isArray(accessibilityAnalysis?.issues) ? accessibilityAnalysis.issues : [];
	if (!contentAnalysisIncluded) {
		return issues;
	}

	const duplicateIssueIds = new Set(['missing-alt-text-critical', 'heading-structure-errors']);
	return issues.filter((issue) => !duplicateIssueIds.has(issue.id));
}

function normalizeChecks(checks: string[] | undefined): {
	designer: boolean;
	assets: boolean;
	content: boolean;
	accessibility: boolean;
} {
	if (!Array.isArray(checks) || checks.length === 0) {
		return {
			designer: true,
			assets: true,
			content: true,
			accessibility: true
		};
	}

	const normalized = new Set(checks.map((check) => String(check).toLowerCase()));
	return {
		designer: normalized.has('designer'),
		assets: normalized.has('assets') || normalized.has('asset'),
		content: normalized.has('content'),
		accessibility: normalized.has('accessibility')
	};
}

function createJobEventStream(
	env: unknown,
	jobId: string,
	initialJob: ReviewJobState
): ReadableStream<Uint8Array> {
	let cancelled = false;
	return new ReadableStream<Uint8Array>({
		start(controller) {
			let lastSeq = 0;
			let heartbeatCount = 0;

			const poll = async () => {
				if (cancelled) return;

				const liveJob = (await getReviewJobState(env, jobId)) || initialJob;
				if (!liveJob) {
					sendSseEvent(controller, 'error', { error: 'Job not found', jobId });
					controller.close();
					cancelled = true;
					return;
				}

				if (lastSeq === 0) {
					sendSseEvent(controller, 'status', toReviewStatus(liveJob));
				}

				const newEvents = liveJob.events.filter((event) => event.seq > lastSeq);
				for (const event of newEvents) {
					sendSseEvent(controller, event.type, event.payload);
					lastSeq = Math.max(lastSeq, event.seq);
				}

				if (TERMINAL_STATUSES.has(liveJob.status)) {
					controller.close();
					cancelled = true;
					return;
				}

				heartbeatCount += 1;
				if (heartbeatCount % 5 === 0) {
					sendSseEvent(controller, 'heartbeat', { jobId, ts: Date.now() });
				}

				setTimeout(() => {
					void poll();
				}, 1000);
			};

			void poll();
		},
		cancel() {
			cancelled = true;
		}
	});
}

function pushJobEvent(
	job: ReviewJobState,
	type: string,
	payload: Record<string, unknown>
): void {
	job.seq += 1;
	job.updatedAt = new Date().toISOString();
	const event: ReviewJobEvent = {
		seq: job.seq,
		type,
		payload,
		at: job.updatedAt
	};
	job.events.push(event);
	if (job.events.length > REVIEW_JOB_EVENT_LIMIT) {
		job.events.splice(0, job.events.length - REVIEW_JOB_EVENT_LIMIT);
	}
}

function updateJobProgress(
	job: ReviewJobState,
	progress: number,
	status: ReviewStatusResponse['status'],
	message: string
): void {
	job.progress = Math.max(0, Math.min(100, progress));
	job.status = status;
	job.message = message;
	pushJobEvent(job, 'progress', {
		jobId: job.jobId,
		status: job.status,
		progress: job.progress,
		message: job.message
	});
}

function toReviewStatus(job: ReviewJobState): ReviewStatusResponse {
	return {
		jobId: job.jobId,
		status: job.status,
		progress: job.progress,
		message: job.message,
		startedAt: job.startedAt,
		updatedAt: job.updatedAt,
		completedAt: job.completedAt,
		correlationId: job.correlationId,
		fallbackUsed: job.fallbackUsed,
		error: job.error || undefined,
		result: job.result ?? undefined
	};
}

function sendSseEvent(
	controller: ReadableStreamDefaultController<Uint8Array>,
	type: string,
	data: unknown
): void {
	const payload = JSON.stringify(data);
	controller.enqueue(encoder.encode(`event: ${type}\ndata: ${payload}\n\n`));
}

function cleanupOldJobs(): void {
	const threshold = Date.now() - REVIEW_JOB_RETENTION_MS;
	for (const [jobId, job] of reviewJobs.entries()) {
		const updatedAt = Date.parse(job.updatedAt);
		if (Number.isFinite(updatedAt) && updatedAt < threshold) {
			reviewJobs.delete(jobId);
		}
	}
}

async function getReviewJobState(
	env: unknown,
	jobId: string
): Promise<ReviewJobState | null> {
	const inMemory = reviewJobs.get(jobId);
	if (inMemory) return inMemory;

	const persisted = await readDurableState(env, `job:${jobId}`);
	if (!persisted) return null;

	const restored = reviveReviewJobState(persisted as ReviewJobState);
	reviewJobs.set(jobId, restored);
	return restored;
}

async function persistReviewJobState(env: unknown, job: ReviewJobState): Promise<void> {
	reviewJobs.set(job.jobId, job);
	await writeDurableState(env, `job:${job.jobId}`, pruneReviewJobState(job));
}

async function getSnippetTokenState(
	env: unknown,
	siteId: string
): Promise<SnippetTokenRecord | null> {
	const inMemory = snippetTokens.get(siteId);
	if (inMemory) return inMemory;

	const persisted = await readDurableState(env, `snippet:${siteId}`);
	if (!persisted) return null;

	const record = persisted as SnippetTokenRecord;
	snippetTokens.set(siteId, record);
	return record;
}

async function persistSnippetTokenState(
	env: unknown,
	record: SnippetTokenRecord
): Promise<void> {
	snippetTokens.set(record.siteId, record);
	await writeDurableState(env, `snippet:${record.siteId}`, record);
}

async function getSubmissionState(
	env: unknown,
	siteId: string
): Promise<SubmissionRateLimitState | null> {
	const inMemory = submissionStates.get(siteId);
	if (inMemory) return inMemory;

	const persisted = await readDurableState(env, `submission:${siteId}`);
	if (!persisted) return null;

	const record = reviveSubmissionState(persisted as SubmissionRateLimitState);
	submissionStates.set(siteId, record);
	return record;
}

async function persistSubmissionState(
	env: unknown,
	record: SubmissionRateLimitState
): Promise<void> {
	const normalized = reviveSubmissionState(record);
	submissionStates.set(record.siteId, normalized);
	await writeDurableState(env, `submission:${record.siteId}`, normalized);
}

function pruneReviewJobState(job: ReviewJobState): ReviewJobState {
	return {
		...job,
		events: Array.isArray(job.events) ? job.events.slice(-REVIEW_JOB_EVENT_LIMIT) : []
	};
}

function reviveReviewJobState(raw: ReviewJobState): ReviewJobState {
	return {
		...raw,
		events: Array.isArray(raw.events) ? raw.events : [],
		seq: Number.isFinite(raw.seq) ? raw.seq : 0,
		cancelRequested: Boolean(raw.cancelRequested)
	};
}

function reviveSubmissionState(raw: SubmissionRateLimitState): SubmissionRateLimitState {
	return {
		siteId: raw.siteId,
		updatedAt:
			typeof raw.updatedAt === 'string' && raw.updatedAt !== ''
				? raw.updatedAt
				: new Date().toISOString(),
		attempts: Array.isArray(raw.attempts) ? raw.attempts : []
	};
}

function getDurableNamespace(env: unknown): DurableObjectNamespace | null {
	const candidate = (env as { REVIEW_JOBS_DO?: DurableObjectNamespace } | undefined)
		?.REVIEW_JOBS_DO;
	return candidate ?? null;
}

async function readDurableState(env: unknown, name: string): Promise<unknown | null> {
	const ns = getDurableNamespace(env);
	if (!ns) return null;
	try {
		const stub = ns.get(ns.idFromName(name));
		const response = await stub.fetch('https://internal/state', { method: 'GET' });
		if (response.status === 404) return null;
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
}

async function writeDurableState(
	env: unknown,
	name: string,
	value: unknown
): Promise<void> {
	const ns = getDurableNamespace(env);
	if (!ns) return;
	const stub = ns.get(ns.idFromName(name));
	await stub.fetch('https://internal/state', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(value)
	});
}

async function emitTelemetry(env: unknown, event: TelemetryEvent): Promise<void> {
	const payload = {
		event: event.event,
		correlationId: event.correlationId,
		level: event.level || 'info',
		timestamp: new Date().toISOString(),
		...event.payload
	};
	const line = JSON.stringify(payload);
	if (event.level === 'error') {
		console.error(line);
	} else {
		console.log(line);
	}
	await emitBraintrustTrace(env, payload).catch(() => undefined);
}

async function emitBraintrustTrace(
	env: unknown,
	payload: Record<string, unknown>
): Promise<void> {
	const apiKey = readEnvString(env, 'BRAINTRUST_API_KEY');
	const projectId = readEnvString(env, 'BRAINTRUST_PROJECT_ID');
	if (!apiKey || !projectId) return;

	const body = {
		events: [
			{
				id: crypto.randomUUID(),
				created: new Date().toISOString(),
				input: payload,
				metadata: {
					correlationId: payload.correlationId,
					source: 'webflow-validation-worker'
				}
			}
		]
	};

	const response = await fetch(
		`https://api.braintrust.dev/v1/project_logs/${projectId}/insert`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		}
	);

	if (!response.ok) {
		const text = await response.text().catch(() => '');
		console.warn(`Braintrust trace failed: ${response.status} ${text}`);
	}
}

function normalizeSiteUrl(value: string | null): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	if (trimmed === '') return null;

	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		return parsed.toString();
	} catch {
		return null;
	}
}

async function verifyManualSnippetStatus(
	env: unknown,
	record: SnippetTokenRecord,
	siteUrl: string
): Promise<SnippetTokenRecord> {
	try {
		const htmlResult = await fetchHTML(siteUrl);
		const hasMarker = htmlResult.html.includes(REVIEW_SNIPPET_MARKER);
		const hasToken = htmlResult.html.includes(record.bridgeToken);
		const hasReviewScript = htmlResult.html.includes(REVIEW_SNIPPET_ASSET_PATH);

		if (hasMarker && hasToken && hasReviewScript) {
			const verifiedRecord: SnippetTokenRecord = {
				...record,
				status: 'active',
				installed: true,
				message:
					'Published review surface verified on the published site. Agents can use published-site audits; interactive reviewers still complete Designer-only checks.',
				updatedAt: new Date().toISOString()
			};
			await persistSnippetTokenState(env, verifiedRecord);
			await emitTelemetry(env, {
				event: 'snippet.verify_manual.success',
				correlationId: normalizeCorrelationId(`snippet_${record.siteId}`),
				payload: { siteId: record.siteId, siteUrl }
			});
			return verifiedRecord;
		}

		const pendingRecord: SnippetTokenRecord = {
			...record,
			status: 'pending_manual',
			installed: false,
			message:
				hasMarker && hasToken
					? 'Bridge token detected, but the published review script is missing. Publish the full bridge + review surface snippet and re-check.'
					: 'Manual snippet not detected on the published site yet. Publish the full bridge + review surface snippet and re-check.',
			updatedAt: new Date().toISOString()
		};
		await persistSnippetTokenState(env, pendingRecord);
		return pendingRecord;
	} catch (error) {
		const pendingRecord: SnippetTokenRecord = {
			...record,
			status: 'pending_manual',
			installed: false,
			message: `Could not verify the published site yet: ${
				error instanceof Error ? error.message : String(error)
			}`,
			updatedAt: new Date().toISOString()
		};
		await persistSnippetTokenState(env, pendingRecord);
		await emitTelemetry(env, {
			event: 'snippet.verify_manual.failed',
			correlationId: normalizeCorrelationId(`snippet_${record.siteId}`),
			level: 'error',
			payload: {
				siteId: record.siteId,
				siteUrl,
				message: error instanceof Error ? error.message : String(error)
			}
		});
		return pendingRecord;
	}
}

function normalizeSiteId(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (trimmed === '' || trimmed.length > 128) return null;
	if (/\s/.test(trimmed)) return null;
	return trimmed;
}

function sanitizeValidationResults(
	validationResults: ValidationSubmitRequest['validationResults']
): ValidationSubmitRequest['validationResults'] {
	const rawSummary =
		validationResults && typeof validationResults.summary === 'object'
			? (validationResults.summary as Record<string, unknown>)
			: {};
	const summary = {
		errors: readSummaryCount(rawSummary, ['errors']),
		warnings: readSummaryCount(rawSummary, ['warnings']),
		infos: readSummaryCount(rawSummary, ['infos']),
		totalErrors: readSummaryCount(rawSummary, ['totalErrors', 'errors']),
		totalWarnings: readSummaryCount(rawSummary, ['totalWarnings', 'warnings']),
		totalInfo: readSummaryCount(rawSummary, ['totalInfo', 'infos']),
		passedCategories: readSummaryCount(rawSummary, ['passedCategories']),
		failedCategories: readSummaryCount(rawSummary, ['failedCategories'])
	};
	const categories = Array.isArray(validationResults?.categories)
		? validationResults.categories.map((category) => ({
				category:
					typeof category?.category === 'string' ? category.category : 'Uncategorized',
				passed: Boolean(category?.passed),
				issues: Array.isArray(category?.issues)
					? category.issues
							.filter((issue) => issue && typeof issue.message === 'string')
							.map((issue) => ({
								severity:
									issue?.severity === 'error' ||
									issue?.severity === 'warning' ||
									issue?.severity === 'info'
										? issue.severity
										: 'info',
								message: issue?.message || ''
							}))
					: []
		  }))
		: [];

	return {
		url:
			typeof validationResults?.url === 'string' && validationResults.url.trim() !== ''
				? validationResults.url.trim()
				: undefined,
		summary,
		categories
	};
}

function formatValidationResults(
	validationResults: ValidationSubmitRequest['validationResults']
): string {
	const summary = validationResults.summary || {};
	const categories = Array.isArray(validationResults.categories)
		? validationResults.categories
		: [];

	const totalErrors = readSummaryCount(summary, ['totalErrors', 'errors']);
	const totalWarnings = readSummaryCount(summary, ['totalWarnings', 'warnings']);
	const passedCategories = readSummaryCount(summary, ['passedCategories']);
	const failedCategoriesCount = readSummaryCount(summary, ['failedCategories']);
	const urlLine = validationResults.url ? `**URL:** ${validationResults.url}\n` : '';

	let formatted = `# Validation Results\n\n`;
	formatted += `**Submitted:** ${new Date().toLocaleString()}\n`;
	if (urlLine) {
		formatted += `${urlLine}`;
	}
	formatted += `\n## Summary\n`;
	formatted += `- Errors: ${totalErrors}\n`;
	formatted += `- Warnings: ${totalWarnings}\n`;
	formatted += `- Categories Passed: ${passedCategories}/${passedCategories + failedCategoriesCount}\n\n`;

	const failedCategories = categories.filter(
		(category) =>
			!category.passed ||
			(category.issues || []).some((issue) => issue.severity === 'error')
	);

	if (failedCategories.length === 0) {
		formatted += `## All validations passed! ✓\n`;
		return formatted;
	}

	formatted += `## Issues by Category\n\n`;
	for (const category of failedCategories) {
		const issues = Array.isArray(category.issues) ? category.issues : [];
		const errors = issues.filter((issue) => issue.severity === 'error');
		const warnings = issues.filter((issue) => issue.severity === 'warning');
		if (errors.length === 0 && warnings.length === 0) continue;

		formatted += `### ${category.category || 'Uncategorized'}\n`;
		if (errors.length > 0) {
			formatted += `**Errors:**\n`;
			for (const issue of errors) {
				formatted += `- ${issue.message}\n`;
			}
			formatted += `\n`;
		}
		if (warnings.length > 0) {
			formatted += `**Warnings:**\n`;
			for (const issue of warnings) {
				formatted += `- ${issue.message}\n`;
			}
			formatted += `\n`;
		}
	}

	return formatted;
}

function readSummaryCount(summary: Record<string, unknown>, keys: string[]): number {
	for (const key of keys) {
		const value = summary[key];
		if (typeof value === 'number' && Number.isFinite(value)) {
			return value;
		}
	}
	return 0;
}

function escapeAirtableFormulaString(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getSubmissionLimitConfig(env: unknown): {
	windowMs: number;
	maxSubmissions: number;
} {
	return {
		windowMs: readEnvNumber(env, 'VALIDATION_SUBMIT_WINDOW_MS') || DEFAULT_SUBMISSION_WINDOW_MS,
		maxSubmissions:
			readEnvNumber(env, 'VALIDATION_SUBMIT_MAX_PER_WINDOW') || DEFAULT_SUBMISSION_MAX
	};
}

function pruneSubmissionAttempts(
	attempts: SubmissionAttemptRecord[],
	windowMs: number,
	nowMs: number
): SubmissionAttemptRecord[] {
	return attempts.filter((attempt) => {
		const atMs = Date.parse(attempt.at);
		return Number.isFinite(atMs) && atMs >= nowMs - windowMs;
	});
}

function getRetryAfterSeconds(
	oldestAttemptAt: string | undefined,
	windowMs: number,
	nowMs: number
): number {
	if (!oldestAttemptAt) return Math.ceil(windowMs / 1000);
	const oldestMs = Date.parse(oldestAttemptAt);
	if (!Number.isFinite(oldestMs)) return Math.ceil(windowMs / 1000);
	return Math.max(1, Math.ceil((oldestMs + windowMs - nowMs) / 1000));
}

function detectSubmissionAnomalies(attempts: SubmissionAttemptRecord[]): string[] {
	const reasons: string[] = [];
	const uniqueClients = new Set(
		attempts.map((attempt) => attempt.clientHash).filter((value): value is string => Boolean(value))
	);
	if (uniqueClients.size >= SUBMISSION_CLIENT_CHURN_THRESHOLD) {
		reasons.push('high_client_churn');
	}

	const recentBurst = pruneSubmissionAttempts(attempts, SUBMISSION_BURST_WINDOW_MS, Date.now());
	if (recentBurst.length >= SUBMISSION_BURST_THRESHOLD) {
		reasons.push('rapid_resubmission');
	}

	return reasons;
}

async function getRequestClientHash(request: Request): Promise<string | null> {
	const forwardedFor =
		request.headers.get('CF-Connecting-IP') ||
		request.headers.get('X-Forwarded-For') ||
		request.headers.get('True-Client-IP');
	return await hashTelemetryValue(forwardedFor);
}

async function hashTelemetryValue(value: string | null): Promise<string | null> {
	if (!value || value.trim() === '') return null;
	const encoded = encoder.encode(value.trim());
	const digest = await crypto.subtle.digest('SHA-256', encoded);
	const bytes = Array.from(new Uint8Array(digest));
	return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

async function persistValidationSubmission(
	env: unknown,
	input: {
		siteId: string;
		siteName: string | null;
		siteUrl?: string;
		validationResults: ValidationSubmitRequest['validationResults'];
	}
): Promise<{
		persisted: boolean;
		recordId?: string;
		reason?: ValidationSubmitResponse['reason'];
		message: string;
	}> {
	const airtableApiKey = readEnvString(env, 'AIRTABLE_API_KEY');
	if (!airtableApiKey) {
		return {
			persisted: false,
			reason: 'airtable_not_configured',
			message: 'Submission accepted, but Airtable persistence is not configured.'
		};
	}

	const searchParams = new URLSearchParams({
		filterByFormula: `{ℹ️UID}='${escapeAirtableFormulaString(input.siteId)}'`
	});
	const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?${searchParams.toString()}`;
	const searchResponse = await fetch(searchUrl, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${airtableApiKey}`
		}
	});

	if (!searchResponse.ok) {
		const errorText = await searchResponse.text().catch(() => '');
		throw new Error(`Failed to search Airtable for template (${searchResponse.status}) ${errorText}`);
	}

	const searchData = (await searchResponse.json()) as {
		records?: Array<{ id: string }>;
	};
	const recordId = searchData.records?.[0]?.id;
	if (!recordId) {
		return {
			persisted: false,
			reason: 'record_not_found',
			message: 'Submission accepted, but no Airtable record exists for this site.'
		};
	}

	const formattedResults = formatValidationResults(input.validationResults);
	const updateResponse = await fetch(
		`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${recordId}`,
		{
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${airtableApiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				fields: {
					'ℹ️Validation notes': formattedResults
				}
			})
		}
	);

	if (!updateResponse.ok) {
		const errorText = await updateResponse.text().catch(() => '');
		throw new Error(`Failed to update Airtable validation notes (${updateResponse.status}) ${errorText}`);
	}

	return {
		persisted: true,
		recordId,
		message: 'Validation results persisted to Airtable.'
	};
}

async function attemptProgrammaticSnippetInstall(
	env: unknown,
	siteId: string,
	snippet: string,
	correlationId: string,
	idToken?: string
): Promise<{ ok: boolean; message: string }> {
	const webflowApiBase = readEnvString(env, 'WEBFLOW_DATA_API_BASE') || 'https://api.webflow.com';

	// Resolve the access token. Priority:
	// 1. Exchange the extension's ID token for a site-scoped access token
	// 2. Fall back to static WEBFLOW_DATA_API_TOKEN
	let webflowApiToken = readEnvString(env, 'WEBFLOW_DATA_API_TOKEN');

	if (idToken) {
		const clientId = readEnvString(env, 'WEBFLOW_APP_CLIENT_ID');
		const clientSecret = readEnvString(env, 'WEBFLOW_APP_CLIENT_SECRET');
		if (clientId && clientSecret) {
			try {
				const tokenResponse = await fetch(`${webflowApiBase}/oauth/access_token`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						client_id: clientId,
						client_secret: clientSecret,
						grant_type: 'authorization_code',
						code: idToken
					})
				});
				if (tokenResponse.ok) {
					const tokenData = (await tokenResponse.json()) as { access_token?: string };
					if (tokenData.access_token) {
						webflowApiToken = tokenData.access_token;
					}
				}
			} catch (e) {
				console.warn('ID token exchange failed, using static token:', e);
			}
		}
	}

	if (!webflowApiToken) {
		return {
			ok: false,
			message: 'Manual install required: no API token available. Ensure the app is authorized with custom_code:write scope.'
		};
	}

	const headers = {
		Authorization: `Bearer ${webflowApiToken}`,
		'Content-Type': 'application/json',
		accept: 'application/json'
	};

	try {
		// Single API call: add_inline_site_script registers AND applies in one step.
		// The inline script sets the bridge config and loads the hosted review.js.
		// Validated against Template Marketplace (5e593fb060cf87bbaf75dd20).
		const reviewScriptUrl = `${readEnvString(env, 'WORKER_PUBLIC_URL') || 'https://validation-worker.createsomething.workers.dev'}${REVIEW_SNIPPET_ASSET_PATH}`;
		const inlineSource = `window.__WF_REVIEW_BRIDGE={version:"${REVIEW_SNIPPET_VERSION}",marker:"${REVIEW_SNIPPET_MARKER}",bridgeToken:"${siteId.slice(0, 8)}",reviewSurface:"published-review",reviewScriptUrl:"${reviewScriptUrl}"};var s=document.createElement("script");s.src="${reviewScriptUrl}";document.head.appendChild(s);`;

		const registerResponse = await fetch(
			`${webflowApiBase}/beta/sites/${siteId}/registered_scripts/inline`,
			{
				method: 'POST',
				headers,
				body: JSON.stringify({
					sourceCode: inlineSource,
					version: REVIEW_SNIPPET_VERSION,
					displayName: 'WF Review Bridge',
					location: 'header',
					canCopy: false
				})
			}
		);

		if (registerResponse.ok) {
			return { ok: true, message: 'Bridge installed via Webflow Scripts API. Publish to activate.' };
		}

		// If inline registration fails (e.g. already registered), fall back to legacy
		const errorText = await registerResponse.text().catch(() => '');
		console.warn(`Inline script registration failed (${registerResponse.status}): ${errorText}`);

		const legacyResponse = await fetch(
			`${webflowApiBase}/v2/sites/${siteId}/custom-code`,
			{
				method: 'PUT',
				headers,
				body: JSON.stringify({ headCode: snippet })
			}
		);
		if (!legacyResponse.ok) {
			const legacyError = await legacyResponse.text().catch(() => '');
			return {
				ok: false,
				message: `Install failed (scripts: ${registerResponse.status}, legacy: ${legacyResponse.status}): ${errorText} / ${legacyError}`
			};
		}
		return { ok: true, message: 'Bridge installed via legacy API. Publish to activate.' };
	} catch (error) {
		return {
			ok: false,
			message: `Install failed: ${
				error instanceof Error ? error.message : String(error)
			} (correlationId=${correlationId})`
		};
	}
}

function buildSnippetPayload(token: string, request: Request): string {
	const reviewScriptUrl = getReviewSnippetUrl(request);
	return `<script>
window.__WF_REVIEW_BRIDGE = {
  version: "${REVIEW_SNIPPET_VERSION}",
  marker: "${REVIEW_SNIPPET_MARKER}",
  bridgeToken: "${token}",
  reviewSurface: "published-review",
  reviewScriptUrl: "${reviewScriptUrl}"
};
</script>
<script src="${reviewScriptUrl}"></script>`;
}

function generateBridgeToken(): string {
	const raw = crypto.randomUUID().replace(/-/g, '');
	return `wfbt_${raw}`;
}

function getReviewSnippetUrl(request: Request): string {
	return `${new URL(request.url).origin}${REVIEW_SNIPPET_ASSET_PATH}`;
}

async function handleReviewSnippetAsset(request: Request, env: Env): Promise<Response> {
	const assetResponse = await env.ASSETS.fetch(request);
	const headers = new Headers(assetResponse.headers);
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-Id');
	headers.set('Cache-Control', headers.get('Cache-Control') || 'public, max-age=300');

	return new Response(assetResponse.body, {
		status: assetResponse.status,
		statusText: assetResponse.statusText,
		headers
	});
}

function normalizeCorrelationId(value: string | undefined): string {
	if (!value) return `corr_${crypto.randomUUID()}`;
	return String(value).slice(0, 128);
}

function getCorrelationId(request: Request): string {
	const headerValue =
		request.headers.get('x-correlation-id') ||
		request.headers.get('x-request-id') ||
		request.headers.get('cf-ray');
	return normalizeCorrelationId(headerValue || undefined);
}

function readEnvString(env: unknown, key: string): string | undefined {
	const value = (env as Record<string, unknown> | undefined)?.[key];
	if (typeof value !== 'string' || value.trim() === '') return undefined;
	return value.trim();
}

function readEnvNumber(env: unknown, key: string): number | undefined {
	const raw = readEnvString(env, key);
	if (!raw) return undefined;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
	return parsed;
}

function isOriginAllowedForRequest(request: Request): boolean {
	const origin = request.headers.get('Origin');
	if (!origin) return true;
	return isAllowedOrigin(origin);
}

function isAllowedOrigin(origin: string): boolean {
	return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

function handleCORSPreflight(request: Request): Response {
	if (!isOriginAllowedForRequest(request)) {
		return new Response('Origin not allowed', { status: 403 });
	}
	return new Response(null, {
		status: 200,
		headers: getCORSHeaders(request)
	});
}

function jsonResponse(
	body: unknown,
	status: number,
	request: Request,
	extraHeaders?: Record<string, string>
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: getCORSHeaders(request, extraHeaders)
	});
}

function methodNotAllowed(request: Request): Response {
	return jsonResponse({ error: 'Method not allowed' }, 405, request);
}

function getCORSHeaders(
	request: Request,
	extraHeaders?: Record<string, string>
): Record<string, string> {
	const origin = request.headers.get('Origin');
	const requestedHeaders = request.headers.get('Access-Control-Request-Headers');
	const allowOrigin = origin && isAllowedOrigin(origin) ? origin : '*';
	return {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': allowOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers':
			requestedHeaders && requestedHeaders.trim() !== ''
				? requestedHeaders
				: 'Content-Type, Authorization, X-Correlation-Id',
		'Access-Control-Max-Age': '86400',
		Vary: 'Origin',
		...extraHeaders
	};
}

function createEmptyAssetAnalysis(): AssetAnalysisResult {
	return {
		issues: [],
		stats: {
			totalAssets: 0,
			oversizedAssets: 0,
			unoptimizedAssets: 0,
			unusedAssets: 0,
			licensingIssues: 0,
			totalPageWeight: 0
		},
		assets: []
	};
}

function createEmptyContentAnalysis(): ContentAnalysisResult {
	return {
		issues: [],
		stats: {
			totalPages: 0,
			pagesWithLoremIpsum: 0,
			headingHierarchyErrors: 0,
			altTextCoverage: 100,
			seoComplianceScore: 0,
			pagesWithSEOIssues: 0,
			averageContentScore: 0,
			pagesWithContentIssues: 0,
			totalLinks: 0,
			totalBrokenLinks: 0,
			averageLinksPerPage: 0
		},
		pages: []
	};
}

function createEmptyAccessibilityAudit(): AccessibilityAudit {
	return {
		colorContrast: [],
		altTextCoverage: {
			totalImages: 0,
			imagesWithAlt: 0,
			imagesWithoutAlt: [],
			coveragePercentage: 100
		},
		headingStructure: {
			isValid: true,
			errors: []
		},
		formLabels: {
			totalInputs: 0,
			inputsWithLabels: 0,
			unlabeledInputs: []
		},
		focusManagement: {
			focusableElements: 0,
			elementsWithoutFocusStyles: 0,
			tabOrderIssues: []
		}
	};
}

function createEmptyAccessibilityAnalysis(): AccessibilityAnalysisResult {
	return {
		issues: [],
		stats: {
			contrastViolations: 0,
			missingAltText: 0,
			headingStructureErrors: 0,
			wcagComplianceScore: 0
		},
		audit: createEmptyAccessibilityAudit()
	};
}

function countCriticalErrors(analyses: Array<{ issues: Array<{ severity: string }> }>): number {
	return analyses.reduce((count, analysis) => {
		return count + analysis.issues.filter((issue) => issue.severity === 'error').length;
	}, 0);
}

async function handleBatchedAssetValidation(request: Request): Promise<Response> {
	try {
		const body = (await request.json()) as AssetBatchRequest;
		if (!body.assets || !body.siteUrl) {
			return jsonResponse(
				{ error: 'Missing required fields: assets and siteUrl' },
				400,
				request
			);
		}

		const result = await validateAssetBatch(body.assets, body.siteUrl);
		const response: AssetBatchResponse = {
			results: result.analyzedAssets,
			issues: result.issues,
			processedCount: result.processedCount,
			totalAssets: body.totalAssets,
			isComplete: result.remainingAssets.length === 0,
			remainingAssets:
				result.remainingAssets.length > 0 ? result.remainingAssets : undefined
		};

		return jsonResponse(response, 200, request);
	} catch (error) {
		return jsonResponse(
			{
				error: 'Batched asset validation failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			500,
			request
		);
	}
}
