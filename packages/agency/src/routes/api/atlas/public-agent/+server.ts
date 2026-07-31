import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	computePublicAtlasReadiness,
	normalizePublicAtlasCanvas,
	summarizePublicAtlasCanvas,
	type PublicAtlasCanvas
} from '@create-something/canon/atlas/headless';
import { PUBLIC_ATLAS_LIMITS, type PublicAtlasTier } from '$lib/atlas/intake-policy';
import { runPublicAtlasMappingAgent } from '$lib/atlas/public';
import { runOpenAiPublicAtlasMappingAgent } from '$lib/atlas/model-agent';
import { buildPublicMapInteractionPair } from '$lib/analytics/workflow-interactions';
import { createLogger } from '@create-something/canon/utils';

const logger = createLogger('PublicAtlasAgentAPI');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AgentRequestBody = {
	message?: unknown;
	canvas?: unknown;
	visitorEmail?: unknown;
	selectedNodeId?: unknown;
	selectedSourceId?: unknown;
};

type UsageSnapshot = {
	tier: PublicAtlasTier;
	messagesUsed: number;
	messagesLimit: number;
	mutationsUsed: number;
	mutationsLimit: number;
	dailyMessagesUsed: number;
	dailyMessagesLimit: number;
};

const memoryDailyCounts = new Map<string, { day: string; count: number }>();

function todayKey(): string {
	return new Date().toISOString().slice(0, 10);
}

