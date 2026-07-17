import assert from 'node:assert/strict';
import test from 'node:test';

import { createPublicAtlasCanvas, createPublicAtlasNode } from '../src/lib/atlas/public.ts';
import {
	CustomerMapAccessError,
	CustomerMapConflictError,
	createCustomerMapWorkspace,
	createD1CustomerMapRepository,
	type CustomerMapRecord,
	type CustomerMapRepository,
	type CustomerMapHandoffRecord,
	type CustomerMapShareRecord,
	type CustomerMapScope,
	type CustomerMapVersion
} from '../src/lib/server/customer-map-workspace.ts';

const accountA: CustomerMapScope = {
	authSubject: 'identity|alice',
	accountId: 'acct_a',
	tenantId: 'tenant_a',
	workspaceAccountId: 'workspace_a'
};

const accountB: CustomerMapScope = {
	authSubject: 'identity|bob',
	accountId: 'acct_b',
	tenantId: 'tenant_b',
	workspaceAccountId: 'workspace_b'
};

function createMemoryRepository(): CustomerMapRepository {
	const maps = new Map<string, CustomerMapRecord>();
	const versions = new Map<string, CustomerMapVersion[]>();
	const shares: CustomerMapShareRecord[] = [];
	const handoffs: CustomerMapHandoffRecord[] = [];
	const belongsTo = (scope: CustomerMapScope, map: CustomerMapRecord) =>
		map.accountId === scope.accountId &&
		map.tenantId === scope.tenantId &&
		map.workspaceAccountId === scope.workspaceAccountId;

	return {
		async createMap(map, version) {
			maps.set(map.id, structuredClone(map));
			versions.set(map.id, [structuredClone(version)]);
		},
		async listMaps(scope) {
			return [...maps.values()]
				.filter((map) => belongsTo(scope, map) && !map.deletedAt)
				.map((map) => structuredClone(map));
		},
		async listArchivedMaps(scope) {
			return [...maps.values()]
				.filter((map) => belongsTo(scope, map) && Boolean(map.deletedAt))
				.map((map) => structuredClone(map));
		},
		async findMap(scope, mapId) {
			const map = maps.get(mapId);
			return map && belongsTo(scope, map) && !map.deletedAt ? structuredClone(map) : null;
		},
		async listVersions(scope, mapId) {
			const map = maps.get(mapId);
			if (!map || !belongsTo(scope, map)) return [];
			return (versions.get(mapId) ?? []).map((version) => structuredClone(version));
		},
		async appendVersion(scope, map, version, expectedVersion) {
			const current = maps.get(map.id);
			if (!current || !belongsTo(scope, current)) return false;
			if (current.currentVersion !== expectedVersion) return false;
			maps.set(map.id, structuredClone(map));
			versions.set(map.id, [...(versions.get(map.id) ?? []), structuredClone(version)]);
			return true;
		},
		async updateReview(scope, map, _event, expectedState) {
			const current = maps.get(map.id);
			if (!current || !belongsTo(scope, current) || current.reviewState !== expectedState) return false;
			maps.set(map.id, structuredClone(map));
			return true;
		},
		async createShare(scope, share) {
			const map = maps.get(share.mapId);
			if (!map || !belongsTo(scope, map) || map.reviewState !== 'approved') throw new Error('not found');
			shares.push(structuredClone(share));
		},
		async findShareByDigest(tokenDigest, at) {
			const share = shares.find(
				(candidate) =>
					candidate.tokenDigest === tokenDigest &&
					!candidate.revokedAt &&
					(!candidate.expiresAt || candidate.expiresAt > at)
			);
			if (!share) return null;
			const map = maps.get(share.mapId);
			const version = versions.get(share.mapId)?.find((candidate) => candidate.version === share.mapVersion);
			return map && version
				? { map: structuredClone(map), version: structuredClone(version), share: structuredClone(share) }
				: null;
		},
		async createHandoff(scope, handoff) {
			const map = maps.get(handoff.mapId);
			if (!map || !belongsTo(scope, map) || map.reviewState !== 'approved') throw new Error('not found');
			handoffs.push(structuredClone(handoff));
		},
		async findHandoff(scope, mapId, handoffId) {
			const map = maps.get(mapId);
			if (!map || !belongsTo(scope, map)) return null;
			const handoff = handoffs.find((candidate) => candidate.id === handoffId && candidate.mapId === mapId);
			return handoff ? structuredClone(handoff) : null;
		},
		async archiveMap(scope, mapId, deletedAt, retentionExpiresAt) {
			const map = maps.get(mapId);
			if (!map || !belongsTo(scope, map)) return false;
			maps.set(mapId, { ...map, deletedAt, retentionExpiresAt });
			return true;
		},
		async recoverMap(scope, mapId, at) {
			const map = maps.get(mapId);
			if (!map || !belongsTo(scope, map) || !map.deletedAt || !map.retentionExpiresAt || map.retentionExpiresAt <= at) return false;
			maps.set(mapId, { ...map, deletedAt: null, retentionExpiresAt: null });
			return true;
		}
	};
}

