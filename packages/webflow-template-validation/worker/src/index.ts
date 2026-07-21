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
import { validateInteractions, type CmsTemplateHint } from './validators/interactions-validator';
import { validateCustomCode } from './validators/custom-code-validator';
import { fetchHTML } from './utils/fetch-utils';
import { Langfuse } from 'langfuse';
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
const WORKER_VERSION = '2.3.2';
const REVIEW_SNIPPET_MARKER = '__wf_review_snippet_v1';
const REVIEW_SNIPPET_ASSET_PATH = '/app-validator/snippet/review.js';
const REVIEW_JOB_RETENTION_MS = 30 * 60 * 1000;
const REVIEW_JOB_EVENT_LIMIT = 250;
const DEFAULT_LANGFUSE_HOST = 'https://us.cloud.langfuse.com';
const AIRTABLE_BASE_ID = 'appMoIgXMTTTNIc3p';
const AIRTABLE_TABLE_ID = 'tblRwzpWoLgE9MrUm';
const DEFAULT_SUBMISSION_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_SUBMISSION_MAX = 6;
const SUBMISSION_BURST_WINDOW_MS = 90 * 1000;
const SUBMISSION_BURST_THRESHOLD = 3;
const SUBMISSION_CLIENT_CHURN_THRESHOLD = 3;
const BRIDGE_USAGE_INDEX_STATE_KEY = 'bridge-usage-index';
const BRIDGE_USAGE_SCHEMA_VERSION = 'validator_bridge_usage_index.v0.1';
const BRIDGE_USAGE_MAX_RECORDS = 1000;
const BRIDGE_USAGE_DEFAULT_LIMIT = 50;
const BRIDGE_USAGE_MAX_LIMIT = 250;
const encoder = new TextEncoder();
let langfuseClient: Langfuse | null = null;
let langfuseClientKey: string | null = null;

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

interface ValidationResultArtifactPersistResult {
	persisted: boolean;
	key?: string;
	sha256?: string;
	byteSize?: number;
	reason?: 'r2_not_configured' | 'r2_write_failed';
}

interface ValidationSubmissionSummary {
	totalErrors: number;
	totalWarnings: number;
	totalInfo: number;
	passedCategories: number;
	failedCategories: number;
	totalCategories: number;
	score: number;
	passed: boolean;
}

interface ValidationCategoryIssueDetail {
	severity: 'error' | 'warning' | 'info';
	message: string;
}

interface ValidationCategoryDetail {
	category: string;
	passed: boolean;
	issues: ValidationCategoryIssueDetail[];
}

interface ValidationResultRecord {
	schemaVersion: 'validator_app_submission_latest.v0.2';
	siteId: string;
	siteName: string | null;
	siteUrl?: string;
	submittedAt: string;
	correlationId: string;
	payloadHash: string;
	customCodePolicyVersion?: string;
	customCodeSurfaceHash?: string;
	rawBridgeTokenStored: false;
	summary: ValidationSubmissionSummary;
	failedCategoryDetails?: ValidationCategoryDetail[];
	warningCategoryDetails?: ValidationCategoryDetail[];
	artifact: ValidationResultArtifactPersistResult;
}

type BridgeUsageEvent =
	| 'snippet_install'
	| 'snippet_status'
	| 'snippet_rotate'
	| 'validation_submit'
	| 'latest_lookup';

interface BridgeUsageEventCounters {
	install: number;
	status: number;
	rotate: number;
	submit: number;
	latestLookup: number;
}

interface BridgeUsageLatestResultSnapshot {
	submittedAt: string;
	correlationId: string;
	payloadHash: string;
	customCodePolicyVersion?: string;
	customCodeSurfaceHash?: string;
	passed: boolean;
	summary: ValidationSubmissionSummary;
	artifact: ValidationResultArtifactPersistResult;
}

interface BridgeUsageIndexRecord {
	schemaVersion: typeof BRIDGE_USAGE_SCHEMA_VERSION;
	siteId: string;
	siteName: string | null;
	siteUrl?: string;
	snippetVersion?: string;
	installMethod?: SnippetTokenRecord['installMethod'];
	status: SnippetTokenRecord['status'];
	installed: boolean;
	firstSeenAt: string;
	lastSeenAt: string;
	lastEvent: BridgeUsageEvent;
	lastInstallAt?: string;
	lastStatusCheckAt?: string;
	lastTokenRotatedAt?: string;
	lastSubmissionAt?: string;
	lastLatestLookupAt?: string;
	lastKnownMessage?: string;
	latestResult?: BridgeUsageLatestResultSnapshot;
	eventCounts: BridgeUsageEventCounters;
	rawBridgeTokenStored: false;
}

interface BridgeUsageIndexState {
	schemaVersion: typeof BRIDGE_USAGE_SCHEMA_VERSION;
	updatedAt: string;
	rawBridgeTokenStored: false;
	records: BridgeUsageIndexRecord[];
}

interface BridgeUsageIndexUpdate {
	event: BridgeUsageEvent;
	siteId: string;
	siteName?: string | null;
	siteUrl?: string;
	snippetVersion?: string;
	installMethod?: SnippetTokenRecord['installMethod'];
	status?: SnippetTokenRecord['status'];
	installed?: boolean;
	eventAt?: string;
	lastInstallAt?: string;
	lastStatusCheckAt?: string;
	lastTokenRotatedAt?: string;
	lastSubmissionAt?: string;
	lastLatestLookupAt?: string;
	lastKnownMessage?: string;
	latestResult?: BridgeUsageLatestResultSnapshot;
	correlationId?: string;
}

interface SnippetTokenLookupRecord {
	bridgeTokenSha256: string;
	siteId: string;
	updatedAt: string;
	rawBridgeTokenStored: false;
}

interface R2BucketLike {
	put(
		key: string,
		value: string,
		options?: {
			httpMetadata?: { contentType?: string };
			customMetadata?: Record<string, string>;
		}
	): Promise<unknown>;
}

