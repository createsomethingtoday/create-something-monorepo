/**
 * Social Agent Worker
 *
 * Cloudflare Worker that runs the social agent autonomously.
 * Cron triggers for:
 * - Polling content sources
 * - Processing idea queue
 * - Checking engagements
 *
 * Integrates with Beads for human oversight via bd commands.
 */

import { SocialAgent } from './index';
import { EngagementManager } from './engagement';
import type { Platform } from './types';

interface Env {
	DB: D1Database;
	SESSIONS: KVNamespace;
	ANTHROPIC_API_KEY: string;
	POSTING_QUEUE: Queue<PostMessage>;
}

interface PostMessage {
	postId: string;
	platform: Platform;
	content: string;
	metadata?: Record<string, unknown>;
}

export default {
	/**
	 * Cron handler: Run social agent tasks
	 *
	 * Schedule recommendations:
	 * - Every 15 min: Check for scheduled posts to send
	 * - Every hour: Poll content sources for new ideas
	 * - Every 4 hours: Process idea queue (generate content)
	 * - Every 6 hours: Check engagements and generate follow-ups
	 */
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const agent = new SocialAgent({
			db: env.DB,
			kv: env.SESSIONS,
			anthropicApiKey: env.ANTHROPIC_API_KEY
		});

		// Check if paused via Beads emergency stop
		if (await agent.isPaused()) {
			console.log('[SocialAgent] Paused - skipping scheduled run');
			return;
		}

		// Determine which task to run based on cron trigger
		const trigger = event.cron;

		if (trigger === '*/15 * * * *') {
			// Every 15 min: Send scheduled posts
			await this.sendScheduledPosts(env);
		} else if (trigger === '0 * * * *') {
			// Hourly: Poll sources
			console.log('[SocialAgent] Polling content sources...');
			const candidates = await agent.pollSources();
			console.log(`[SocialAgent] Found ${candidates.length} new ideas`);
		} else if (trigger === '0 */4 * * *') {
			// Every 4 hours: Process queue
			console.log('[SocialAgent] Processing idea queue...');
			const result = await agent.processAllIdeas();
			console.log(`[SocialAgent] Processed ${result.processed} ideas, scheduled ${result.scheduled} posts`);
		} else if (trigger === '0 */6 * * *') {
			// Every 6 hours: Check engagements
			await this.processEngagements(env);
		} else {
			// Default: process queue
			console.log('[SocialAgent] Running default task...');
			await agent.processAllIdeas();
		}
	},

	/**
	 * Send posts that are due
	 */
	async sendScheduledPosts(env: Env): Promise<void> {
		const now = Date.now();

		// Find posts ready to send
		const posts = await env.DB.prepare(
			`SELECT id, platform, content, metadata
			 FROM social_posts
			 WHERE status = 'pending' AND scheduled_for <= ?
			 ORDER BY scheduled_for ASC
			 LIMIT 5`
		)
			.bind(now)
			.all<{ id: string; platform: string; content: string; metadata: string | null }>();

		if (posts.results.length === 0) {
			console.log('[SocialAgent] No posts due');
			return;
		}

		console.log(`[SocialAgent] Queueing ${posts.results.length} posts`);

		for (const post of posts.results) {
			// Queue for processing
			await env.POSTING_QUEUE.send({
				postId: post.id,
				platform: post.platform as Platform,
				content: post.content,
				metadata: post.metadata ? JSON.parse(post.metadata) : undefined
			});

			// Mark as queued
			await env.DB.prepare(`UPDATE social_posts SET status = 'queued' WHERE id = ?`)
				.bind(post.id)
				.run();
		}
	},

	/**
	 * Process engagements (replies, mentions)
	 */
	async processEngagements(env: Env): Promise<void> {
		const manager = new EngagementManager(env.DB);

		// Generate follow-up ideas from high performers
		const followUpIdeas = await manager.generateFollowUpIdeas();
		console.log(`[SocialAgent] Generated ${followUpIdeas.length} follow-up ideas`);

		// Check for pending escalations
		const escalations = await manager.getPendingEscalations();
		if (escalations.length > 0) {
			console.log(`[SocialAgent] ${escalations.length} escalations pending human review`);
			// Could create Beads issue here for human attention
		}
	},

	/**
	 * HTTP handler for manual triggers and status checks
	 */
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		const agent = new SocialAgent({
			db: env.DB,
			kv: env.SESSIONS,
			anthropicApiKey: env.ANTHROPIC_API_KEY
		});

		// Health check
		if (path === '/health') {
			const isPaused = await agent.isPaused();
			return Response.json({
				status: isPaused ? 'paused' : 'running',
				timestamp: new Date().toISOString()
			});
		}

		// Get queue stats
		if (path === '/stats') {
			const stats = await agent.getQueueStats();
			return Response.json(stats);
		}

		// Manual triggers (require auth in production)
		if (path === '/trigger/poll') {
			const candidates = await agent.pollSources();
			return Response.json({ polled: candidates.length });
		}

		if (path === '/trigger/process') {
			const result = await agent.processAllIdeas();
			return Response.json(result);
		}

		// Pause/Resume
		if (path === '/pause' && request.method === 'POST') {
			await agent.pause();
			return Response.json({ status: 'paused' });
		}

		if (path === '/resume' && request.method === 'POST') {
			await agent.resume();
			return Response.json({ status: 'running' });
		}

		// Add manual idea
		if (path === '/ideas' && request.method === 'POST') {
			const body = await request.json() as {
				content: string;
				platforms?: Platform[];
				priority?: number;
			};

			const idea = await agent.addIdea({
				rawContent: body.content,
				suggestedPlatforms: body.platforms ?? ['linkedin'],
				priority: body.priority ?? 50
			});

			return Response.json(idea);
		}

		return new Response('Not Found', { status: 404 });
	},

	/**
	 * Queue handler for posting
	 */
	async queue(batch: MessageBatch<PostMessage>, env: Env): Promise<void> {
		// Delegate to existing social-poster worker logic
		// This would be shared infrastructure
		for (const msg of batch.messages) {
			console.log(`[SocialAgent] Processing queued post: ${msg.body.postId}`);
			// Post processing happens in social-poster worker
			msg.ack();
		}
	}
};
