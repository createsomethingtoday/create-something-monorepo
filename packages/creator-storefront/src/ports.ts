import type {
	ApplyResult,
	AssetInfo,
	CreatorRef,
	DraftFields,
	ReadModelRow,
	SelectionRecord,
	StorefrontRecord
} from './types';
import type { PublicationStatus } from './fields';

/** Authoring store (Airtable today). Every method maps provider failures to StorefrontError. */
export interface AuthoringStore {
	/** Exact email match on 🎨Creators. Returns every match; the caller rejects ambiguity. */
	findCreatorsByEmail(email: string): Promise<CreatorRef[]>;
	readCreator(creatorId: string): Promise<CreatorRef & { assetIds: string[]; storefrontIds: string[] }>;
	createStorefront(creatorId: string): Promise<string>;
	readStorefront(storefrontId: string): Promise<StorefrontRecord>;
	updateStorefront(
		storefrontId: string,
		update: Partial<DraftFields> & {
			draftVersion?: number;
			status?: PublicationStatus;
			snapshotJson?: string;
			publishedDraftVersion?: number;
			publishedAt?: string;
		}
	): Promise<void>;
	readSelections(selectionIds: string[]): Promise<SelectionRecord[]>;
	createSelections(rows: Array<{ storefrontId: string; assetId: string; position: number; note: string | null }>): Promise<void>;
	updateSelections(rows: Array<{ id: string; position: number; note: string | null }>): Promise<void>;
	deleteSelections(selectionIds: string[]): Promise<void>;
	readAssets(assetIds: string[]): Promise<AssetInfo[]>;
}

/** Live template-search inventory. Throws upstream_unavailable when it cannot answer. */
export interface TemplateInventory {
	presentSlugs(templateSlugs: string[]): Promise<Set<string>>;
}

/** Durable public read model (D1). */
export interface ReadModel {
	apply(row: ReadModelRow): Promise<ApplyResult>;
	get(creatorSlug: string): Promise<ReadModelRow | null>;
}

/** Durable per-Creator writer storage (Durable Object storage). */
export interface WriterStorage {
	get<T>(key: string): Promise<T | undefined>;
	/** Atomic multi-key write. */
	put(entries: Record<string, unknown>): Promise<void>;
	delete(keys: string[]): Promise<void>;
	list<T>(prefix: string): Promise<Map<string, T>>;
}

export interface WriterDeps {
	store: AuthoringStore;
	inventory: TemplateInventory;
	readModel: ReadModel;
	storage: WriterStorage;
	allowedCoverOrigins: readonly string[];
	now?: () => Date;
	/** Ask the host to run reconcile() later (Durable Object alarm). */
	scheduleReconcile?: (delayMs: number) => Promise<void>;
	publicMaxAgeSeconds?: number;
}
