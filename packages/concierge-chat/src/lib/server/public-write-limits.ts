import { json } from '@sveltejs/kit';
import type { D1Database } from './db/d1';

export interface PublicWritePolicy {
	scope: string;
	subject: string;
	windowMs: number;
	maxHits: number;
	hitCost?: number;
	maxBytes?: number;
	byteCost?: number;
}

export interface PublicWritePolicyState {
	scope: string;
	subject: string;
	windowMs: number;
	maxHits: number;
	hitCount: number;
	remainingHits: number;
	maxBytes: number | null;
	byteCount: number;
	remainingBytes: number | null;
	retryAfterSeconds: number;
	blocked: boolean;
}

export interface PublicWriteLimitResult {
	ok: boolean;
	blockedPolicy: PublicWritePolicyState | null;
	policies: PublicWritePolicyState[];
}

interface StoredBucketState {
	hitCount: number;
	byteCount: number;
	expiresAtMs: number;
}

const LOCAL_BUCKET_LIMIT = 1_500;
const localBuckets = new Map<string, StoredBucketState>();

function maybeCleanupLocalBuckets(now: number) {
	for (const [key, bucket] of localBuckets) {
		if (bucket.expiresAtMs <= now) {
			localBuckets.delete(key);
		}
	}

	if (localBuckets.size <= LOCAL_BUCKET_LIMIT) {
		return;
	}

	const overflow = localBuckets.size - LOCAL_BUCKET_LIMIT;
	const oldestBuckets = [...localBuckets.entries()]
		.sort((left, right) => left[1].expiresAtMs - right[1].expiresAtMs)
		.slice(0, overflow);
	for (const [key] of oldestBuckets) {
		localBuckets.delete(key);
	}
}

async function maybeCleanupD1Buckets(db: D1Database, nowIso: string) {
	if (Math.random() > 0.02) {
		return;
	}

	await db
		.prepare('DELETE FROM public_write_usage_buckets WHERE expires_at <= ?')
		.bind(nowIso)
		.run();
}

async function consumeBucket(input: {
	db?: D1Database;
	bucketKey: string;
	scope: string;
	subject: string;
	windowStartMs: number;
	expiresAtMs: number;
	hitCost: number;
	byteCost: number;
	nowIso: string;
}) {
	if (input.db) {
		await maybeCleanupD1Buckets(input.db, input.nowIso);
		await input.db
			.prepare(
				`INSERT INTO public_write_usage_buckets (
					bucket_key,
					scope,
					subject_key,
					window_start_ms,
					expires_at,
					hit_count,
					byte_count,
					updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(bucket_key) DO UPDATE SET
					hit_count = public_write_usage_buckets.hit_count + excluded.hit_count,
					byte_count = public_write_usage_buckets.byte_count + excluded.byte_count,
					expires_at = excluded.expires_at,
					updated_at = excluded.updated_at`
			)
			.bind(
				input.bucketKey,
				input.scope,
				input.subject,
				input.windowStartMs,
				new Date(input.expiresAtMs).toISOString(),
				input.hitCost,
				input.byteCost,
				input.nowIso
			)
			.run();

		const row = await input.db
			.prepare(
				'SELECT hit_count AS hitCount, byte_count AS byteCount FROM public_write_usage_buckets WHERE bucket_key = ?'
			)
			.bind(input.bucketKey)
			.first<{ hitCount: number; byteCount: number }>();

		return {
			hitCount: row?.hitCount ?? input.hitCost,
			byteCount: row?.byteCount ?? input.byteCost
		};
	}

	maybeCleanupLocalBuckets(Date.now());

	const currentBucket = localBuckets.get(input.bucketKey);
	if (!currentBucket || currentBucket.expiresAtMs <= input.windowStartMs) {
		const nextBucket: StoredBucketState = {
			hitCount: input.hitCost,
			byteCount: input.byteCost,
			expiresAtMs: input.expiresAtMs
		};
		localBuckets.set(input.bucketKey, nextBucket);
		return nextBucket;
	}

	currentBucket.hitCount += input.hitCost;
	currentBucket.byteCount += input.byteCost;
	currentBucket.expiresAtMs = input.expiresAtMs;
	localBuckets.set(input.bucketKey, currentBucket);
	return currentBucket;
}

export async function enforcePublicWritePolicies(input: {
	platform?: App.Platform;
	policies: PublicWritePolicy[];
}) {
	const now = Date.now();
	const nowIso = new Date(now).toISOString();
	const db = input.platform?.env?.DB;
	const states: PublicWritePolicyState[] = [];

	for (const policy of input.policies) {
		const hitCost = Math.max(1, policy.hitCost ?? 1);
		const byteCost = Math.max(0, policy.byteCost ?? 0);
		const windowStartMs = Math.floor(now / policy.windowMs) * policy.windowMs;
		const expiresAtMs = windowStartMs + policy.windowMs;
		const bucketKey = `${policy.scope}:${policy.subject}:${windowStartMs}`;
		const bucket = await consumeBucket({
			db,
			bucketKey,
			scope: policy.scope,
			subject: policy.subject,
			windowStartMs,
			expiresAtMs,
			hitCost,
			byteCost,
			nowIso
		});
		const hitCount = bucket.hitCount;
		const byteCount = bucket.byteCount;
		const blocked =
			hitCount > policy.maxHits ||
			(typeof policy.maxBytes === 'number' && byteCount > policy.maxBytes);

		states.push({
			scope: policy.scope,
			subject: policy.subject,
			windowMs: policy.windowMs,
			maxHits: policy.maxHits,
			hitCount,
			remainingHits: Math.max(0, policy.maxHits - hitCount),
			maxBytes: typeof policy.maxBytes === 'number' ? policy.maxBytes : null,
			byteCount,
			remainingBytes:
				typeof policy.maxBytes === 'number' ? Math.max(0, policy.maxBytes - byteCount) : null,
			retryAfterSeconds: Math.max(1, Math.ceil((expiresAtMs - now) / 1000)),
			blocked
		});
	}

	const blockedPolicy = states.find((state) => state.blocked) ?? null;
	return {
		ok: blockedPolicy === null,
		blockedPolicy,
		policies: states
	} satisfies PublicWriteLimitResult;
}

export function createRateLimitedJsonResponse(message: string, retryAfterSeconds: number) {
	return json(
		{ message },
		{
			status: 429,
			headers: {
				'retry-after': String(retryAfterSeconds)
			}
		}
	);
}
