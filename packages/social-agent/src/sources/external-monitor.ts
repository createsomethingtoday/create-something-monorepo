/**
 * External Monitor
 *
 * Watches external sources for content triggers:
 * - News mentions of CREATE SOMETHING or WORKWAY
 * - Competitor posts (for response opportunities)
 * - Industry news (for commentary)
 * - RSS feeds of relevant publications
 */

import type { SourceMonitor, IdeaCandidate } from '../types';

// Keywords to watch for in external sources
const WATCH_KEYWORDS = [
	'create something',
	'workway',
	'subtractive triad',
	'ai-native development',
	'claude code',
	'ai coding assistant',
	'llm partnership'
];

// RSS feeds to monitor
const RSS_FEEDS = [
	{ url: 'https://simonwillison.net/atom/everything/', name: 'Simon Willison', priority: 60 },
	{ url: 'https://www.anthropic.com/feed', name: 'Anthropic Blog', priority: 80 },
	{ url: 'https://openai.com/blog/rss/', name: 'OpenAI Blog', priority: 70 }
];

export class ExternalMonitor implements SourceMonitor {
	name = 'external';
	private lastChecked: Map<string, number> = new Map();

	/**
	 * Poll external sources
	 *
	 * In production, this would:
	 * 1. Fetch RSS feeds
	 * 2. Check for mentions via search APIs
	 * 3. Parse and filter for relevant content
	 */
	async poll(): Promise<IdeaCandidate[]> {
		// In a Cloudflare Worker, we'd fetch RSS feeds here
		// For now, return empty - external triggers come via webhooks
		return [];
	}

	/**
	 * Analyze an external mention
	 * Called when a mention is detected (via webhook, RSS, or manual input)
	 */
	analyzeMention(mention: MentionInfo): IdeaCandidate | null {
		// Determine relevance
		const relevance = this.calculateRelevance(mention);
		if (relevance < 30) {
			return null; // Not relevant enough
		}

		const priority = this.calculatePriority(mention, relevance);

		return {
			source: 'external',
			sourceId: `mention:${mention.id || Date.now()}`,
			rawContent: this.generateRawContent(mention),
			suggestedPlatforms: this.selectPlatforms(mention),
			priority,
			metadata: {
				type: mention.type,
				source: mention.sourceName,
				url: mention.url,
				author: mention.author
			}
		};
	}

	/**
	 * Analyze an RSS feed item
	 */
	analyzeRssItem(item: RssItem, feedName: string): IdeaCandidate | null {
		// Check if item is relevant to our topics
		const isRelevant = WATCH_KEYWORDS.some((keyword) =>
			item.title.toLowerCase().includes(keyword.toLowerCase()) ||
			item.description?.toLowerCase().includes(keyword.toLowerCase())
		);

		if (!isRelevant) {
			return null;
		}

		const feedConfig = RSS_FEEDS.find((f) => f.name === feedName);
		const basePriority = feedConfig?.priority || 50;

		return {
			source: 'external',
			sourceId: `rss:${item.guid || item.link}`,
			rawContent: this.generateRssContent(item, feedName),
			suggestedPlatforms: ['linkedin', 'twitter'],
			priority: basePriority,
			metadata: {
				type: 'rss',
				source: feedName,
				url: item.link,
				publishedAt: item.pubDate
			}
		};
	}

	/**
	 * Calculate relevance score for a mention
	 */
	private calculateRelevance(mention: MentionInfo): number {
		let relevance = 0;

		// Direct mention of our brands
		if (/create\s*something|workway/i.test(mention.content)) {
			relevance += 50;
		}

		// Mention of our concepts
		if (/subtractive\s*triad|zuhandenheit|ai-native/i.test(mention.content)) {
			relevance += 40;
		}

		// Mention of related tools
		if (/claude\s*code|anthropic|cursor/i.test(mention.content)) {
			relevance += 20;
		}

		// High-profile author
		if (mention.authorFollowers && mention.authorFollowers > 10000) {
			relevance += 15;
		}

		return Math.min(100, relevance);
	}

	/**
	 * Calculate priority for a mention
	 */
	private calculatePriority(mention: MentionInfo, relevance: number): number {
		let priority = relevance;

		// Boost for positive sentiment
		if (mention.sentiment === 'positive') {
			priority += 10;
		}

		// Boost for question/engagement opportunity
		if (/\?|how|what|why|curious/i.test(mention.content)) {
			priority += 15;
		}

		// Boost for recent mentions (recency matters for engagement)
		const hoursSinceMention = mention.publishedAt
			? (Date.now() - new Date(mention.publishedAt).getTime()) / (1000 * 60 * 60)
			: 24;

		if (hoursSinceMention < 6) {
			priority += 20;
		} else if (hoursSinceMention < 24) {
			priority += 10;
		}

		return Math.min(100, priority);
	}

	/**
	 * Select platforms based on mention characteristics
	 */
	private selectPlatforms(mention: MentionInfo): ('linkedin' | 'twitter')[] {
		// If mention is from Twitter, respond on Twitter
		if (mention.platform === 'twitter') {
			return ['twitter'];
		}

		// If it's industry news, use both
		if (mention.type === 'news' || mention.type === 'blog') {
			return ['linkedin', 'twitter'];
		}

		// Default to LinkedIn for professional content
		return ['linkedin'];
	}

	/**
	 * Generate raw content from mention
	 */
	private generateRawContent(mention: MentionInfo): string {
		return `
Type: External Mention
Source: ${mention.sourceName}
Platform: ${mention.platform || 'web'}
Author: ${mention.author || 'Unknown'}
URL: ${mention.url}

Original content:
${mention.content}

Generate a response post that:
- Acknowledges the mention professionally
- Adds value beyond just thanking them
- Shares relevant insight or resource
- If it's a question, answers it thoroughly
- If it's criticism, addresses it honestly
`.trim();
	}

	/**
	 * Generate raw content from RSS item
	 */
	private generateRssContent(item: RssItem, feedName: string): string {
		return `
Type: Industry News Commentary
Source: ${feedName}
Title: ${item.title}
URL: ${item.link}
Published: ${item.pubDate || 'Unknown'}

Summary:
${item.description || 'No description available'}

Generate a commentary post that:
- Shares the key insight from this article
- Adds our perspective (Subtractive Triad, AI-native development)
- Connects it to practical advice for the audience
- Doesn't just rehash - adds unique value
`.trim();
	}

	/**
	 * Update last checked timestamp for a source
	 */
	markChecked(sourceName: string): void {
		this.lastChecked.set(sourceName, Date.now());
	}

	/**
	 * Get last checked timestamp
	 */
	getLastChecked(sourceName: string): number | undefined {
		return this.lastChecked.get(sourceName);
	}
}

// =============================================================================
// Types
// =============================================================================

interface MentionInfo {
	id?: string;
	type: 'mention' | 'news' | 'blog' | 'social' | 'forum';
	platform?: 'twitter' | 'linkedin' | 'reddit' | 'hackernews' | 'web';
	sourceName: string;
	author?: string;
	authorFollowers?: number;
	content: string;
	url: string;
	sentiment?: 'positive' | 'negative' | 'neutral';
	publishedAt?: string;
}

interface RssItem {
	title: string;
	link: string;
	description?: string;
	pubDate?: string;
	guid?: string;
}
