import type { AnalyticsEvent, Property } from './types.js';
import { processEventBatch, type D1Database } from './server.js';

type LeadStage = 'awareness' | 'consideration' | 'decision' | 'won' | 'lost';
type LeadSource = 'linkedin' | 'website' | 'referral' | 'cold' | 'event' | 'other' | 'abundance';

interface LeadDatabase {
	prepare(query: string): {
		bind(...args: unknown[]): {
			first<T = unknown>(): Promise<T | null>;
			run(): Promise<unknown>;
		};
	};
}

interface ConversionContext {
	userAgent?: string;
	ipCountry?: string;
}

export interface ServerConversionInput {
	property: Property;
	action: string;
	sessionId?: string | null;
	userId?: string | null;
	sourceProperty?: Property | null;
	url: string;
	referrer?: string | null;
	target?: string | null;
	value?: number | null;
	metadata?: Record<string, unknown>;
	timestamp?: string;
}

export interface WarmLeadInput {
	name: string;
	email?: string | null;
	company?: string | null;
	source?: LeadSource;
	sourceDetail?: string | null;
	campaign?: string | null;
	stage?: LeadStage;
	estimatedValue?: number | null;
	serviceInterest?: string | null;
	discoveryCallAt?: string | null;
	notes?: string | null;
	touchedAt?: string;
}

const stageRank: Record<Exclude<LeadStage, 'lost'>, number> = {
	awareness: 0,
	consideration: 1,
	decision: 2,
	won: 3
};

function createId(prefix: string): string {
	const random =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID().slice(0, 8)
			: Math.random().toString(36).slice(2, 10);
	return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function chooseStage(current: LeadStage | null | undefined, next: LeadStage): LeadStage {
	if (!current) return next;
	if (current === 'won' || current === 'lost') return current;
	if (next === 'lost') return next;
	if (next === 'won') return next;
	return stageRank[next] > stageRank[current] ? next : current;
}

function mergeNotes(existing: string | null | undefined, next: string | null | undefined): string | null {
	const trimmedNext = next?.trim();
	if (!trimmedNext) return existing ?? null;
	if (!existing) return trimmedNext;
	if (existing.includes(trimmedNext)) return existing;
	return `${existing}\n\n${trimmedNext}`;
}

export async function recordServerConversion(
	db: D1Database,
	input: ServerConversionInput,
	context: ConversionContext = {}
) {
	const timestamp = input.timestamp ?? new Date().toISOString();
	const event: AnalyticsEvent = {
		eventId: createId('conv'),
		sessionId: input.sessionId || createId('server_session'),
		userId: input.userId ?? undefined,
		property: input.property,
		sourceProperty: input.sourceProperty ?? undefined,
		timestamp,
		url: input.url,
		referrer: input.referrer ?? undefined,
		category: 'conversion',
		action: input.action,
		target: input.target ?? undefined,
		value: input.value ?? undefined,
		metadata: input.metadata
	};

	return processEventBatch(
		db,
		{
			events: [event],
			sentAt: timestamp
		},
		context
	);
}

export async function upsertWarmLead(db: LeadDatabase, input: WarmLeadInput) {
	const now = input.touchedAt ?? new Date().toISOString();
	const stage = input.stage ?? 'consideration';
	const source = input.source ?? 'website';
	const email = input.email?.trim().toLowerCase() || null;

	if (email) {
		const existing = await db
			.prepare('SELECT id, stage, notes FROM leads WHERE lower(email) = lower(?) LIMIT 1')
			.bind(email)
			.first<{ id: string; stage: LeadStage | null; notes: string | null }>();

		if (existing) {
			const nextStage = chooseStage(existing.stage, stage);
			const notes = mergeNotes(existing.notes, input.notes);

			await db
				.prepare(
					`UPDATE leads
					 SET name = COALESCE(NULLIF(?, ''), name),
					     email = COALESCE(?, email),
					     company = COALESCE(NULLIF(?, ''), company),
					     source = COALESCE(source, ?),
					     source_detail = COALESCE(?, source_detail),
					     campaign = COALESCE(?, campaign),
					     stage = ?,
					     estimated_value = COALESCE(?, estimated_value),
					     service_interest = COALESCE(?, service_interest),
					     discovery_call_at = COALESCE(?, discovery_call_at),
					     last_touch_at = ?,
					     notes = ?,
					     updated_at = ?
					 WHERE id = ?`
				)
				.bind(
					input.name,
					email,
					input.company ?? null,
					source,
					input.sourceDetail ?? null,
					input.campaign ?? null,
					nextStage,
					input.estimatedValue ?? null,
					input.serviceInterest ?? null,
					input.discoveryCallAt ?? null,
					now,
					notes,
					now,
					existing.id
				)
				.run();

			return { id: existing.id, created: false, stage: nextStage };
		}
	}

	const id = createId('lead');
	await db
		.prepare(
			`INSERT INTO leads (
				id, name, email, company,
				source, source_detail, campaign, stage,
				estimated_value, service_interest,
				first_touch_at, last_touch_at, discovery_call_at, notes,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			input.name,
			email,
			input.company ?? null,
			source,
			input.sourceDetail ?? null,
			input.campaign ?? null,
			stage,
			input.estimatedValue ?? null,
			input.serviceInterest ?? null,
			now,
			now,
			input.discoveryCallAt ?? null,
			input.notes ?? null,
			now,
			now
		)
		.run();

	return { id, created: true, stage };
}
