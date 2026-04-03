import { error, type Cookies } from '@sveltejs/kit';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getIntakeSigningSecret, isSignedIntakeRequired } from './runtime';

const INTAKE_GRANT_COOKIE = 'abundance_intake_grant';
const INTAKE_GRANT_QUERY_PARAM = 'grant';
const INTAKE_GRANT_SCOPE = 'nurse_intake';

export interface IntakeGrantPayload {
	v: 1;
	scope: typeof INTAKE_GRANT_SCOPE;
	sub: string;
	grantId: string;
	exp: number;
	email?: string;
	name?: string;
}

export interface IntakeAccessState {
	required: boolean;
	granted: boolean;
	source: 'open' | 'query' | 'cookie' | 'none';
	reason: 'missing' | 'invalid_or_expired' | 'missing_secret' | null;
	grant: IntakeGrantPayload | null;
	shouldStripGrantParam: boolean;
}

export function getIntakeAccessStatusCode(state: IntakeAccessState) {
	return state.reason === 'missing_secret' ? 500 : 403;
}

function toBase64Url(input: string | Uint8Array) {
	const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
	return buffer
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
}

function fromBase64Url(input: string) {
	const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
	const remainder = normalized.length % 4;
	const padding = remainder === 0 ? '' : '='.repeat(4 - remainder);
	return Buffer.from(`${normalized}${padding}`, 'base64');
}

function isIntakeGrantPayload(value: unknown): value is IntakeGrantPayload {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	const record = value as Record<string, unknown>;
	return (
		record.v === 1 &&
		record.scope === INTAKE_GRANT_SCOPE &&
		typeof record.sub === 'string' &&
		record.sub.trim().length > 0 &&
		typeof record.grantId === 'string' &&
		record.grantId.trim().length > 0 &&
		typeof record.exp === 'number' &&
		Number.isFinite(record.exp) &&
		record.exp > 0 &&
		(record.email === undefined || typeof record.email === 'string') &&
		(record.name === undefined || typeof record.name === 'string')
	);
}

function buildSignature(payloadPart: string, secret: string) {
	return createHmac('sha256', secret).update(payloadPart).digest();
}

function clearIntakeGrantCookie(cookies: Cookies) {
	cookies.delete(INTAKE_GRANT_COOKIE, { path: '/' });
}

function setIntakeGrantCookie(
	cookies: Cookies,
	token: string,
	secure: boolean,
	expiresAtSeconds: number
) {
	const nowSeconds = Math.floor(Date.now() / 1000);
	const maxAge = Math.max(1, expiresAtSeconds - nowSeconds);

	cookies.set(INTAKE_GRANT_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge
	});
}

export interface IssueIntakeGrantCookieInput {
	cookies: Cookies;
	secure: boolean;
	platform?: App.Platform;
	subject: string;
	email?: string;
	name?: string;
	ttlSeconds?: number;
}

export function signIntakeGrantToken(payload: IntakeGrantPayload, secret: string) {
	const payloadPart = toBase64Url(JSON.stringify(payload));
	const signaturePart = toBase64Url(buildSignature(payloadPart, secret));
	return `${payloadPart}.${signaturePart}`;
}

export function issueIntakeGrantCookie(input: IssueIntakeGrantCookieInput) {
	const secret = getIntakeSigningSecret(input.platform);

	if (!secret) {
		throw error(
			500,
			'Secure intake verification is enabled, but the signing secret is missing from the runtime.'
		);
	}

	const nowSeconds = Math.floor(Date.now() / 1000);
	const ttlSeconds = Math.max(60, input.ttlSeconds ?? 60 * 60 * 24 * 7);
	const payload: IntakeGrantPayload = {
		v: 1,
		scope: INTAKE_GRANT_SCOPE,
		sub: input.subject,
		grantId: crypto.randomUUID(),
		exp: nowSeconds + ttlSeconds,
		...(input.email ? { email: input.email } : {}),
		...(input.name ? { name: input.name } : {})
	};
	const token = signIntakeGrantToken(payload, secret);

	setIntakeGrantCookie(input.cookies, token, input.secure, payload.exp);
	return payload;
}