test('customer Map workspace persists account-scoped maps and immutable versions', async () => {
	let id = 0;
	const workspace = createCustomerMapWorkspace({
		repository: createMemoryRepository(),
		clock: () => '2026-07-17T00:00:00.000Z',
		id: () => `id_${++id}`
	});
	const firstCanvas = createPublicAtlasCanvas();

	const created = await workspace.create(accountA, {
		title: 'Lead routing control map',
		canvas: firstCanvas
	});

	assert.equal(created.map.currentVersion, 1);
	assert.equal(created.version.version, 1);
	assert.equal((await workspace.list(accountA)).length, 1);
	await assert.rejects(() => workspace.get(accountB, created.map.id), CustomerMapAccessError);

	const revisedCanvas = {
		...firstCanvas,
		nodes: [
			...firstCanvas.nodes,
			createPublicAtlasNode('human', { label: 'Sales owner', status: 'wait' })
		]
	};
	const revised = await workspace.save(accountA, created.map.id, {
		canvas: revisedCanvas,
		expectedVersion: 1,
		message: 'Add the human approval owner'
	});

	assert.equal(revised.map.currentVersion, 2);
	assert.equal(revised.version.version, 2);
	assert.equal(revised.version.message, 'Add the human approval owner');
	assert.equal((await workspace.history(accountA, created.map.id)).length, 2);
	assert.deepEqual(await workspace.diff(accountA, created.map.id, 1, 2), {
		fromVersion: 1,
		toVersion: 2,
		addedNodeIds: [revisedCanvas.nodes.at(-1)!.id],
		removedNodeIds: [],
		changedNodeIds: [],
		addedEdgeIds: [],
		removedEdgeIds: [],
		changedEdgeIds: []
	});
});

test('workspace limits fail closed and archived maps remain recoverable only inside the owning account', async () => {
	const workspace = createCustomerMapWorkspace({
		repository: createMemoryRepository(),
		clock: () => '2026-07-17T00:00:00.000Z',
		id: () => crypto.randomUUID(),
		limits: { mapsPerWorkspace: 1 }
	});
	const created = await workspace.create(accountA, { title: 'Recoverable map', canvas: createPublicAtlasCanvas() });
	await assert.rejects(
		() => workspace.create(accountA, { title: 'Over limit', canvas: createPublicAtlasCanvas() }),
		/limit/i
	);

	const archived = await workspace.archive(accountA, created.map.id);
	assert.equal(archived.retentionExpiresAt, '2026-08-16T00:00:00.000Z');
	await assert.rejects(() => workspace.get(accountA, created.map.id), CustomerMapAccessError);
	assert.equal((await workspace.listArchived(accountA)).length, 1);
	await assert.rejects(() => workspace.recover(accountB, created.map.id), CustomerMapAccessError);
	await workspace.recover(accountA, created.map.id);
	assert.equal((await workspace.list(accountA)).length, 1);
});

test('customer Map workspace rejects stale writes instead of overwriting a newer version', async () => {
	const workspace = createCustomerMapWorkspace({
		repository: createMemoryRepository(),
		clock: () => '2026-07-17T00:00:00.000Z',
		id: () => crypto.randomUUID()
	});
	const canvas = createPublicAtlasCanvas();
	const created = await workspace.create(accountA, { title: 'Lifecycle map', canvas });

	await workspace.save(accountA, created.map.id, { canvas, expectedVersion: 1 });
	await assert.rejects(
		() => workspace.save(accountA, created.map.id, { canvas, expectedVersion: 1 }),
		CustomerMapConflictError
	);
});

