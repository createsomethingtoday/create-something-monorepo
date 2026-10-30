/**
 * Per-Creator serialized writer (CONTRACT.md §4–§7).
 *
 * One instance runs inside one Durable Object per Creator, so there is a
 * single writer per Creator. Inside the instance, `serialize` keeps operations
 * strictly one-at-a-time even while they await Airtable or D1 (Durable Object
 * input gates do not hold across outbound fetches).
 *
 * Durable state lives in WriterStorage:
 *   storefrontId   cached record ID of this Creator's storefront
 *   draftIntent    in-flight draft change (fields or selections) with the
 *                  last committed draft; blocks other writes until resolved
 *   pub:revision   last allocated publicationRevision
 *   pub:intent     latest publication intent (pending, done or superseded)
 *   pub:slugs      every slug this Creator has written a read-model row for
 *   idem:<key>     idempotency records (24 h)
 */
import { ASSET_PUBLISHED_STATUS, PUBLICATION_STATUS } from './fields';
import type { PublicationStatus } from './fields';
import { StorefrontError, isStorefrontError } from './errors';
import type { WriterDeps } from './ports';
import { toPublicDto } from './public-dto';
import type {
	AirtablePublicationUpdate,
	AssetInfo,
	CreatorRef,
	DraftFields,
	DraftSelection,
	DraftState,
	EligibilityIssue,
	OwnerView,
	PublicStorefrontV1,
	PublicationIntent,
	PublicationOp,
	PublicationReceipt,
	SelectionCandidate,
	SelectionRecord,
	StorefrontRecord,
	StorefrontSnapshotV1
} from './types';
import { EMPTY_DRAFT_FIELDS } from './types';
import { LIMITS, validateDraftFields, validateSelectionInput } from './validation';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const RECONCILE_DELAYS_MS = [5_000, 30_000, 120_000, 300_000];

type DraftIntent =
	| {
			kind: 'fields';
			storefrontId: string;
			lastCommitted: DraftState;
			fields: DraftFields;
			targetDraftVersion: number;
	  }
	| {
			kind: 'selections';
			storefrontId: string;
			lastCommitted: DraftState;
			target: DraftSelection[];
			targetDraftVersion: number;
	  };

interface IdempotencyRecord {
	fingerprint: string;
	op: string;
	at: number;
	status: 'in_progress' | 'done';
	result?: unknown;
	targetDraftVersion?: number;
	revision?: number;
}

type IdemContext = { key: string; record: IdempotencyRecord };

type PublicationPlan =
	| 'unchanged'
	| { storefrontId: string; rows: PublicationIntent['rows']; airtable: AirtablePublicationUpdate };

function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, v]) => v !== undefined)
			.sort(([a], [b]) => a.localeCompare(b));
		return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
	}
	return JSON.stringify(value ?? null);
}

function fieldsEqual(a: DraftFields, b: DraftFields): boolean {
	return canonical(a) === canonical(b);
}

export function isTemplateAsset(asset: AssetInfo): boolean {
	const type = asset.typeText.toLowerCase();
	return type.includes('template') && !type.includes('library') && !type.includes('app');
}

function invariant(message: string, details?: unknown): StorefrontError {
	return new StorefrontError('invariant_violation', message, details === undefined ? {} : { details });
}

/** Every selection row of a storefront must link exactly that storefront and exactly one asset. */
function assertRowLinks(storefrontId: string, rows: SelectionRecord[]): void {
	const bad = rows.filter(
		(row) => row.storefrontIds.length !== 1 || row.storefrontIds[0] !== storefrontId || row.assetIds.length !== 1
	);
	if (bad.length) throw invariant('Selection rows must link exactly one storefront and one asset', { rows: bad.length });
}

export class StorefrontWriter {
	private tail: Promise<unknown> = Promise.resolve();
	private readonly now: () => Date;

	constructor(private readonly deps: WriterDeps) {
		this.now = deps.now ?? (() => new Date());
	}

	// ---------------------------------------------------------------- owner

	view(creator: CreatorRef): Promise<OwnerView> {
		return this.serialize(async () => {
			const recovered = await this.tryRecoverDraft();
			const draft = recovered.pending ? recovered.intent.lastCommitted : await this.readDraft(creator);
			return this.ownerView(creator, draft, recovered.pending);
		});
	}