const reviewJobs = new Map<string, ReviewJobState>();
const snippetTokens = new Map<string, SnippetTokenRecord>();
const snippetTokenLookups = new Map<string, SnippetTokenLookupRecord>();
const submissionStates = new Map<string, SubmissionRateLimitState>();
const validationResultRecords = new Map<string, ValidationResultRecord>();
const bridgeUsageRecords = new Map<string, BridgeUsageIndexRecord>();

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

			if (url.pathname === '/app-validator/submission/latest') {
				if (request.method !== 'GET') return methodNotAllowed(request);
				return await handleValidationSubmissionLatest(request, env, correlationId);
			}

			if (url.pathname === '/app-validator/feedback') {
				if (request.method !== 'POST') return methodNotAllowed(request);
				return await handleIssueFeedback(request, env, correlationId);
			}

			if (url.pathname === '/app-validator/bridge/usage') {
				if (request.method !== 'GET') return methodNotAllowed(request);
				return await handleBridgeUsageList(request, env, correlationId);
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
							version: WORKER_VERSION,
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
								'/app-validator/submit',
								'/app-validator/submission/latest',
								'/app-validator/bridge/usage'
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
	const snippet = buildSnippetPayload(bridgeToken, request, body.siteId);

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
		const programmatic = await attemptProgrammaticSnippetInstall(
			env,
			body.siteId,
			bridgeToken,
			snippet,
			correlationId,
			body.idToken
		);
		if (programmatic.ok) {
			record.installMethod = 'webflow-api';
			record.status = 'active';
			record.installed = true;
			record.message = programmatic.message;
		} else {
			record.message = programmatic.message;
		}
	} else {
		record.message =
			'Validator script ready. Paste it in Site Settings > Custom Code > Head code, publish, then re-check.';
	}

	await persistSnippetTokenState(env, record);
	await recordBridgeUsage(env, {
		event: 'snippet_install',
		siteId: record.siteId,
		siteName: record.siteName,
		snippetVersion: record.snippetVersion,
		installMethod: record.installMethod,
		status: record.status,
		installed: record.installed,
		eventAt: now,
		lastInstallAt: now,
		lastKnownMessage: record.message,
		correlationId
	});

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
			snippet: buildSnippetPayload('__REPLACE_WITH_TOKEN__', request, siteId)
		};
		await recordBridgeUsage(env, {
			event: 'snippet_status',
			siteId,
			siteName: null,
			status: response.status,
			installed: response.installed,
			snippetVersion: response.snippetVersion,
			installMethod: response.installMethod,
			eventAt: response.updatedAt,
			lastStatusCheckAt: response.updatedAt,
			lastKnownMessage: response.message
		});
		return jsonResponse(response, 200, request);
	}

	if (existing.installMethod === 'manual-fallback' && siteUrl) {
		existing = await verifyManualSnippetStatus(env, existing, siteUrl);
	}

	const response: SnippetStatusResponse & { snippet: string } = {
		...existing,
		snippet: buildSnippetPayload(existing.bridgeToken, request, existing.siteId)
	};
	await recordBridgeUsage(env, {
		event: 'snippet_status',
		siteId: existing.siteId,
		siteName: existing.siteName,
		siteUrl: siteUrl || undefined,
		snippetVersion: existing.snippetVersion,
		installMethod: existing.installMethod,
		status: existing.status,
		installed: existing.installed,
		eventAt: existing.updatedAt,
		lastStatusCheckAt: existing.updatedAt,
		lastKnownMessage: existing.message
	});
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
	const snippet = buildSnippetPayload(bridgeToken, request, body.siteId);
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
			bridgeToken,
			snippet,
			correlationId
		);
		if (programmatic.ok) {
			record = {
				...record,
				installMethod: 'webflow-api',
				status: 'pending_manual',
				installed: false,
				message:
					'Token rotated and Validator script updated. Publish the site, then re-check the published script.'
			};
		} else {
			record = {
				...record,
				message: `${programmatic.message} Publish the updated bridge and review surface, then re-check.`
			};
		}
	}
	await persistSnippetTokenState(env, record);
	await recordBridgeUsage(env, {
		event: 'snippet_rotate',
		siteId: record.siteId,
		siteName: record.siteName,
		snippetVersion: record.snippetVersion,
		installMethod: record.installMethod,
		status: record.status,
		installed: record.installed,
		eventAt: now,
		lastTokenRotatedAt: now,
		lastKnownMessage: record.message,
		correlationId
	});

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
	const artifactResult = await persistValidationResultArtifact(env, {
		siteId,
		siteName,
		siteUrl,
		submittedAt,
		correlationId,
		payloadHash,
		validationResults: sanitizedResults
	});
	const latestResult: ValidationResultRecord = {
		schemaVersion: 'validator_app_submission_latest.v0.2',
		siteId,
		siteName,
		siteUrl,
		submittedAt,
		correlationId,
		payloadHash,
		customCodePolicyVersion: sanitizedResults.customCodePolicyVersion,
		customCodeSurfaceHash: sanitizedResults.customCodeSurfaceHash,
		rawBridgeTokenStored: false,
		summary: summarizeValidationSubmission(sanitizedResults),
		failedCategoryDetails: getFailedCategoryDetails(sanitizedResults),
		warningCategoryDetails: getWarningCategoryDetails(sanitizedResults),
		artifact: artifactResult
	};
	await persistValidationResultState(env, latestResult);
	const knownSnippetState = await getSnippetTokenState(env, siteId);
	await recordBridgeUsage(env, {
		event: 'validation_submit',
		siteId,
		siteName,
		siteUrl,
		status: knownSnippetState?.status,
		installed: knownSnippetState?.installed,
		snippetVersion: knownSnippetState?.snippetVersion,
		installMethod: knownSnippetState?.installMethod,
		eventAt: submittedAt,
		lastSubmissionAt: submittedAt,
		latestResult: snapshotLatestResultForBridgeUsage(latestResult),
		correlationId
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
		},
		artifact: artifactResult
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
				artifactPersisted: artifactResult.persisted,
				artifactKey: artifactResult.key,
				artifactReason: artifactResult.reason,
				remaining,
				anomalyReasons
			}
		})
	);

	return jsonResponse(response, 200, request);
}

const FEEDBACK_MAX_BODY_BYTES = 8 * 1024;

/**
 * Creator-reported false positives. Each report is logged as a structured
 * event (queryable in Workers observability) and archived to R2 when the
 * artifact bucket is bound, so validator bugs surface as data instead of
 * support tickets.
 */
