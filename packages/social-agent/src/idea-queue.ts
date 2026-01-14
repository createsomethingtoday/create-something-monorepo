/**
 * Idea Queue
 *
 * D1-backed queue for managing content ideas from raw capture through publication.
 * Supports priority-based processing and status tracking.
 */

import type { Idea, IdeaCandidate, IdeaStatus, Draft, Platform } from './types';

export class IdeaQueue {
	constructor(private db: D1Database) {}

	/**
	 * Generate a unique idea ID
	 */
	private generateId(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2, 8);
		return `idea_${timestamp}_${random}`;
	}

	/**
	 * Generate a unique draft ID
	 */
	private generateDraftId(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2, 8);
		return `draft_${timestamp}_${random}`;
	}

	/**
	 * Add a new idea to the queue
	 */
	async add(candidate: IdeaCandidate): Promise<Idea> {
		const id = this.generateId();
		const now = Date.now();

		const idea: Idea = {
			id,
			source: candidate.source,
			sourceId: candidate.sourceId,
			rawContent: candidate.rawContent,
			platforms: candidate.suggestedPlatforms,
			status: 'raw',
			priority: candidate.priority,
			createdAt: now,
			updatedAt: now,
			metadata: candidate.metadata
		};

		await this.db
			.prepare(
				`INSERT INTO social_ideas (id, source, source_id, raw_content, platforms, status, priority, created_at, updated_at, metadata)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				idea.id,
				idea.source,
				idea.sourceId ?? null,
				idea.rawContent,
				JSON.stringify(idea.platforms),
				idea.status,
				idea.priority,
				idea.createdAt,
				idea.updatedAt,
				idea.metadata ? JSON.stringify(idea.metadata) : null
			)
			.run();

		return idea;
	}

	/**
	 * Get the next idea to process (highest priority, oldest first)
	 */
	async getNext(): Promise<Idea | null> {
		const result = await this.db
			.prepare(
				`SELECT * FROM social_ideas 
				 WHERE status IN ('raw', 'drafted')
				 ORDER BY priority DESC, created_at ASC
				 LIMIT 1`
			)
			.first<IdeaRow>();

		if (!result) return null;

		return this.rowToIdea(result);
	}

	/**
	 * Get an idea by ID
	 */
	async get(id: string): Promise<Idea | null> {
		const result = await this.db
			.prepare(`SELECT * FROM social_ideas WHERE id = ?`)
			.bind(id)
			.first<IdeaRow>();

		if (!result) return null;

		return this.rowToIdea(result);
	}

	/**
	 * Find an idea by source ID (for deduplication)
	 */
	async findBySourceId(sourceId: string): Promise<Idea | null> {
		const result = await this.db
			.prepare(`SELECT * FROM social_ideas WHERE source_id = ?`)
			.bind(sourceId)
			.first<IdeaRow>();

		if (!result) return null;

		return this.rowToIdea(result);
	}

	/**
	 * Update idea status
	 */
	async updateStatus(id: string, status: IdeaStatus): Promise<void> {
		await this.db
			.prepare(`UPDATE social_ideas SET status = ?, updated_at = ? WHERE id = ?`)
			.bind(status, Date.now(), id)
			.run();
	}

	/**
	 * Update idea priority
	 */
	async updatePriority(id: string, priority: number): Promise<void> {
		await this.db
			.prepare(`UPDATE social_ideas SET priority = ?, updated_at = ? WHERE id = ?`)
			.bind(Math.max(0, Math.min(100, priority)), Date.now(), id)
			.run();
	}

	/**
	 * Save a draft for an idea
	 */
	async saveDraft(draft: Omit<Draft, 'id' | 'createdAt'>): Promise<Draft> {
		const id = this.generateDraftId();
		const now = Date.now();

		const fullDraft: Draft = {
			...draft,
			id,
			createdAt: now
		};

		await this.db
			.prepare(
				`INSERT INTO social_drafts (id, idea_id, platform, content, voice_score, voice_violations, revision_count, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				fullDraft.id,
				fullDraft.ideaId,
				fullDraft.platform,
				fullDraft.content,
				fullDraft.voiceScore,
				JSON.stringify(fullDraft.voiceViolations),
				fullDraft.revisionCount,
				fullDraft.createdAt
			)
			.run();

		return fullDraft;
	}

	/**
	 * Get the latest draft for an idea and platform
	 */
	async getLatestDraft(ideaId: string, platform: Platform): Promise<Draft | null> {
		const result = await this.db
			.prepare(
				`SELECT * FROM social_drafts 
				 WHERE idea_id = ? AND platform = ?
				 ORDER BY created_at DESC
				 LIMIT 1`
			)
			.bind(ideaId, platform)
			.first<DraftRow>();

		if (!result) return null;

		return this.rowToDraft(result);
	}

	/**
	 * Get all drafts for an idea
	 */
	async getDrafts(ideaId: string): Promise<Draft[]> {
		const results = await this.db
			.prepare(`SELECT * FROM social_drafts WHERE idea_id = ? ORDER BY created_at DESC`)
			.bind(ideaId)
			.all<DraftRow>();

		return results.results.map(this.rowToDraft);
	}

	/**
	 * Get queue statistics
	 */
	async getStats(): Promise<{
		raw: number;
		drafted: number;
		reviewed: number;
		scheduled: number;
		posted: number;
		rejected: number;
	}> {
		const results = await this.db
			.prepare(
				`SELECT status, COUNT(*) as count 
				 FROM social_ideas 
				 GROUP BY status`
			)
			.all<{ status: IdeaStatus; count: number }>();

		const stats = {
			raw: 0,
			drafted: 0,
			reviewed: 0,
			scheduled: 0,
			posted: 0,
			rejected: 0
		};

		for (const row of results.results) {
			if (row.status in stats) {
				stats[row.status as keyof typeof stats] = row.count;
			}
		}

		return stats;
	}

	/**
	 * Get ideas by status
	 */
	async getByStatus(status: IdeaStatus, limit = 50): Promise<Idea[]> {
		const results = await this.db
			.prepare(
				`SELECT * FROM social_ideas 
				 WHERE status = ?
				 ORDER BY priority DESC, created_at ASC
				 LIMIT ?`
			)
			.bind(status, limit)
			.all<IdeaRow>();

		return results.results.map(this.rowToIdea);
	}

	/**
	 * Delete an idea and its drafts
	 */
	async delete(id: string): Promise<void> {
		// Drafts are CASCADE deleted
		await this.db.prepare(`DELETE FROM social_ideas WHERE id = ?`).bind(id).run();
	}

	/**
	 * Convert database row to Idea type
	 */
	private rowToIdea(row: IdeaRow): Idea {
		return {
			id: row.id,
			source: row.source as Idea['source'],
			sourceId: row.source_id ?? undefined,
			rawContent: row.raw_content,
			platforms: JSON.parse(row.platforms) as Platform[],
			status: row.status as IdeaStatus,
			priority: row.priority,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			metadata: row.metadata ? JSON.parse(row.metadata) : undefined
		};
	}

	/**
	 * Convert database row to Draft type
	 */
	private rowToDraft(row: DraftRow): Draft {
		return {
			id: row.id,
			ideaId: row.idea_id,
			platform: row.platform as Platform,
			content: row.content,
			voiceScore: row.voice_score,
			voiceViolations: row.voice_violations ? JSON.parse(row.voice_violations) : [],
			revisionCount: row.revision_count,
			createdAt: row.created_at
		};
	}
}

// =============================================================================
// Database Row Types
// =============================================================================

interface IdeaRow {
	id: string;
	source: string;
	source_id: string | null;
	raw_content: string;
	platforms: string;
	status: string;
	priority: number;
	created_at: number;
	updated_at: number;
	metadata: string | null;
}

interface DraftRow {
	id: string;
	idea_id: string;
	platform: string;
	content: string;
	voice_score: number;
	voice_violations: string | null;
	revision_count: number;
	reasoning: string | null;
	tokens_used: number | null;
	created_at: number;
}
