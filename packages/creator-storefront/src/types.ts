import type { PublicationStatus } from './fields';

/** A Creator resolved by the service itself, never chosen by an owner caller. */
export interface CreatorRef {
	id: string;
	/** Public 🥞CMS Slug; null when the Creator has none yet. */
	slug: string | null;
}

export interface DraftFields {
	positioning: string | null;
	coverUrl: string | null;
	coverAlt: string | null;
	portfolioUrl: string | null;
	supportText: string | null;
	supportUrl: string | null;
}

export const EMPTY_DRAFT_FIELDS: DraftFields = {
	positioning: null,
	coverUrl: null,
	coverAlt: null,
	portfolioUrl: null,
	supportText: null,
	supportUrl: null
};

export interface DraftSelection {
	assetId: string;
	/** 1-based. */
	position: number;
	note: string | null;
}

/** The committed draft as the owner sees it. */
export interface DraftState {
	exists: boolean;
	draftVersion: number;
	status: PublicationStatus;
	publishedDraftVersion: number | null;
	publishedAt: string | null;
	fields: DraftFields;
	selections: DraftSelection[];
}

export interface StorefrontRecord {
	id: string;
	creatorIds: string[];
	fields: DraftFields;
	draftVersion: number;
	status: PublicationStatus;
	publishedDraftVersion: number | null;
	publishedAt: string | null;
	snapshotJson: string | null;
	selectionIds: string[];
}

export interface SelectionRecord {
	id: string;
	storefrontIds: string[];
	assetIds: string[];
	position: number | null;
	note: string | null;
}

export interface AssetInfo {
	id: string;
	name: string;
	creatorIds: string[];
	marketplaceStatus: string | null;
	templateSlug: string | null;
	typeText: string;
}

/** Internal snapshot (CONTRACT.md §8). Stored in Airtable and the read model; never returned publicly. */
export interface StorefrontSnapshotV1 {
	schema: 1;
	storefrontId: string;
	creatorId: string;
	creatorSlug: string;
	draftVersion: number;
	publishedAt: string;
	positioning: string | null;
	cover: { url: string; alt: string } | null;
	portfolioUrl: string | null;
	support: { text: string; href: string } | null;
	selections: Array<{ assetId: string; templateSlug: string; position: number; note: string | null }>;
}

/** Public DTO (CONTRACT.md §8). No Airtable IDs, no private Creator fields. */
export interface PublicStorefrontV1 {
	schema: 1;
	creatorSlug: string;
	version: number;
	publishedAt: string;
	positioning: string | null;
	cover: { url: string; alt: string } | null;
	links: Array<{ href: string; label: string }>;
	support: { text: string; href: string } | null;
	selections: Array<{ templateSlug: string; note: string | null }>;
}

export type ReadModelState = 'live' | 'unpublished' | 'suspended' | 'moved';

export interface ReadModelRow {
	creatorSlug: string;
	creatorId: string;
	revision: number;
	state: ReadModelState;
	snapshot: StorefrontSnapshotV1 | null;
}

export type ApplyResult = 'applied' | 'idempotent' | 'stale' | 'conflict';

export type PublicationOp = 'publish' | 'unpublish' | 'suspend' | 'clear_suspension' | 'move_slug';

export interface AirtablePublicationUpdate {
	status: PublicationStatus;
	snapshotJson?: string;
	publishedDraftVersion?: number;
	publishedAt?: string;
}

export interface PublicationIntent {
	revision: number;
	op: PublicationOp;
	creatorId: string;
	storefrontId: string;
	rows: Array<Omit<ReadModelRow, 'creatorId' | 'revision'>>;
	airtable: AirtablePublicationUpdate;
	steps: { airtable: boolean; readModel: boolean };
	state: 'pending' | 'done' | 'superseded';
	supersededReason?: string;
	attempts: number;
	lastError?: string;
	createdAt: string;
}

export type ReceiptState = 'live' | 'removed' | 'propagating' | 'superseded' | 'unchanged';

export interface PublicationReceipt {
	publicationRevision: number;
	op: PublicationOp;
	status: PublicationStatus;
	publishedDraftVersion: number | null;
	publishedAt: string | null;
	readModel: 'committed' | 'pending' | 'superseded' | 'not_applicable';
	state: ReceiptState;
}

export interface SelectionCandidate {
	assetId: string;
	name: string;
	templateSlug: string | null;
}

export interface OwnerView {
	draft: DraftState;
	pending: boolean;
	lastReceipt: PublicationReceipt | null;
	candidates: SelectionCandidate[];
}

export interface EligibilityIssue {
	assetId: string;
	reason: 'not_found' | 'not_owned' | 'not_template' | 'not_published' | 'missing_slug' | 'not_in_inventory';
}
