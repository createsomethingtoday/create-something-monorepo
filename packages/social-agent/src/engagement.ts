/**
 * Engagement Automation
 *
 * Monitors and responds to social engagement:
 * - Track replies to our posts
 * - Monitor mentions
 * - Auto-react to relevant content
 * - Generate follow-up based on performance
 */

import type { Platform, IdeaCandidate } from './types';

// =============================================================================
// Types
// =============================================================================

export interface Engagement {
	id: string;
	platform: Platform;
	type: 'reply' | 'mention' | 'like' | 'repost' | 'quote';
	postId: string; // Our original post ID
	engagerId: string;
	engagerName?: string;
	content?: string; // For replies/quotes
	createdAt: number;
	processed: boolean;
	response?: string;
}

export interface EngagementStats {
	platform: Platform;
	postId: string;
	likes: number;
	replies: number;
	reposts: number;
	quotes: number;
	impressions?: number;
	engagementRate?: number;
}

export interface EngagementRule {
	name: string;
	condition: (engagement: Engagement) => boolean;
	action: 'reply' | 'like' | 'ignore' | 'escalate';
	priority: number;
}

// =============================================================================
// Engagement Manager
// =============================================================================

export class EngagementManager {
	private rules: EngagementRule[] = [];
	private db: D1Database;

	constructor(db: D1Database) {
		this.db = db;
		this.initDefaultRules();
	}

	/**
	 * Initialize default engagement rules
	 */
	private initDefaultRules(): void {
		this.rules = [
			// High-priority: Questions about our methodology
			{
				name: 'methodology-question',
				condition: (e) =>
					e.type === 'reply' &&
					/\?|how|what|why|explain|tell me/i.test(e.content || ''),
				action: 'reply',
				priority: 90
			},
			// High-priority: Positive mentions
			{
				name: 'positive-mention',
				condition: (e) =>
					e.type === 'mention' &&
					/great|awesome|helpful|thanks|love|amazing/i.test(e.content || ''),
				action: 'like',
				priority: 80
			},
			// Medium-priority: Constructive feedback
			{
				name: 'constructive-feedback',
				condition: (e) =>
					e.type === 'reply' &&
					/but|however|disagree|different|alternative/i.test(e.content || ''),
				action: 'escalate', // Human review
				priority: 70
			},
			// Low-priority: Simple acknowledgments
			{
				name: 'simple-acknowledgment',
				condition: (e) =>
					e.type === 'reply' &&
					(e.content?.length || 0) < 50 &&
					!/\?/.test(e.content || ''),
				action: 'like',
				priority: 30
			},
			// Ignore: Low-effort engagement
			{
				name: 'low-effort',
				condition: (e) =>
					e.type === 'reply' &&
					/^(nice|cool|good|ok|👍|🔥|💯)$/i.test((e.content || '').trim()),
				action: 'ignore',
				priority: 10
			}
		];

		// Sort by priority (highest first)
		this.rules.sort((a, b) => b.priority - a.priority);
	}

	/**
	 * Add a custom engagement rule
	 */
	addRule(rule: EngagementRule): void {
		this.rules.push(rule);
		this.rules.sort((a, b) => b.priority - a.priority);
	}

	/**
	 * Process an engagement according to rules
	 */
	async processEngagement(engagement: Engagement): Promise<{
		action: 'reply' | 'like' | 'ignore' | 'escalate';
		rule: string;
		response?: string;
	}> {
		// Find first matching rule
		for (const rule of this.rules) {
			if (rule.condition(engagement)) {
				// Generate response if needed
				let response: string | undefined;

				if (rule.action === 'reply') {
					response = await this.generateResponse(engagement);
				}

				// Record the processing
				await this.recordEngagement(engagement, rule.name, rule.action, response);

				return {
					action: rule.action,
					rule: rule.name,
					response
				};
			}
		}

		// Default: ignore
		return { action: 'ignore', rule: 'default' };
	}

	/**
	 * Generate a response to an engagement
	 * This would call the content generator with engagement context
	 */
	private async generateResponse(engagement: Engagement): Promise<string> {
		// Placeholder - in production, this would call Claude
		// For now, return a template response

		if (/how/i.test(engagement.content || '')) {
			return "Great question! I'd be happy to explain. The key is...";
		}

		if (/why/i.test(engagement.content || '')) {
			return "The reasoning behind this is...";
		}

		return "Thanks for engaging! Here's more context...";
	}

