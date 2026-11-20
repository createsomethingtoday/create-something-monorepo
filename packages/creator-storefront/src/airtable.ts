/**
 * Airtable authoring adapter. Reads use returnFieldsByFieldId and verified
 * field IDs (fields.ts). Reads retry transient failures (429, 5xx, network)
 * a bounded number of times. Writes are never retried here: an unknown write
 * outcome is resolved by the writer's intents and lookups (writer.ts).
 */
import { buildCreatorRecordEmailMatchFormula } from '@create-something/webflow-dashboard-core/creator-email';
import { StorefrontError } from './errors';
import {
	ASSET,
	BASE_ID,
	CREATOR,
	PUBLICATION_STATUS,
	SELECTION,
	STOREFRONT,
	TABLES
} from './fields';
import type { PublicationStatus } from './fields';
import type { AuthoringStore } from './ports';
import type { AssetInfo, CreatorRef, DraftFields, SelectionRecord, StorefrontRecord } from './types';

type Fields = Record<string, unknown>;
interface AirtableRecord {
	id: string;
	fields: Fields;
}

export interface AirtableOptions {
	apiKey: string;
	apiBaseUrl?: string;
	baseId?: string;
	fetch?: typeof fetch;
	sleep?: (ms: number) => Promise<void>;
	timeoutMs?: number;
	readAttempts?: number;
}

const RECORD_ID = /^rec[A-Za-z0-9]{14}$/;
const CHUNK = 50;
const WRITE_BATCH = 10;

/**
 * Creator email matching reuses the dashboard's shared helper, so the service
 * and /api/profile resolve identity with identical normalization.
 */
export const creatorEmailFormula = buildCreatorRecordEmailMatchFormula;

function recordIdFormula(ids: string[]): string {
	for (const id of ids) {
		if (!RECORD_ID.test(id)) throw new StorefrontError('invalid_request', 'Invalid record ID');
	}
	return `OR(${ids.map((id) => `RECORD_ID()='${id}'`).join(',')})`;
}

function str(value: unknown): string | null {
	if (typeof value === 'string') return value.trim() || null;
	if (Array.isArray(value)) return str(value.filter((v) => typeof v === 'string').join(','));
	return null;
}

