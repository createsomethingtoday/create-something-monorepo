/**
 * Content Generator
 *
 * Claude-based content generation following voice canon rules.
 * Generates platform-specific drafts from raw ideas.
 */

import type {
	GeneratorConfig,
	GenerationContext,
	GenerationResult,
	Draft,
	Platform,
	PLATFORM_GUIDELINES
} from './types';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export class ContentGenerator {
	private config: Required<GeneratorConfig>;

	constructor(config: GeneratorConfig) {
		this.config = {
			anthropicApiKey: config.anthropicApiKey,
			model: config.model ?? 'claude-sonnet-4-20250514',
			maxRevisions: config.maxRevisions ?? 3,
			voiceThreshold: config.voiceThreshold ?? 85
		};
	}

	/**
	 * Generate content for an idea on a specific platform
	 */
	async generate(context: GenerationContext): Promise<GenerationResult> {
		const { idea, platform, voiceRules, platformGuidelines, recentPosts } = context;

		// Check for existing draft to continue revision
		const existingDraft = context.idea.metadata?.lastDraft as Draft | undefined;
		const revisionCount = existingDraft?.revisionCount ?? 0;

		const systemPrompt = this.buildSystemPrompt(platform, voiceRules, platformGuidelines);
		const userPrompt = this.buildUserPrompt(idea, platform, existingDraft, recentPosts);

		const response = await fetch(ANTHROPIC_API, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.config.anthropicApiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: this.config.model,
				max_tokens: 2048,
				system: systemPrompt,
				messages: [{ role: 'user', content: userPrompt }]
			})
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Claude API error: ${error}`);
		}

		const result = (await response.json()) as AnthropicResponse;

		// Extract content and reasoning from response
		const fullContent = result.content[0]?.text ?? '';
		const { content, reasoning } = this.parseResponse(fullContent, platform);

		const draft: Draft = {
			id: '', // Will be set by IdeaQueue
			ideaId: idea.id,
			platform,
			content,
			voiceScore: 0, // Will be set by reviewer
			voiceViolations: [],
			revisionCount: revisionCount + 1,
			createdAt: 0 // Will be set by IdeaQueue
		};

		return {
			draft,
			reasoning,
			tokensUsed: (result.usage?.input_tokens ?? 0) + (result.usage?.output_tokens ?? 0)
		};
	}

	/**
	 * Build the system prompt for content generation
	 */
	private buildSystemPrompt(
		platform: Platform,
		voiceRules: string,
		guidelines: typeof PLATFORM_GUIDELINES[Platform]
	): string {
		return `You are a social content generator for CREATE SOMETHING and WORKWAY.

## Your Voice

${voiceRules}

## Platform: ${platform.toUpperCase()}

**Constraints:**
- Maximum length: ${guidelines.maxLength} characters
- Hashtag limit: ${guidelines.hashtagLimit}
- Link placement: ${guidelines.linkPlacement === 'comment' ? 'Put links in a follow-up comment, not the main post' : 'Links can go in the post body'}

**Formatting:**
${guidelines.formatting.map((f) => `- ${f}`).join('\n')}

## Your Task

Generate a social media post that:
1. Follows all voice canon rules
2. Fits the platform constraints
3. Leads with a hook that stops scrolling
4. Provides specific value (metrics, insights, actionable takeaways)
5. Sounds like a human expert, not marketing copy

## Output Format

First, write your reasoning in <thinking> tags.
Then, write the final post content (no markdown headers, just the post text).

Example:
<thinking>
The idea is about reducing scripts. LinkedIn favors longform with specific metrics.
I'll lead with the outcome (155 to 13), then explain the methodology.
</thinking>

Most automation fails because it adds complexity.

We helped Kickstand go from 155 scripts to 13. Here's what happened when we subtracted instead of added.

[rest of post...]`;
	}

	/**
	 * Build the user prompt for content generation
	 */
	private buildUserPrompt(
		idea: GenerationContext['idea'],
		platform: Platform,
		existingDraft?: Draft,
		recentPosts?: string[]
	): string {
		let prompt = `## Idea to Transform

Source: ${idea.source}
Raw content: ${idea.rawContent}

`;

		if (existingDraft) {
			prompt += `## Previous Draft (Revision ${existingDraft.revisionCount})

${existingDraft.content}

**Voice Violations Found:**
${existingDraft.voiceViolations.map((v) => `- ${v.type}: "${v.found}" → ${v.suggestion}`).join('\n') || 'None'}

Please revise to fix these violations while maintaining the core message.

`;
		}

		if (recentPosts && recentPosts.length > 0) {
			prompt += `## Recent Posts (for style consistency)

${recentPosts.slice(0, 3).map((p, i) => `Post ${i + 1}:\n${p.substring(0, 500)}...`).join('\n\n')}

`;
		}

		prompt += `Generate a ${platform} post based on this idea.`;

		return prompt;
	}

	/**
	 * Parse the response to extract content and reasoning
	 */
	private parseResponse(
		fullContent: string,
		platform: Platform
	): { content: string; reasoning: string } {
		// Extract thinking if present
		const thinkingMatch = fullContent.match(/<thinking>([\s\S]*?)<\/thinking>/);
		const reasoning = thinkingMatch ? thinkingMatch[1].trim() : '';

		// Remove thinking tags to get content
		let content = fullContent.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();

		// Clean up any markdown headers Claude might have added
		content = content.replace(/^#+\s+.*$/gm, '').trim();

		// Ensure content fits platform limits
		const limits = {
			linkedin: 3000,
			twitter: 280
		};

		if (content.length > limits[platform]) {
			content = content.substring(0, limits[platform] - 3) + '...';
		}

		return { content, reasoning };
	}

	/**
	 * Generate a thread for Twitter (when content exceeds 280 chars)
	 */
	async generateThread(context: GenerationContext): Promise<GenerationResult[]> {
		if (context.platform !== 'twitter') {
			throw new Error('Thread generation only supported for Twitter');
		}

		// First, generate full content
		const fullContext = {
			...context,
			platformGuidelines: {
				...context.platformGuidelines,
				maxLength: 2000 // Allow longer for threading
			}
		};

		const response = await fetch(ANTHROPIC_API, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.config.anthropicApiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: this.config.model,
				max_tokens: 2048,
				system: this.buildThreadSystemPrompt(context.voiceRules),
				messages: [
					{
						role: 'user',
						content: `Create a Twitter thread from this idea:\n\n${context.idea.rawContent}`
					}
				]
			})
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Claude API error: ${error}`);
		}

		const result = (await response.json()) as AnthropicResponse;
		const fullContent = result.content[0]?.text ?? '';

		// Parse thread tweets
		const tweets = this.parseThread(fullContent);

		return tweets.map((content, index) => ({
			draft: {
				id: '',
				ideaId: context.idea.id,
				platform: 'twitter' as const,
				content,
				voiceScore: 0,
				voiceViolations: [],
				revisionCount: 1,
				createdAt: 0
			},
			reasoning: index === 0 ? `Thread tweet ${index + 1} of ${tweets.length}` : '',
			tokensUsed: Math.floor(((result.usage?.input_tokens ?? 0) + (result.usage?.output_tokens ?? 0)) / tweets.length)
		}));
	}

	/**
	 * Build system prompt for thread generation
	 */
	private buildThreadSystemPrompt(voiceRules: string): string {
		return `You are a Twitter thread generator for CREATE SOMETHING and WORKWAY.

${voiceRules}

## Thread Format

- First tweet: Hook that demands attention (must work standalone)
- Middle tweets: One idea per tweet, building the argument
- Final tweet: Clear takeaway or CTA
- Maximum 280 characters per tweet
- Use 🧵 emoji at start of first tweet to indicate thread
- Number subsequent tweets (2/, 3/, etc.)

## Output Format

Write each tweet on its own line, separated by ---

Example:
🧵 Most automation fails because it adds complexity. Here's what happened when we subtracted instead.

---

2/ Kickstand had 155 automation scripts. We didn't optimize them—we asked which ones actually run.

---

3/ The answer: 13. The other 142 were variations, duplicates, or artifacts from problems that no longer existed.

---

4/ 92% of their codebase was noise masquerading as progress.`;
	}

	/**
	 * Parse thread content into individual tweets
	 */
	private parseThread(content: string): string[] {
		const tweets = content
			.split(/---+/)
			.map((t) => t.trim())
			.filter((t) => t.length > 0 && t.length <= 280);

		// Ensure at least one tweet
		if (tweets.length === 0) {
			return [content.substring(0, 280)];
		}

		return tweets;
	}
}

// =============================================================================
// Anthropic API Types
// =============================================================================

interface AnthropicResponse {
	content: Array<{ type: string; text: string }>;
	usage?: {
		input_tokens: number;
		output_tokens: number;
	};
}
