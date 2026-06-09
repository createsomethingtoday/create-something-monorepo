import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyCalendlySignature } from '$lib/server/calendly';

const SECRET = 'test-signing-key';

function signHeader(body: string, timestamp: number, secret = SECRET): string {
	const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
	return `t=${timestamp},v1=${signature}`;
}

describe('verifyCalendlySignature', () => {
	const body = JSON.stringify({ event: { uri: 'https://api.calendly.com/x' }, event_type: 'invitee.created' });

	it('accepts a valid signature', async () => {
		const ts = Math.floor(Date.now() / 1000);
		expect(await verifyCalendlySignature(signHeader(body, ts), body, SECRET)).toBe(true);
	});

	it('rejects a tampered body', async () => {
		const ts = Math.floor(Date.now() / 1000);
		expect(await verifyCalendlySignature(signHeader(body, ts), `${body} `, SECRET)).toBe(false);
	});

	it('rejects a signature made with a different secret', async () => {
		const ts = Math.floor(Date.now() / 1000);
		expect(await verifyCalendlySignature(signHeader(body, ts, 'attacker-key'), body, SECRET)).toBe(
			false
		);
	});

	it('rejects a stale timestamp (outside the 5-minute window)', async () => {
		const staleTs = Math.floor(Date.now() / 1000) - 6 * 60;
		expect(await verifyCalendlySignature(signHeader(body, staleTs), body, SECRET)).toBe(false);
	});

	it('rejects a missing header or missing secret', async () => {
		const ts = Math.floor(Date.now() / 1000);
		expect(await verifyCalendlySignature(null, body, SECRET)).toBe(false);
		expect(await verifyCalendlySignature(signHeader(body, ts), body, undefined)).toBe(false);
	});

	it('rejects a malformed header', async () => {
		expect(await verifyCalendlySignature('not-a-valid-header', body, SECRET)).toBe(false);
	});
});
