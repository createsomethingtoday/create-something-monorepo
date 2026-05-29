import test from 'node:test';
import assert from 'node:assert/strict';

import {
	abundanceApiAuthHandle,
	isProtectedAbundanceApiPath,
	isValidAbundanceApiBearer
} from '../src/lib/server/abundance-api-auth.ts';
import { isValidMetaSignature } from '../src/lib/server/abundance-whatsapp-auth.ts';
import { POST as matchPost } from '../src/routes/api/abundance/match/+server.ts';
import { POST as convertPost } from '../src/routes/api/abundance/convert/+server.ts';
import { GET as whatsappGet } from '../src/routes/api/abundance/whatsapp/+server.ts';

type StatementRecord = {
	sql: string;
	args: unknown[];
	operation: 'first' | 'all' | 'run';
};

function normalizeSql(sql: string): string {
	return sql.replace(/\s+/g, ' ').trim();
}

function createFakeDb() {
	const statements: StatementRecord[] = [];
	const talentRow = {
		id: 'talent_1',
		phone: '+15550000002',
		name: 'Nurse Candidate',
		email: 'candidate@example.com',
		skills: JSON.stringify(['iv', 'triage']),
		styles: JSON.stringify(['night-shift']),
		hourly_rate_min: 70,
		hourly_rate_max: 95,
		availability: 'available',
		abundance_index: 80,
		status: 'active',
		created_at: '2026-05-01T00:00:00.000Z',
		updated_at: '2026-05-01T00:00:00.000Z'
	};

	return {
		statements,
		db: {
			prepare(sql: string) {
				const normalized = normalizeSql(sql);
				const boundStatement = (args: unknown[]) => ({
					async first() {
						statements.push({ sql: normalized, args, operation: 'first' });

						if (/SELECT id FROM seekers WHERE id = \?/.test(normalized)) {
							return { id: 'seeker_1' };
						}

						if (/SELECT id, created_at FROM matches/.test(normalized)) {
							return { id: 'match_existing', created_at: '2026-05-02T00:00:00.000Z' };
						}

						if (/SELECT \* FROM seekers WHERE phone = \?/.test(normalized)) {
							return {
								id: 'seeker_1',
								phone: '+15550000001',
								name: 'Nurse Seeker',
								email: 'seeker@example.com',
								status: 'active',
								preferred_formats: JSON.stringify(['per-diem'])
							};
						}

						if (/SELECT \* FROM talent WHERE phone = \?/.test(normalized)) {
							return null;
						}

						if (/SELECT \* FROM talent WHERE id = \?/.test(normalized)) {
							return {
								...talentRow,
								id: args[0],
								phone: '+15550000001',
								name: 'Nurse Seeker'
							};
						}

						return null;
					},
					async all() {
						statements.push({ sql: normalized, args, operation: 'all' });

						if (/SELECT \* FROM talent WHERE status = 'active'/.test(normalized)) {
							return { results: [talentRow] };
						}

						return { results: [] };
					},
					async run() {
						statements.push({ sql: normalized, args, operation: 'run' });
						return {};
					}
				});

				return {
					bind(...args: unknown[]) {
						return boundStatement(args);
					},
					first: () => boundStatement([]).first(),
					all: () => boundStatement([]).all(),
					run: () => boundStatement([]).run()
				};
			}
		} as unknown as D1Database
	};
}

async function signMetaPayload(payload: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
	const hex = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `sha256=${hex}`;
}

