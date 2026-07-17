import { normalizePublicAtlasCanvas, type PublicAtlasCanvas } from '$lib/atlas/public';

export type CustomerMapReviewState = 'draft' | 'in_review' | 'approved' | 'changes_requested';

export interface CustomerMapScope {
	authSubject: string;
	accountId: string;
	tenantId: string;
	workspaceAccountId: string;
}

export interface CustomerMapRecord {
	id: string;
	title: string;
	accountId: string;
	tenantId: string;
	workspaceAccountId: string;
	createdBy: string;
	currentVersion: number;
	reviewState: CustomerMapReviewState;
	retentionExpiresAt: string | null;
	deletedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CustomerMapVersion {
	id: string;
	mapId: string;
	accountId: string;
	version: number;
	canvas: PublicAtlasCanvas;
	message: string | null;
	createdBy: string;
	createdAt: string;
}

export interface CustomerMapWithVersion {
	map: CustomerMapRecord;
	version: CustomerMapVersion;
}

export interface CustomerMapDiff {
	fromVersion: number;
	toVersion: number;
	addedNodeIds: string[];
	removedNodeIds: string[];
	changedNodeIds: string[];
	addedEdgeIds: string[];
	removedEdgeIds: string[];
	changedEdgeIds: string[];
}

export interface CustomerMapReviewEvent {
	id: string;
	mapId: string;
	accountId: string;
	mapVersion: number;
	fromState: CustomerMapReviewState;
	toState: CustomerMapReviewState;
	note: string | null;
	actorSubject: string;
	createdAt: string;
}

export interface CustomerMapShareRecord {
	id: string;
	mapId: string;
	accountId: string;
	mapVersion: number;
	tokenDigest: string;
	createdBy: string;
	expiresAt: string | null;
	revokedAt: string | null;
	createdAt: string;
}

export interface CustomerMapExport {
	schema: 'create-something/customer-map-export@1';
	exportedAt: string;
	map: CustomerMapRecord;
	canvas: PublicAtlasCanvas;
}

export interface CustomerMapBuildHandoff {
	schema: 'create-something/map-to-build-handoff@1';
	handoffId: string;
	preparedAt: string;
	mapId: string;
	mapTitle: string;
	mapVersion: number;
	reviewState: 'approved';
	accountId: string;
	workspaceAccountId: string;
	canvas: PublicAtlasCanvas;
}

export interface CustomerMapHandoffRecord {
	id: string;
	mapId: string;
	accountId: string;
	mapVersion: number;
	status: 'prepared' | 'accepted' | 'cancelled';
	payload: CustomerMapBuildHandoff;
	createdBy: string;
	createdAt: string;
	acceptedAt: string | null;
}

export interface CustomerMapRepository {
	createMap(map: CustomerMapRecord, version: CustomerMapVersion): Promise<void>;
	listMaps(scope: CustomerMapScope): Promise<CustomerMapRecord[]>;
	listArchivedMaps(scope: CustomerMapScope): Promise<CustomerMapRecord[]>;
	findMap(scope: CustomerMapScope, mapId: string): Promise<CustomerMapRecord | null>;
	listVersions(scope: CustomerMapScope, mapId: string): Promise<CustomerMapVersion[]>;
	appendVersion(
		scope: CustomerMapScope,
		map: CustomerMapRecord,
		version: CustomerMapVersion,
		expectedVersion: number
	): Promise<boolean>;
	updateReview(
		scope: CustomerMapScope,
		map: CustomerMapRecord,
		event: CustomerMapReviewEvent,
		expectedState: CustomerMapReviewState
	): Promise<boolean>;
	createShare(scope: CustomerMapScope, share: CustomerMapShareRecord): Promise<void>;
	findShareByDigest(
		tokenDigest: string,
		at: string
	): Promise<{ map: CustomerMapRecord; version: CustomerMapVersion; share: CustomerMapShareRecord } | null>;
	createHandoff(scope: CustomerMapScope, handoff: CustomerMapHandoffRecord): Promise<void>;
	findHandoff(scope: CustomerMapScope, mapId: string, handoffId: string): Promise<CustomerMapHandoffRecord | null>;
	archiveMap(scope: CustomerMapScope, mapId: string, deletedAt: string, retentionExpiresAt: string): Promise<boolean>;
	recoverMap(scope: CustomerMapScope, mapId: string, at: string): Promise<boolean>;
}

export const CUSTOMER_MAP_POLICY = Object.freeze({
	mapsPerWorkspace: 100,
	versionsPerMap: 500,
	archiveRecoveryDays: 30,
	shareTokenShownOnce: true,
	publicDraftAutoImport: false
});

interface CustomerMapWorkspaceOptions {
	repository: CustomerMapRepository;
	clock?: () => string;
	id?: () => string;
	shareToken?: () => string;
	digest?: (value: string) => Promise<string>;
	limits?: Partial<Pick<typeof CUSTOMER_MAP_POLICY, 'mapsPerWorkspace' | 'versionsPerMap'>>;
}

interface CreateCustomerMapInput {
	title: string;
	canvas: PublicAtlasCanvas;
}

interface SaveCustomerMapInput {
	canvas: PublicAtlasCanvas;
	expectedVersion: number;
	message?: string | null;
}

interface ReviewCustomerMapInput {
	to: CustomerMapReviewState;
	note?: string | null;
}

export class CustomerMapAccessError extends Error {
	readonly code = 'customer_map_not_found';