	/**
	 * Record engagement processing for audit
	 */
	private async recordEngagement(
		engagement: Engagement,
		ruleName: string,
		action: string,
		response?: string
	): Promise<void> {
		await this.db
			.prepare(
				`INSERT INTO social_engagements (id, platform, type, post_id, engager_id, content, rule_matched, action_taken, response, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				engagement.id,
				engagement.platform,
				engagement.type,
				engagement.postId,
				engagement.engagerId,
				engagement.content ?? null,
				ruleName,
				action,
				response ?? null,
				engagement.createdAt
			)
			.run();
	}

	/**
	 * Get engagement stats for a post
	 */
	async getPostStats(postId: string, platform: Platform): Promise<EngagementStats> {
		const result = await this.db
			.prepare(
				`SELECT 
					type, COUNT(*) as count
				 FROM social_engagements
				 WHERE post_id = ? AND platform = ?
				 GROUP BY type`
			)
			.bind(postId, platform)
			.all<{ type: string; count: number }>();

		const stats: EngagementStats = {
			platform,
			postId,
			likes: 0,
			replies: 0,
			reposts: 0,
			quotes: 0
		};

		for (const row of result.results) {
			if (row.type === 'like') stats.likes = row.count;
			if (row.type === 'reply') stats.replies = row.count;
			if (row.type === 'repost') stats.reposts = row.count;
			if (row.type === 'quote') stats.quotes = row.count;
		}

		return stats;
	}

	/**
	 * Get high-performing posts for follow-up content
	 */
	async getHighPerformers(
		minEngagement: number = 10,
		platform?: Platform
	): Promise<{ postId: string; platform: Platform; totalEngagement: number }[]> {
		let query = `
			SELECT post_id, platform, COUNT(*) as total
			FROM social_engagements
			GROUP BY post_id, platform
			HAVING COUNT(*) >= ?
			ORDER BY total DESC
			LIMIT 10
		`;

		const params: (string | number)[] = [minEngagement];

		if (platform) {
			query = query.replace('GROUP BY', 'WHERE platform = ? GROUP BY');
			params.unshift(platform);
		}

		const result = await this.db
			.prepare(query)
			.bind(...params)
			.all<{ post_id: string; platform: string; total: number }>();

		return result.results.map((row) => ({
			postId: row.post_id,
			platform: row.platform as Platform,
			totalEngagement: row.total
		}));
	}

	/**
	 * Generate follow-up content ideas from high performers
	 */
	async generateFollowUpIdeas(): Promise<IdeaCandidate[]> {
		const highPerformers = await this.getHighPerformers(10);
		const ideas: IdeaCandidate[] = [];

		for (const post of highPerformers) {
			// Get engagement context
			const stats = await this.getPostStats(post.postId, post.platform);

			// Get common questions from replies
			const questions = await this.db
				.prepare(
					`SELECT content FROM social_engagements
					 WHERE post_id = ? AND type = 'reply' AND content LIKE '%?%'
					 LIMIT 5`
				)
				.bind(post.postId)
				.all<{ content: string }>();

			if (questions.results.length > 0) {
				ideas.push({
					source: 'engagement',
					sourceId: `followup:${post.postId}`,
					rawContent: `
High-performing post received these questions:
${questions.results.map((q) => `- ${q.content}`).join('\n')}

Engagement: ${stats.likes} likes, ${stats.replies} replies, ${stats.reposts} reposts

Generate a follow-up post that:
- Addresses the most common questions
- Provides deeper insight on the topic
- References the original post's success
					`.trim(),
					suggestedPlatforms: [post.platform],
					priority: 75,
					metadata: {
						originalPostId: post.postId,
						engagement: stats
					}
				});
			}
		}

		return ideas;
	}

	/**
	 * Get pending escalations for human review
	 */
	async getPendingEscalations(): Promise<Engagement[]> {
		const result = await this.db
			.prepare(
				`SELECT * FROM social_engagements
				 WHERE action_taken = 'escalate' AND processed = 0
				 ORDER BY created_at DESC
				 LIMIT 20`
			)
			.all<EngagementRow>();

		return result.results.map(this.rowToEngagement);
	}

	/**
	 * Mark escalation as handled
	 */
	async resolveEscalation(id: string, response?: string): Promise<void> {
		await this.db
			.prepare(
				`UPDATE social_engagements 
				 SET processed = 1, response = ?
				 WHERE id = ?`
			)
			.bind(response ?? null, id)
			.run();
	}

	/**
	 * Convert database row to Engagement type
	 */
	private rowToEngagement(row: EngagementRow): Engagement {
		return {
			id: row.id,
			platform: row.platform as Platform,
			type: row.type as Engagement['type'],
			postId: row.post_id,
			engagerId: row.engager_id,
			engagerName: row.engager_name ?? undefined,
			content: row.content ?? undefined,
			createdAt: row.created_at,
			processed: row.processed === 1,
			response: row.response ?? undefined
		};
	}
}

// =============================================================================
// Database Types
// =============================================================================

interface EngagementRow {
	id: string;
	platform: string;
	type: string;
	post_id: string;
	engager_id: string;
	engager_name: string | null;
	content: string | null;
	rule_matched: string | null;
	action_taken: string | null;
	response: string | null;
	created_at: number;
	processed: number;
}
