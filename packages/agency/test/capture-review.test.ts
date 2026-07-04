import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
	buildCaptureReview,
	classifyCaptureRecord,
	deleteCaptureReviewDecision,
	upsertCaptureReviewDecision,
	type CaptureReviewRecord,
} from '../src/lib/server/capture-review.ts';
import { createPublicAtlasCanvasFromStarter } from '../src/lib/atlas/public.ts';

class FakeStatement {
	constructor(
		private readonly tables: Record<string, unknown[]>,
		private readonly sql: string,
		private values: unknown[] = []
	) {}

	bind(...values: unknown[]): FakeStatement {
		this.values = values;
		return this;
	}

	async first<T = unknown>(): Promise<T | null> {
		if (this.sql.includes('sqlite_master')) {
			const table = String(this.values[0] ?? '');
			return (this.tables[table] ? { name: table } : null) as T | null;
		}

		const results = await this.all<T>();
		return results.results?.[0] ?? null;
	}

	async all<T = unknown>(): Promise<{ results: T[] }> {
		const table = Object.keys(this.tables).find((name) => this.sql.includes(`FROM ${name}`));
		if (table === 'capture_review_decisions' && this.sql.includes('WHERE surface = ? AND source_id = ?')) {
			const [surface, sourceId] = this.values;
			const rows = (this.tables.capture_review_decisions ?? []) as Record<string, unknown>[];
			return {
				results: rows.filter((row) => row.surface === surface && row.source_id === sourceId) as T[],
			};
		}
		return { results: (table ? this.tables[table] : []) as T[] };
	}

	async run(): Promise<{ success: true }> {
		if (!this.sql.includes('capture_review_decisions')) {
			return { success: true };
		}
		if (this.sql.includes('DELETE FROM capture_review_decisions')) {
			const [surface, sourceId] = this.values;
			const rows = (this.tables.capture_review_decisions ?? []) as Record<string, unknown>[];
			this.tables.capture_review_decisions = rows.filter(
				(row) => row.surface !== surface || row.source_id !== sourceId
			);
			return { success: true };
		}

		const rows = (this.tables.capture_review_decisions ??= []) as Record<string, unknown>[];
		const [
			id,
			surface,
			source_id,
			email,
			email_hash,
			classification_label,
			confidence,
			recommended_action,
			notes,
			reviewed_by,
			reviewed_at,
			metadata_json,
			created_at,
			updated_at,
		] = this.values;
		const existing = rows.find((row) => row.surface === surface && row.source_id === source_id);
		const next = {
			id: existing?.id ?? id,
			surface,
			source_id,
			email,
			email_hash,
			classification_label,
			confidence,
			recommended_action,
			notes,
			reviewed_by,
			reviewed_at,
			metadata_json,
			created_at: existing?.created_at ?? created_at,
			updated_at,
		};
		if (existing) {
			Object.assign(existing, next);
		} else {
			rows.push(next);
		}
		return { success: true };
	}
}

class FakeD1 {
	constructor(private readonly tables: Record<string, unknown[]>) {}

	prepare(sql: string): FakeStatement {
		return new FakeStatement(this.tables, sql);
	}
}

function atlasHash(email: string): string {
	return crypto.createHash('sha256').update(`email:${email.toLowerCase()}`).digest('hex');
}

function classify(record: Partial<CaptureReviewRecord>) {
	return classifyCaptureRecord({
		id: 'row_1',
		surface: 'newsletter',
		email: null,
		captured_at: '2026-01-01T00:00:00.000Z',
		...record,
	});
}

test('classifies sourced confirmed newsletter rows as actual users', () => {
	const result = classify({
		surface: 'newsletter',
		email: 'carnecky.juraj@gmail.com',
		status: 'active',
		source: 'io',
		source_detail: 'confirmed',
	});

	assert.equal(result.label, 'actual_user');
	assert.equal(result.recommended_action, 'keep');
});

test('classifies explicit tests, fixtures, generated addresses, and spam', () => {
	assert.equal(classify({ email: 'test@example.com' }).label, 'internal_test');
	assert.equal(classify({ surface: 'contact', email: 'alice@techstartup.com' }).label, 'fixture');
	assert.equal(classify({ email: 'ovapeyup695@gmail.com' }).label, 'likely_bot');
	assert.equal(
		classify({
			surface: 'contact',
			email: 'sophie@sendproud.com',
			excerpt: 'I help businesses book meetings through targeted outreach to 100 million contacts.',
		}).label,
		'spam'
	);
});

