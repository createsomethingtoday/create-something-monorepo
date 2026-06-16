/**
 * Calendly webhook signature verification.
 *
 * Calendly signs each webhook and sends a `Calendly-Webhook-Signature` header
 * of the form `t=<unix_seconds>,v1=<hex_hmac_sha256>`. The signed payload is
 * `${t}.${rawBody}`, HMAC-SHA256'd with the subscription's signing key
 * (`CALENDLY_WEBHOOK_SECRET`).
 *
 * @see https://developer.calendly.com/api-docs/ZG9jOjM2MzE2MDM4-webhook-signatures
 */

import { createHmac } from 'node:crypto';

const WEBHOOK_TIME_TOLERANCE_SECONDS = 5 * 60;

function parseCalendlySignatureHeader(
	signatureHeader: string
): { timestamp: number; signature: string } | null {
	const parts = signatureHeader
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);

	let timestamp = 0;
	let signature = '';

	for (const part of parts) {
		const idx = part.indexOf('=');
		if (idx === -1) continue;
		const key = part.slice(0, idx).trim();
		const value = part.slice(idx + 1).trim();
		if (key === 't') {
			timestamp = Number.parseInt(value, 10);
		} else if (key === 'v1') {
			signature = value;
		}
	}

	if (!timestamp || !signature) {
		return null;
	}

	return { timestamp, signature };
}

function timingSafeEqualHex(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}

	let mismatch = 0;
	for (let i = 0; i < a.length; i += 1) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}

	return mismatch === 0;
}

/**
 * Verify a Calendly webhook signature over the raw request body.
 *
 * Returns false on a missing header, missing signing key, malformed header,
 * stale timestamp (outside the tolerance window), or signature mismatch.
 */
export async function verifyCalendlySignature(
	signatureHeader: string | null,
	rawBody: string,
	signingKey: string | undefined
): Promise<boolean> {
	if (!signatureHeader || !signingKey) {
		return false;
	}

	const parsed = parseCalendlySignatureHeader(signatureHeader);
	if (!parsed) {
		return false;
	}

	const now = Math.floor(Date.now() / 1000);
	if (Math.abs(now - parsed.timestamp) > WEBHOOK_TIME_TOLERANCE_SECONDS) {
		return false;
	}

	const payload = `${parsed.timestamp}.${rawBody}`;
	const expected = createHmac('sha256', signingKey).update(payload).digest('hex');
	return timingSafeEqualHex(expected, parsed.signature.toLowerCase());
}
