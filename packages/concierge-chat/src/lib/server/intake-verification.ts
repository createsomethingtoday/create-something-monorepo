import { error, type Cookies } from '@sveltejs/kit';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IntakeVerificationSupport } from '$lib/intake/types';
import { issueIntakeGrantCookie } from './intake-access';
import {
	getIntakeEmailFrom,
	getIntakeSigningSecret,
	getResendApiKey,
	isProductionRuntime,
	isSignedIntakeRequired
} from './runtime';

const RESEND_API = 'https://api.resend.com/emails';
const VERIFICATION_PURPOSE = 'nurse_intake';
const VERIFICATION_CODE_LENGTH = 6;
const VERIFICATION_TTL_MINUTES = 10;
const VERIFICATION_TTL_MS = VERIFICATION_TTL_MINUTES * 60 * 1000;
const RESEND_COOLDOWN_SECONDS = 60;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFIED_GRANT_TTL_SECONDS = 60 * 60 * 24 * 30;

interface StoredVerificationChallenge {
	id: string;
	purpose: typeof VERIFICATION_PURPOSE;
	sessionId: string;
	email: string;
	codeHash: string;
	deliveryMode: 'email' | 'preview';
	createdAt: string;
	expiresAt: string;
	resendAvailableAt: string;
	consumedAt: string | null;
	attemptCount: number;
	lastAttemptAt: string | null;
}

interface VerificationChallengeRow {
	id: string;
	purpose: string;
	session_id: string;
	email: string;
	code_hash: string;
	delivery_mode: 'email' | 'preview';
	created_at: string;
	expires_at: string;
	resend_available_at: string;
	consumed_at: string | null;
	attempt_count: number;
	last_attempt_at: string | null;
}

interface IntakeVerificationRequestResult {
	mode: 'email' | 'preview';
	email: string;
	expiresAt: string;
	previewCode?: string;
}

interface IntakeVerificationVerifyResult {
	email: string;
	grantExpiresAt: string;
}

const fallbackChallenges = new Map<string, StoredVerificationChallenge[]>();

function getFallbackStoreKey(email: string) {
	return `${VERIFICATION_PURPOSE}:${email}`;
}

function readFallbackChallenges(email: string) {
	return [...(fallbackChallenges.get(getFallbackStoreKey(email)) ?? [])];
}

function writeFallbackChallenges(email: string, challenges: StoredVerificationChallenge[]) {
	fallbackChallenges.set(getFallbackStoreKey(email), challenges);
}