test('buildCaptureReview matches Atlas warm lead hashes against captured emails', async () => {
	const canvas = createPublicAtlasCanvasFromStarter('marketplace-review-queue');
	const db = new FakeD1({
		newsletter_subscribers: [
			{
				id: 1,
				email: 'micah@createsomething.io',
				status: 'active',
				source: null,
				subscribed_at: '2026-01-01 00:00:00',
				created_at: '2026-01-01 00:00:00',
				updated_at: '2026-01-01 00:00:00',
				confirmed_at: '2026-01-01 00:00:01',
				unsubscribed_at: null,
				bounce_count: 0,
				last_bounce_at: null,
			},
		],
		public_atlas_sessions: [
			{
				id: 'public_atlas_1',
				email_hash: atlasHash('micah@createsomething.io'),
				readiness_slug: 'ready-to-map',
				readiness_score: 84,
				canvas_json: JSON.stringify(canvas),
				summary: 'Atlas public canvas summary',
				source: 'agency-public-atlas',
				created_at: '2026-06-18 15:38:29',
				updated_at: '2026-06-18 17:36:13',
				summary_excerpt: 'Atlas public canvas summary',
			},
		],
	}) as unknown as Parameters<typeof buildCaptureReview>[0];

	const review = await buildCaptureReview(db);
	const atlas = review.records.find((record) => record.surface === 'public_atlas');

	assert.equal(atlas?.matched_email, 'micah@createsomething.io');
	assert.equal(atlas?.classification.label, 'internal_test');
	assert.equal(atlas?.atlas_handoff?.tier, 'mixed');
	assert.equal(atlas?.atlas_handoff?.lane, 'claim-worktree');
	assert.match(atlas?.atlas_handoff?.packet ?? '', /Database:/);
	assert.match(atlas?.atlas_handoff?.packet ?? '', /Automation:/);
	assert.match(atlas?.atlas_handoff?.packet ?? '', /Judgment:/);
	assert.match(atlas?.atlas_handoff?.packet ?? '', /Marketplace review queue/);
	assert.match(atlas?.atlas_handoff?.linear_create_command ?? '', /pnpm linear:create/);
	assert.match(atlas?.atlas_handoff?.linear_create_command ?? '', /code-quality/);
	assert.equal(review.summary.by_surface.newsletter, 1);
	assert.equal(review.summary.by_surface.public_atlas, 1);
	assert.equal(review.decision_storage.available, false);
	assert.equal(review.decision_storage.stored_count, 0);
});

test('buildCaptureReview keeps operational records optional', async () => {
	const db = new FakeD1({
		users: [
			{
				id: 'demo-user-001',
				username: 'demo',
				email: 'demo@createsomething.agency',
				role: 'user',
				created_at: '2026-01-01 00:00:00',
				updated_at: '2026-01-01 00:00:00',
				last_login: null,
			},
		],
	}) as unknown as Parameters<typeof buildCaptureReview>[0];

	const publicOnly = await buildCaptureReview(db);
	const withOperational = await buildCaptureReview(db, { includeOperational: true });

	assert.equal(publicOnly.records.length, 0);
	assert.equal(withOperational.records.length, 1);
	assert.equal(withOperational.records[0]?.surface, 'user');
});

test('stored capture decisions override computed classification', async () => {
	const db = new FakeD1({
		newsletter_subscribers: [
			{
				id: 24,
				email: 'carnecky.juraj@gmail.com',
				status: 'active',
				source: 'io',
				subscribed_at: '2026-05-28 09:30:39',
				created_at: '2026-05-28 09:30:39',
				updated_at: '2026-05-28 09:30:39',
				confirmed_at: '2026-05-28 09:30:53',
				unsubscribed_at: null,
				bounce_count: 0,
				last_bounce_at: null,
			},
		],
		capture_review_decisions: [
			{
				id: 'capture_review_1',
				surface: 'newsletter',
				source_id: '24',
				email: 'carnecky.juraj@gmail.com',
				email_hash: null,
				classification_label: 'actual_user',
				confidence: 'high',
				recommended_action: 'keep',
				notes: 'Confirmed manually.',
				reviewed_by: 'operator@example.com',
				reviewed_at: '2026-06-25T00:00:00.000Z',
				metadata_json: '{}',
				created_at: '2026-06-25T00:00:00.000Z',
				updated_at: '2026-06-25T00:00:00.000Z',
			},
		],
	}) as unknown as Parameters<typeof buildCaptureReview>[0];

	const review = await buildCaptureReview(db);
	const newsletter = review.records.find((record) => record.surface === 'newsletter');

	assert.equal(review.decision_storage.available, true);
	assert.equal(review.decision_storage.stored_count, 1);
	assert.equal(newsletter?.review?.reviewed_by, 'operator@example.com');
	assert.equal(newsletter?.classification.reasons[1], 'Confirmed manually.');
	assert.equal(newsletter?.review?.metadata.computed_classification instanceof Object, true);
});

