import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';

import identityWorker from '../src/index.ts';
import { incrementRateLimit } from '../src/db/queries.ts';
import { hashToken } from '../src/services/crypto.ts';

const adminToken = 'test-player-access-admin-token';
const migrations = [
	'0001_initial.sql',
	'0003_soft_delete.sql',
	'0004_analytics_opt_out.sql',
	'0006_mcp_sessions.sql',
	'0012_player_access.sql',
];

let miniflare: Miniflare;
let db: D1Database;
let env: Record<string, unknown>;
let initialRefreshToken = '';

before(async () => {
	miniflare = new Miniflare({
		modules: true,
		script: 'export default { fetch() { return new Response("ok") } }',
		d1Databases: ['DB'],
	});
	db = await miniflare.getD1Database('DB');
	for (const migration of migrations) {
		const path = fileURLToPath(new URL(`../migrations/${migration}`, import.meta.url));
		const sql = (await readFile(path, 'utf8'))
			.split('\n')
			.filter((line) => !line.trimStart().startsWith('--'))
			.join('\n')
			.trim();
		const statements = sql.split(';').map((statement) => statement.trim()).filter(Boolean);
		await db.batch(statements.map((statement) => db.prepare(statement)));
	}
	await db
		.prepare('INSERT INTO api_keys (id, service, key_hash, permissions) VALUES (?, ?, ?, ?)')
		.bind('player-access-test-key', 'guard-performance-lab', await hashToken(adminToken), JSON.stringify(['player_access_manage']))
		.run();
	env = {
		DB: db,
		ENVIRONMENT: 'test',
		ALLOWED_ORIGINS: 'https://guard.test',
	};
});

after(async () => {
	await miniflare.dispose();
});

test('an operator provisions an email-free player credential that signs into the standard session', async () => {
	const provision = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/player-access/admin-upsert', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-api-key': adminToken,
			},
			body: JSON.stringify({
				subject_id: 'guard-player-13',
				player_code: 'ACE-2713',
				passphrase: 'river lantern balance corner',
				manager_subject: 'guardian-13',
				display_name: 'Player 13',
			}),
		}),
		env as any,
	);
	assert.equal(provision.status, 201);
	assert.deepEqual(await provision.json(), {
		success: true,
		player_access: {
			subject: 'guard-player-13',
			player_code: 'ACE-2713',
			manager_subject: 'guardian-13',
			status: 'active',
		},
	});

	const stored = await db.prepare('SELECT email FROM users WHERE id = ?').bind('guard-player-13').first<{ email: string | null }>();
	assert.equal(stored, null, 'Player Access must not manufacture an email-backed user row');

	const login = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/player-login', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'cf-connecting-ip': '192.0.2.10',
			},
			body: JSON.stringify({
				player_code: 'ace-2713',
				passphrase: 'river lantern balance corner',
			}),
		}),
		env as any,
	);
	assert.equal(login.status, 200);
	const session = await login.json() as any;
	assert.equal(session.user.id, 'guard-player-13');
	assert.equal(session.user.email, undefined);
	assert.equal(typeof session.access_token, 'string');
	assert.equal(typeof session.refresh_token, 'string');
	initialRefreshToken = session.refresh_token;

	const [, encodedPayload] = session.access_token.split('.');
	const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
	assert.equal(payload.sub, 'guard-player-13');
	assert.equal(payload.email, undefined);
	assert.ok(payload.aud.includes('guard-performance-lab'));
});

test('reset and revocation invalidate Player Access sessions without exposing account state', async () => {
	const invalid = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/player-login', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.11' },
			body: JSON.stringify({ player_code: 'ACE-2713', passphrase: 'this phrase is not right' }),
		}),
		env as any,
	);
	assert.equal(invalid.status, 401);
	assert.deepEqual(await invalid.json(), {
		error: 'invalid_credentials',
		message: 'Invalid player code or passphrase',
		status: 401,
	});

	const reset = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/player-access/admin-upsert', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-api-key': adminToken },
			body: JSON.stringify({
				subject_id: 'guard-player-13',
				player_code: 'ACE-2713',
				passphrase: 'orbit paper window balance',
				manager_subject: 'guardian-13',
				display_name: 'Player 13',
			}),
		}),
		env as any,
	);
	assert.equal(reset.status, 200);

	const staleRefresh = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/refresh', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: initialRefreshToken }),
		}),
		env as any,
	);
	assert.equal(staleRefresh.status, 401);

	const newLogin = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/player-login', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.12' },
			body: JSON.stringify({ player_code: 'ACE-2713', passphrase: 'orbit paper window balance' }),
		}),
		env as any,
	);
	assert.equal(newLogin.status, 200);
	const newSession = await newLogin.json() as any;

	const revoke = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/player-access/admin-revoke', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-api-key': adminToken },
			body: JSON.stringify({ subject_id: 'guard-player-13' }),
		}),
		env as any,
	);
	assert.equal(revoke.status, 200);
	assert.equal((await revoke.json() as any).player_access.status, 'revoked');

	const revokedLogin = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/player-login', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.13' },
			body: JSON.stringify({ player_code: 'ACE-2713', passphrase: 'orbit paper window balance' }),
		}),
		env as any,
	);
	assert.equal(revokedLogin.status, 401);

	const revokedRefresh = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/refresh', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: newSession.refresh_token }),
		}),
		env as any,
	);
	assert.equal(revokedRefresh.status, 401);
});