function normalizeEmail(value: string) {
	return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeVerificationCode(value: string) {
	return value.trim().replace(/\s+/g, '');
}

function isValidVerificationCode(value: string) {
	return /^\d{6}$/.test(value);
}

function toIso(timestamp: number) {
	return new Date(timestamp).toISOString();
}

function fromIso(value: string | null | undefined) {
	return value ? Date.parse(value) : Number.NaN;
}

function buildCodeHash(secret: string, email: string, code: string) {
	return createHmac('sha256', secret)
		.update(`${VERIFICATION_PURPOSE}:${email}:${code}`)
		.digest('hex');
}

function secureCodeEquals(left: string, right: string) {
	const leftBuffer = Buffer.from(left, 'utf8');
	const rightBuffer = Buffer.from(right, 'utf8');
	return (
		leftBuffer.byteLength === rightBuffer.byteLength &&
		timingSafeEqual(leftBuffer, rightBuffer)
	);
}

function generateVerificationCode() {
	const randomBytes = crypto.getRandomValues(new Uint32Array(1));
	const number = 100000 + (randomBytes[0] % 900000);
	return `${number}`.padStart(VERIFICATION_CODE_LENGTH, '0');
}

function coerceChallengeRow(row: VerificationChallengeRow): StoredVerificationChallenge {
	return {
		id: row.id,
		purpose: VERIFICATION_PURPOSE,
		sessionId: row.session_id,
		email: row.email,
		codeHash: row.code_hash,
		deliveryMode: row.delivery_mode,
		createdAt: row.created_at,
		expiresAt: row.expires_at,
		resendAvailableAt: row.resend_available_at,
		consumedAt: row.consumed_at,
		attemptCount: row.attempt_count,
		lastAttemptAt: row.last_attempt_at
	};
}

async function countRecentChallenges(email: string, sinceIso: string, db?: D1Database) {
	if (!db) {
		return readFallbackChallenges(email).filter((challenge) => challenge.createdAt >= sinceIso).length;
	}

	const result = await db
		.prepare(
			`SELECT COUNT(*) as count
				FROM intake_verification_challenges
				WHERE purpose = ? AND email = ? AND created_at >= ?`
		)
		.bind(VERIFICATION_PURPOSE, email, sinceIso)
		.first<{ count: number | string }>();

	return Number(result?.count ?? 0);
}

async function getLatestChallenge(sessionId: string, email: string, db?: D1Database) {
	if (!db) {
		return (
			readFallbackChallenges(email)
				.filter((challenge) => challenge.sessionId === sessionId)
				.sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null
		);
	}

	const row = await db
		.prepare(
			`SELECT *
				FROM intake_verification_challenges
				WHERE purpose = ? AND session_id = ? AND email = ?
				ORDER BY created_at DESC
				LIMIT 1`
		)
		.bind(VERIFICATION_PURPOSE, sessionId, email)
		.first<VerificationChallengeRow>();

	return row ? coerceChallengeRow(row) : null;
}

async function deactivateActiveChallenges(
	sessionId: string,
	email: string,
	consumedAt: string,
	db?: D1Database
) {
	if (!db) {
		writeFallbackChallenges(
			email,
			readFallbackChallenges(email).map((challenge) =>
				challenge.sessionId === sessionId &&
				challenge.consumedAt === null &&
				challenge.purpose === VERIFICATION_PURPOSE
					? { ...challenge, consumedAt }
					: challenge
			)
		);
		return;
	}

	await db
		.prepare(
			`UPDATE intake_verification_challenges
				SET consumed_at = ?
				WHERE purpose = ? AND session_id = ? AND email = ? AND consumed_at IS NULL`
		)
		.bind(consumedAt, VERIFICATION_PURPOSE, sessionId, email)
		.run();
}

async function insertChallenge(challenge: StoredVerificationChallenge, db?: D1Database) {
	if (!db) {
		writeFallbackChallenges(emailFromChallenge(challenge), [
			challenge,
			...readFallbackChallenges(emailFromChallenge(challenge))
		]);
		return;
	}

	await db
		.prepare(
			`INSERT INTO intake_verification_challenges (
				id,
				purpose,
				session_id,
				email,
				code_hash,
				delivery_mode,
				created_at,
				expires_at,
				resend_available_at,
				consumed_at,
				attempt_count,
				last_attempt_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			challenge.id,
			challenge.purpose,
			challenge.sessionId,
			challenge.email,
			challenge.codeHash,
			challenge.deliveryMode,
			challenge.createdAt,
			challenge.expiresAt,
			challenge.resendAvailableAt,
			challenge.consumedAt,
			challenge.attemptCount,
			challenge.lastAttemptAt
		)
		.run();
}

async function deleteChallenge(id: string, email: string, db?: D1Database) {
	if (!db) {
		writeFallbackChallenges(
			email,
			readFallbackChallenges(email).filter((challenge) => challenge.id !== id)
		);
		return;
	}

	await db.prepare('DELETE FROM intake_verification_challenges WHERE id = ?').bind(id).run();
}

async function markChallengeAttempt(
	challenge: StoredVerificationChallenge,
	attemptCount: number,
	lastAttemptAt: string,
	db?: D1Database
) {
	if (!db) {
		writeFallbackChallenges(
			challenge.email,
			readFallbackChallenges(challenge.email).map((item) =>
				item.id === challenge.id ? { ...item, attemptCount, lastAttemptAt } : item
			)
		);
		return;
	}

	await db
		.prepare(
			`UPDATE intake_verification_challenges
				SET attempt_count = ?, last_attempt_at = ?
				WHERE id = ?`
		)
		.bind(attemptCount, lastAttemptAt, challenge.id)
		.run();
}

async function markChallengeConsumed(challenge: StoredVerificationChallenge, consumedAt: string, db?: D1Database) {
	if (!db) {
		writeFallbackChallenges(
			challenge.email,
			readFallbackChallenges(challenge.email).map((item) =>
				item.id === challenge.id ? { ...item, consumedAt } : item
			)
		);
		return;
	}

	await db
		.prepare(
			`UPDATE intake_verification_challenges
				SET consumed_at = ?
				WHERE id = ?`
		)
		.bind(consumedAt, challenge.id)
		.run();
}

function emailFromChallenge(challenge: StoredVerificationChallenge) {
	return challenge.email;
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

async function sendVerificationEmail(
	apiKey: string,
	from: string,
	to: string,
	code: string
) {
	const subject = 'Your Abundance verification code';
	const text = `Use this Abundance verification code to unlock secure credential steps: ${code}. It expires in ${VERIFICATION_TTL_MINUTES} minutes.`;
	const html = `
		<div style="font-family: ui-sans-serif, system-ui, sans-serif; color: #0f172a; line-height: 1.6;">
			<p>Use this verification code to unlock secure credential upload and recruiter review in Abundance:</p>
			<p style="font-size: 28px; font-weight: 700; letter-spacing: 0.18em;">${escapeHtml(code)}</p>
			<p>The code expires in ${VERIFICATION_TTL_MINUTES} minutes.</p>
		</div>
	`;

	const response = await fetch(RESEND_API, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			from,
			to,
			subject,
			html,
			text
		})
	});

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as { message?: string } | null;
		throw error(502, payload?.message || 'Unable to send the verification email right now.');
	}
}

export function getIntakeVerificationSupport(platform?: App.Platform): IntakeVerificationSupport {
	if (!isSignedIntakeRequired(platform)) {
		return {
			available: false,
			mode: 'unavailable',
			detail: 'Secure verification is not required in this environment.'
		};
	}

	if (!getIntakeSigningSecret(platform)) {
		return {
			available: false,
			mode: 'unavailable',
			detail: 'Secure verification is unavailable until the intake signing secret is configured.'
		};
	}

	if (getResendApiKey(platform)) {
		return {
			available: true,
			mode: 'email',
			detail: 'We can email a one-time verification code before protected credential steps.'
		};
	}

	if (!isProductionRuntime(platform)) {
		return {
			available: true,
			mode: 'preview',
			detail: 'Local preview can issue a one-time verification code directly for testing.'
		};
	}

	return {
		available: false,
		mode: 'unavailable',
		detail: 'Self-serve verification email is not configured in this production runtime yet.'
	};
}

export async function requestIntakeVerificationChallenge(input: {
	sessionId: string;
	email: string;
	platform?: App.Platform;
}) {
	const normalizedEmail = normalizeEmail(input.email);

	if (!isValidEmail(normalizedEmail)) {
		throw error(400, 'Enter a valid email address to receive a verification code.');
	}

	const support = getIntakeVerificationSupport(input.platform);
	if (!support.available) {
		throw error(503, support.detail);
	}

	const secret = getIntakeSigningSecret(input.platform);
	if (!secret) {
		throw error(500, 'Secure verification is unavailable until the intake signing secret is configured.');
	}

	const now = Date.now();
	const db = input.platform?.env?.DB;
	const recentRequestCount = await countRecentChallenges(
		normalizedEmail,
		toIso(now - REQUEST_WINDOW_MS),
		db
	);

	if (recentRequestCount >= MAX_REQUESTS_PER_WINDOW) {
		throw error(429, 'Too many verification codes have been requested. Try again in about an hour.');
	}

	const latestChallenge = await getLatestChallenge(input.sessionId, normalizedEmail, db);
	if (latestChallenge && latestChallenge.consumedAt === null) {
		const resendAt = fromIso(latestChallenge.resendAvailableAt);
		if (!Number.isNaN(resendAt) && resendAt > now) {
			const waitSeconds = Math.max(1, Math.ceil((resendAt - now) / 1000));
			throw error(429, `Wait ${waitSeconds} seconds before requesting another verification code.`);
		}
	}

	const verificationCode = generateVerificationCode();
	const createdAt = toIso(now);
	const challenge: StoredVerificationChallenge = {
		id: crypto.randomUUID(),
		purpose: VERIFICATION_PURPOSE,
		sessionId: input.sessionId,
		email: normalizedEmail,
		codeHash: buildCodeHash(secret, normalizedEmail, verificationCode),
		deliveryMode: support.mode === 'preview' ? 'preview' : 'email',
		createdAt,
		expiresAt: toIso(now + VERIFICATION_TTL_MS),
		resendAvailableAt: toIso(now + RESEND_COOLDOWN_SECONDS * 1000),
		consumedAt: null,
		attemptCount: 0,
		lastAttemptAt: null
	};

	await deactivateActiveChallenges(input.sessionId, normalizedEmail, createdAt, db);
	await insertChallenge(challenge, db);

	try {
		if (challenge.deliveryMode === 'email') {
			const resendApiKey = getResendApiKey(input.platform);
			if (!resendApiKey) {
				throw error(503, 'Self-serve verification email is not configured in this production runtime yet.');
			}

			await sendVerificationEmail(
				resendApiKey,
				getIntakeEmailFrom(input.platform),
				normalizedEmail,
				verificationCode
			);
		}
	} catch (issue) {
		await deleteChallenge(challenge.id, normalizedEmail, db);
		throw issue;
	}

	const response: IntakeVerificationRequestResult = {
		mode: challenge.deliveryMode,
		email: normalizedEmail,
		expiresAt: challenge.expiresAt,
		...(challenge.deliveryMode === 'preview' ? { previewCode: verificationCode } : {})
	};

	return response;
}

export async function verifyIntakeVerificationChallenge(input: {
	sessionId: string;
	email: string;
	code: string;
	cookies: Cookies;
	secure: boolean;
	platform?: App.Platform;
}) {
	const normalizedEmail = normalizeEmail(input.email);
	const normalizedCode = normalizeVerificationCode(input.code);

	if (!isValidEmail(normalizedEmail)) {
		throw error(400, 'Enter the same email address used for the verification request.');
	}

	if (!isValidVerificationCode(normalizedCode)) {
		throw error(400, 'Enter the 6-digit verification code from your email.');
	}

	const secret = getIntakeSigningSecret(input.platform);
	if (!secret) {
		throw error(500, 'Secure verification is unavailable until the intake signing secret is configured.');
	}

	const db = input.platform?.env?.DB;
	const challenge = await getLatestChallenge(input.sessionId, normalizedEmail, db);

	if (!challenge || challenge.consumedAt !== null || fromIso(challenge.expiresAt) <= Date.now()) {
		throw error(400, 'The verification code is invalid or expired. Request a fresh code and try again.');
	}

	if (challenge.attemptCount >= MAX_VERIFY_ATTEMPTS) {
		throw error(429, 'Too many incorrect verification attempts. Request a fresh code and try again.');
	}

	const expectedHash = buildCodeHash(secret, normalizedEmail, normalizedCode);
	if (!secureCodeEquals(challenge.codeHash, expectedHash)) {
		const nextAttemptCount = challenge.attemptCount + 1;
		await markChallengeAttempt(challenge, nextAttemptCount, new Date().toISOString(), db);

		if (nextAttemptCount >= MAX_VERIFY_ATTEMPTS) {
			throw error(429, 'Too many incorrect verification attempts. Request a fresh code and try again.');
		}

		const remainingAttempts = MAX_VERIFY_ATTEMPTS - nextAttemptCount;
		throw error(
			400,
			`The verification code is incorrect. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
		);
	}

	await markChallengeConsumed(challenge, new Date().toISOString(), db);
	const grantPayload = issueIntakeGrantCookie({
		cookies: input.cookies,
		secure: input.secure,
		platform: input.platform,
		subject: `self-serve:${normalizedEmail}`,
		email: normalizedEmail,
		ttlSeconds: VERIFIED_GRANT_TTL_SECONDS
	});

	const response: IntakeVerificationVerifyResult = {
		email: normalizedEmail,
		grantExpiresAt: new Date(grantPayload.exp * 1000).toISOString()
	};

	return response;
}