	saveDraft(
		creator: CreatorRef,
		input: { expectedDraftVersion: unknown; fields: unknown; idempotencyKey: string | null }
	): Promise<OwnerView> {
		const fields = validateDraftFields(input.fields, { allowedCoverOrigins: this.deps.allowedCoverOrigins });
		const expected = this.expectedVersion(input.expectedDraftVersion);
		return this.serialize(async () => {
			await this.recoverDraftOrThrow();
			await this.idempotent(
				input.idempotencyKey,
				'save_draft',
				{ expected, fields },
				async (idem) => {
					const record = await this.ensureStorefront(creator);
					if (record.draftVersion !== expected) throw this.versionConflict(record.draftVersion);
					const intent: DraftIntent = {
						kind: 'fields',
						storefrontId: record.id,
						lastCommitted: await this.draftOf(record),
						fields,
						targetDraftVersion: expected + 1
					};
					await this.beginDraftIntent(intent, idem);
					await this.applyDraftIntent(intent);
					return { ok: true };
				},
				(existing) => this.resumeDraftWrite(creator, existing)
			);
			return this.ownerView(creator, await this.readDraft(creator), false);
		});
	}

	replaceSelections(
		creator: CreatorRef,
		input: { expectedDraftVersion: unknown; selections: unknown; idempotencyKey: string | null }
	): Promise<OwnerView> {
		const selections = validateSelectionInput(input.selections);
		const expected = this.expectedVersion(input.expectedDraftVersion);
		return this.serialize(async () => {
			await this.recoverDraftOrThrow();
			await this.idempotent(
				input.idempotencyKey,
				'replace_selections',
				{ expected, selections },
				async (idem) => {
					const record = await this.ensureStorefront(creator);
					if (record.draftVersion !== expected) throw this.versionConflict(record.draftVersion);

					const assets = await this.deps.store.readAssets(selections.map((s) => s.assetId));
					const issues = this.eligibilityIssues(creator, selections.map((s) => s.assetId), assets);
					if (issues.length) {
						throw new StorefrontError('ineligible_selection', 'Some selected templates cannot be featured', {
							details: { issues }
						});
					}

					const intent: DraftIntent = {
						kind: 'selections',
						storefrontId: record.id,
						// Fails closed on malformed existing rows before anything is mutated.
						lastCommitted: await this.draftOf(record),
						target: selections.map((s, index) => ({ assetId: s.assetId, position: index + 1, note: s.note })),
						targetDraftVersion: expected + 1
					};
					await this.beginDraftIntent(intent, idem);
					await this.applyDraftIntent(intent);
					return { ok: true };
				},
				(existing) => this.resumeDraftWrite(creator, existing)
			);
			return this.ownerView(creator, await this.readDraft(creator), false);
		});
	}

	/** Builds the public DTO from the committed draft. Not cached, never stored. */
	preview(creator: CreatorRef): Promise<{ storefront: PublicStorefrontV1; issues: EligibilityIssue[]; blockers: string[] }> {
		return this.serialize(async () => {
			const recovered = await this.tryRecoverDraft();
			const draft = recovered.pending ? recovered.intent.lastCommitted : await this.readDraft(creator);
			const blockers: string[] = [];
			if (!creator.slug) blockers.push('creator_slug_missing');
			if (recovered.pending) blockers.push('intent_pending');

			const { resolved, issues, inventoryChecked } = await this.resolveSelections(creator, draft.selections, 'best_effort');
			if (issues.length) blockers.push('ineligible_selection');
			if (!inventoryChecked && draft.selections.length) blockers.push('inventory_unavailable');
			const snapshot = this.buildSnapshot(creator, 'preview', draft, resolved, this.now().toISOString());
			return {
				storefront: toPublicDto({ creatorSlug: creator.slug ?? '', revision: 0, state: 'live', creatorId: creator.id, snapshot }),
				issues,
				blockers
			};
		});
	}

	publish(creator: CreatorRef, input: { expectedDraftVersion: unknown; idempotencyKey: string | null }): Promise<PublicationReceipt> {
		const expected = this.expectedVersion(input.expectedDraftVersion);
		return this.serialize(async () => {
			await this.recoverDraftOrThrow();
			return this.publication(creator, input.idempotencyKey, 'publish', { expected }, async () => {
				const record = await this.readOwnedStorefront(creator);
				if (!record) throw new StorefrontError('not_found', 'Save a storefront draft before publishing');
				if ((await this.effectiveStatus(record)) === PUBLICATION_STATUS.suspended) {
					throw new StorefrontError('suspended', 'This storefront is suspended by Marketplace staff');
				}
				if (record.draftVersion !== expected) throw this.versionConflict(record.draftVersion);
				if (!creator.slug) throw new StorefrontError('creator_slug_missing', 'The Creator has no public slug yet');

				// Re-validate stored fields against current rules (cover origins can change).
				validateDraftFields(record.fields, { allowedCoverOrigins: this.deps.allowedCoverOrigins });
				const draft = await this.draftOf(record);
				const { resolved, issues } = await this.resolveSelections(creator, draft.selections, 'required');
				if (issues.length) {
					throw new StorefrontError('ineligible_selection', 'Some selected templates cannot be featured', {
						details: { issues }
					});
				}

				const publishedAt = this.now().toISOString();
				const snapshot = this.buildSnapshot(creator, record.id, draft, resolved, publishedAt);
				return {
					storefrontId: record.id,
					rows: await this.liveRows(creator.slug, snapshot),
					airtable: {
						status: PUBLICATION_STATUS.published,
						snapshotJson: JSON.stringify(snapshot),
						publishedDraftVersion: record.draftVersion,
						publishedAt
					}
				};
			});
		});
	}