test('abundance API hook requires either a session user or internal bearer token', async () => {
	const url = new URL('https://example.com/api/abundance/match');

	const denied = await abundanceApiAuthHandle({
		event: {
			url,
			request: new Request(url),
			locals: {},
			platform: { env: { AGENCY_INTERNAL_API_KEY: 'expected-secret' } }
		},
		resolve: async () => new Response('ok')
	} as any);

	assert.equal(denied.status, 401);

	const allowedByBearer = await abundanceApiAuthHandle({
		event: {
			url,
			request: new Request(url, { headers: { authorization: 'Bearer expected-secret' } }),
			locals: {},
			platform: { env: { AGENCY_INTERNAL_API_KEY: 'expected-secret' } }
		},
		resolve: async () => new Response('ok', { status: 200 })
	} as any);

	assert.equal(allowedByBearer.status, 200);
	assert.equal(isProtectedAbundanceApiPath('/api/abundance/match'), true);
	assert.equal(isProtectedAbundanceApiPath('/api/abundance/whatsapp'), false);
	assert.equal(isProtectedAbundanceApiPath('/api/abundance/whatsapp/'), false);
	assert.equal(await isValidAbundanceApiBearer('Bearer expected-secret', 'expected-secret'), true);
	assert.equal(await isValidAbundanceApiBearer('Bearer wrong-secret', 'expected-secret'), false);
});

test('abundance WhatsApp webhook rejects missing verification config and validates Meta signatures', async () => {
	const missingConfig = await whatsappGet({
		url: new URL('https://example.com/api/abundance/whatsapp?hub.mode=subscribe&hub.verify_token=x&hub.challenge=abc'),
		platform: { env: {} }
	} as any);

	assert.equal(missingConfig.status, 503);

	const verified = await whatsappGet({
		url: new URL('https://example.com/api/abundance/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc'),
		platform: { env: { WHATSAPP_VERIFY_TOKEN: 'verify-me' } }
	} as any);

	assert.equal(verified.status, 200);
	assert.equal(await verified.text(), 'abc');

	const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
	const signature = await signMetaPayload(payload, 'app-secret');

	assert.equal(await isValidMetaSignature(payload, signature, 'app-secret'), true);
	assert.equal(await isValidMetaSignature(payload, signature, 'wrong-secret'), false);
	assert.equal(await isValidMetaSignature(payload, null, 'app-secret'), false);
});

test('abundance match creation updates an existing suggestion instead of inserting a duplicate', async () => {
	const { db, statements } = createFakeDb();
	const response = await matchPost({
		request: new Request('https://example.com/api/abundance/match', {
			method: 'POST',
			body: JSON.stringify({
				seeker_id: ' seeker_1 ',
				job_title: 'RN night shift',
				job_description: 'Need IV and triage support.',
				required_skills: ['iv'],
				budget: 85
			})
		}),
		platform: { env: { DB: db } }
	} as any);

	assert.equal(response.status, 201);

	const payload = await response.json();
	assert.equal(payload.data[0].match.id, 'match_existing');
	assert.equal(payload.data[0].match.created_at, '2026-05-02T00:00:00.000Z');
	assert.ok(statements.some((entry) => /SELECT id, created_at FROM matches/.test(entry.sql)));
	assert.ok(statements.some((entry) => /UPDATE matches SET/.test(entry.sql)));
	assert.equal(statements.some((entry) => /INSERT INTO matches/.test(entry.sql)), false);
});

test('abundance conversion preserves the source record by marking it inactive', async () => {
	const { db, statements } = createFakeDb();
	const response = await convertPost({
		request: new Request('https://example.com/api/abundance/convert', {
			method: 'POST',
			body: JSON.stringify({
				phone: '+15550000001',
				target_type: 'talent',
				skills: ['iv', 'triage'],
				availability: 'available'
			})
		}),
		platform: { env: { DB: db } }
	} as any);

	assert.equal(response.status, 201);

	const payload = await response.json();
	assert.equal(payload.success, true);
	assert.deepEqual(payload.data.skills, ['iv', 'triage']);
	assert.ok(statements.some((entry) => /INSERT INTO talent/.test(entry.sql)));
	assert.ok(statements.some((entry) => /UPDATE seekers SET status = 'inactive'/.test(entry.sql)));
	assert.equal(statements.some((entry) => /DELETE FROM seekers|DELETE FROM talent/.test(entry.sql)), false);
});
