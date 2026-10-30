import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { ASSET_PUBLISHED_STATUS, PUBLICATION_STATUS } from '../src/fields';
import { StorefrontError } from '../src/errors';
import type { AuthoringStore, TemplateInventory, WriterStorage } from '../src/ports';
import type { AssetInfo, CreatorRef, SelectionRecord, StorefrontRecord } from '../src/types';
import { EMPTY_DRAFT_FIELDS } from '../src/types';

let counter = 0;
export function recId(prefix: string): string {
	counter += 1;
	return `rec${(prefix + String(counter).padStart(14, '0')).slice(-14)}`.replace(/[^A-Za-z0-9]/g, 'x');
}

type Mode = 'before' | 'after';

/**
 * In-memory Airtable stand-in. Keeps reciprocal links like Airtable does.
 * failNext(method, 'before') throws without applying; 'after' applies the
 * write, then throws (a lost response: the caller cannot know it landed).
 */
export class FakeStore implements AuthoringStore {
	creators = new Map<string, { slug: string | null; emails: string[]; assetIds: string[] }>();
	assets = new Map<string, AssetInfo>();
	storefronts = new Map<string, StorefrontRecord>();
	selections = new Map<string, SelectionRecord>();
	calls: string[] = [];
	private failures: Array<{ method: string; mode: Mode }> = [];

	failNext(method: string, mode: Mode = 'before'): void {
		this.failures.push({ method, mode });
	}

	private async gate<T>(method: string, apply: () => T): Promise<T> {
		this.calls.push(method);
		const index = this.failures.findIndex((f) => f.method === method);
		if (index >= 0) {
			const [failure] = this.failures.splice(index, 1);
			if (failure.mode === 'after') apply();
			throw new StorefrontError('upstream_unavailable', `injected ${method} failure (${failure.mode})`);
		}
		return apply();
	}

	addCreator(email: string, slug: string | null): CreatorRef {
		const id = recId('cre');
		this.creators.set(id, { slug, emails: [email.toLowerCase()], assetIds: [] });
		return { id, slug };
	}

	addAsset(creatorId: string, overrides: Partial<AssetInfo> = {}): AssetInfo {
		const id = overrides.id ?? recId('ast');
		const asset: AssetInfo = {
			id,
			name: `Template ${id.slice(-4)}`,
			creatorIds: [creatorId],
			marketplaceStatus: ASSET_PUBLISHED_STATUS,
			templateSlug: `template-${id.slice(-6).toLowerCase()}`,
			typeText: 'Template🏗️',
			...overrides
		};
		this.assets.set(id, asset);
		this.creators.get(creatorId)?.assetIds.push(id);
		return asset;
	}

	storefrontIdsFor(creatorId: string): string[] {
		return [...this.storefronts.values()].filter((s) => s.creatorIds.includes(creatorId)).map((s) => s.id);
	}

	findCreatorsByEmail(email: string): Promise<CreatorRef[]> {
		return this.gate('findCreatorsByEmail', () =>
			[...this.creators.entries()]
				.filter(([, c]) => c.emails.includes(email.trim().toLowerCase()))
				.map(([id, c]) => ({ id, slug: c.slug }))
		);
	}

	readCreator(creatorId: string) {
		return this.gate('readCreator', () => {
			const creator = this.creators.get(creatorId);
			if (!creator) throw new StorefrontError('not_found', 'no creator');
			return {
				id: creatorId,
				slug: creator.slug,
				assetIds: [...creator.assetIds],
				storefrontIds: this.storefrontIdsFor(creatorId)
			};
		});
	}

	createStorefront(creatorId: string): Promise<string> {
		const id = recId('stf');
		return this.gate('createStorefront', () => {
			this.storefronts.set(id, {
				id,
				creatorIds: [creatorId],
				fields: { ...EMPTY_DRAFT_FIELDS },
				draftVersion: 0,
				status: PUBLICATION_STATUS.neverPublished,
				publishedDraftVersion: null,
				publishedAt: null,
				snapshotJson: null,
				selectionIds: []
			});
			return id;
		});
	}

	readStorefront(storefrontId: string): Promise<StorefrontRecord> {
		return this.gate('readStorefront', () => {
			const record = this.storefronts.get(storefrontId);
			if (!record) throw new StorefrontError('not_found', 'no storefront');
			return structuredClone({
				...record,
				selectionIds: [...this.selections.values()].filter((s) => s.storefrontIds.includes(storefrontId)).map((s) => s.id)
			});
		});
	}