	unpublish(creator: CreatorRef, input: { idempotencyKey: string | null }): Promise<PublicationReceipt> {
		return this.serialize(async () =>
			this.publication(creator, input.idempotencyKey, 'unpublish', {}, async () => {
				const record = await this.readOwnedStorefront(creator);
				const status = record ? await this.effectiveStatus(record) : PUBLICATION_STATUS.neverPublished;
				if (status === PUBLICATION_STATUS.suspended) {
					throw new StorefrontError('suspended', 'Only Marketplace staff can change a suspended storefront');
				}
				if (!record || status !== PUBLICATION_STATUS.published) return 'unchanged';
				return this.tombstonePlan(record.id, creator, 'unpublished', PUBLICATION_STATUS.unpublished);
			})
		);
	}

	// ---------------------------------------------------------------- staff

	suspend(creator: CreatorRef, input: { idempotencyKey: string | null }): Promise<PublicationReceipt> {
		return this.serialize(async () =>
			this.publication(creator, input.idempotencyKey, 'suspend', {}, async () => {
				const record = await this.ensureStorefront(creator);
				if ((await this.effectiveStatus(record)) === PUBLICATION_STATUS.suspended) return 'unchanged';
				return this.tombstonePlan(record.id, creator, 'suspended', PUBLICATION_STATUS.suspended);
			})
		);
	}

	clearSuspension(creator: CreatorRef, input: { idempotencyKey: string | null }): Promise<PublicationReceipt> {
		return this.serialize(async () =>
			this.publication(creator, input.idempotencyKey, 'clear_suspension', {}, async () => {
				const record = await this.readOwnedStorefront(creator);
				if (!record || (await this.effectiveStatus(record)) !== PUBLICATION_STATUS.suspended) return 'unchanged';
				return this.tombstonePlan(record.id, creator, 'unpublished', PUBLICATION_STATUS.unpublished);
			})
		);
	}

	/** Re-keys a live storefront after the Creator's 🥞CMS Slug changed. */
	moveSlug(creator: CreatorRef, input: { idempotencyKey: string | null }): Promise<PublicationReceipt> {
		return this.serialize(async () =>
			this.publication(creator, input.idempotencyKey, 'move_slug', { slug: creator.slug }, async () => {
				const record = await this.readOwnedStorefront(creator);
				const known = await this.knownSlugs();
				if (!record || !creator.slug || known.every((slug) => slug === creator.slug)) return 'unchanged';
				if ((await this.effectiveStatus(record)) !== PUBLICATION_STATUS.published || !record.snapshotJson) {
					return 'unchanged';
				}
				const snapshot = { ...(JSON.parse(record.snapshotJson) as StorefrontSnapshotV1), creatorSlug: creator.slug };
				return {
					storefrontId: record.id,
					rows: await this.liveRows(creator.slug, snapshot),
					airtable: { status: PUBLICATION_STATUS.published, snapshotJson: JSON.stringify(snapshot) }
				};
			})
		);
	}

	// ---------------------------------------------------------------- reconciler

	/**
	 * Completes a pending draft intent and the latest pending publication intent.
	 * Runs from the Durable Object alarm. Superseded or status-changed intents
	 * are dropped, never replayed.
	 */
	reconcile(creator: CreatorRef): Promise<PublicationReceipt | null> {
		return this.serialize(async () => {
			await this.tryRecoverDraft();
			const intent = await this.deps.storage.get<PublicationIntent>('pub:intent');
			if (!intent || intent.state !== 'pending') return intent ? this.receiptFor(intent) : null;

			const latest = (await this.deps.storage.get<number>('pub:revision')) ?? 0;
			if (intent.revision !== latest) {
				await this.supersede(intent, 'newer_revision');
				return this.receiptFor(intent);
			}
			if (intent.op === 'publish' && !intent.steps.airtable) {
				// Re-check status first: a suspension made outside the writer must not be overwritten.
				const record = await this.readOwnedStorefront(creator);
				if (!record || record.status === PUBLICATION_STATUS.suspended) {
					await this.supersede(intent, 'status_changed');
					return this.receiptFor(intent);
				}
			}
			return this.executeIntent(intent);
		});
	}

