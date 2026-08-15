import assert from 'node:assert/strict';
import test from 'node:test';

import {
	consumeOAuthGrant,
	createOAuthRefreshFamily,
	isOAuthRefreshFamilyActive,
	revokeOAuthRefreshFamily,
} from '../src/db/queries';

function createGrantDb() {
	const grants = new Map<string, number>();
	return {
		prepare(sql: string) {
			return {
				bind(...values: unknown[]) {
					return {
						async run() {
							if (sql.startsWith('DELETE')) {
								const now = Number(values[0]);
								for (const [id, expiresAt] of grants) if (expiresAt < now) grants.delete(id);
								return { meta: { changes: 0 } };
							}
							const id = String(values[0]);
							if (grants.has(id)) return { meta: { changes: 0 } };
							grants.set(id, Number(values[3]));
							return { meta: { changes: 1 } };
						},
					};
				},
			};
		},
	} as unknown as D1Database;
}

test('OAuth authorization and refresh grants are consumed exactly once', async () => {
	const db = createGrantDb();
	const grant = {
		grantId: 'grant-a',
		grantKind: 'oauth_authorization_code' as const,
		clientId: 'client-a',
		expiresAt: 200,
		nowSeconds: 100,
	};
	assert.equal(await consumeOAuthGrant(db, grant), true);
	assert.equal(await consumeOAuthGrant(db, grant), false);
});

test('refresh token families are explicitly created and revoked after replay', async () => {
	let family: { familyId: string; clientId: string; userId: string; revoked: boolean } | null = null;
	const db = {
		prepare(sql: string) {
			return { bind(...values: unknown[]) { return {
				async run() {
					if (sql.startsWith('INSERT')) family = { familyId: String(values[0]), clientId: String(values[1]), userId: String(values[2]), revoked: false };
					if (sql.startsWith('UPDATE') && family?.familyId === values[0]) family.revoked = true;
					return { meta: { changes: 1 } };
				},
				async first() {
					return family && !family.revoked && family.familyId === values[0] && family.clientId === values[1] && family.userId === values[2]
						? { family_id: family.familyId }
						: null;
				},
			}; } };
		},
	} as unknown as D1Database;
	await createOAuthRefreshFamily(db, { familyId: 'family-a', clientId: 'client-a', userId: 'user-a' });
	assert.equal(await isOAuthRefreshFamilyActive(db, 'family-a', 'client-a', 'user-a'), true);
	await revokeOAuthRefreshFamily(db, 'family-a');
	assert.equal(await isOAuthRefreshFamilyActive(db, 'family-a', 'client-a', 'user-a'), false);
});
