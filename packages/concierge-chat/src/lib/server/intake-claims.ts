import { createHmac } from 'node:crypto';
import type { IntakeClaimSource, IntakeClaimThreadSeed } from '$lib/intake/claim-seed';
import { getIntakeSigningSecret } from './runtime';

const DEFAULT_CLAIM_TTL_SECONDS = 60 * 60 * 24 * 14;
const CLAIM_HASH_SCOPE = 'candidate_intake_claim';

interface StoredCandidateIntakeClaim {
	id: string;
	source: IntakeClaimSource;
	applicantEmail: string | null;
	applicantPhone: string | null;
	localJobId: string | null;
	indeedApplyId: string;
	threadSeed: IntakeClaimThreadSeed;
	claimTokenHash: string;
	expiresAt: string;
	claimedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

interface CandidateIntakeClaimRow {
	id: string;
	source: IntakeClaimSource;
	applicant_email: string | null;
	applicant_phone: string | null;
	local_job_id: string | null;
	indeed_apply_id: string;
	thread_seed_json: string;
	claim_token_hash: string;
	expires_at: string;
	claimed_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface CreateCandidateIntakeClaimInput {
	platform?: App.Platform;
	baseUrl: string;
	source: IntakeClaimSource;
	applicantEmail?: string;
	applicantPhone?: string;
	localJobId?: string;
	indeedApplyId: string;
	threadSeed: IntakeClaimThreadSeed;
	ttlSeconds?: number;
}

export interface CreatedCandidateIntakeClaim {
	id: string;
	token: string;
	claimUrl: string;
	expiresAt: string;
}

export interface ResolvedCandidateIntakeClaim {
	id: string;
	source: IntakeClaimSource;
	applicantEmail: string | null;
	applicantPhone: string | null;
	localJobId: string | null;
	indeedApplyId: string;
	threadSeed: IntakeClaimThreadSeed;
	expiresAt: string;
	claimedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

const fallbackClaims = new Map<string, StoredCandidateIntakeClaim>();

function normalizeNullableString(value: string | null | undefined) {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function toIso(timestamp: number) {
	return new Date(timestamp).toISOString();
}

function fromIso(value: string) {
	return Date.parse(value);
}

function getClaimTokenHash(secret: string, token: string) {
	return createHmac('sha256', secret)
		.update(`${CLAIM_HASH_SCOPE}:${token}`)
		.digest('hex');
}

function coerceRow(row: CandidateIntakeClaimRow): StoredCandidateIntakeClaim {
	return {
		id: row.id,
		source: row.source,
		applicantEmail: row.applicant_email,
		applicantPhone: row.applicant_phone,
		localJobId: row.local_job_id,
		indeedApplyId: row.indeed_apply_id,
		threadSeed: JSON.parse(row.thread_seed_json) as IntakeClaimThreadSeed,
		claimTokenHash: row.claim_token_hash,
		expiresAt: row.expires_at,
		claimedAt: row.claimed_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function buildClaimUrl(baseUrl: string, token: string) {
	const url = new URL('/apply/claim', baseUrl);
	url.searchParams.set('token', token);
	return url.toString();
}

function buildClaimToken() {
	return `${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`;
}

function requireSigningSecret(platform?: App.Platform) {
	const secret = getIntakeSigningSecret(platform);
	if (!secret) {
		throw new Error(
			'ABUNDANCE_INTAKE_SIGNING_SECRET is required before candidate intake claims can be issued.'
		);
	}

	return secret;
}

async function insertClaim(claim: StoredCandidateIntakeClaim, db?: D1Database) {
	if (!db) {
		fallbackClaims.set(claim.claimTokenHash, claim);
		return;
	}

	await db
		.prepare(
			`INSERT INTO candidate_intake_claims (
				id,
				source,
				applicant_email,
				applicant_phone,
				local_job_id,
				indeed_apply_id,
				thread_seed_json,
				claim_token_hash,
				expires_at,
				claimed_at,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			claim.id,
			claim.source,
			claim.applicantEmail,
			claim.applicantPhone,
			claim.localJobId,
			claim.indeedApplyId,
			JSON.stringify(claim.threadSeed),
			claim.claimTokenHash,
			claim.expiresAt,
			claim.claimedAt,
			claim.createdAt,
			claim.updatedAt
		)
		.run();
}

async function readClaimByHash(hash: string, db?: D1Database) {
	if (!db) {
		return fallbackClaims.get(hash) ?? null;
	}

	const row = await db
		.prepare('SELECT * FROM candidate_intake_claims WHERE claim_token_hash = ? LIMIT 1')
		.bind(hash)
		.first<CandidateIntakeClaimRow>();

	return row ? coerceRow(row) : null;
}

async function updateClaimClaimedAt(
	claim: StoredCandidateIntakeClaim,
	claimedAt: string,
	db?: D1Database
) {
	if (!db) {
		fallbackClaims.set(claim.claimTokenHash, {
			...claim,
			claimedAt,
			updatedAt: claimedAt
		});
		return;
	}

	await db
		.prepare(
			`UPDATE candidate_intake_claims
				SET claimed_at = COALESCE(claimed_at, ?), updated_at = ?
				WHERE id = ?`
		)
		.bind(claimedAt, claimedAt, claim.id)
		.run();
}

function toResolvedClaim(claim: StoredCandidateIntakeClaim): ResolvedCandidateIntakeClaim {
	return {
		id: claim.id,
		source: claim.source,
		applicantEmail: claim.applicantEmail,
		applicantPhone: claim.applicantPhone,
		localJobId: claim.localJobId,
		indeedApplyId: claim.indeedApplyId,
		threadSeed: claim.threadSeed,
		expiresAt: claim.expiresAt,
		claimedAt: claim.claimedAt,
		createdAt: claim.createdAt,
		updatedAt: claim.updatedAt
	};
}

export async function createCandidateIntakeClaim(
	input: CreateCandidateIntakeClaimInput
): Promise<CreatedCandidateIntakeClaim> {
	const secret = requireSigningSecret(input.platform);
	const token = buildClaimToken();
	const claimTokenHash = getClaimTokenHash(secret, token);
	const now = Date.now();
	const createdAt = toIso(now);
	const expiresAt = toIso(now + Math.max(60, input.ttlSeconds ?? DEFAULT_CLAIM_TTL_SECONDS) * 1000);
	const claim: StoredCandidateIntakeClaim = {
		id: crypto.randomUUID(),
		source: input.source,
		applicantEmail: normalizeNullableString(input.applicantEmail),
		applicantPhone: normalizeNullableString(input.applicantPhone),
		localJobId: normalizeNullableString(input.localJobId),
		indeedApplyId: input.indeedApplyId.trim(),
		threadSeed: input.threadSeed,
		claimTokenHash,
		expiresAt,
		claimedAt: null,
		createdAt,
		updatedAt: createdAt
	};

	await insertClaim(claim, input.platform?.env?.DB);

	return {
		id: claim.id,
		token,
		claimUrl: buildClaimUrl(input.baseUrl, token),
		expiresAt
	};
}

export async function resolveCandidateIntakeClaim(
	token: string,
	platform?: App.Platform
): Promise<ResolvedCandidateIntakeClaim | null> {
	const trimmedToken = token.trim();
	if (!trimmedToken) {
		return null;
	}

	const secret = requireSigningSecret(platform);
	const claim = await readClaimByHash(getClaimTokenHash(secret, trimmedToken), platform?.env?.DB);
	if (!claim) {
		return null;
	}

	if (fromIso(claim.expiresAt) <= Date.now()) {
		return null;
	}

	return toResolvedClaim(claim);
}

export async function markCandidateIntakeClaimClaimed(
	token: string,
	platform?: App.Platform
): Promise<ResolvedCandidateIntakeClaim | null> {
	const trimmedToken = token.trim();
	if (!trimmedToken) {
		return null;
	}

	const secret = requireSigningSecret(platform);
	const claim = await readClaimByHash(getClaimTokenHash(secret, trimmedToken), platform?.env?.DB);
	if (!claim) {
		return null;
	}

	if (fromIso(claim.expiresAt) <= Date.now()) {
		return null;
	}

	const claimedAt = claim.claimedAt ?? toIso(Date.now());
	if (!claim.claimedAt) {
		await updateClaimClaimedAt(claim, claimedAt, platform?.env?.DB);
	}

	return toResolvedClaim({
		...claim,
		claimedAt,
		updatedAt: claimedAt
	});
}
