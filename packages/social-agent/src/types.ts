/**
 * Social Agent Types
 *
 * Core type definitions for the autonomous social posting agent.
 */

// =============================================================================
// Idea Queue Types
// =============================================================================

export type IdeaStatus =
	| 'raw' // Just captured, not yet processed
	| 'drafted' // Content generated
	| 'reviewed' // Passed voice validation
	| 'scheduled' // In the posting queue
	| 'posted' // Successfully published
	| 'failed' // Failed to post
	| 'rejected'; // Failed voice validation after max retries

export type IdeaSource =
	| 'manual' // Direct input via API
	| 'repo' // Git commit or code change
	| 'paper' // New paper or experiment
	| 'external' // News mention, RSS feed
	| 'engagement'; // Follow-up to high-performing post

export type Platform = 'linkedin' | 'twitter';

export interface Idea {
	id: string;
	source: IdeaSource;
	sourceId?: string; // Reference to source (commit hash, paper slug, etc.)
	rawContent: string; // Original idea/trigger content
	platforms: Platform[];
	status: IdeaStatus;
	priority: number; // 0-100, higher = more urgent
	createdAt: number;
	updatedAt: number;
	metadata?: Record<string, unknown>;
}

export interface Draft {
	id: string;
	ideaId: string;
	platform: Platform;
	content: string;
	voiceScore: number; // 0-100 compliance score
	voiceViolations: VoiceViolation[];
	revisionCount: number;
	createdAt: number;
}

export interface VoiceViolation {
	type: 'forbidden' | 'vague' | 'terminology' | 'structure';
	line: number;
	found: string;
	suggestion: string;
	severity: 'error' | 'warning';
}

// =============================================================================
// Content Generation Types
// =============================================================================

export interface GeneratorConfig {
	anthropicApiKey: string;
	model?: string;
	maxRevisions?: number;
	voiceThreshold?: number; // Minimum score to pass (default: 85)
}

export interface GenerationContext {
	idea: Idea;
	platform: Platform;
	recentPosts?: string[]; // Last N posts for style consistency
	voiceRules: string; // From .claude/skills/voice-validator.md
	platformGuidelines: PlatformGuidelines;
}

export interface PlatformGuidelines {
	maxLength: number;
	hashtagLimit: number;
	linkPlacement: 'body' | 'comment';
	formatting: string[];
}

export interface GenerationResult {
	draft: Draft;
	reasoning: string; // Claude's thinking for audit trail
	tokensUsed: number;
}

// =============================================================================
// Source Monitor Types
// =============================================================================

export interface SourceMonitor {
	name: string;
	poll(): Promise<IdeaCandidate[]>;
}

export interface IdeaCandidate {
	source: IdeaSource;
	sourceId: string;
	rawContent: string;
	suggestedPlatforms: Platform[];
	priority: number;
	metadata?: Record<string, unknown>;
}

// =============================================================================
// Review Types
// =============================================================================

export interface ReviewResult {
	passed: boolean;
	score: number;
	violations: VoiceViolation[];
	feedback: string; // For revision guidance
}

// =============================================================================
// Agent Configuration
// =============================================================================

export interface SocialAgentConfig {
	db: D1Database;
	kv: KVNamespace;
	anthropicApiKey: string;
	model?: string;
	voiceThreshold?: number;
	maxRevisions?: number;
	rateLimits?: {
		linkedin: number; // Posts per day
		twitter: number;
	};
}

export interface AgentState {
	paused: boolean;
	lastRun: number;
	postsToday: Record<Platform, number>;
	errors: AgentError[];
}

export interface AgentError {
	timestamp: number;
	phase: 'monitor' | 'generate' | 'review' | 'schedule' | 'post';
	message: string;
	ideaId?: string;
}

// =============================================================================
// Platform-specific Types
// =============================================================================

export const PLATFORM_GUIDELINES: Record<Platform, PlatformGuidelines> = {
	linkedin: {
		maxLength: 3000,
		hashtagLimit: 5,
		linkPlacement: 'comment',
		formatting: [
			'Use bold (**text**) for emphasis',
			'Use bullet points for lists',
			'Add line breaks for readability',
			'Lead with a hook (first 2 lines visible in feed)'
		]
	},
	twitter: {
		maxLength: 280,
		hashtagLimit: 3,
		linkPlacement: 'body',
		formatting: [
			'No markdown - plain text only',
			'Use threads for longer content',
			'First tweet must hook',
			'End threads with clear CTA'
		]
	}
};

// =============================================================================
// Rate Limiting
// =============================================================================

export const DEFAULT_RATE_LIMITS = {
	linkedin: 1, // 1 post per day (LinkedIn penalizes multiple)
	twitter: 5 // 5 tweets per day
};
