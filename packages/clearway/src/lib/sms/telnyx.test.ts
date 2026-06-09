import { describe, expect, it } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyTelnyxSignature } from './telnyx';

/**
 * Build an Ed25519 keypair and return the public key as raw-bytes base64
 * (the format Telnyx publishes and `verifyTelnyxSignature` expects).
 */
function makeKeypair() {
	const { publicKey, privateKey } = generateKeyPairSync('ed25519');
	const spki = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
	// SPKI for Ed25519 is a 12-byte prefix followed by the 32-byte raw key.
	const rawPublicKey = spki.subarray(spki.length - 32);
	return { publicKeyB64: Buffer.from(rawPublicKey).toString('base64'), privateKey };
}

function signPayload(privateKey: ReturnType<typeof makeKeypair>['privateKey'], timestamp: string, body: string) {
	return sign(null, Buffer.from(`${timestamp}|${body}`), privateKey).toString('base64');
}

describe('verifyTelnyxSignature', () => {
	const body = JSON.stringify({ data: { event_type: 'message.received' } });

	it('accepts a valid signature', async () => {
		const { publicKeyB64, privateKey } = makeKeypair();
		const ts = Math.floor(Date.now() / 1000).toString();
		const signature = signPayload(privateKey, ts, body);
		expect(await verifyTelnyxSignature(publicKeyB64, signature, ts, body)).toBe(true);
	});

	it('rejects a tampered body', async () => {
		const { publicKeyB64, privateKey } = makeKeypair();
		const ts = Math.floor(Date.now() / 1000).toString();
		const signature = signPayload(privateKey, ts, body);
		expect(await verifyTelnyxSignature(publicKeyB64, signature, ts, `${body} `)).toBe(false);
	});

	it('rejects a signature made with a different key', async () => {
		const signer = makeKeypair();
		const other = makeKeypair();
		const ts = Math.floor(Date.now() / 1000).toString();
		const signature = signPayload(signer.privateKey, ts, body);
		expect(await verifyTelnyxSignature(other.publicKeyB64, signature, ts, body)).toBe(false);
	});

	it('rejects a stale timestamp (outside the 5-minute window)', async () => {
		const { publicKeyB64, privateKey } = makeKeypair();
		const staleTs = (Math.floor(Date.now() / 1000) - 6 * 60).toString();
		const signature = signPayload(privateKey, staleTs, body);
		expect(await verifyTelnyxSignature(publicKeyB64, signature, staleTs, body)).toBe(false);
	});

	it('rejects empty inputs', async () => {
		const { publicKeyB64 } = makeKeypair();
		const ts = Math.floor(Date.now() / 1000).toString();
		expect(await verifyTelnyxSignature('', 'sig', ts, body)).toBe(false);
		expect(await verifyTelnyxSignature(publicKeyB64, '', ts, body)).toBe(false);
		expect(await verifyTelnyxSignature(publicKeyB64, 'sig', '', body)).toBe(false);
	});
});