test('Player Access throttles repeated guesses by code', async () => {
	const provision = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/player-access/admin-upsert', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-api-key': adminToken },
			body: JSON.stringify({
				subject_id: 'guard-player-14',
				player_code: 'PACE-2714',
				passphrase: 'copper meadow shoulder square',
				manager_subject: 'guardian-14',
			}),
		}),
		env as any,
	);
	assert.equal(provision.status, 201);

	for (let attempt = 0; attempt < 5; attempt += 1) {
		const failure = await identityWorker.fetch(
			new Request('https://id.test/v1/auth/player-login', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'cf-connecting-ip': `192.0.2.${30 + attempt}` },
				body: JSON.stringify({ player_code: 'PACE-2714', passphrase: 'incorrect secret phrase' }),
			}),
			env as any,
		);
		assert.equal(failure.status, 401);
	}

	const throttled = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/player-login', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.99' },
			body: JSON.stringify({ player_code: 'PACE-2714', passphrase: 'copper meadow shoulder square' }),
		}),
		env as any,
	);
	assert.equal(throttled.status, 429);
});

test('reusing a rotated Player Access refresh token revokes the entire token family', async () => {
	const provision = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/player-access/admin-upsert', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-api-key': adminToken },
			body: JSON.stringify({
				subject_id: 'guard-player-15',
				player_code: 'READ-2715',
				passphrase: 'willow compass elbow balance',
				manager_subject: 'guardian-15',
			}),
		}),
		env as any,
	);
	assert.equal(provision.status, 201);

	const login = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/player-login', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.115' },
			body: JSON.stringify({ player_code: 'READ-2715', passphrase: 'willow compass elbow balance' }),
		}),
		env as any,
	);
	assert.equal(login.status, 200);
	const initialSession = await login.json() as any;

	const rotation = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/refresh', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: initialSession.refresh_token }),
		}),
		env as any,
	);
	assert.equal(rotation.status, 200);
	const rotatedSession = await rotation.json() as any;

	const replay = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/refresh', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: initialSession.refresh_token }),
		}),
		env as any,
	);
	assert.equal(replay.status, 401);

	const familyRefresh = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/refresh', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: rotatedSession.refresh_token }),
		}),
		env as any,
	);
	assert.equal(familyRefresh.status, 401);
});

test('Player Access attempt counters retain the configured fifteen-minute window', async () => {
	const key = 'player-login:test:window';
	await db
		.prepare('INSERT INTO rate_limits (key, count, window_start) VALUES (?, ?, ?)')
		.bind(key, 4, new Date(Date.now() - 20 * 60 * 1000).toISOString())
		.run();

	await incrementRateLimit(db, key, 15 * 60);

	const record = await db.prepare('SELECT count FROM rate_limits WHERE key = ?').bind(key).first<{ count: number }>();
	assert.equal(record?.count, 1);
});

test('concurrent Player Access refresh claims cannot mint two live successors', async () => {
	const provision = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/player-access/admin-upsert', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-api-key': adminToken },
			body: JSON.stringify({
				subject_id: 'guard-player-16',
				player_code: 'PACE-2716',
				passphrase: 'maple pocket footwork window',
				manager_subject: 'guardian-16',
			}),
		}),
		env as any,
	);
	assert.equal(provision.status, 201);

	const login = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/player-login', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.116' },
			body: JSON.stringify({ player_code: 'PACE-2716', passphrase: 'maple pocket footwork window' }),
		}),
		env as any,
	);
	assert.equal(login.status, 200);
	const session = await login.json() as any;

	const refreshRequest = () => identityWorker.fetch(
		new Request('https://id.test/v1/auth/refresh', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: session.refresh_token }),
		}),
		env as any,
	);
	const responses = await Promise.all([refreshRequest(), refreshRequest()]);
	assert.ok(responses.filter((response) => response.status === 200).length <= 1);

	const successor = responses.find((response) => response.status === 200);
	if (!successor) return;
	const successorSession = await successor.json() as any;
	const afterReplay = await identityWorker.fetch(
		new Request('https://id.test/v1/auth/refresh', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: successorSession.refresh_token }),
		}),
		env as any,
	);
	assert.equal(afterReplay.status, 401);
});