test('review, share, export, and Build handoff stay pinned to an approved immutable version', async () => {
	const repository = createMemoryRepository();
	const workspace = createCustomerMapWorkspace({
		repository,
		clock: () => '2026-07-17T00:00:00.000Z',
		id: (() => {
			let id = 0;
			return () => `id_${++id}`;
		})(),
		shareToken: () => 'share_secret_once',
		digest: async () => 'share_digest'
	});
	const canvas = createPublicAtlasCanvas();
	const created = await workspace.create(accountA, { title: 'Approved handoff map', canvas });

	await assert.rejects(() => workspace.share(accountA, created.map.id), /must be approved/i);
	await workspace.review(accountA, created.map.id, { to: 'in_review', note: 'Ready for owner review' });
	const approved = await workspace.review(accountA, created.map.id, { to: 'approved', note: 'Approved for Build' });
	assert.equal(approved.map.reviewState, 'approved');

	const share = await workspace.share(accountA, created.map.id);
	assert.equal(share.token, 'share_secret_once');
	assert.equal(share.mapVersion, 1);
	const shared = await workspace.resolveShare('share_secret_once');
	assert.equal(shared.map.id, created.map.id);
	assert.equal(shared.version.version, 1);

	const exported = await workspace.export(accountA, created.map.id);
	assert.equal(exported.schema, 'create-something/customer-map-export@1');
	assert.equal(exported.map.reviewState, 'approved');
	assert.deepEqual(exported.canvas, canvas);

	const handoff = await workspace.prepareBuildHandoff(accountA, created.map.id);
	assert.equal(handoff.schema, 'create-something/map-to-build-handoff@1');
	assert.equal(handoff.mapVersion, 1);
	assert.equal(handoff.reviewState, 'approved');
	assert.deepEqual(handoff.canvas, canvas);
	assert.deepEqual((await workspace.getBuildHandoff(accountA, created.map.id, handoff.handoffId)).payload, handoff);
	await assert.rejects(
		() => workspace.getBuildHandoff(accountB, created.map.id, handoff.handoffId),
		CustomerMapAccessError
	);
});

test('D1 repository binds every placeholder and keeps resource queries tenant-scoped', async () => {
	const sql: string[] = [];
	const db = {
		prepare(statement: string) {
			sql.push(statement);
			return {
				bind(...args: unknown[]) {
					assert.equal((statement.match(/\?/g) ?? []).length, args.length, statement);
					return this;
				},
				async run() { return { meta: { changes: 1 } }; },
				async first() { return null; },
				async all() { return { results: [] }; }
			};
		},
		async batch(statements: unknown[]) {
			return statements.map(() => ({ meta: { changes: 1 } }));
		}
	} as unknown as D1Database;
	const repository = createD1CustomerMapRepository(db);
	const map: CustomerMapRecord = {
		id: 'map_1', title: 'Scoped map', accountId: 'acct_a', tenantId: 'tenant_a', workspaceAccountId: 'workspace_a',
		createdBy: 'identity|alice', currentVersion: 1, reviewState: 'draft', retentionExpiresAt: null, deletedAt: null,
		createdAt: '2026-07-17T00:00:00.000Z', updatedAt: '2026-07-17T00:00:00.000Z'
	};
	const version: CustomerMapVersion = {
		id: 'version_1', mapId: map.id, accountId: map.accountId, version: 1, canvas: createPublicAtlasCanvas(),
		message: 'Initial version', createdBy: map.createdBy, createdAt: map.createdAt
	};
	await repository.createMap(map, version);
	await repository.listMaps(accountA);
	await repository.listArchivedMaps(accountA);
	await repository.findMap(accountA, map.id);
	await repository.listVersions(accountA, map.id);
	await repository.appendVersion(accountA, { ...map, currentVersion: 2 }, { ...version, id: 'version_2', version: 2 }, 1);
	await repository.archiveMap(accountA, map.id, map.createdAt, '2026-08-16T00:00:00.000Z');
	await repository.recoverMap(accountA, map.id, '2026-07-18T00:00:00.000Z');

	for (const statement of sql.filter((candidate) => /customer_maps/.test(candidate) && /(SELECT|UPDATE)/.test(candidate))) {
		assert.match(statement, /account_id/);
		assert.match(statement, /workspace_account_id/);
	}
});