async function handleIssueFeedback(
	request: Request,
	env: unknown,
	correlationId: string
): Promise<Response> {
	const rawBody = await request.text();
	if (rawBody.length > FEEDBACK_MAX_BODY_BYTES) {
		return jsonResponse({ error: 'Feedback payload too large' }, 413, request);
	}

	let body: {
		issueId?: string;
		category?: string;
		message?: string;
		pageUrl?: string;
		siteId?: string;
		siteUrl?: string;
		runCorrelationId?: string;
		note?: string;
	};
	try {
		body = JSON.parse(rawBody);
	} catch {
		return jsonResponse({ error: 'Invalid JSON body' }, 400, request);
	}

	if (!body.issueId || typeof body.issueId !== 'string') {
		return jsonResponse({ error: 'Missing required field: issueId' }, 400, request);
	}

	const clean = (value: unknown, max: number): string | undefined =>
		typeof value === 'string' && value.trim() !== '' ? value.trim().slice(0, max) : undefined;

	const feedback = {
		event: 'issue.feedback',
		level: 'info',
		correlationId,
		timestamp: new Date().toISOString(),
		issueId: clean(body.issueId, 120),
		category: clean(body.category, 120),
		message: clean(body.message, 500),
		pageUrl: clean(body.pageUrl, 500),
		siteId: clean(body.siteId, 120),
		siteUrl: clean(body.siteUrl, 500),
		runCorrelationId: clean(body.runCorrelationId, 120),
		note: clean(body.note, 1000)
	};

	console.log(JSON.stringify(feedback));

	const bucket = getValidationResultArtifactBucket(env);
	if (bucket) {
		try {
			const key = `feedback/${new Date().toISOString().slice(0, 10)}/${correlationId}.json`;
			await bucket.put(key, JSON.stringify(feedback, null, 2), {
				httpMetadata: { contentType: 'application/json' }
			});
		} catch (error) {
			console.warn('Feedback artifact write failed:', error);
		}
	}

	return jsonResponse({ received: true, correlationId }, 200, request);
}

async function handleValidationSubmissionLatest(
	request: Request,
	env: unknown,
	correlationId: string
): Promise<Response> {
	const url = new URL(request.url);
	const siteIdParam = normalizeSiteId(url.searchParams.get('siteId'));
	const bridgeTokenSha256 = normalizeSha256(url.searchParams.get('bridgeTokenSha256'));
	let siteId = siteIdParam;

	if (!siteId && bridgeTokenSha256) {
		const lookup = await getSnippetTokenLookupState(env, bridgeTokenSha256);
		siteId = lookup?.siteId || null;
	}

	if (!siteId && !bridgeTokenSha256) {
		return jsonResponse(
			{ error: 'Missing required query param: siteId or bridgeTokenSha256', correlationId },
			400,
			request
		);
	}

	if (!siteId) {
		return jsonResponse(
			{
				status: 'missing',
				accepted: false,
				passed: false,
				message: 'No Validator app site mapping was found for this bridge token.',
				correlationId,
				rawBridgeTokenStored: false
			},
			404,
			request
		);
	}

	const record = await getValidationResultState(env, siteId);
	if (!record) {
		return jsonResponse(
			{
				status: 'missing',
				accepted: false,
				passed: false,
				siteId,
				message: 'No Validator app result has been submitted for this site yet.',
				correlationId,
				rawBridgeTokenStored: false
			},
			404,
			request
		);
	}

	const lookupAt = new Date().toISOString();
	await recordBridgeUsage(env, {
		event: 'latest_lookup',
		siteId: record.siteId,
		siteName: record.siteName,
		siteUrl: record.siteUrl,
		eventAt: lookupAt,
		lastLatestLookupAt: lookupAt,
		latestResult: snapshotLatestResultForBridgeUsage(record),
		correlationId
	});

	return jsonResponse(
		{
			status: 'available',
			accepted: true,
			passed: record.summary.passed,
			siteId: record.siteId,
			siteName: record.siteName,
			siteUrl: record.siteUrl,
			submittedAt: record.submittedAt,
			correlationId: record.correlationId,
			payloadHash: record.payloadHash,
			customCodePolicyVersion: record.customCodePolicyVersion,
			customCodeSurfaceHash: record.customCodeSurfaceHash,
			rawBridgeTokenStored: false,
			summary: record.summary,
			failedCategoryDetails: record.failedCategoryDetails || [],
			warningCategoryDetails: record.warningCategoryDetails || [],
			artifact: record.artifact
		},
		200,
		request
	);
}