function randomId(prefix: string): string {
	if (globalThis.crypto && 'randomUUID' in globalThis.crypto) {
		return `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
	}
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function sha256(value: string): Promise<string> {
	if (globalThis.crypto?.subtle) {
		const encoded = new TextEncoder().encode(value);
		const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
		return Array.from(new Uint8Array(digest))
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
	}

	let hash = 0;
	for (const char of value) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	}
	return hash.toString(16).padStart(8, '0');
}

function normalizeEmail(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const normalized = value.trim().toLowerCase();
	return emailPattern.test(normalized) ? normalized.slice(0, 160) : undefined;
}

function getClientIp(request: Request): string {
	return (
		request.headers.get('cf-connecting-ip') ??
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		'unknown'
	);
}

async function buildRateKeys(request: Request, email: string | undefined) {
	const userAgent = request.headers.get('user-agent')?.slice(0, 180) ?? 'unknown';
	const basis = email ? `email:${email}` : `anon:${getClientIp(request)}:${userAgent}`;
	const hash = await sha256(basis);
	const emailHash = email ? await sha256(`email:${email}`) : undefined;
	return {
		rateKey: `atlas:${hash}`,
		emailHash
	};
}

function memoryCount(rateKey: string): number {
	const day = todayKey();
	const entry = memoryDailyCounts.get(rateKey);
	return entry?.day === day ? entry.count : 0;
}

function incrementMemoryCount(rateKey: string): void {
	const day = todayKey();
	const entry = memoryDailyCounts.get(rateKey);
	memoryDailyCounts.set(rateKey, {
		day,
		count: entry?.day === day ? entry.count + 1 : 1
	});
}

async function getDailyMessageCount(db: D1Database | undefined, rateKey: string): Promise<number> {
	if (!db) return memoryCount(rateKey);

	try {
		const row = await db
			.prepare(
				`SELECT COUNT(*) AS count
				 FROM public_atlas_agent_events
				 WHERE rate_key = ?
				   AND event_type = 'agent_message'
				   AND created_at >= datetime('now', 'start of day')`
			)
			.bind(rateKey)
			.first<{ count: number }>();

		return Number(row?.count ?? 0);
	} catch (err) {
		logger.warn('Falling back to in-memory Atlas rate counts', { error: err });
		return memoryCount(rateKey);
	}
}

function buildUsage(
	tier: PublicAtlasTier,
	canvas: PublicAtlasCanvas,
	dailyMessagesUsed: number
): UsageSnapshot {
	const limits = PUBLIC_ATLAS_LIMITS[tier];
	return {
		tier,
		messagesUsed: canvas.agentMessages,
		messagesLimit: limits.messagesPerMap,
		mutationsUsed: canvas.mutationCount,
		mutationsLimit: limits.mutationsPerMap,
		dailyMessagesUsed,
		dailyMessagesLimit: limits.dailyMessagesPerVisitor
	};
}

function limitResponse(message: string, usage: UsageSnapshot) {
	return json({ error: message, usage }, { status: 429 });
}

function normalizeOptionalToken(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const normalized = value.trim().slice(0, 90);
	return normalized || undefined;
}

function parsePositiveInteger(value: string | undefined, fallback: number, max: number): number {
	const parsed = Number.parseInt(value ?? '', 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.min(max, parsed);
}

function normalizeReasoningEffort(
	value: string | undefined
): 'low' | 'medium' | 'high' | 'xhigh' {
	const normalized = value?.trim().toLowerCase();
	if (
		normalized === 'low' ||
		normalized === 'medium' ||
		normalized === 'high' ||
		normalized === 'xhigh'
	) {
		return normalized;
	}
	return 'high';
}

async function persistAtlasEvent(
	db: D1Database | undefined,
	canvas: PublicAtlasCanvas,
	emailHash: string | undefined,
	rateKey: string,
	messageLength: number,
	mutationCount: number,
	tier: PublicAtlasTier
): Promise<boolean> {
	if (!db) return false;

	const readiness = computePublicAtlasReadiness(canvas);

	try {
		await db
			.prepare(
				`INSERT INTO public_atlas_sessions (
					id,
					email_hash,
					readiness_slug,
					readiness_score,
					canvas_json,
					summary,
					source,
					created_at,
					updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, 'agency-public-atlas', datetime('now'), datetime('now'))
				ON CONFLICT(id) DO UPDATE SET
					email_hash = COALESCE(excluded.email_hash, public_atlas_sessions.email_hash),
					readiness_slug = excluded.readiness_slug,
					readiness_score = excluded.readiness_score,
					canvas_json = excluded.canvas_json,
					summary = excluded.summary,
					updated_at = datetime('now')`
			)
			.bind(
				canvas.id,
				emailHash ?? null,
				readiness.slug,
				readiness.score,
				JSON.stringify(canvas),
				summarizePublicAtlasCanvas(canvas, readiness)
			)
			.run();

		await db
			.prepare(
				`INSERT INTO public_atlas_agent_events (
					id,
					session_id,
					rate_key,
					email_hash,
					event_type,
					message_chars,
					mutation_count,
					created_at
				)
				VALUES (?, ?, ?, ?, 'agent_message', ?, ?, datetime('now'))`
			)
			.bind(randomId('atlas_event'), canvas.id, rateKey, emailHash ?? null, messageLength, mutationCount)
			.run();

		const interactionEvents = buildPublicMapInteractionPair({
			correlationId: randomId('workflow_interaction'),
			humanEventId: randomId('workflow_event'),
			agentEventId: randomId('workflow_event'),
			sessionId: canvas.id,
			actorIdHash: await sha256(rateKey),
			messageChars: messageLength,
			mutationCount,
			tier
		});

		try {
			await db.batch(
				interactionEvents.map((event) =>
					db
						.prepare(
							`INSERT INTO workflow_interaction_events (
								id, property, workflow_id, session_id, correlation_id, parent_event_id,
								actor_kind, actor_id_hash, event_type, authority_state, tool_id, outcome,
								approval_required, proof_ref, duration_ms, metadata_json, created_at
							)
							VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
						)
						.bind(
							event.id,
							event.property,
							event.workflowId,
							event.sessionId,
							event.correlationId,
							event.parentEventId,
							event.actorKind,
							event.actorIdHash,
							event.eventType,
							event.authorityState,
							event.toolId,
							event.outcome,
							event.approvalRequired ? 1 : 0,
							event.proofRef,
							event.durationMs,
							JSON.stringify(event.metadata),
							event.createdAt
						)
				)
			);
		} catch (err) {
			logger.warn('Workflow interaction analytics skipped', { error: err });
		}

		return true;
	} catch (err) {
		logger.warn('Public Atlas persistence skipped', { error: err });
		return false;
	}
}

