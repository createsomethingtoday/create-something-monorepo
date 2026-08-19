import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
	claimCrossDomainToken,
	rotateRefreshTokenAtomically,
} from '../src/db/queries.ts';

interface BoundStatement {
	__sql: string;
	__values: unknown[];
}

function createAtomicCredentialDb() {
	const refreshTokens = [{
		id: 'refresh-original',
		user_id: 'user-1',
		token_hash: 'hash-original',
		family_id: 'family-1',
		expires_at: '2999-01-01T00:00:00.000Z',
		revoked_at: null as string | null,
		rotation_id: null as string | null,
		audience: 'ltd',
	}];
	const crossDomainToken = {
		id: 'cross-1',
		user_id: 'user-1',
		token_hash: 'cross-hash',
		target: 'ltd',
		created_at: '2026-08-15T00:00:00.000Z',
		expires_at: '2999-01-01T00:00:00.000Z',
		used_at: null as string | null,
	};
	let writeQueue = Promise.resolve();

	const serialize = <T>(operation: () => T | Promise<T>): Promise<T> => {
		const result = writeQueue.then(operation);
		writeQueue = result.then(() => undefined, () => undefined);
		return result;
	};

	const execute = (statement: BoundStatement) => {
		const { __sql: sql, __values: values } = statement;
		if (sql.includes('SET revoked_at = datetime') && sql.includes('rotation_id = ?')) {
			const [rotationId, tokenHash] = values.map(String);
			const predecessor = refreshTokens.find((token) => token.token_hash === tokenHash && token.revoked_at === null);
			if (!predecessor) return { meta: { changes: 0 } };
			predecessor.revoked_at = '2026-08-15 12:00:00';
			predecessor.rotation_id = rotationId;
			return { meta: { changes: 1 } };
		}
		if (sql.startsWith('INSERT INTO refresh_tokens')) {
			const [id, tokenHash, expiresAt, predecessorHash, rotationId] = values.map(String);
			const predecessor = refreshTokens.find((token) => token.token_hash === predecessorHash && token.rotation_id === rotationId);
			if (!predecessor) return { meta: { changes: 0 } };
			refreshTokens.push({
				id,
				user_id: predecessor.user_id,
				token_hash: tokenHash,
				family_id: predecessor.family_id,
				expires_at: expiresAt,
				revoked_at: null,
				rotation_id: null,
				audience: predecessor.audience,
			});
			return { meta: { changes: 1 } };
		}
		if (sql.includes('AND family_id =') && sql.includes('rotation_id')) {
			const [predecessorHash, rotationId] = values.map(String);
			const predecessor = refreshTokens.find((token) => token.token_hash === predecessorHash);
			if (!predecessor?.revoked_at || predecessor.rotation_id === rotationId) return { meta: { changes: 0 } };
			let changes = 0;
			for (const token of refreshTokens) {
				if (token.family_id === predecessor.family_id && token.revoked_at === null) {
					token.revoked_at = '2026-08-15 12:00:01';
					changes += 1;
				}
			}
			return { meta: { changes } };
		}
		throw new Error(`Unexpected statement: ${sql}`);
	};

	const db = {
		prepare(sql: string) {
			return {
				bind(...values: unknown[]) {
					const statement = { __sql: sql, __values: values } as BoundStatement;
					return {
						...statement,
						async first() {
							return serialize(() => {
								if (!sql.startsWith('UPDATE cross_domain_tokens')) throw new Error(`Unexpected first: ${sql}`);
								const [tokenHash, target] = values.map(String);
								if (crossDomainToken.token_hash !== tokenHash || crossDomainToken.target !== target || crossDomainToken.used_at) return null;
								crossDomainToken.used_at = '2026-08-15 12:00:00';
								return { ...crossDomainToken };
							});
						},
					};
				},
			};
		},
		async batch(statements: BoundStatement[]) {
			return serialize(() => statements.map(execute));
		},
	} as unknown as D1Database;

	return { db, refreshTokens, crossDomainToken };
}

test('concurrent first-party refresh rotation creates one successor and replay revokes the family', async () => {
	const { db, refreshTokens } = createAtomicCredentialDb();
	const [first, second] = await Promise.all([
		rotateRefreshTokenAtomically(db, {
			predecessorHash: 'hash-original',
			rotationId: 'rotation-a',
			replacementId: 'refresh-a',
			replacementHash: 'hash-a',
			replacementExpiresAt: '2999-01-08T00:00:00.000Z',
		}),
		rotateRefreshTokenAtomically(db, {
			predecessorHash: 'hash-original',
			rotationId: 'rotation-b',
			replacementId: 'refresh-b',
			replacementHash: 'hash-b',
			replacementExpiresAt: '2999-01-08T00:00:00.000Z',
		}),
	]);

	assert.deepEqual([first, second].sort(), ['replayed', 'rotated']);
	assert.equal(refreshTokens.length, 2);
	assert.equal(refreshTokens.filter((token) => token.id !== 'refresh-original').length, 1);
	assert.equal(refreshTokens.every((token) => token.revoked_at !== null), true);
});

test('concurrent cross-domain exchange atomically claims the intermediary once for its exact target', async () => {
	const { db } = createAtomicCredentialDb();
	const [first, second] = await Promise.all([
		claimCrossDomainToken(db, 'cross-hash', 'ltd'),
		claimCrossDomainToken(db, 'cross-hash', 'ltd'),
	]);

	assert.equal([first, second].filter(Boolean).length, 1);
	assert.equal([first, second].filter((value) => value === null).length, 1);
	assert.equal(await claimCrossDomainToken(db, 'cross-hash', 'agency'), null);
});

test('the atomic cutover invalidates both intermediary credential tables', async () => {
	const migration = await readFile(new URL('../migrations/0015_atomic_credential_consumption.sql', import.meta.url), 'utf8');
	assert.match(migration, /ALTER TABLE refresh_tokens ADD COLUMN rotation_id TEXT/);
	assert.match(migration, /UPDATE refresh_tokens[\s\S]*WHERE revoked_at IS NULL/);
	assert.match(migration, /UPDATE cross_domain_tokens[\s\S]*WHERE used_at IS NULL/);
});