async function handleBridgeUsageList(
	request: Request,
	env: unknown,
	correlationId: string
): Promise<Response> {
	const auth = authorizeBridgeUsageRequest(request, env);
	if (!auth.authorized) {
		return jsonResponse(
			{
				status: auth.status === 503 ? 'unconfigured' : 'unauthorized',
				accepted: false,
				message: auth.message,
				correlationId,
				rawBridgeTokenStored: false
			},
			auth.status,
			request
		);
	}

	const url = new URL(request.url);
	const filters = parseBridgeUsageFilters(url);
	if ('error' in filters) {
		return jsonResponse({ error: filters.error, correlationId }, 400, request);
	}

	const state = await getBridgeUsageIndexState(env);
	const filtered = state.records
		.filter((record) => {
			if (filters.siteId && record.siteId !== filters.siteId) return false;
			if (filters.status && record.status !== filters.status) return false;
			if (typeof filters.installed === 'boolean' && record.installed !== filters.installed) return false;
			if (typeof filters.hasLatestResult === 'boolean' && Boolean(record.latestResult) !== filters.hasLatestResult) return false;
			if (filters.sinceMs) {
				const lastSeen = Date.parse(record.lastSeenAt);
				if (!Number.isFinite(lastSeen) || lastSeen < filters.sinceMs) return false;
			}
			if (filters.query) {
				const haystack = [
					record.siteId,
					record.siteName || '',
					record.siteUrl || '',
					record.lastKnownMessage || ''
				].join(' ').toLowerCase();
				if (!haystack.includes(filters.query)) return false;
			}
			return true;
		})
		.sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));

	const items = filtered.slice(0, filters.limit).map(sanitizeBridgeUsageRecordForResponse);

	return jsonResponse(
		{
			schemaVersion: BRIDGE_USAGE_SCHEMA_VERSION,
			status: 'available',
			accepted: true,
			count: items.length,
			totalMatched: filtered.length,
			limit: filters.limit,
			filters: {
				siteId: filters.siteId,
				status: filters.status,
				installed: filters.installed,
				hasLatestResult: filters.hasLatestResult,
				since: filters.since,
				query: filters.query
			},
			updatedAt: state.updatedAt,
			rawBridgeTokenStored: false,
			items
		},
		200,
		request
	);
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
	const cmsTemplateHints = extractCmsTemplateHints(body.designerData);

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
		maxPages: options.maxPages,
		cmsTemplateHints
	});
	const customCodePromise = validateCustomCode(body.siteUrl, body.pageSlugs, {
		maxPages: options.maxPages
	});

	const [assetAnalysis, contentAnalysis, accessibilityAnalysis, interactionsAnalysis, customCodeAnalysis] = await Promise.all([
		assetPromise,
		contentPromise,
		accessibilityPromise,
		interactionsPromise,
		customCodePromise
	]);

	return {
		siteUrl: body.siteUrl,
		workerVersion: WORKER_VERSION,
		timestamp: new Date().toISOString(),
		analysis: {
			assets: assetAnalysis,
			content: contentAnalysis,
			accessibility: accessibilityAnalysis,
			interactions: interactionsAnalysis,
			customCode: customCodeAnalysis
		},
		summary: {
			totalIssues:
				assetAnalysis.issues.length +
				contentAnalysis.issues.length +
				accessibilityAnalysis.issues.length +
				interactionsAnalysis.issues.length +
				customCodeAnalysis.issues.length,
			criticalErrors: countCriticalErrors([
				assetAnalysis,
				contentAnalysis,
				accessibilityAnalysis,
				interactionsAnalysis,
				customCodeAnalysis
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
		if (enhancedResult.analysis?.customCode) {
			categories.push({
				category: 'Custom Code & Site Settings',
				passed: enhancedResult.analysis.customCode.issues.filter((i: any) => i.severity === 'error').length === 0,
				issues: enhancedResult.analysis.customCode.issues,
				stats: enhancedResult.analysis.customCode.stats,
				policyVersion: enhancedResult.analysis.customCode.policyVersion,
				homepageSurfaceHash: enhancedResult.analysis.customCode.homepageSurfaceHash
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

	if (enhancedResult?.analysis?.customCode) {
		merged.categories.push({
			category: 'Custom Code & Site Settings',
			passed: enhancedResult.analysis.customCode.issues.filter((i: any) => i.severity === 'error').length === 0,
			issues: enhancedResult.analysis.customCode.issues,
			stats: enhancedResult.analysis.customCode.stats,
			policyVersion: enhancedResult.analysis.customCode.policyVersion,
			homepageSurfaceHash: enhancedResult.analysis.customCode.homepageSurfaceHash
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
	const issues = Array.isArray(accessibilityAnalysis?.issues)
		? accessibilityAnalysis.issues.filter((issue) => issue.id !== 'color-contrast-violations')
		: [];
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

	if (record.bridgeToken) {
		const bridgeTokenSha256 = await sha256Hex(record.bridgeToken);
		const lookup: SnippetTokenLookupRecord = {
			bridgeTokenSha256,
			siteId: record.siteId,
			updatedAt: record.updatedAt,
			rawBridgeTokenStored: false
		};
		snippetTokenLookups.set(bridgeTokenSha256, lookup);
		await writeDurableState(env, `snippet-token:${bridgeTokenSha256}`, lookup);
	}
}

async function getSnippetTokenLookupState(
	env: unknown,
	bridgeTokenSha256: string
): Promise<SnippetTokenLookupRecord | null> {
	const inMemory = snippetTokenLookups.get(bridgeTokenSha256);
	if (inMemory) return inMemory;

	const persisted = await readDurableState(env, `snippet-token:${bridgeTokenSha256}`);
	if (!persisted) return null;

	const record = persisted as SnippetTokenLookupRecord;
	snippetTokenLookups.set(bridgeTokenSha256, record);
	return record;
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

async function getValidationResultState(
	env: unknown,
	siteId: string
): Promise<ValidationResultRecord | null> {
	const inMemory = validationResultRecords.get(siteId);
	if (inMemory) return inMemory;

	const persisted = await readDurableState(env, `validation-result:${siteId}`);
	if (!persisted) return null;

	const record = persisted as ValidationResultRecord;
	validationResultRecords.set(siteId, record);
	return record;
}

async function persistValidationResultState(
	env: unknown,
	record: ValidationResultRecord
): Promise<void> {
	validationResultRecords.set(record.siteId, record);
	await writeDurableState(env, `validation-result:${record.siteId}`, record);
}

async function getBridgeUsageIndexState(env: unknown): Promise<BridgeUsageIndexState> {
	const persisted = await readDurableState(env, BRIDGE_USAGE_INDEX_STATE_KEY);
	if (persisted) {
		const restored = reviveBridgeUsageIndexState(persisted);
		bridgeUsageRecords.clear();
		for (const record of restored.records) {
			bridgeUsageRecords.set(record.siteId, record);
		}
		return restored;
	}

	const records = Array.from(bridgeUsageRecords.values()).sort(sortBridgeUsageRecords);
	return {
		schemaVersion: BRIDGE_USAGE_SCHEMA_VERSION,
		updatedAt: records[0]?.lastSeenAt || new Date(0).toISOString(),
		rawBridgeTokenStored: false,
		records
	};
}

async function persistBridgeUsageIndexState(
	env: unknown,
	state: BridgeUsageIndexState
): Promise<void> {
	bridgeUsageRecords.clear();
	for (const record of state.records) {
		bridgeUsageRecords.set(record.siteId, record);
	}
	await writeDurableState(env, BRIDGE_USAGE_INDEX_STATE_KEY, state);
}

async function recordBridgeUsage(env: unknown, update: BridgeUsageIndexUpdate): Promise<void> {
	try {
		const siteId = normalizeSiteId(update.siteId);
		if (!siteId) return;

		const eventAt = normalizeIsoTimestamp(update.eventAt) || new Date().toISOString();
		const state = await getBridgeUsageIndexState(env);
		const bySite = new Map(state.records.map((record) => [record.siteId, record]));
		const existing = bySite.get(siteId);
		const eventCounts = incrementBridgeUsageEventCount(existing?.eventCounts, update.event);
		const siteUrl = normalizeSiteUrl(update.siteUrl || null) || existing?.siteUrl;
		const next: BridgeUsageIndexRecord = {
			schemaVersion: BRIDGE_USAGE_SCHEMA_VERSION,
			siteId,
			siteName: update.siteName !== undefined ? update.siteName : existing?.siteName || null,
			siteUrl,
			snippetVersion: update.snippetVersion || existing?.snippetVersion,
			installMethod: update.installMethod || existing?.installMethod,
			status: update.status || existing?.status || 'pending_manual',
			installed: typeof update.installed === 'boolean' ? update.installed : existing?.installed || false,
			firstSeenAt: existing?.firstSeenAt || eventAt,
			lastSeenAt: eventAt,
			lastEvent: update.event,
			lastInstallAt: update.lastInstallAt || existing?.lastInstallAt,
			lastStatusCheckAt: update.lastStatusCheckAt || existing?.lastStatusCheckAt,
			lastTokenRotatedAt: update.lastTokenRotatedAt || existing?.lastTokenRotatedAt,
			lastSubmissionAt: update.lastSubmissionAt || existing?.lastSubmissionAt,
			lastLatestLookupAt: update.lastLatestLookupAt || existing?.lastLatestLookupAt,
			lastKnownMessage: sanitizeBridgeUsageMessage(update.lastKnownMessage) || existing?.lastKnownMessage,
			latestResult: update.latestResult || existing?.latestResult,
			eventCounts,
			rawBridgeTokenStored: false
		};

		bySite.set(siteId, next);
		const records = Array.from(bySite.values())
			.sort(sortBridgeUsageRecords)
			.slice(0, BRIDGE_USAGE_MAX_RECORDS);
		await persistBridgeUsageIndexState(env, {
			schemaVersion: BRIDGE_USAGE_SCHEMA_VERSION,
			updatedAt: eventAt,
			rawBridgeTokenStored: false,
			records
		});
	} catch (error) {
		await emitTelemetry(env, {
			event: 'bridge_usage.persist_failed',
			correlationId: normalizeCorrelationId(update.correlationId || `bridge_usage_${update.siteId}`),
			level: 'error',
			payload: {
				siteId: update.siteId,
				usageEvent: update.event,
				message: error instanceof Error ? error.message : String(error)
			}
		});
	}
}

function snapshotLatestResultForBridgeUsage(record: ValidationResultRecord): BridgeUsageLatestResultSnapshot {
	return {
		submittedAt: record.submittedAt,
		correlationId: record.correlationId,
		payloadHash: record.payloadHash,
		customCodePolicyVersion: record.customCodePolicyVersion,
		customCodeSurfaceHash: record.customCodeSurfaceHash,
		passed: record.summary.passed,
		summary: record.summary,
		artifact: record.artifact
	};
}

function reviveBridgeUsageIndexState(raw: unknown): BridgeUsageIndexState {
	const maybeState = raw as Partial<BridgeUsageIndexState> | null;
	const records = Array.isArray(maybeState?.records)
		? maybeState.records
			.map(reviveBridgeUsageRecord)
			.filter((record): record is BridgeUsageIndexRecord => Boolean(record))
			.sort(sortBridgeUsageRecords)
			.slice(0, BRIDGE_USAGE_MAX_RECORDS)
		: [];
	return {
		schemaVersion: BRIDGE_USAGE_SCHEMA_VERSION,
		updatedAt: normalizeIsoTimestamp(maybeState?.updatedAt) || records[0]?.lastSeenAt || new Date(0).toISOString(),
		rawBridgeTokenStored: false,
		records
	};
}

function reviveBridgeUsageRecord(raw: unknown): BridgeUsageIndexRecord | null {
	const value = raw as Partial<BridgeUsageIndexRecord> | null;
	const siteId = normalizeSiteId(value?.siteId);
	if (!siteId) return null;
	const lastSeenAt = normalizeIsoTimestamp(value?.lastSeenAt) || new Date(0).toISOString();
	const firstSeenAt = normalizeIsoTimestamp(value?.firstSeenAt) || lastSeenAt;
	const status = value?.status === 'active' || value?.status === 'failed' || value?.status === 'pending_manual'
		? value.status
		: 'pending_manual';
	const lastEvent = isBridgeUsageEvent(value?.lastEvent) ? value.lastEvent : 'snippet_status';

	return {
		schemaVersion: BRIDGE_USAGE_SCHEMA_VERSION,
		siteId,
		siteName: typeof value?.siteName === 'string' ? value.siteName : null,
		siteUrl: typeof value?.siteUrl === 'string' ? value.siteUrl : undefined,
		snippetVersion: typeof value?.snippetVersion === 'string' ? value.snippetVersion : undefined,
		installMethod: value?.installMethod === 'webflow-api' || value?.installMethod === 'manual-fallback'
			? value.installMethod
			: undefined,
		status,
		installed: Boolean(value?.installed),
		firstSeenAt,
		lastSeenAt,
		lastEvent,
		lastInstallAt: normalizeIsoTimestamp(value?.lastInstallAt) || undefined,
		lastStatusCheckAt: normalizeIsoTimestamp(value?.lastStatusCheckAt) || undefined,
		lastTokenRotatedAt: normalizeIsoTimestamp(value?.lastTokenRotatedAt) || undefined,
		lastSubmissionAt: normalizeIsoTimestamp(value?.lastSubmissionAt) || undefined,
		lastLatestLookupAt: normalizeIsoTimestamp(value?.lastLatestLookupAt) || undefined,
		lastKnownMessage: sanitizeBridgeUsageMessage(value?.lastKnownMessage),
		latestResult: reviveBridgeUsageLatestResult(value?.latestResult),
		eventCounts: reviveBridgeUsageEventCounts(value?.eventCounts),
		rawBridgeTokenStored: false
	};
}

function reviveBridgeUsageLatestResult(raw: unknown): BridgeUsageLatestResultSnapshot | undefined {
	const value = raw as Partial<BridgeUsageLatestResultSnapshot> | null;
	const submittedAt = normalizeIsoTimestamp(value?.submittedAt);
	if (!submittedAt || !value?.summary) return undefined;
	return {
		submittedAt,
		correlationId: typeof value.correlationId === 'string' ? value.correlationId : '',
		payloadHash: typeof value.payloadHash === 'string' ? value.payloadHash : '',
		customCodePolicyVersion:
			typeof value.customCodePolicyVersion === 'string' ? value.customCodePolicyVersion : undefined,
		customCodeSurfaceHash: normalizeSha256(value.customCodeSurfaceHash) || undefined,
		passed: Boolean(value.passed),
		summary: value.summary as ValidationSubmissionSummary,
		artifact: value.artifact || { persisted: false, reason: 'r2_not_configured' }
	};
}

function reviveBridgeUsageEventCounts(raw: unknown): BridgeUsageEventCounters {
	const value = raw as Partial<BridgeUsageEventCounters> | null;
	return {
		install: toNonNegativeInteger(value?.install),
		status: toNonNegativeInteger(value?.status),
		rotate: toNonNegativeInteger(value?.rotate),
		submit: toNonNegativeInteger(value?.submit),
		latestLookup: toNonNegativeInteger(value?.latestLookup)
	};
}

function incrementBridgeUsageEventCount(
	raw: BridgeUsageEventCounters | undefined,
	event: BridgeUsageEvent
): BridgeUsageEventCounters {
	const counts = reviveBridgeUsageEventCounts(raw);
	switch (event) {
		case 'snippet_install':
			counts.install++;
			break;
		case 'snippet_status':
			counts.status++;
			break;
		case 'snippet_rotate':
			counts.rotate++;
			break;
		case 'validation_submit':
			counts.submit++;
			break;
		case 'latest_lookup':
			counts.latestLookup++;
			break;
	}
	return counts;
}

function parseBridgeUsageFilters(url: URL): {
	limit: number;
	siteId?: string;
	status?: SnippetTokenRecord['status'];
	installed?: boolean;
	hasLatestResult?: boolean;
	since?: string;
	sinceMs?: number;
	query?: string;
} | { error: string } {
	const limitRaw = url.searchParams.get('limit');
	const limit = limitRaw
		? Math.min(Math.max(Number.parseInt(limitRaw, 10) || BRIDGE_USAGE_DEFAULT_LIMIT, 1), BRIDGE_USAGE_MAX_LIMIT)
		: BRIDGE_USAGE_DEFAULT_LIMIT;
	const siteId = normalizeSiteId(url.searchParams.get('siteId')) || undefined;
	const statusRaw = url.searchParams.get('status');
	const status = statusRaw && statusRaw !== 'any'
		? statusRaw === 'active' || statusRaw === 'pending_manual' || statusRaw === 'failed'
			? statusRaw
			: null
		: undefined;
	if (statusRaw && statusRaw !== 'any' && !status) return { error: 'Invalid status filter.' };

	const installed = parseBooleanFilter(url.searchParams.get('installed'));
	if (installed === 'invalid') return { error: 'Invalid installed filter. Use true or false.' };
	const hasLatestResult = parseBooleanFilter(url.searchParams.get('hasLatestResult'));
	if (hasLatestResult === 'invalid') return { error: 'Invalid hasLatestResult filter. Use true or false.' };

	const since = url.searchParams.get('since') || undefined;
	const sinceMs = since ? Date.parse(since) : undefined;
	if (since && !Number.isFinite(sinceMs)) return { error: 'Invalid since filter. Use an ISO timestamp.' };

	const query = url.searchParams.get('q')?.trim().toLowerCase() || undefined;
	return {
		limit,
		siteId,
		status: status || undefined,
		installed: installed === undefined ? undefined : installed,
		hasLatestResult: hasLatestResult === undefined ? undefined : hasLatestResult,
		since,
		sinceMs,
		query
	};
}

function parseBooleanFilter(value: string | null): boolean | undefined | 'invalid' {
	if (value === null || value === '') return undefined;
	if (/^(true|1|yes)$/i.test(value)) return true;
	if (/^(false|0|no)$/i.test(value)) return false;
	return 'invalid';
}

function authorizeBridgeUsageRequest(
	request: Request,
	env: unknown
): { authorized: true } | { authorized: false; status: number; message: string } {
	const configuredToken =
		readEnvString(env, 'VALIDATOR_BRIDGE_USAGE_ADMIN_TOKEN') ||
		readEnvString(env, 'VALIDATOR_ADMIN_TOKEN');
	if (!configuredToken) {
		return {
			authorized: false,
			status: 503,
			message: 'Bridge usage listing is not configured. Set VALIDATOR_BRIDGE_USAGE_ADMIN_TOKEN or VALIDATOR_ADMIN_TOKEN.'
		};
	}

	const authHeader = request.headers.get('Authorization') || '';
	const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
	const providedToken = bearerMatch?.[1] || request.headers.get('X-Validator-Admin-Token') || '';
	if (!providedToken) {
		return { authorized: false, status: 401, message: 'Missing bridge usage admin token.' };
	}
	if (providedToken !== configuredToken) {
		return { authorized: false, status: 403, message: 'Invalid bridge usage admin token.' };
	}
	return { authorized: true };
}

function sanitizeBridgeUsageRecordForResponse(record: BridgeUsageIndexRecord) {
	return {
		...record,
		rawBridgeTokenStored: false
	};
}

function isBridgeUsageEvent(value: unknown): value is BridgeUsageEvent {
	return value === 'snippet_install' ||
		value === 'snippet_status' ||
		value === 'snippet_rotate' ||
		value === 'validation_submit' ||
		value === 'latest_lookup';
}

function sortBridgeUsageRecords(a: BridgeUsageIndexRecord, b: BridgeUsageIndexRecord): number {
	return Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt);
}

function normalizeIsoTimestamp(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const parsed = Date.parse(value);
	if (!Number.isFinite(parsed)) return undefined;
	return new Date(parsed).toISOString();
}

function sanitizeBridgeUsageMessage(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.replace(/\s+/g, ' ').trim();
	if (!trimmed) return undefined;
	return trimmed.length > 300 ? `${trimmed.slice(0, 297)}...` : trimmed;
}

function toNonNegativeInteger(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) && value > 0
		? Math.floor(value)
		: 0;
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
	await emitLangfuseTrace(env, payload).catch(() => undefined);
}

async function emitLangfuseTrace(
	env: unknown,
	payload: Record<string, unknown>
): Promise<void> {
	const publicKey = readEnvString(env, 'LANGFUSE_PUBLIC_KEY');
	const secretKey = readEnvString(env, 'LANGFUSE_SECRET_KEY');
	if (!publicKey || !secretKey) return;

	const host =
		readEnvString(env, 'LANGFUSE_BASE_URL') ??
		readEnvString(env, 'LANGFUSE_HOST') ??
		DEFAULT_LANGFUSE_HOST;
	const projectName = readEnvString(env, 'LANGFUSE_PROJECT_NAME') ?? 'webflow-validation-worker';
	const nextKey = `${publicKey}::${secretKey}::${host}::${projectName}`;

	if (!langfuseClient || langfuseClientKey !== nextKey) {
		langfuseClient = new Langfuse({
			publicKey,
			secretKey,
			baseUrl: host,
			flushAt: 1,
			flushInterval: 250
		});
		langfuseClientKey = nextKey;
	}

	const trace = langfuseClient.trace({
		name: 'webflow-validation-worker:event',
		input: payload,
		metadata: {
			correlationId: payload.correlationId,
			projectName,
			source: 'webflow-validation-worker'
		},
		tags: ['webflow', 'validation', String(payload.event ?? 'event')]
	});
	trace
		.span({
			name: String(payload.event ?? 'validation-event'),
			input: payload,
			metadata: {
				correlationId: payload.correlationId,
				level: payload.level,
				source: 'webflow-validation-worker'
			},
			level: payload.level === 'error' ? 'ERROR' : 'DEFAULT'
		})
		.end();
	await langfuseClient.flushAsync();
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

function normalizeSha256(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const normalized = value.trim().toLowerCase();
	return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
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
		customCodePolicyVersion:
			typeof validationResults?.customCodePolicyVersion === 'string' &&
			validationResults.customCodePolicyVersion.trim().length <= 128
				? validationResults.customCodePolicyVersion.trim()
				: undefined,
		customCodeSurfaceHash:
			normalizeSha256(validationResults?.customCodeSurfaceHash) || undefined,
		summary,
		categories
	};
}

function getCategoryDetails(
	validationResults: ValidationSubmitRequest['validationResults'],
	predicate: (category: NonNullable<ValidationSubmitRequest['validationResults']['categories']>[number]) => boolean
): ValidationCategoryDetail[] {
	const categories = Array.isArray(validationResults.categories)
		? validationResults.categories
		: [];

	return categories
		.filter(predicate)
		.map((category) => ({
			category:
				typeof category.category === 'string' && category.category.trim() !== ''
					? category.category.trim()
					: 'Uncategorized',
			passed: category.passed === true,
			issues: Array.isArray(category.issues)
				? category.issues
						.filter(
							(issue): issue is ValidationCategoryIssueDetail =>
								Boolean(issue) &&
								(issue.severity === 'error' ||
									issue.severity === 'warning' ||
									issue.severity === 'info') &&
								typeof issue.message === 'string' &&
								issue.message.trim() !== ''
						)
						.map((issue) => ({
							severity: issue.severity,
							message: issue.message.trim()
						}))
				: []
		}))
		.slice(0, 10);
}

function getFailedCategoryDetails(
	validationResults: ValidationSubmitRequest['validationResults']
): ValidationCategoryDetail[] {
	return getCategoryDetails(
		validationResults,
		(category) =>
			category.passed !== true ||
			(Array.isArray(category.issues) &&
				category.issues.some((issue) => issue.severity === 'error'))
	);
}

function getWarningCategoryDetails(
	validationResults: ValidationSubmitRequest['validationResults']
): ValidationCategoryDetail[] {
	return getCategoryDetails(
		validationResults,
		(category) =>
			category.passed === true &&
			Array.isArray(category.issues) &&
			category.issues.some((issue) => issue.severity === 'warning')
	);
}

function summarizeValidationSubmission(
	validationResults: ValidationSubmitRequest['validationResults']
): ValidationSubmissionSummary {
	const summary =
		validationResults.summary && typeof validationResults.summary === 'object'
			? validationResults.summary
			: {};
	const categories = Array.isArray(validationResults.categories)
		? validationResults.categories
		: [];
	const categoryErrors = categories.reduce((total, category) => {
		const issues = Array.isArray(category.issues) ? category.issues : [];
		return total + issues.filter((issue) => issue.severity === 'error').length;
	}, 0);
	const categoryPassed = categories.filter((category) => category.passed === true).length;
	const categoryFailed = categories.filter((category) => category.passed !== true).length;
	const summaryErrors = readSummaryCount(summary, ['totalErrors', 'errors']);
	const totalErrors = Math.max(summaryErrors, categoryErrors);
	const totalWarnings = readSummaryCount(summary, ['totalWarnings', 'warnings']);
	const totalInfo = readSummaryCount(summary, ['totalInfo', 'infos']);
	const summaryPassedCategories = readSummaryCount(summary, ['passedCategories']);
	const summaryFailedCategories = readSummaryCount(summary, ['failedCategories']);
	const passedCategories =
		summaryPassedCategories > 0 || summaryFailedCategories > 0
			? summaryPassedCategories
			: categoryPassed;
	const failedCategories =
		summaryPassedCategories > 0 || summaryFailedCategories > 0
			? summaryFailedCategories
			: categoryFailed;
	const totalCategories =
		passedCategories + failedCategories > 0
			? passedCategories + failedCategories
			: categories.length;
	const score = totalCategories > 0 ? Math.round((passedCategories / totalCategories) * 100) : 0;

	return {
		totalErrors,
		totalWarnings,
		totalInfo,
		passedCategories,
		failedCategories,
		totalCategories,
		score,
		passed: totalCategories > 0 && score === 100 && failedCategories === 0 && totalErrors === 0
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

function getValidationResultArtifactBucket(env: unknown): R2BucketLike | null {
	const candidate = (env as { VALIDATOR_RESULT_ARTIFACTS?: R2BucketLike; VALIDATION_RESULT_ARTIFACTS?: R2BucketLike } | undefined);
	if (candidate?.VALIDATOR_RESULT_ARTIFACTS?.put) return candidate.VALIDATOR_RESULT_ARTIFACTS;
	if (candidate?.VALIDATION_RESULT_ARTIFACTS?.put) return candidate.VALIDATION_RESULT_ARTIFACTS;
	return null;
}

async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

function artifactSafeTimestamp(value: string): string {
	return value.replace(/[^0-9A-Za-z-]+/g, '-').replace(/-+$/g, '');
}

async function persistValidationResultArtifact(
	env: unknown,
	input: {
		siteId: string;
		siteName: string | null;
		siteUrl?: string;
		submittedAt: string;
		correlationId: string;
		payloadHash: string;
		validationResults: ValidationSubmitRequest['validationResults'];
	}
): Promise<ValidationResultArtifactPersistResult> {
	const bucket = getValidationResultArtifactBucket(env);
	if (!bucket) return { persisted: false, reason: 'r2_not_configured' };

	const artifact = {
		schema_version: 'validator_app_results_submission.v0.1',
		source_lane: 'validator_app_supplemental_results',
		site_id: input.siteId,
		site_name: input.siteName,
		site_url: input.siteUrl,
		submitted_at: input.submittedAt,
		correlation_id: input.correlationId,
		payload_hash: input.payloadHash,
		raw_bridge_token_stored: false,
		validation_results: input.validationResults
	};
	const body = JSON.stringify(artifact, null, 2);
	const sha256 = await sha256Hex(body);
	const key = [
		'validator-app-results',
		`site=${encodeURIComponent(input.siteId)}`,
		`${artifactSafeTimestamp(input.submittedAt)}_${input.payloadHash}.json`
	].join('/');

	try {
		await bucket.put(key, body, {
			httpMetadata: { contentType: 'application/json' },
			customMetadata: {
				siteId: input.siteId,
				sha256,
				submittedAt: input.submittedAt,
				correlationId: input.correlationId
			}
		});
		return {
			persisted: true,
			key,
			sha256,
			byteSize: encoder.encode(body).byteLength
		};
	} catch (error) {
		await emitTelemetry(env, {
			event: 'submission.artifact_persist_failed',
			correlationId: input.correlationId,
			level: 'error',
			payload: {
				siteId: input.siteId,
				siteUrl: input.siteUrl,
				message: error instanceof Error ? error.message : String(error)
			}
		});
		return { persisted: false, reason: 'r2_write_failed' };
	}
}

async function attemptProgrammaticSnippetInstall(
	env: unknown,
	siteId: string,
	bridgeToken: string,
	snippet: string,
	correlationId: string,
	idToken?: string
): Promise<{ ok: boolean; message: string }> {
	void env;
	void siteId;
	void bridgeToken;
	void snippet;
	void correlationId;
	void idToken;

	return {
		ok: false,
		message:
			'Automatic custom-code install is not enabled for this Validator. Copy the script into Site Settings > Custom Code > Head code, publish, then re-check.'
	};
}

function buildSnippetPayload(token: string, request: Request, siteId?: string): string {
	const reviewScriptUrl = getReviewSnippetUrl(request);
	return `<script>
${buildReviewBridgeConfigSource(token, reviewScriptUrl, siteId)}
</script>
<script src="${reviewScriptUrl}"></script>`;
}

function buildReviewBridgeConfigSource(token: string, reviewScriptUrl: string, siteId?: string): string {
	const siteIdLine = siteId ? `  siteId: ${JSON.stringify(siteId)},\n` : '';
	return `window.__WF_REVIEW_BRIDGE = {
${siteIdLine}  version: ${JSON.stringify(REVIEW_SNIPPET_VERSION)},
  marker: ${JSON.stringify(REVIEW_SNIPPET_MARKER)},
  bridgeToken: ${JSON.stringify(token)},
  reviewSurface: "published-review",
  reviewScriptUrl: ${JSON.stringify(reviewScriptUrl)}
};`;
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
				: 'Content-Type, Authorization, X-Correlation-Id, X-Validator-Admin-Token',
		'Access-Control-Max-Age': '86400',
		Vary: 'Origin',
		...extraHeaders
	};
}

function extractCmsTemplateHints(designerData: DesignerData): CmsTemplateHint[] {
	const pages = Array.isArray(designerData?.pages) ? designerData.pages : [];
	const hints = new Map<string, CmsTemplateHint>();

	for (const page of pages) {
		const candidates = [page.slug, page.path, page.publishPath]
			.filter((value): value is string => typeof value === 'string' && value.trim() !== '');
		const hasTemplateMetadata = Boolean(page.isCmsTemplate || page.collectionId || page.collectionName);
		const templateSlug = candidates.find(isInternalCmsTemplateSlug) || (hasTemplateMetadata ? candidates[0] : undefined);
		if (!templateSlug) continue;

		const normalizedTemplateSlug = normalizeCmsTemplateSlug(templateSlug);
		hints.set(normalizedTemplateSlug, {
			templateSlug: normalizedTemplateSlug,
			publishPath: page.publishPath || null,
			collectionId: page.collectionId || null,
			collectionName: page.collectionName || null
		});
	}

	return Array.from(hints.values());
}

const WEBFLOW_ECOMMERCE_TEMPLATE_ROOTS = new Set(['/product', '/sku', '/category']);

function isInternalCmsTemplateSlug(value: string): boolean {
	const pathname = getPathname(value);
	const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
	return /^\/detail_[^/]+\/?$/i.test(pathname) || WEBFLOW_ECOMMERCE_TEMPLATE_ROOTS.has(normalizedPathname.toLowerCase());
}

function normalizeCmsTemplateSlug(value: string): string {
	const pathname = getPathname(value);
	return pathname || value.trim();
}

function getPathname(value: string): string {
	const trimmed = value.trim();
	if (trimmed === '') return '';

	try {
		const path = trimmed.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `/${trimmed}`;
		return new URL(path, 'https://example.com').pathname;
	} catch {
		const withoutQuery = trimmed.split(/[?#]/, 1)[0] || '';
		return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
	}
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