function ids(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function num(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function status(value: unknown): PublicationStatus {
	const known = Object.values(PUBLICATION_STATUS) as string[];
	const name = typeof value === 'string' ? value : value && typeof value === 'object' ? (value as { name?: string }).name : null;
	return (name && known.includes(name) ? name : PUBLICATION_STATUS.neverPublished) as PublicationStatus;
}

function chunks<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

export class AirtableAuthoringStore implements AuthoringStore {
	private readonly apiBase: string;
	private readonly baseId: string;
	private readonly fetchImpl: typeof fetch;
	private readonly sleep: (ms: number) => Promise<void>;
	private readonly timeoutMs: number;
	private readonly readAttempts: number;

	constructor(private readonly options: AirtableOptions) {
		this.apiBase = (options.apiBaseUrl ?? 'https://api.airtable.com').replace(/\/$/, '');
		this.baseId = options.baseId ?? BASE_ID;
		this.fetchImpl = options.fetch ?? ((input, init) => fetch(input, init));
		this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
		this.timeoutMs = options.timeoutMs ?? 8000;
		this.readAttempts = options.readAttempts ?? 3;
	}

	// ------------------------------------------------------------ transport

	private url(table: string, suffix = '', params?: URLSearchParams): string {
		const query = params && [...params].length ? `?${params}` : '';
		return `${this.apiBase}/v0/${this.baseId}/${table}${suffix}${query}`;
	}

	private async send(method: string, url: string, body?: unknown): Promise<unknown> {
		const isRead = method === 'GET';
		const attempts = isRead ? this.readAttempts : 1;
		let lastError: unknown;
		for (let attempt = 1; attempt <= attempts; attempt += 1) {
			let response: Response;
			try {
				response = await this.fetchImpl(url, {
					method,
					headers: {
						Authorization: `Bearer ${this.options.apiKey}`,
						...(body === undefined ? {} : { 'Content-Type': 'application/json' })
					},
					body: body === undefined ? undefined : JSON.stringify(body),
					signal: AbortSignal.timeout(this.timeoutMs)
				});
			} catch (error) {
				lastError = new StorefrontError('upstream_unavailable', `Airtable ${method} failed (network or timeout)`, {
					cause: error
				});
				if (attempt < attempts) await this.sleep(250 * 4 ** (attempt - 1));
				continue;
			}
			if (response.ok) return response.json();
			if (response.status === 404) {
				throw new StorefrontError('not_found', 'Airtable record not found');
			}
			if (response.status === 429 || response.status >= 500) {
				lastError = new StorefrontError('upstream_unavailable', `Airtable ${method} returned ${response.status}`);
				if (attempt < attempts) await this.sleep(250 * 4 ** (attempt - 1));
				continue;
			}
			// Permanent: 401/403/422 etc. The body is kept as the cause, not returned to callers.
			throw new StorefrontError('upstream_rejected', `Airtable ${method} rejected with ${response.status}`, {
				cause: await response.text().catch(() => '')
			});
		}
		throw lastError;
	}

	private async getRecord(table: string, recordId: string): Promise<AirtableRecord> {
		if (!RECORD_ID.test(recordId)) throw new StorefrontError('invalid_request', 'Invalid record ID');
		const params = new URLSearchParams({ returnFieldsByFieldId: 'true' });
		return (await this.send('GET', this.url(table, `/${recordId}`, params))) as AirtableRecord;
	}

	private async list(table: string, formula: string, fields: string[]): Promise<AirtableRecord[]> {
		const records: AirtableRecord[] = [];
		let offset: string | undefined;
		do {
			const params = new URLSearchParams({ filterByFormula: formula, returnFieldsByFieldId: 'true', pageSize: '100' });
			for (const field of fields) params.append('fields[]', field);
			if (offset) params.set('offset', offset);
			const page = (await this.send('GET', this.url(table, '', params))) as { records: AirtableRecord[]; offset?: string };
			records.push(...page.records);
			offset = page.offset;
		} while (offset);
		return records;
	}

	private async listByIds(table: string, recordIds: string[], fields: string[]): Promise<AirtableRecord[]> {
		const unique = [...new Set(recordIds)];
		const out: AirtableRecord[] = [];
		for (const group of chunks(unique, CHUNK)) out.push(...(await this.list(table, recordIdFormula(group), fields)));
		return out;
	}

	// ------------------------------------------------------------ creators

	async findCreatorsByEmail(email: string): Promise<CreatorRef[]> {
		if (!email.trim()) return [];
		let formula: string;
		try {
			formula = creatorEmailFormula(email);
		} catch (error) {
			// The shared helper rejects control characters and mixed quotes: fail closed.
			throw new StorefrontError('invalid_request', 'Email cannot be used for lookup', { cause: error });
		}
		const records = await this.list(TABLES.creators, formula, [CREATOR.cmsSlug]);
		return records.map((r) => ({ id: r.id, slug: str(r.fields[CREATOR.cmsSlug]) }));
	}

	async readCreator(creatorId: string): Promise<CreatorRef & { assetIds: string[]; storefrontIds: string[] }> {
		const record = await this.getRecord(TABLES.creators, creatorId);
		return {
			id: record.id,
			slug: str(record.fields[CREATOR.cmsSlug]),
			assetIds: ids(record.fields[CREATOR.assets]),
			storefrontIds: ids(record.fields[CREATOR.storefronts])
		};
	}

	// ------------------------------------------------------------ storefronts

	async createStorefront(creatorId: string): Promise<string> {
		const body = {
			records: [
				{
					fields: {
						[STOREFRONT.creator]: [creatorId],
						[STOREFRONT.draftVersion]: 0,
						[STOREFRONT.status]: PUBLICATION_STATUS.neverPublished
					}
				}
			]
		};
		const created = (await this.send('POST', this.url(TABLES.storefronts), body)) as { records: AirtableRecord[] };
		return created.records[0].id;
	}

	async readStorefront(storefrontId: string): Promise<StorefrontRecord> {
		const r = await this.getRecord(TABLES.storefronts, storefrontId);
		const f = r.fields;
		const fields: DraftFields = {
			positioning: str(f[STOREFRONT.positioning]),
			coverUrl: str(f[STOREFRONT.coverUrl]),
			coverAlt: str(f[STOREFRONT.coverAlt]),
			portfolioUrl: str(f[STOREFRONT.portfolioUrl]),
			supportText: str(f[STOREFRONT.supportText]),
			supportUrl: str(f[STOREFRONT.supportUrl])
		};
		return {
			id: r.id,
			creatorIds: ids(f[STOREFRONT.creator]),
			fields,
			draftVersion: num(f[STOREFRONT.draftVersion]) ?? 0,
			status: status(f[STOREFRONT.status]),
			publishedDraftVersion: num(f[STOREFRONT.publishedDraftVersion]),
			publishedAt: str(f[STOREFRONT.publishedAt]),
			snapshotJson: str(f[STOREFRONT.snapshotJson]),
			selectionIds: ids(f[STOREFRONT.selections])
		};
	}

	async updateStorefront(
		storefrontId: string,
		update: Parameters<AuthoringStore['updateStorefront']>[1]
	): Promise<void> {
		const map: Record<string, string> = {
			positioning: STOREFRONT.positioning,
			coverUrl: STOREFRONT.coverUrl,
			coverAlt: STOREFRONT.coverAlt,
			portfolioUrl: STOREFRONT.portfolioUrl,
			supportText: STOREFRONT.supportText,
			supportUrl: STOREFRONT.supportUrl,
			draftVersion: STOREFRONT.draftVersion,
			status: STOREFRONT.status,
			snapshotJson: STOREFRONT.snapshotJson,
			publishedDraftVersion: STOREFRONT.publishedDraftVersion,
			publishedAt: STOREFRONT.publishedAt
		};
		const fields: Fields = {};
		for (const [key, value] of Object.entries(update)) {
			if (value === undefined) continue;
			const fieldId = map[key];
			if (!fieldId) throw new StorefrontError('invalid_request', `Unknown storefront field ${key}`);
			fields[fieldId] = value;
		}
		await this.send('PATCH', this.url(TABLES.storefronts), { records: [{ id: storefrontId, fields }] });
	}

	// ------------------------------------------------------------ selections

	async readSelections(selectionIds: string[]): Promise<SelectionRecord[]> {
		if (!selectionIds.length) return [];
		const records = await this.listByIds(TABLES.selections, selectionIds, [
			SELECTION.storefront,
			SELECTION.asset,
			SELECTION.position,
			SELECTION.note
		]);
		return records.map((r) => ({
			id: r.id,
			storefrontIds: ids(r.fields[SELECTION.storefront]),
			assetIds: ids(r.fields[SELECTION.asset]),
			position: num(r.fields[SELECTION.position]),
			note: str(r.fields[SELECTION.note])
		}));
	}

	async createSelections(rows: Parameters<AuthoringStore['createSelections']>[0]): Promise<void> {
		for (const batch of chunks(rows, WRITE_BATCH)) {
			await this.send('POST', this.url(TABLES.selections), {
				records: batch.map((row) => ({
					fields: {
						[SELECTION.storefront]: [row.storefrontId],
						[SELECTION.asset]: [row.assetId],
						[SELECTION.position]: row.position,
						[SELECTION.note]: row.note
					}
				}))
			});
		}
	}

	async updateSelections(rows: Parameters<AuthoringStore['updateSelections']>[0]): Promise<void> {
		for (const batch of chunks(rows, WRITE_BATCH)) {
			await this.send('PATCH', this.url(TABLES.selections), {
				records: batch.map((row) => ({
					id: row.id,
					fields: { [SELECTION.position]: row.position, [SELECTION.note]: row.note }
				}))
			});
		}
	}

	async deleteSelections(selectionIds: string[]): Promise<void> {
		for (const batch of chunks(selectionIds, WRITE_BATCH)) {
			const params = new URLSearchParams();
			for (const id of batch) {
				if (!RECORD_ID.test(id)) throw new StorefrontError('invalid_request', 'Invalid record ID');
				params.append('records[]', id);
			}
			await this.send('DELETE', this.url(TABLES.selections, '', params));
		}
	}

	// ------------------------------------------------------------ assets

	async readAssets(assetIds: string[]): Promise<AssetInfo[]> {
		if (!assetIds.length) return [];
		const records = await this.listByIds(TABLES.assets, assetIds, [
			ASSET.name,
			ASSET.creator,
			ASSET.marketplaceStatus,
			ASSET.cmsSlug,
			ASSET.typeText
		]);
		return records.map((r) => {
			const statusValue = r.fields[ASSET.marketplaceStatus];
			return {
				id: r.id,
				name: str(r.fields[ASSET.name]) ?? '',
				creatorIds: ids(r.fields[ASSET.creator]),
				marketplaceStatus:
					typeof statusValue === 'string'
						? statusValue
						: statusValue && typeof statusValue === 'object'
							? ((statusValue as { name?: string }).name ?? null)
							: null,
				templateSlug: str(r.fields[ASSET.cmsSlug]),
				typeText: str(r.fields[ASSET.typeText]) ?? ''
			};
		});
	}
}
