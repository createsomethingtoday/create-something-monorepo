/**
 * Social Agent
 *
 * Fully autonomous multi-platform social agent for WORKWAY and CREATE SOMETHING.
 *
 * Philosophy: The agent recedes into transparent operation.
 * When working, you don't think about the agent—you review progress and redirect when needed.
 */

import type {
	SocialAgentConfig,
	AgentState,
	Idea,
	IdeaCandidate,
	Platform,
	Draft,
	DEFAULT_RATE_LIMITS
} from './types';
import { IdeaQueue } from './idea-queue';
import { ContentGenerator } from './generator';
import { ContentReviewer } from './reviewer';
import { SourceMonitorManager } from './sources';

export class SocialAgent {
	private config: Required<SocialAgentConfig>;
	private ideaQueue: IdeaQueue;
	private generator: ContentGenerator;
	private reviewer: ContentReviewer;
	private sourceMonitors: SourceMonitorManager;
	private state: AgentState;

	constructor(config: SocialAgentConfig) {
		this.config = {
			...config,
			model: config.model ?? 'claude-sonnet-4-20250514',
			voiceThreshold: config.voiceThreshold ?? 85,
			maxRevisions: config.maxRevisions ?? 3,
			rateLimits: config.rateLimits ?? { linkedin: 1, twitter: 5 }
		};

		this.ideaQueue = new IdeaQueue(config.db);
		this.generator = new ContentGenerator({
			anthropicApiKey: config.anthropicApiKey,
			model: this.config.model,
			maxRevisions: this.config.maxRevisions,
			voiceThreshold: this.config.voiceThreshold
		});
		this.reviewer = new ContentReviewer(this.config.voiceThreshold);
		this.sourceMonitors = new SourceMonitorManager();

		this.state = {
			paused: false,
			lastRun: 0,
			postsToday: { linkedin: 0, twitter: 0 },
			errors: []
		};
	}

	/**
	 * Check if agent is paused via Beads emergency stop
	 */
	async isPaused(): Promise<boolean> {
		// Check for social-pause Beads issue
		const pauseFlag = await this.config.kv.get('social-agent:paused');
		return pauseFlag === 'true' || this.state.paused;
	}

	/**
	 * Pause agent operation
	 */
	async pause(): Promise<void> {
		await this.config.kv.put('social-agent:paused', 'true');
		this.state.paused = true;
	}

	/**
	 * Resume agent operation
	 */
	async resume(): Promise<void> {
		await this.config.kv.delete('social-agent:paused');
		this.state.paused = false;
	}

	/**
	 * Add a manual idea to the queue
	 */
	async addIdea(candidate: Omit<IdeaCandidate, 'source' | 'sourceId'> & { source?: 'manual' }): Promise<Idea> {
		return this.ideaQueue.add({
			source: 'manual',
			sourceId: `manual-${Date.now()}`,
			...candidate,
			suggestedPlatforms: candidate.suggestedPlatforms ?? ['linkedin']
		});
	}

	/**
	 * Poll all source monitors and add new ideas
	 */
	async pollSources(): Promise<IdeaCandidate[]> {
		if (await this.isPaused()) {
			return [];
		}

		const candidates = await this.sourceMonitors.pollAll();

		for (const candidate of candidates) {
			// Check if we already have this idea (by sourceId)
			const existing = await this.ideaQueue.findBySourceId(candidate.sourceId);
			if (!existing) {
				await this.ideaQueue.add(candidate);
			}
		}

		return candidates;
	}

	/**
	 * Process the next idea in the queue
	 *
	 * Flow: raw → drafted → reviewed → scheduled
	 */
	async processNextIdea(): Promise<{ idea: Idea; drafts: Draft[] } | null> {
		if (await this.isPaused()) {
			return null;
		}

		// Get next raw or failed idea
		const idea = await this.ideaQueue.getNext();
		if (!idea) {
			return null;
		}

		const drafts: Draft[] = [];

		for (const platform of idea.platforms) {
			// Check rate limits
			if (this.state.postsToday[platform] >= this.config.rateLimits[platform]) {
				continue;
			}

			// Generate content
			const result = await this.generator.generate({
				idea,
				platform,
				voiceRules: await this.loadVoiceRules(),
				platformGuidelines: (await import('./types')).PLATFORM_GUIDELINES[platform]
			});

			// Review content
			const review = this.reviewer.review(result.draft.content, platform);
			result.draft.voiceScore = review.score;
			result.draft.voiceViolations = review.violations;

			if (review.passed) {
				// Ready for scheduling
				await this.ideaQueue.updateStatus(idea.id, 'reviewed');
				drafts.push(result.draft);
			} else if (result.draft.revisionCount >= this.config.maxRevisions) {
				// Max revisions reached, mark as rejected
				await this.ideaQueue.updateStatus(idea.id, 'rejected');
				this.state.errors.push({
					timestamp: Date.now(),
					phase: 'review',
					message: `Failed voice validation after ${result.draft.revisionCount} revisions`,
					ideaId: idea.id
				});
			} else {
				// Needs revision - will be picked up again
				await this.ideaQueue.updateStatus(idea.id, 'drafted');
			}

			// Store draft
			await this.ideaQueue.saveDraft(result.draft);
		}

		return { idea, drafts };
	}

	/**
	 * Process all pending ideas
	 */
	async processAllIdeas(): Promise<{ processed: number; scheduled: number }> {
		let processed = 0;
		let scheduled = 0;

		let result = await this.processNextIdea();
		while (result) {
			processed++;
			scheduled += result.drafts.filter((d) => d.voiceScore >= this.config.voiceThreshold).length;
			result = await this.processNextIdea();
		}

		return { processed, scheduled };
	}

	/**
	 * Get current agent state
	 */
	getState(): AgentState {
		return { ...this.state };
	}

	/**
	 * Get queue statistics
	 */
	async getQueueStats(): Promise<{
		raw: number;
		drafted: number;
		reviewed: number;
		scheduled: number;
		posted: number;
		rejected: number;
	}> {
		return this.ideaQueue.getStats();
	}

	/**
	 * Load voice rules from skill file
	 */
	private async loadVoiceRules(): Promise<string> {
		// In production, this would read from the skill file
		// For now, return the core rules inline
		return `
# Voice Validator Rules

## The Five Principles

1. **Clarity Over Cleverness**: Serve the reader. No jargon that excludes.
2. **Specificity Over Generality**: Every claim must be measurable. Numbers, baselines, evidence.
3. **Honesty Over Polish**: Document failures alongside successes.
4. **Useful Over Interesting**: Actionable takeaways, reproducibility.
5. **Grounded Over Trendy**: Connect to timeless principles.

## Forbidden Patterns

cutting-edge, revolutionary, game-changing, leverage, synergy,
solutions, best-in-class, world-class, industry-leading,
transformative, innovative, seamless, robust, scalable

## Required for Social Posts

- Lead with outcome or hook
- Specific metrics over vague claims
- Philosophy as anchor, not lead
- Active voice
- Short declarative sentences
`;
	}
}

// Re-export types and utilities
export * from './types';
export { IdeaQueue } from './idea-queue';
export { ContentGenerator } from './generator';
export { ContentReviewer, defaultReviewer } from './reviewer';
export { SourceMonitorManager, RepoActivityMonitor, PaperMonitor, ExternalMonitor } from './sources';
export { EngagementManager } from './engagement';
export type { Engagement, EngagementStats, EngagementRule } from './engagement';