export const POST: RequestHandler = async ({ request, platform }) => {
	let body: AgentRequestBody;

	try {
		body = (await request.json()) as AgentRequestBody;
	} catch {
		return json({ error: 'Request body must be JSON.' }, { status: 400 });
	}

	const message = typeof body.message === 'string' ? body.message.trim() : '';
	if (!message) {
		return json({ error: 'Missing message.' }, { status: 400 });
	}

	const visitorEmail = normalizeEmail(body.visitorEmail);
	const tier: PublicAtlasTier = visitorEmail ? 'warmLead' : 'anonymous';
	const limits = PUBLIC_ATLAS_LIMITS[tier];

	if (message.length > limits.maxMessageChars) {
		return json(
			{ error: `Message must be ${limits.maxMessageChars} characters or fewer.` },
			{ status: 400 }
		);
	}

	const canvas = normalizePublicAtlasCanvas(body.canvas);
	const { rateKey, emailHash } = await buildRateKeys(request, visitorEmail);
	const dailyMessagesUsed = await getDailyMessageCount(platform?.env?.DB, rateKey);
	const usage = buildUsage(tier, canvas, dailyMessagesUsed);

	if (canvas.nodes.length > limits.maxNodes || canvas.edges.length > limits.maxEdges) {
		return limitResponse('This public map is already above the size limit for this access tier.', usage);
	}

	if (canvas.agentMessages >= limits.messagesPerMap) {
		return limitResponse('This Atlas map has reached its message limit.', usage);
	}

	if (canvas.mutationCount >= limits.mutationsPerMap) {
		return limitResponse('This Atlas map has reached its mutation limit.', usage);
	}

	if (dailyMessagesUsed >= limits.dailyMessagesPerVisitor) {
		return limitResponse('This visitor has reached the daily public Atlas message limit.', usage);
	}

	const remainingMutations = limits.mutationsPerMap - canvas.mutationCount;
	const selectedNodeId = normalizeOptionalToken(body.selectedNodeId);
	const selectedSourceId = normalizeOptionalToken(body.selectedSourceId);
	const modelResult = await runOpenAiPublicAtlasMappingAgent({
		apiKey: platform?.env?.OPENAI_API_KEY,
		canvas,
		maxMutations: Math.min(6, remainingMutations),
		maxOutputTokens: parsePositiveInteger(platform?.env?.PUBLIC_ATLAS_AGENT_MAX_OUTPUT_TOKENS, 900, 1800),
		message,
		model: platform?.env?.PUBLIC_ATLAS_AGENT_MODEL,
		reasoningEffort: normalizeReasoningEffort(platform?.env?.PUBLIC_ATLAS_AGENT_REASONING_EFFORT),
		selectedNodeId,
		selectedSourceId,
		timeoutMs: parsePositiveInteger(platform?.env?.PUBLIC_ATLAS_AGENT_TIMEOUT_MS, 12_000, 25_000)
	});
	const result = modelResult ?? runPublicAtlasMappingAgent(message, canvas);
	const nextUsage = buildUsage(tier, result.canvas, dailyMessagesUsed + 1);

	if (
		result.canvas.nodes.length > limits.maxNodes ||
		result.canvas.edges.length > limits.maxEdges ||
		result.canvas.mutationCount > limits.mutationsPerMap
	) {
		return limitResponse('This request would exceed the public Atlas map limit.', usage);
	}

	const persisted = await persistAtlasEvent(
		platform?.env?.DB,
		result.canvas,
		emailHash,
		rateKey,
		message.length,
		result.mutationCount,
		tier
	);
	if (!persisted) {
		incrementMemoryCount(rateKey);
	}

	return json({
		...result,
		usage: nextUsage
	});
};