test('buildCaptureReview filters records by classification, review state, and query', async () => {
	const db = new FakeD1({
		newsletter_subscribers: [
			{
				id: 24,
				email: 'carnecky.juraj@gmail.com',
				status: 'active',
				source: 'io',
				subscribed_at: '2026-05-28 09:30:39',
				created_at: '2026-05-28 09:30:39',
				updated_at: '2026-05-28 09:30:39',
				confirmed_at: '2026-05-28 09:30:53',
				unsubscribed_at: null,
				bounce_count: 0,
				last_bounce_at: null,
			},
			{
				id: 25,
				email: 'ovapeyup695@gmail.com',
				status: 'active',
				source: null,
				subscribed_at: '2026-05-29 09:30:39',
				created_at: '2026-05-29 09:30:39',
				updated_at: '2026-05-29 09:30:39',
				confirmed_at: null,
				unsubscribed_at: null,
				bounce_count: 0,
				last_bounce_at: null,
			},
		],
		capture_review_decisions: [
			{
				id: 'capture_review_1',
				surface: 'newsletter',
				source_id: '24',
				email: 'carnecky.juraj@gmail.com',
				email_hash: null,
				classification_label: 'actual_user',
				confidence: 'high',
				recommended_action: 'keep',
				notes: 'Confirmed manually.',
				reviewed_by: 'operator@example.com',
				reviewed_at: '2026-06-25T00:00:00.000Z',
				metadata_json: '{}',
				created_at: '2026-06-25T00:00:00.000Z',
				updated_at: '2026-06-25T00:00:00.000Z',
			},
		],
	}) as unknown as Parameters<typeof buildCaptureReview>[0];

	const reviewed = await buildCaptureReview(db, { reviewed: 'reviewed' });
	const bots = await buildCaptureReview(db, { classification: 'likely_bot' });
	const queried = await buildCaptureReview(db, { query: 'carnecky' });

	assert.equal(reviewed.records.length, 1);
	assert.equal(reviewed.records[0]?.id, '24');
	assert.equal(bots.records.length, 1);
	assert.equal(bots.records[0]?.email, 'ovapeyup695@gmail.com');
	assert.equal(queried.summary.total, 1);
	assert.equal(queried.summary.unfiltered_total, 2);
});

test('upsertCaptureReviewDecision writes durable operator decisions', async () => {
	const db = new FakeD1({ capture_review_decisions: [] }) as unknown as Parameters<
		typeof upsertCaptureReviewDecision
	>[0];

	const decision = await upsertCaptureReviewDecision(db, {
		surface: 'newsletter',
		sourceId: '24',
		email: 'carnecky.juraj@gmail.com',
		classificationLabel: 'actual_user',
		recommendedAction: 'keep',
		reviewedBy: 'operator@example.com',
		notes: 'Confirmed real subscriber.',
	});

	assert.equal(decision.surface, 'newsletter');
	assert.equal(decision.source_id, '24');
	assert.equal(decision.classification_label, 'actual_user');
	assert.equal(decision.reviewed_by, 'operator@example.com');
});

test('deleteCaptureReviewDecision clears stored operator decisions', async () => {
	const db = new FakeD1({
		capture_review_decisions: [
			{
				id: 'capture_review_1',
				surface: 'newsletter',
				source_id: '24',
				email: 'carnecky.juraj@gmail.com',
				email_hash: null,
				classification_label: 'actual_user',
				confidence: 'high',
				recommended_action: 'keep',
				notes: 'Confirmed manually.',
				reviewed_by: 'operator@example.com',
				reviewed_at: '2026-06-25T00:00:00.000Z',
				metadata_json: '{}',
				created_at: '2026-06-25T00:00:00.000Z',
				updated_at: '2026-06-25T00:00:00.000Z',
			},
		],
	}) as unknown as Parameters<typeof deleteCaptureReviewDecision>[0];

	const result = await deleteCaptureReviewDecision(db, {
		surface: 'newsletter',
		sourceId: '24',
	});

	assert.equal(result.deleted, true);
});