export function verifyIntakeGrantToken(token: string, secret: string): IntakeGrantPayload | null {
	const trimmedToken = token.trim();
	const separatorIndex = trimmedToken.indexOf('.');

	if (separatorIndex <= 0 || separatorIndex === trimmedToken.length - 1) {
		return null;
	}

	const payloadPart = trimmedToken.slice(0, separatorIndex);
	const signaturePart = trimmedToken.slice(separatorIndex + 1);

	let payloadValue: unknown;
	let actualSignature: Buffer;

	try {
		payloadValue = JSON.parse(fromBase64Url(payloadPart).toString('utf8'));
		actualSignature = fromBase64Url(signaturePart);
	} catch {
		return null;
	}

	if (!isIntakeGrantPayload(payloadValue)) {
		return null;
	}

	const expectedSignature = buildSignature(payloadPart, secret);
	if (
		actualSignature.byteLength !== expectedSignature.byteLength ||
		!timingSafeEqual(actualSignature, expectedSignature)
	) {
		return null;
	}

	if (payloadValue.exp <= Math.floor(Date.now() / 1000)) {
		return null;
	}

	return payloadValue;
}

export function resolveIntakeAccess(input: {
	cookies: Cookies;
	url: URL;
	platform?: App.Platform;
	secure: boolean;
}): IntakeAccessState {
	const required = isSignedIntakeRequired(input.platform);
	if (!required) {
		return {
			required: false,
			granted: true,
			source: 'open',
			reason: null,
			grant: null,
			shouldStripGrantParam: false
		};
	}

	const secret = getIntakeSigningSecret(input.platform);
	if (!secret) {
		clearIntakeGrantCookie(input.cookies);
		return {
			required: true,
			granted: false,
			source: 'none',
			reason: 'missing_secret',
			grant: null,
			shouldStripGrantParam: false
		};
	}

	const queryToken = input.url.searchParams.get(INTAKE_GRANT_QUERY_PARAM)?.trim() || null;
	const cookieToken = input.cookies.get(INTAKE_GRANT_COOKIE)?.trim() || null;

	if (queryToken) {
		const queryGrant = verifyIntakeGrantToken(queryToken, secret);
		if (queryGrant) {
			setIntakeGrantCookie(input.cookies, queryToken, input.secure, queryGrant.exp);
			return {
				required: true,
				granted: true,
				source: 'query',
				reason: null,
				grant: queryGrant,
				shouldStripGrantParam: true
			};
		}

		clearIntakeGrantCookie(input.cookies);
		return {
			required: true,
			granted: false,
			source: 'none',
			reason: 'invalid_or_expired',
			grant: null,
			shouldStripGrantParam: true
		};
	}

	if (cookieToken) {
		const cookieGrant = verifyIntakeGrantToken(cookieToken, secret);
		if (cookieGrant) {
			return {
				required: true,
				granted: true,
				source: 'cookie',
				reason: null,
				grant: cookieGrant,
				shouldStripGrantParam: false
			};
		}

		clearIntakeGrantCookie(input.cookies);
		return {
			required: true,
			granted: false,
			source: 'none',
			reason: 'invalid_or_expired',
			grant: null,
			shouldStripGrantParam: false
		};
	}

	return {
		required: true,
		granted: false,
		source: 'none',
		reason: 'missing',
		grant: null,
		shouldStripGrantParam: false
	};
}

export function getSanitizedIntakeGrantUrl(url: URL) {
	const nextUrl = new URL(url);
	nextUrl.searchParams.delete(INTAKE_GRANT_QUERY_PARAM);
	return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}

export function getIntakeAccessErrorMessage(state: IntakeAccessState) {
	switch (state.reason) {
		case 'missing_secret':
			return 'Secure intake verification is enabled, but the signing secret is missing from the runtime.';
		case 'invalid_or_expired':
			return 'This secure verification link is invalid or expired. Request a fresh link before uploading documents or continuing staffing review.';
		case 'missing':
		default:
			return 'Secure verification is required before uploading documents or continuing staffing review.';
	}
}

export function ensureIntakeAccess(input: {
	cookies: Cookies;
	url: URL;
	platform?: App.Platform;
	secure: boolean;
}) {
	const state = resolveIntakeAccess(input);
	if (!state.granted) {
		throw error(getIntakeAccessStatusCode(state), getIntakeAccessErrorMessage(state));
	}

	return state;
}