	constructor() {
		super('Map not found in this workspace');
		this.name = 'CustomerMapAccessError';
	}
}

export class CustomerMapConflictError extends Error {
	readonly code = 'customer_map_version_conflict';

	constructor() {
		super('This map changed after the requested version was loaded');
		this.name = 'CustomerMapConflictError';
	}
}

export class CustomerMapValidationError extends Error {
	readonly code = 'customer_map_invalid';

	constructor(message: string) {
		super(message);
		this.name = 'CustomerMapValidationError';
	}
}

function requireScope(scope: CustomerMapScope): void {
	for (const [key, value] of Object.entries(scope)) {
		if (!value.trim()) throw new CustomerMapValidationError(`Missing workspace scope: ${key}`);
	}
}

function normalizeTitle(value: string): string {
	const title = value.trim().replace(/\s+/g, ' ');
	if (!title) throw new CustomerMapValidationError('Map title is required');
	if (title.length > 120) throw new CustomerMapValidationError('Map title must be 120 characters or fewer');
	return title;
}

function normalizeMessage(value: string | null | undefined): string | null {
	const message = value?.trim().replace(/\s+/g, ' ') ?? '';
	if (!message) return null;
	if (message.length > 240) throw new CustomerMapValidationError('Version message must be 240 characters or fewer');
	return message;
}

async function sha256(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function canReviewTransition(from: CustomerMapReviewState, to: CustomerMapReviewState): boolean {
	return (
		(from === 'draft' && to === 'in_review') ||
		(from === 'in_review' && (to === 'approved' || to === 'changes_requested')) ||
		(from === 'changes_requested' && to === 'in_review')
	);
}

function normalizeCustomerCanvas(input: PublicAtlasCanvas): PublicAtlasCanvas {
	const normalized = normalizePublicAtlasCanvas(input);
	const nodeTimestamps = new Map(input.nodes.map((node) => [node.id, node.updatedAt]));
	const edgeTimestamps = new Map(input.edges.map((edge) => [edge.id, edge.updatedAt]));
	return {
		...normalized,
		nodes: normalized.nodes.map((node) => ({
			...node,
			updatedAt: nodeTimestamps.get(node.id) ?? node.updatedAt
		})),
		edges: normalized.edges.map((edge) => ({
			...edge,
			updatedAt: edgeTimestamps.get(edge.id) ?? edge.updatedAt
		}))
	};
}

function changedIds<T extends { id: string }>(from: T[], to: T[]): {
	added: string[];
	removed: string[];
	changed: string[];
} {
	const before = new Map(from.map((item) => [item.id, JSON.stringify(item)]));
	const after = new Map(to.map((item) => [item.id, JSON.stringify(item)]));
	return {
		added: [...after.keys()].filter((id) => !before.has(id)).sort(),
		removed: [...before.keys()].filter((id) => !after.has(id)).sort(),
		changed: [...after.keys()]
			.filter((id) => before.has(id) && before.get(id) !== after.get(id))
			.sort()
	};
}

export function createCustomerMapWorkspace(options: CustomerMapWorkspaceOptions) {
	const now = options.clock ?? (() => new Date().toISOString());
	const newId = options.id ?? (() => crypto.randomUUID());
	const newShareToken = options.shareToken ?? (() => `${crypto.randomUUID()}${crypto.randomUUID()}`);
	const digest = options.digest ?? sha256;
	const limits = { ...CUSTOMER_MAP_POLICY, ...(options.limits ?? {}) };

	async function requireMap(scope: CustomerMapScope, mapId: string): Promise<CustomerMapRecord> {
		requireScope(scope);
		const map = await options.repository.findMap(scope, mapId);
		if (!map) throw new CustomerMapAccessError();
		return map;
	}

	return {
		async create(scope: CustomerMapScope, input: CreateCustomerMapInput): Promise<CustomerMapWithVersion> {
			requireScope(scope);
			if ((await options.repository.listMaps(scope)).length >= limits.mapsPerWorkspace) {
				throw new CustomerMapValidationError(`Workspace map limit reached (${limits.mapsPerWorkspace})`);
			}
			const timestamp = now();
			const map: CustomerMapRecord = {
				id: newId(),
				title: normalizeTitle(input.title),
				accountId: scope.accountId,
				tenantId: scope.tenantId,
				workspaceAccountId: scope.workspaceAccountId,
				createdBy: scope.authSubject,
				currentVersion: 1,
				reviewState: 'draft',
				retentionExpiresAt: null,
				deletedAt: null,
				createdAt: timestamp,
				updatedAt: timestamp
			};
			const version: CustomerMapVersion = {
				id: newId(),
				mapId: map.id,
				accountId: scope.accountId,
				version: 1,
				canvas: normalizeCustomerCanvas(input.canvas),
				message: 'Initial version',
				createdBy: scope.authSubject,
				createdAt: timestamp
			};
			await options.repository.createMap(map, version);
			return { map, version };
		},

		async list(scope: CustomerMapScope): Promise<CustomerMapRecord[]> {
			requireScope(scope);
			return options.repository.listMaps(scope);
		},

		async listArchived(scope: CustomerMapScope): Promise<CustomerMapRecord[]> {
			requireScope(scope);
			return options.repository.listArchivedMaps(scope);
		},

		async get(scope: CustomerMapScope, mapId: string): Promise<CustomerMapWithVersion> {
			const map = await requireMap(scope, mapId);
			const versions = await options.repository.listVersions(scope, mapId);
			const version = versions.find((candidate) => candidate.version === map.currentVersion);
			if (!version) throw new CustomerMapAccessError();
			return { map, version };
		},

		async save(scope: CustomerMapScope, mapId: string, input: SaveCustomerMapInput): Promise<CustomerMapWithVersion> {
			const current = await requireMap(scope, mapId);
			if (current.currentVersion !== input.expectedVersion) throw new CustomerMapConflictError();
			if ((await options.repository.listVersions(scope, mapId)).length >= limits.versionsPerMap) {
				throw new CustomerMapValidationError(`Map version limit reached (${limits.versionsPerMap})`);
			}
			const timestamp = now();
			const map: CustomerMapRecord = {
				...current,
				currentVersion: current.currentVersion + 1,
				reviewState: 'draft',
				updatedAt: timestamp
			};
			const version: CustomerMapVersion = {
				id: newId(),
				mapId,
				accountId: scope.accountId,
				version: map.currentVersion,
				canvas: normalizeCustomerCanvas(input.canvas),
				message: normalizeMessage(input.message),
				createdBy: scope.authSubject,
				createdAt: timestamp
			};
			const stored = await options.repository.appendVersion(scope, map, version, input.expectedVersion);
			if (!stored) throw new CustomerMapConflictError();
			return { map, version };
		},

		async history(scope: CustomerMapScope, mapId: string): Promise<CustomerMapVersion[]> {
			await requireMap(scope, mapId);
			return options.repository.listVersions(scope, mapId);
		},

		async diff(scope: CustomerMapScope, mapId: string, fromVersion: number, toVersion: number): Promise<CustomerMapDiff> {
			await requireMap(scope, mapId);
			const versions = await options.repository.listVersions(scope, mapId);
			const from = versions.find((candidate) => candidate.version === fromVersion);
			const to = versions.find((candidate) => candidate.version === toVersion);
			if (!from || !to) throw new CustomerMapAccessError();
			const nodes = changedIds(from.canvas.nodes, to.canvas.nodes);
			const edges = changedIds(from.canvas.edges, to.canvas.edges);
			return {
				fromVersion,
				toVersion,
				addedNodeIds: nodes.added,
				removedNodeIds: nodes.removed,
				changedNodeIds: nodes.changed,
				addedEdgeIds: edges.added,
				removedEdgeIds: edges.removed,
				changedEdgeIds: edges.changed
			};
		},

		async review(
			scope: CustomerMapScope,
			mapId: string,
			input: ReviewCustomerMapInput
		): Promise<{ map: CustomerMapRecord; event: CustomerMapReviewEvent }> {
			const current = await requireMap(scope, mapId);
			if (!canReviewTransition(current.reviewState, input.to)) {
				throw new CustomerMapValidationError(`Cannot move review from ${current.reviewState} to ${input.to}`);
			}
			const timestamp = now();
			const map = { ...current, reviewState: input.to, updatedAt: timestamp };
			const event: CustomerMapReviewEvent = {
				id: newId(),
				mapId,
				accountId: scope.accountId,
				mapVersion: current.currentVersion,
				fromState: current.reviewState,
				toState: input.to,
				note: normalizeMessage(input.note),
				actorSubject: scope.authSubject,
				createdAt: timestamp
			};
			const stored = await options.repository.updateReview(scope, map, event, current.reviewState);
			if (!stored) throw new CustomerMapConflictError();
			return { map, event };
		},

		async share(scope: CustomerMapScope, mapId: string, expiresAt: string | null = null) {
			const current = await this.get(scope, mapId);
			if (current.map.reviewState !== 'approved') {
				throw new CustomerMapValidationError('Map must be approved before it can be shared');
			}
			const token = newShareToken();
			const share: CustomerMapShareRecord = {
				id: newId(),
				mapId,
				accountId: scope.accountId,
				mapVersion: current.map.currentVersion,
				tokenDigest: await digest(token),
				createdBy: scope.authSubject,
				expiresAt,
				revokedAt: null,
				createdAt: now()
			};
			await options.repository.createShare(scope, share);
			return { id: share.id, token, mapVersion: share.mapVersion, expiresAt };
		},

		async resolveShare(token: string) {
			const shared = await options.repository.findShareByDigest(await digest(token), now());
			if (!shared) throw new CustomerMapAccessError();
			return shared;
		},

		async export(scope: CustomerMapScope, mapId: string): Promise<CustomerMapExport> {
			const current = await this.get(scope, mapId);
			return {
				schema: 'create-something/customer-map-export@1',
				exportedAt: now(),
				map: current.map,
				canvas: current.version.canvas
			};
		},

		async prepareBuildHandoff(scope: CustomerMapScope, mapId: string): Promise<CustomerMapBuildHandoff> {
			const current = await this.get(scope, mapId);
			if (current.map.reviewState !== 'approved') {
				throw new CustomerMapValidationError('Map must be approved before Build handoff');
			}
			const timestamp = now();
			const handoffId = newId();
			const payload: CustomerMapBuildHandoff = {
				schema: 'create-something/map-to-build-handoff@1',
				handoffId,
				preparedAt: timestamp,
				mapId,
				mapTitle: current.map.title,
				mapVersion: current.map.currentVersion,
				reviewState: 'approved',
				accountId: scope.accountId,
				workspaceAccountId: scope.workspaceAccountId,
				canvas: current.version.canvas
			};
			await options.repository.createHandoff(scope, {
				id: handoffId,
				mapId,
				accountId: scope.accountId,
				mapVersion: current.map.currentVersion,
				status: 'prepared',
				payload,
				createdBy: scope.authSubject,
				createdAt: timestamp,
				acceptedAt: null
			});
			return payload;
		},

		async getBuildHandoff(
			scope: CustomerMapScope,
			mapId: string,
			handoffId: string
		): Promise<CustomerMapHandoffRecord> {
			await requireMap(scope, mapId);
			const handoff = await options.repository.findHandoff(scope, mapId, handoffId);
			if (!handoff) throw new CustomerMapAccessError();
			return handoff;
		},

		async archive(scope: CustomerMapScope, mapId: string) {
			await requireMap(scope, mapId);
			const deletedAt = now();
			const retentionExpiresAt = new Date(
				Date.parse(deletedAt) + CUSTOMER_MAP_POLICY.archiveRecoveryDays * 24 * 60 * 60 * 1000
			).toISOString();
			if (!(await options.repository.archiveMap(scope, mapId, deletedAt, retentionExpiresAt))) {
				throw new CustomerMapConflictError();
			}
			return { mapId, deletedAt, retentionExpiresAt };
		},

		async recover(scope: CustomerMapScope, mapId: string) {
			requireScope(scope);
			if (!(await options.repository.recoverMap(scope, mapId, now()))) throw new CustomerMapAccessError();
			return this.get(scope, mapId);
		}
	};
}

interface CustomerMapRow {
	id: string;
	title: string;
	account_id: string;
	tenant_id: string;
	workspace_account_id: string;
	created_by: string;
	current_version: number;
	review_state: CustomerMapReviewState;
	retention_expires_at: string | null;
	deleted_at: string | null;
	created_at: string;
	updated_at: string;
}

interface CustomerMapVersionRow {
	id: string;
	map_id: string;
	account_id: string;
	version: number;
	canvas_json: string;
	message: string | null;
	created_by: string;
	created_at: string;
}

interface CustomerMapShareRow {
	id: string;
	map_id: string;
	account_id: string;
	map_version: number;
	token_digest: string;
	created_by: string;
	expires_at: string | null;
	revoked_at: string | null;
	created_at: string;
}

interface SharedCustomerMapRow extends CustomerMapShareRow {
	map_title: string;
	map_tenant_id: string;
	map_workspace_account_id: string;
	map_created_by: string;
	map_current_version: number;
	map_review_state: CustomerMapReviewState;
	map_created_at: string;
	map_updated_at: string;
	version_id: string;
	canvas_json: string;
	version_message: string | null;
	version_created_by: string;
	version_created_at: string;
}

interface CustomerMapHandoffRow {
	id: string;
	map_id: string;
	account_id: string;
	map_version: number;
	status: 'prepared' | 'accepted' | 'cancelled';
	payload_json: string;
	created_by: string;
	created_at: string;
	accepted_at: string | null;
}

function fromMapRow(row: CustomerMapRow): CustomerMapRecord {
	return {
		id: row.id,
		title: row.title,
		accountId: row.account_id,
		tenantId: row.tenant_id,
		workspaceAccountId: row.workspace_account_id,
		createdBy: row.created_by,
		currentVersion: row.current_version,
		reviewState: row.review_state,
		retentionExpiresAt: row.retention_expires_at,
		deletedAt: row.deleted_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function fromVersionRow(row: CustomerMapVersionRow): CustomerMapVersion {
	return {
		id: row.id,
		mapId: row.map_id,
		accountId: row.account_id,
		version: row.version,
		canvas: normalizeCustomerCanvas(JSON.parse(row.canvas_json) as PublicAtlasCanvas),
		message: row.message,
		createdBy: row.created_by,
		createdAt: row.created_at
	};
}

function fromShareRow(row: CustomerMapShareRow): CustomerMapShareRecord {
	return {
		id: row.id,
		mapId: row.map_id,
		accountId: row.account_id,
		mapVersion: row.map_version,
		tokenDigest: row.token_digest,
		createdBy: row.created_by,
		expiresAt: row.expires_at,
		revokedAt: row.revoked_at,
		createdAt: row.created_at
	};
}

function scopeBindings(scope: CustomerMapScope): [string, string, string] {
	return [scope.accountId, scope.tenantId, scope.workspaceAccountId];
}

export function createD1CustomerMapRepository(db: D1Database): CustomerMapRepository {
	return {
		async createMap(map, version) {
			await db.batch([
				db
					.prepare(
						`INSERT INTO customer_maps
						 (id, title, account_id, tenant_id, workspace_account_id, created_by, current_version, review_state, created_at, updated_at)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
					)
					.bind(
						map.id,
						map.title,
						map.accountId,
						map.tenantId,
						map.workspaceAccountId,
						map.createdBy,
						map.currentVersion,
						map.reviewState,
						map.createdAt,
						map.updatedAt
					),
				db
					.prepare(
						`INSERT INTO customer_map_versions
						 (id, map_id, account_id, version, canvas_json, message, created_by, created_at)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
					)
					.bind(
						version.id,
						version.mapId,
						version.accountId,
						version.version,
						JSON.stringify(version.canvas),
						version.message,
						version.createdBy,
						version.createdAt
					)
			]);
		},

		async listMaps(scope) {
			const result = await db
				.prepare(
					`SELECT * FROM customer_maps
					 WHERE account_id = ? AND tenant_id = ? AND workspace_account_id = ? AND deleted_at IS NULL
					 ORDER BY updated_at DESC, id ASC`
				)
				.bind(...scopeBindings(scope))
				.all<CustomerMapRow>();
			return result.results.map(fromMapRow);
		},

		async listArchivedMaps(scope) {
			const result = await db
				.prepare(
					`SELECT * FROM customer_maps
					 WHERE account_id = ? AND tenant_id = ? AND workspace_account_id = ? AND deleted_at IS NOT NULL
					 ORDER BY deleted_at DESC, id ASC`
				)
				.bind(...scopeBindings(scope))
				.all<CustomerMapRow>();
			return result.results.map(fromMapRow);
		},

		async findMap(scope, mapId) {
			const row = await db
				.prepare(
					`SELECT * FROM customer_maps
					 WHERE id = ? AND account_id = ? AND tenant_id = ? AND workspace_account_id = ? AND deleted_at IS NULL
					 LIMIT 1`
				)
				.bind(mapId, ...scopeBindings(scope))
				.first<CustomerMapRow>();
			return row ? fromMapRow(row) : null;
		},

		async listVersions(scope, mapId) {
			const result = await db
				.prepare(
					`SELECT v.* FROM customer_map_versions v
					 INNER JOIN customer_maps m ON m.id = v.map_id AND m.account_id = v.account_id
					 WHERE v.map_id = ? AND m.account_id = ? AND m.tenant_id = ? AND m.workspace_account_id = ?
					 ORDER BY v.version ASC`
				)
				.bind(mapId, ...scopeBindings(scope))
				.all<CustomerMapVersionRow>();
			return result.results.map(fromVersionRow);
		},

		async appendVersion(scope, map, version, expectedVersion) {
			const result = await db.batch([
				db
					.prepare(
						`INSERT INTO customer_map_versions
						 (id, map_id, account_id, version, canvas_json, message, created_by, created_at)
						 SELECT ?, m.id, m.account_id, ?, ?, ?, ?, ?
						 FROM customer_maps m
						 WHERE m.id = ? AND m.account_id = ? AND m.tenant_id = ? AND m.workspace_account_id = ?
						   AND m.current_version = ?`
					)
					.bind(
						version.id,
						version.version,
						JSON.stringify(version.canvas),
						version.message,
						version.createdBy,
						version.createdAt,
						map.id,
						...scopeBindings(scope),
						expectedVersion
					),
				db
					.prepare(
						`UPDATE customer_maps
						 SET current_version = ?, review_state = ?, updated_at = ?
						 WHERE id = ? AND account_id = ? AND tenant_id = ? AND workspace_account_id = ?
						   AND current_version = ?`
					)
					.bind(
						map.currentVersion,
						map.reviewState,
						map.updatedAt,
						map.id,
						...scopeBindings(scope),
						expectedVersion
					)
			]);
			return Number(result[0]?.meta?.changes ?? 0) === 1 && Number(result[1]?.meta?.changes ?? 0) === 1;
		},

		async updateReview(scope, map, event, expectedState) {
			const result = await db.batch([
				db
					.prepare(
						`INSERT INTO customer_map_review_events
						 (id, map_id, account_id, map_version, from_state, to_state, note, actor_subject, created_at)
						 SELECT ?, m.id, m.account_id, ?, ?, ?, ?, ?, ?
						 FROM customer_maps m
						 WHERE m.id = ? AND m.account_id = ? AND m.tenant_id = ? AND m.workspace_account_id = ?
						   AND m.review_state = ? AND m.current_version = ?`
					)
					.bind(
						event.id,
						event.mapVersion,
						event.fromState,
						event.toState,
						event.note,
						event.actorSubject,
						event.createdAt,
						map.id,
						...scopeBindings(scope),
						expectedState,
						map.currentVersion
					),
				db
					.prepare(
						`UPDATE customer_maps SET review_state = ?, updated_at = ?
						 WHERE id = ? AND account_id = ? AND tenant_id = ? AND workspace_account_id = ?
						   AND review_state = ? AND current_version = ?`
					)
					.bind(
						map.reviewState,
						map.updatedAt,
						map.id,
						...scopeBindings(scope),
						expectedState,
						map.currentVersion
					)
			]);
			return Number(result[0]?.meta?.changes ?? 0) === 1 && Number(result[1]?.meta?.changes ?? 0) === 1;
		},

		async createShare(scope, share) {
			const result = await db
				.prepare(
					`INSERT INTO customer_map_shares
					 (id, map_id, account_id, map_version, token_digest, created_by, expires_at, revoked_at, created_at)
					 SELECT ?, m.id, m.account_id, m.current_version, ?, ?, ?, NULL, ?
					 FROM customer_maps m
					 WHERE m.id = ? AND m.account_id = ? AND m.tenant_id = ? AND m.workspace_account_id = ?
					   AND m.review_state = 'approved' AND m.current_version = ?`
				)
				.bind(
					share.id,
					share.tokenDigest,
					share.createdBy,
					share.expiresAt,
					share.createdAt,
					share.mapId,
					...scopeBindings(scope),
					share.mapVersion
				)
				.run();
			if (Number(result.meta.changes ?? 0) !== 1) throw new CustomerMapAccessError();
		},

		async findShareByDigest(tokenDigest, at) {
			const row = await db
				.prepare(
					`SELECT
					   s.*,
					   m.title AS map_title,
					   m.tenant_id AS map_tenant_id,
					   m.workspace_account_id AS map_workspace_account_id,
					   m.created_by AS map_created_by,
					   m.current_version AS map_current_version,
					   m.review_state AS map_review_state,
					   m.created_at AS map_created_at,
					   m.updated_at AS map_updated_at,
					   v.id AS version_id,
					   v.canvas_json,
					   v.message AS version_message,
					   v.created_by AS version_created_by,
					   v.created_at AS version_created_at
					 FROM customer_map_shares s
					 INNER JOIN customer_maps m ON m.id = s.map_id AND m.account_id = s.account_id
					 INNER JOIN customer_map_versions v
					   ON v.map_id = s.map_id AND v.account_id = s.account_id AND v.version = s.map_version
					 WHERE s.token_digest = ? AND s.revoked_at IS NULL
					   AND m.deleted_at IS NULL
					   AND (s.expires_at IS NULL OR s.expires_at > ?)
					 LIMIT 1`
				)
				.bind(tokenDigest, at)
				.first<SharedCustomerMapRow>();
			if (!row) return null;
			return {
				share: fromShareRow(row),
				map: {
					id: row.map_id,
					title: row.map_title,
					accountId: row.account_id,
					tenantId: row.map_tenant_id,
					workspaceAccountId: row.map_workspace_account_id,
					createdBy: row.map_created_by,
					currentVersion: row.map_current_version,
					reviewState: row.map_review_state,
					retentionExpiresAt: null,
					deletedAt: null,
					createdAt: row.map_created_at,
					updatedAt: row.map_updated_at
				},
				version: {
					id: row.version_id,
					mapId: row.map_id,
					accountId: row.account_id,
					version: row.map_version,
					canvas: normalizeCustomerCanvas(JSON.parse(row.canvas_json) as PublicAtlasCanvas),
					message: row.version_message,
					createdBy: row.version_created_by,
					createdAt: row.version_created_at
				}
			};
		},

		async createHandoff(scope, handoff) {
			const result = await db
				.prepare(
					`INSERT INTO customer_map_handoffs
					 (id, map_id, account_id, map_version, status, payload_json, created_by, created_at, accepted_at)
					 SELECT ?, m.id, m.account_id, m.current_version, ?, ?, ?, ?, NULL
					 FROM customer_maps m
					 WHERE m.id = ? AND m.account_id = ? AND m.tenant_id = ? AND m.workspace_account_id = ?
					   AND m.review_state = 'approved' AND m.current_version = ?`
				)
				.bind(
					handoff.id,
					handoff.status,
					JSON.stringify(handoff.payload),
					handoff.createdBy,
					handoff.createdAt,
					handoff.mapId,
					...scopeBindings(scope),
					handoff.mapVersion
				)
				.run();
			if (Number(result.meta.changes ?? 0) !== 1) throw new CustomerMapAccessError();
		},

		async findHandoff(scope, mapId, handoffId) {
			const row = await db
				.prepare(
					`SELECT h.* FROM customer_map_handoffs h
					 INNER JOIN customer_maps m ON m.id = h.map_id AND m.account_id = h.account_id
					 WHERE h.id = ? AND h.map_id = ?
					   AND m.account_id = ? AND m.tenant_id = ? AND m.workspace_account_id = ? AND m.deleted_at IS NULL
					 LIMIT 1`
				)
				.bind(handoffId, mapId, ...scopeBindings(scope))
				.first<CustomerMapHandoffRow>();
			if (!row) return null;
			return {
				id: row.id,
				mapId: row.map_id,
				accountId: row.account_id,
				mapVersion: row.map_version,
				status: row.status,
				payload: JSON.parse(row.payload_json) as CustomerMapBuildHandoff,
				createdBy: row.created_by,
				createdAt: row.created_at,
				acceptedAt: row.accepted_at
			};
		},

		async archiveMap(scope, mapId, deletedAt, retentionExpiresAt) {
			const result = await db.batch([
				db
					.prepare(
						`UPDATE customer_maps SET deleted_at = ?, retention_expires_at = ?, updated_at = ?
						 WHERE id = ? AND account_id = ? AND tenant_id = ? AND workspace_account_id = ? AND deleted_at IS NULL`
					)
					.bind(deletedAt, retentionExpiresAt, deletedAt, mapId, ...scopeBindings(scope)),
				db
					.prepare(
						`UPDATE customer_map_shares SET revoked_at = ?
						 WHERE map_id = ? AND account_id = ? AND revoked_at IS NULL`
					)
					.bind(deletedAt, mapId, scope.accountId)
			]);
			return Number(result[0]?.meta?.changes ?? 0) === 1;
		},

		async recoverMap(scope, mapId, at) {
			const result = await db
				.prepare(
					`UPDATE customer_maps
					 SET deleted_at = NULL, retention_expires_at = NULL, updated_at = ?
					 WHERE id = ? AND account_id = ? AND tenant_id = ? AND workspace_account_id = ?
					   AND deleted_at IS NOT NULL AND retention_expires_at > ?`
				)
				.bind(at, mapId, ...scopeBindings(scope), at)
				.run();
			return Number(result.meta.changes ?? 0) === 1;
		}
	};
}