	updateStorefront(storefrontId: string, update: Parameters<AuthoringStore['updateStorefront']>[1]): Promise<void> {
		return this.gate('updateStorefront', () => {
			const record = this.storefronts.get(storefrontId)!;
			const { draftVersion, status, snapshotJson, publishedDraftVersion, publishedAt, ...fields } = update;
			record.fields = { ...record.fields, ...fields };
			if (draftVersion !== undefined) record.draftVersion = draftVersion;
			if (status !== undefined) record.status = status;
			if (snapshotJson !== undefined) record.snapshotJson = snapshotJson;
			if (publishedDraftVersion !== undefined) record.publishedDraftVersion = publishedDraftVersion;
			if (publishedAt !== undefined) record.publishedAt = publishedAt;
		});
	}

	readSelections(selectionIds: string[]): Promise<SelectionRecord[]> {
		return this.gate('readSelections', () =>
			selectionIds.map((id) => this.selections.get(id)).filter(Boolean).map((s) => structuredClone(s!))
		);
	}

	createSelections(rows: Parameters<AuthoringStore['createSelections']>[0]): Promise<void> {
		return this.gate('createSelections', () => {
			for (const row of rows) {
				const id = recId('sel');
				this.selections.set(id, {
					id,
					storefrontIds: [row.storefrontId],
					assetIds: [row.assetId],
					position: row.position,
					note: row.note
				});
			}
		});
	}

	updateSelections(rows: Parameters<AuthoringStore['updateSelections']>[0]): Promise<void> {
		return this.gate('updateSelections', () => {
			for (const row of rows) Object.assign(this.selections.get(row.id)!, { position: row.position, note: row.note });
		});
	}

	deleteSelections(selectionIds: string[]): Promise<void> {
		return this.gate('deleteSelections', () => {
			for (const id of selectionIds) this.selections.delete(id);
		});
	}

	readAssets(assetIds: string[]): Promise<AssetInfo[]> {
		return this.gate('readAssets', () => assetIds.map((id) => this.assets.get(id)).filter(Boolean).map((a) => structuredClone(a!)));
	}
}

export class FakeInventory implements TemplateInventory {
	missing = new Set<string>();
	down = false;
	async presentSlugs(slugs: string[]): Promise<Set<string>> {
		if (this.down) throw new StorefrontError('upstream_unavailable', 'inventory down');
		return new Set(slugs.filter((s) => !this.missing.has(s)));
	}
}

/** Durable storage stand-in. A "restart" is a new writer over the same instance. */
export class MemoryStorage implements WriterStorage {
	data = new Map<string, unknown>();
	async get<T>(key: string): Promise<T | undefined> {
		return this.data.has(key) ? (structuredClone(this.data.get(key)) as T) : undefined;
	}
	async put(entries: Record<string, unknown>): Promise<void> {
		for (const [k, v] of Object.entries(entries)) this.data.set(k, structuredClone(v));
	}
	async delete(keys: string[]): Promise<void> {
		for (const k of keys) this.data.delete(k);
	}
	async list<T>(prefix: string): Promise<Map<string, T>> {
		return new Map([...this.data].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, structuredClone(v) as T]));
	}
}

/** Minimal D1Database over node:sqlite, so read-model SQL runs for real. */
export class SqliteD1 {
	readonly db = new DatabaseSync(':memory:');
	failWrites = 0;

	constructor() {
		const migration = readFileSync(fileURLToPath(`${import.meta.url.replace(/test\/fakes\.ts$/, '')}migrations/0001_storefront_public.sql`), 'utf8');
		this.db.exec(migration);
	}

	prepare(sql: string) {
		const self = this;
		return {
			bind(...params: unknown[]) {
				return {
					async run() {
						if (self.failWrites > 0) {
							self.failWrites -= 1;
							throw new Error('injected D1 write failure');
						}
						const result = self.db.prepare(sql).run(...(params as never[]));
						return { success: true, meta: { changes: Number(result.changes) } };
					},
					async first<T>() {
						return (self.db.prepare(sql).get(...(params as never[])) ?? null) as T | null;
					}
				};
			}
		};
	}

	asD1(): D1Database {
		return this as unknown as D1Database;
	}
}