	// ---------------------------------------------------------------- internals

	private serialize<T>(fn: () => Promise<T>): Promise<T> {
		const run = this.tail.then(fn, fn);
		this.tail = run.catch(() => undefined);
		return run;
	}

	private expectedVersion(value: unknown): number {
		if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
			throw new StorefrontError('invalid_request', 'expectedDraftVersion must be a non-negative integer');
		}
		return value;
	}

	private versionConflict(current: number): StorefrontError {
		return new StorefrontError('version_conflict', 'The draft changed since it was loaded', {
			details: { currentDraftVersion: current }
		});
	}

	private async ownerView(creator: CreatorRef, draft: DraftState, pending: boolean): Promise<OwnerView> {
		const intent = await this.deps.storage.get<PublicationIntent>('pub:intent');
		return {
			draft: intent && intent.state !== 'superseded' ? { ...draft, status: intent.airtable.status } : draft,
			pending,
			lastReceipt: intent ? this.receiptFor(intent) : null,
			candidates: await this.candidates(creator)
		};
	}

	/** The writer's latest intent wins over Airtable, so a failed Airtable step cannot unlock a suspension. */
	private async effectiveStatus(record: StorefrontRecord): Promise<PublicationStatus> {
		const intent = await this.deps.storage.get<PublicationIntent>('pub:intent');
		if (intent && intent.state !== 'superseded') return intent.airtable.status;
		return record.status;
	}

	private async readOwnedStorefront(creator: CreatorRef): Promise<StorefrontRecord | null> {
		const cached = await this.deps.storage.get<string>('storefrontId');
		const id = cached ?? (await this.findStorefrontId(creator));
		if (!id) return null;
		const record = await this.deps.store.readStorefront(id);
		if (record.creatorIds.length !== 1 || record.creatorIds[0] !== creator.id) {
			throw invariant('Storefront is not linked to exactly this Creator');
		}
		if (!cached) await this.deps.storage.put({ storefrontId: id });
		return record;
	}

	private async findStorefrontId(creator: CreatorRef): Promise<string | null> {
		const { storefrontIds } = await this.deps.store.readCreator(creator.id);
		if (storefrontIds.length > 1) {
			throw invariant('More than one storefront is linked to this Creator', { count: storefrontIds.length });
		}
		return storefrontIds[0] ?? null;
	}

	/**
	 * First create runs inside the serialized writer: look up, then create only
	 * when none exists. If a create timed out but succeeded, the next lookup
	 * finds it instead of creating a duplicate.
	 */
	private async ensureStorefront(creator: CreatorRef): Promise<StorefrontRecord> {
		const existing = await this.readOwnedStorefront(creator);
		if (existing) return existing;
		const id = await this.deps.store.createStorefront(creator.id);
		await this.deps.storage.put({ storefrontId: id });
		return this.deps.store.readStorefront(id);
	}

	/** Strict: malformed links, duplicate assets or duplicate positions fail closed. */
	private draftFrom(record: StorefrontRecord, rows: SelectionRecord[]): DraftState {
		assertRowLinks(record.id, rows);
		const assets = new Set(rows.map((row) => row.assetIds[0]));
		const positions = new Set(rows.map((row) => row.position));
		if (assets.size !== rows.length || positions.size !== rows.length || rows.some((row) => row.position === null)) {
			throw invariant('Selection rows have duplicate or missing assets or positions');
		}
		const ordered = [...rows].sort((a, b) => (a.position as number) - (b.position as number));
		return {
			exists: true,
			draftVersion: record.draftVersion,
			status: record.status,
			publishedDraftVersion: record.publishedDraftVersion,
			publishedAt: record.publishedAt,
			fields: record.fields,
			selections: ordered.map((row, index) => ({ assetId: row.assetIds[0], position: index + 1, note: row.note }))
		};
	}

	private async draftOf(record: StorefrontRecord): Promise<DraftState> {
		return this.draftFrom(record, await this.deps.store.readSelections(record.selectionIds));
	}

	private async readDraft(creator: CreatorRef): Promise<DraftState> {
		const record = await this.readOwnedStorefront(creator);
		if (!record) {
			return {
				exists: false,
				draftVersion: 0,
				status: PUBLICATION_STATUS.neverPublished,
				publishedDraftVersion: null,
				publishedAt: null,
				fields: { ...EMPTY_DRAFT_FIELDS },
				selections: []
			};
		}
		return this.draftOf(record);
	}

	private async candidates(creator: CreatorRef): Promise<SelectionCandidate[]> {
		const { assetIds } = await this.deps.store.readCreator(creator.id);
		if (!assetIds.length) return [];
		const assets = await this.deps.store.readAssets(assetIds);
		const eligible = new Set(assets.map((a) => a.id));
		for (const issue of this.eligibilityIssues(creator, assetIds, assets)) eligible.delete(issue.assetId);
		return assets
			.filter((a) => eligible.has(a.id))
			.map((a) => ({ assetId: a.id, name: a.name, templateSlug: a.templateSlug }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	private eligibilityIssues(creator: CreatorRef, assetIds: string[], assets: AssetInfo[]): EligibilityIssue[] {
		const byId = new Map(assets.map((a) => [a.id, a]));
		const issues: EligibilityIssue[] = [];
		for (const assetId of assetIds) {
			const asset = byId.get(assetId);
			if (!asset) issues.push({ assetId, reason: 'not_found' });
			else if (asset.creatorIds.length !== 1 || asset.creatorIds[0] !== creator.id) issues.push({ assetId, reason: 'not_owned' });
			else if (!isTemplateAsset(asset)) issues.push({ assetId, reason: 'not_template' });
			else if (asset.marketplaceStatus !== ASSET_PUBLISHED_STATUS) issues.push({ assetId, reason: 'not_published' });
			else if (!asset.templateSlug) issues.push({ assetId, reason: 'missing_slug' });
		}
		return issues;
	}

	private async resolveSelections(
		creator: CreatorRef,
		selections: DraftSelection[],
		inventory: 'required' | 'best_effort'
	): Promise<{ resolved: StorefrontSnapshotV1['selections']; issues: EligibilityIssue[]; inventoryChecked: boolean }> {
		if (!selections.length) return { resolved: [], issues: [], inventoryChecked: true };
		const assets = await this.deps.store.readAssets(selections.map((s) => s.assetId));
		const issues = this.eligibilityIssues(creator, selections.map((s) => s.assetId), assets);
		const byId = new Map(assets.map((a) => [a.id, a]));
		const blocked = new Set(issues.map((i) => i.assetId));
		const candidates = selections.filter((s) => !blocked.has(s.assetId));

		let present: Set<string> | null = null;
		try {
			present = await this.deps.inventory.presentSlugs(candidates.map((s) => byId.get(s.assetId)!.templateSlug!));
		} catch (error) {
			if (inventory === 'required') throw error;
		}

		const resolved: StorefrontSnapshotV1['selections'] = [];
		for (const selection of candidates) {
			const slug = byId.get(selection.assetId)!.templateSlug!;
			if (present && !present.has(slug)) {
				issues.push({ assetId: selection.assetId, reason: 'not_in_inventory' });
				continue;
			}
			resolved.push({ assetId: selection.assetId, templateSlug: slug, position: resolved.length + 1, note: selection.note });
		}
		return { resolved, issues, inventoryChecked: present !== null };
	}

	private buildSnapshot(
		creator: CreatorRef,
		storefrontId: string,
		draft: DraftState,
		selections: StorefrontSnapshotV1['selections'],
		publishedAt: string
	): StorefrontSnapshotV1 {
		const f = draft.fields;
		return {
			schema: 1,
			storefrontId,
			creatorId: creator.id,
			creatorSlug: creator.slug ?? '',
			draftVersion: draft.draftVersion,
			publishedAt,
			positioning: f.positioning,
			cover: f.coverUrl && f.coverAlt ? { url: f.coverUrl, alt: f.coverAlt } : null,
			portfolioUrl: f.portfolioUrl,
			support: f.supportText && f.supportUrl ? { text: f.supportText, href: f.supportUrl } : null,
			selections: selections.slice(0, LIMITS.selections)
		};
	}

	// ------------------------------------------------------------ draft intents

	/** Intent and idempotency target in one atomic write, before any Airtable call. */
	private async beginDraftIntent(intent: DraftIntent, idem: IdemContext): Promise<void> {
		idem.record = { ...idem.record, targetDraftVersion: intent.targetDraftVersion };
		await this.deps.storage.put({ draftIntent: intent, [`idem:${idem.key}`]: idem.record });
	}

	private async tryRecoverDraft(): Promise<{ pending: false } | { pending: true; intent: DraftIntent; error: unknown }> {
		const intent = await this.deps.storage.get<DraftIntent>('draftIntent');
		if (!intent) return { pending: false };
		try {
			await this.applyDraftIntent(intent);
			return { pending: false };
		} catch (error) {
			if (!isStorefrontError(error)) throw error;
			if (error.code !== 'invariant_violation') await this.scheduleReconcile(RECONCILE_DELAYS_MS[0]);
			return { pending: true, intent, error };
		}
	}

	/** While a draft write's outcome is uncertain, every other write is blocked. */
	private async recoverDraftOrThrow(): Promise<void> {
		const recovered = await this.tryRecoverDraft();
		if (!recovered.pending) return;
		if (isStorefrontError(recovered.error) && recovered.error.code === 'invariant_violation') throw recovered.error;
		throw new StorefrontError('intent_pending', 'A previous change is still being applied; retry shortly');
	}

	/**
	 * Idempotent. The commit point is 🔢Draft Version = target:
	 *   version = target      already committed (fields are checked)
	 *   version = target - 1  not committed: apply again
	 *   anything else         unexpected writer state: fail closed
	 */
	private async applyDraftIntent(intent: DraftIntent): Promise<void> {
		const record = await this.deps.store.readStorefront(intent.storefrontId);
		const committed = record.draftVersion === intent.targetDraftVersion;
		if (!committed && record.draftVersion !== intent.targetDraftVersion - 1) {
			throw invariant('Draft version moved outside the writer', {
				expected: intent.targetDraftVersion - 1,
				found: record.draftVersion
			});
		}

		if (intent.kind === 'fields') {
			if (committed) {
				if (!fieldsEqual(record.fields, intent.fields)) throw invariant('Committed draft fields differ from the intent');
			} else {
				// One record update: fields and version change together or not at all.
				await this.deps.store.updateStorefront(intent.storefrontId, {
					...intent.fields,
					draftVersion: intent.targetDraftVersion
				});
			}
		} else if (!committed) {
			await this.applySelectionRows(intent.storefrontId, record, intent.target);
			await this.deps.store.updateStorefront(intent.storefrontId, { draftVersion: intent.targetDraftVersion });
		}
		await this.deps.storage.delete(['draftIntent']);
	}

	/**
	 * Upserts target rows keyed by asset and deletes every other row of this
	 * storefront. Rows linked to another storefront or to zero/several assets
	 * fail closed before any mutation. Duplicate rows for a target asset can
	 * only come from this writer's own uncertain create, so extras are removed.
	 */
	private async applySelectionRows(storefrontId: string, record: StorefrontRecord, target: DraftSelection[]): Promise<void> {
		const rows = await this.deps.store.readSelections(record.selectionIds);
		assertRowLinks(storefrontId, rows);

		const byAsset = new Map<string, SelectionRecord[]>();
		for (const row of rows) byAsset.set(row.assetIds[0], [...(byAsset.get(row.assetIds[0]) ?? []), row]);

		const creates: Array<{ storefrontId: string; assetId: string; position: number; note: string | null }> = [];
		const updates: Array<{ id: string; position: number; note: string | null }> = [];
		const keep = new Set<string>();
		for (const t of target) {
			const row = byAsset.get(t.assetId)?.[0];
			if (!row) {
				creates.push({ storefrontId, ...t });
				continue;
			}
			keep.add(row.id);
			if (row.position !== t.position || (row.note ?? null) !== t.note) {
				updates.push({ id: row.id, position: t.position, note: t.note });
			}
		}
		const deletes = rows.filter((row) => !keep.has(row.id)).map((row) => row.id);

		if (deletes.length) await this.deps.store.deleteSelections(deletes);
		if (updates.length) await this.deps.store.updateSelections(updates);
		if (creates.length) await this.deps.store.createSelections(creates);
	}

	private async resumeDraftWrite(creator: CreatorRef, existing: IdempotencyRecord): Promise<{ ok: true } | 'rerun'> {
		// recoverDraftOrThrow already ran: the intent is either committed or never started.
		if (existing.targetDraftVersion === undefined) return 'rerun';
		const record = await this.readOwnedStorefront(creator);
		if (record && record.draftVersion === existing.targetDraftVersion) return { ok: true };
		throw this.versionConflict(record?.draftVersion ?? 0);
	}

	// ------------------------------------------------------- publication

	private async knownSlugs(): Promise<string[]> {
		return (await this.deps.storage.get<string[]>('pub:slugs')) ?? [];
	}

	/** Live row at the current slug plus a `moved` tombstone at every other slug ever used. */
	private async liveRows(slug: string, snapshot: StorefrontSnapshotV1): Promise<PublicationIntent['rows']> {
		const others = (await this.knownSlugs()).filter((s) => s !== slug);
		return [
			{ creatorSlug: slug, state: 'live', snapshot },
			...others.map((s) => ({ creatorSlug: s, state: 'moved' as const, snapshot: null }))
		];
	}

	/** Tombstones cover every slug this Creator ever wrote, so a half-applied move cannot stay live. */
	private async tombstonePlan(
		storefrontId: string,
		creator: CreatorRef,
		state: 'unpublished' | 'suspended',
		status: PublicationStatus
	): Promise<PublicationPlan> {
		const known = await this.knownSlugs();
		const slugs = known.length ? known : creator.slug ? [creator.slug] : [];
		return {
			storefrontId,
			rows: slugs.map((slug) => ({ creatorSlug: slug, state, snapshot: null })),
			airtable: { status }
		};
	}

	private async publication(
		creator: CreatorRef,
		key: string | null,
		op: PublicationOp,
		payload: Record<string, unknown>,
		plan: () => Promise<PublicationPlan>
	): Promise<PublicationReceipt> {
		return this.idempotent<PublicationReceipt>(
			key,
			op,
			payload,
			async (idem) => {
				const planned = await plan();
				const latest = await this.deps.storage.get<PublicationIntent>('pub:intent');
				if (planned === 'unchanged') return this.unchangedReceipt(op, latest);

				// A pending older intent is replaced, not replayed: the new revision wins,
				// and the read model would reject the older revision anyway.
				const revision = ((await this.deps.storage.get<number>('pub:revision')) ?? 0) + 1;
				const intent: PublicationIntent = {
					revision,
					op,
					creatorId: creator.id,
					storefrontId: planned.storefrontId,
					rows: planned.rows,
					airtable: planned.airtable,
					steps: { airtable: false, readModel: planned.rows.length === 0 },
					state: 'pending',
					attempts: 0,
					createdAt: this.now().toISOString()
				};
				const slugs = [...new Set([...(await this.knownSlugs()), ...planned.rows.map((r) => r.creatorSlug)])];
				idem.record = { ...idem.record, revision };
				// Point of no return: revision, intent, slugs and idempotency target in one atomic write.
				await this.deps.storage.put({
					'pub:revision': revision,
					'pub:intent': intent,
					'pub:slugs': slugs,
					[`idem:${idem.key}`]: idem.record
				});
				return this.executeIntent(intent);
			},
			async (existing) => {
				if (existing.revision === undefined) return 'rerun';
				return this.receiptForRevision(existing.revision, op, true);
			},
			// A stored receipt may be stale: replay its intent if still pending, or report supersession.
			async (stored) => this.receiptForRevision(stored.publicationRevision, op, true, stored)
		);
	}

	/**
	 * Receipt for a revision this caller already received. Same revision still
	 * pending: replay the same intent (never a new revision). A newer revision
	 * exists: report `superseded`, never the old `live`.
	 */
	private async receiptForRevision(
		revision: number,
		op: PublicationOp,
		replay: boolean,
		stored?: PublicationReceipt
	): Promise<PublicationReceipt> {
		const intent = await this.deps.storage.get<PublicationIntent>('pub:intent');
		if (stored && stored.state === 'unchanged') {
			if (!intent || intent.revision === stored.publicationRevision) return stored;
		} else if (intent && intent.revision === revision) {
			return replay && intent.state === 'pending' ? this.executeIntent(intent) : this.receiptFor(intent);
		}
		const base = stored ?? this.unchangedReceipt(op, undefined);
		return { ...base, op, publicationRevision: revision, readModel: 'superseded', state: 'superseded' };
	}

	private unchangedReceipt(op: PublicationOp, latest: PublicationIntent | undefined): PublicationReceipt {
		if (latest) return { ...this.receiptFor(latest), op, state: 'unchanged' };
		return {
			publicationRevision: 0,
			op,
			status: PUBLICATION_STATUS.neverPublished,
			publishedDraftVersion: null,
			publishedAt: null,
			readModel: 'not_applicable',
			state: 'unchanged'
		};
	}

	private async executeIntent(intent: PublicationIntent): Promise<PublicationReceipt> {
		try {
			if (!intent.steps.airtable) {
				const a = intent.airtable;
				await this.deps.store.updateStorefront(intent.storefrontId, {
					status: a.status,
					...(a.snapshotJson !== undefined ? { snapshotJson: a.snapshotJson } : {}),
					...(a.publishedDraftVersion !== undefined ? { publishedDraftVersion: a.publishedDraftVersion } : {}),
					...(a.publishedAt !== undefined ? { publishedAt: a.publishedAt } : {})
				});
				intent.steps.airtable = true;
				await this.deps.storage.put({ 'pub:intent': intent });
			}
			if (!intent.steps.readModel) {
				for (const row of intent.rows) {
					const result = await this.deps.readModel.apply({ ...row, creatorId: intent.creatorId, revision: intent.revision });
					if (result === 'stale') {
						await this.supersede(intent, 'read_model_newer');
						return this.receiptFor(intent);
					}
					// Fail closed: slug reuse across Creators needs a verified ownership transfer.
					if (result === 'conflict') {
						throw invariant('Another Creator holds this slug in the public read model');
					}
				}
				intent.steps.readModel = true;
			}
			intent.state = 'done';
			intent.lastError = undefined;
			await this.deps.storage.put({ 'pub:intent': intent });
		} catch (error) {
			intent.attempts += 1;
			intent.lastError = isStorefrontError(error) ? error.code : 'unexpected';
			await this.deps.storage.put({ 'pub:intent': intent });
			if (isStorefrontError(error) && error.code === 'invariant_violation') throw error;
			await this.scheduleReconcile(RECONCILE_DELAYS_MS[Math.min(intent.attempts - 1, RECONCILE_DELAYS_MS.length - 1)]);
		}
		return this.receiptFor(intent);
	}

	private async supersede(intent: PublicationIntent, reason: string): Promise<void> {
		intent.state = 'superseded';
		intent.supersededReason = reason;
		await this.deps.storage.put({ 'pub:intent': intent });
	}

	/**
	 * `live`/`removed` means the read model committed. The public GET is
	 * no-store in this slice, so every later public request sees it.
	 */
	private receiptFor(intent: PublicationIntent): PublicationReceipt {
		const committed = intent.state === 'done';
		const readModel =
			intent.state === 'superseded'
				? 'superseded'
				: intent.rows.length === 0
					? 'not_applicable'
					: intent.steps.readModel
						? 'committed'
						: 'pending';
		const state =
			intent.state === 'superseded'
				? 'superseded'
				: committed
					? intent.op === 'publish' || intent.op === 'move_slug'
						? 'live'
						: 'removed'
					: 'propagating';
		return {
			publicationRevision: intent.revision,
			op: intent.op,
			status: intent.airtable.status,
			publishedDraftVersion: intent.airtable.publishedDraftVersion ?? null,
			publishedAt: intent.airtable.publishedAt ?? null,
			readModel,
			state
		};
	}

	private async scheduleReconcile(delayMs: number): Promise<void> {
		if (this.deps.scheduleReconcile) await this.deps.scheduleReconcile(delayMs);
	}

	// ------------------------------------------------------- idempotency

	/**
	 * Same key + same payload returns the first outcome (or resumes it). Same key
	 * + different payload is rejected. Failures that committed nothing release
	 * the key so a corrected retry can use it.
	 */
	private async idempotent<T>(
		key: string | null,
		op: string,
		payload: unknown,
		run: (idem: IdemContext) => Promise<T>,
		resume: (existing: IdempotencyRecord) => Promise<T | 'rerun'>,
		refresh?: (stored: T) => Promise<T>
	): Promise<T> {
		if (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key)) {
			throw new StorefrontError('idempotency_key_required', 'Idempotency-Key header (8–128 URL-safe chars) is required');
		}
		await this.pruneIdempotency();
		const storageKey = `idem:${key}`;
		const fingerprint = canonical({ op, payload });
		const existing = await this.deps.storage.get<IdempotencyRecord>(storageKey);
		if (existing && this.now().getTime() - existing.at < IDEMPOTENCY_TTL_MS) {
			if (existing.fingerprint !== fingerprint) {
				throw new StorefrontError('idempotency_conflict', 'This Idempotency-Key was already used with a different request');
			}
			if (existing.status === 'done') return refresh ? refresh(existing.result as T) : (existing.result as T);
			const resumed = await resume(existing);
			if (resumed !== 'rerun') {
				await this.deps.storage.put({ [storageKey]: { ...existing, status: 'done', result: resumed } });
				return resumed;
			}
		}

		const idem: IdemContext = { key, record: { fingerprint, op, at: this.now().getTime(), status: 'in_progress' } };
		await this.deps.storage.put({ [storageKey]: idem.record });
		try {
			const result = await run(idem);
			await this.deps.storage.put({ [storageKey]: { ...idem.record, status: 'done', result } });
			return result;
		} catch (error) {
			// Keep the record once a commit target exists, so a retry resumes instead of re-running.
			const started = idem.record.targetDraftVersion !== undefined || idem.record.revision !== undefined;
			if (!started) await this.deps.storage.delete([storageKey]);
			throw error;
		}
	}

	private async pruneIdempotency(): Promise<void> {
		const records = await this.deps.storage.list<IdempotencyRecord>('idem:');
		const cutoff = this.now().getTime() - IDEMPOTENCY_TTL_MS;
		const expired = [...records].filter(([, r]) => r.at < cutoff).map(([k]) => k);
		if (expired.length) await this.deps.storage.delete(expired);
	}
}
