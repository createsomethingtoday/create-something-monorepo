import { DurableObject } from 'cloudflare:workers';
import { AirtableAuthoringStore } from './airtable';
import { requireAuthoringConfig } from './config';
import type { Env } from './config';
import { dispatch } from './dispatch';
import type { WriterEnvelope, WriterOp } from './dispatch';
import { TemplateSearchInventory } from './inventory';
import type { WriterStorage } from './ports';
import { D1ReadModel } from './read-model';
import type { CreatorRef } from './types';
import { StorefrontWriter } from './writer';
import { StorefrontError } from './errors';

const RECORD_ID = /^rec[A-Za-z0-9]{14}$/;

function durableStorage(storage: DurableObjectStorage): WriterStorage {
	return {
		get: (key) => storage.get(key),
		put: (entries) => storage.put(entries),
		delete: async (keys) => {
			await storage.delete(keys);
		},
		list: (prefix) => storage.list({ prefix })
	};
}

/**
 * One instance per Creator (idFromName(creator record ID)). Cloudflare runs
 * at most one instance per ID, which makes this the single writer for that
 * Creator; StorefrontWriter serializes operations inside it.
 */
export class CreatorStorefrontWriter extends DurableObject<Env> {
	private writer: StorefrontWriter | null = null;

	private getWriter(): StorefrontWriter {
		if (this.writer) return this.writer;
		const config = requireAuthoringConfig(this.env);
		const storage = this.ctx.storage;
		this.writer = new StorefrontWriter({
			store: new AirtableAuthoringStore({ apiKey: config.airtableApiKey, apiBaseUrl: config.airtableApiBaseUrl }),
			inventory: new TemplateSearchInventory(config.templateSearchUrl),
			readModel: new D1ReadModel(config.readModel),
			storage: durableStorage(storage),
			allowedCoverOrigins: config.allowedCoverOrigins,
			scheduleReconcile: async (delayMs) => {
				const at = Date.now() + delayMs;
				const current = await storage.getAlarm();
				if (current === null || current > at) await storage.setAlarm(at);
			}
		});
		return this.writer;
	}

	async run(op: WriterOp, creator: CreatorRef, input: Parameters<typeof dispatch>[3]): Promise<WriterEnvelope> {
		// Bound to one Creator on first use; a different Creator can never reuse this writer.
		const bound = await this.ctx.storage.get<CreatorRef>('creator');
		if (!RECORD_ID.test(creator.id) || (bound && bound.id !== creator.id)) {
			const error = new StorefrontError('invariant_violation', 'Writer does not belong to this Creator');
			return { ok: false, status: error.status, body: error.toJSON() };
		}
		try {
			await this.ctx.storage.put('creator', creator);
			return await dispatch(this.getWriter(), op, creator, input);
		} catch (error) {
			const failure =
				error instanceof StorefrontError ? error : new StorefrontError('not_configured', 'Writer could not start', { cause: error });
			return { ok: false, status: failure.status, body: failure.toJSON() };
		}
	}

	/** Reconciler: retries pending intents with backoff (scheduled by the writer). */
	async alarm(): Promise<void> {
		const creator = await this.ctx.storage.get<CreatorRef>('creator');
		if (!creator) return;
		await this.getWriter().reconcile(creator);
	}
}
