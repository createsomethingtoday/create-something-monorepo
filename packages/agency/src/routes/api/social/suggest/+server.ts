/**
 * GET /api/social/suggest
 *
 * AI-powered content suggestions based on CREATE SOMETHING methodology.
 * Analyzes patterns, gaps, and available content to suggest what to post.
 *
 * Considers:
 * - Clay playbook weekly rhythm (what's due today)
 * - Recent posts (avoid repetition)
 * - Available content files (what's not yet scheduled)
 * - Methodology pillars (Canon, Subtractive Triad)
 *
 * Agent-native endpoint for intelligent content planning.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Content categories based on CREATE SOMETHING methodology
const CONTENT_CATEGORIES = {
	methodology: {
		name: 'Methodology',
		description: 'Canon, Subtractive Triad, Hermeneutic Circle concepts',
		keywords: ['triad', 'canon', 'rams', 'heidegger', 'weniger', 'zuhandenheit'],
		weight: 1.0
	},
	case_study: {
		name: 'Case Study',
		description: 'Client work, project outcomes, lessons learned',
		keywords: ['kickstand', 'arc', 'viralytics', 'case', 'client', 'project'],
		weight: 0.9
	},
	pattern: {
		name: 'Pattern',
		description: 'Discovered patterns, best practices, technical insights',
		keywords: ['pattern', 'insight', 'discovery', 'learned', 'practice'],
		weight: 0.8
	},
	engagement: {
		name: 'Engagement',
		description: 'Community-focused, questions, discussions',
		keywords: ['question', 'community', 'discussion', 'thoughts', 'opinion'],
		weight: 0.7
	},
	ai_native: {
		name: 'AI Native',
		description: 'AI agent development, MCP tools, automation',
		keywords: ['agent', 'ai', 'mcp', 'automation', 'claude', 'llm'],
		weight: 0.85
	}
};

// Known content files (would ideally scan filesystem, but keeping simple for now)
const KNOWN_CONTENT_FILES = [
	{ filename: 'linkedin-triad.md', title: 'The Subtractive Triad', category: 'methodology' },
	{ filename: 'linkedin-kickstand.md', title: 'Kickstand Case Study', category: 'case_study' },
	{ filename: 'linkedin-arc.md', title: 'Arc Case Study', category: 'case_study' },
	{ filename: 'linkedin-ai-patterns.md', title: 'AI Agent Patterns', category: 'ai_native' },
	{ filename: 'linkedin-discovery-sprint.md', title: 'Two-Week Discovery Sprint', category: 'methodology' },
	{ filename: 'linkedin-year-reflection.md', title: 'Year-End Reflection', category: 'engagement' },
	{ filename: 'linkedin-workway-first-post.md', title: 'WORKWAY Introduction', category: 'ai_native' },
	{ filename: 'linkedin-norvig-partnership.md', title: 'Norvig Partnership', category: 'case_study' }
];

interface Suggestion {
	type: string;
	title: string;
	rationale: string;
	contentFile?: string;
	confidence: number;
	priority: 'high' | 'medium' | 'low';
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const focus = url.searchParams.get('focus'); // Optional filter
	const timezone = 'America/Los_Angeles';
	const now = new Date();

	// Get day of week for rhythm context
	const dayFormatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		weekday: 'long'
	});
	const currentDay = dayFormatter.format(now).toLowerCase();

	// Get recent posts (last 30 days) to avoid repetition
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const recentResult = await db
		.prepare(
			`SELECT content, campaign, scheduled_for
			 FROM social_posts
			 WHERE scheduled_for >= ?
			   AND (status = 'posted' OR status = 'pending')
			 ORDER BY scheduled_for DESC`
		)
		.bind(thirtyDaysAgo.getTime())
		.all<{
			content: string;
			campaign: string | null;
			scheduled_for: number;
		}>();

	const recentPosts = recentResult.results || [];

	// Get scheduled campaigns to avoid duplicating
	const scheduledCampaigns = new Set(
		recentPosts.filter((p) => p.campaign).map((p) => p.campaign)
	);

	// Analyze recent content to find category gaps
	const categoryLastPosted = new Map<string, number>();

	for (const post of recentPosts) {
		const content = post.content.toLowerCase();

		for (const [catKey, catDef] of Object.entries(CONTENT_CATEGORIES)) {
			if (catDef.keywords.some((kw) => content.includes(kw))) {
				if (!categoryLastPosted.has(catKey)) {
					categoryLastPosted.set(catKey, post.scheduled_for);
				}
			}
		}
	}

	// Generate suggestions
	const suggestions: Suggestion[] = [];

	// 1. Suggest based on category gaps
	for (const [catKey, catDef] of Object.entries(CONTENT_CATEGORIES)) {
		if (focus && focus !== catKey) continue;

		const lastPosted = categoryLastPosted.get(catKey);
		const daysSinceLastPost = lastPosted
			? Math.floor((now.getTime() - lastPosted) / (1000 * 60 * 60 * 24))
			: 999;

		// Find available content for this category
		const availableContent = KNOWN_CONTENT_FILES.filter(
			(f) => f.category === catKey && !scheduledCampaigns.has(f.filename.replace('linkedin-', '').replace('.md', ''))
		);

		if (daysSinceLastPost > 14 || !lastPosted) {
			// Category hasn't been covered in 2+ weeks
			const confidence = Math.min(0.95, 0.5 + daysSinceLastPost * 0.02) * catDef.weight;

			if (availableContent.length > 0) {
				suggestions.push({
					type: catKey,
					title: availableContent[0].title,
					rationale: lastPosted
						? `No ${catDef.name.toLowerCase()} content in ${daysSinceLastPost} days`
						: `No ${catDef.name.toLowerCase()} content found in recent history`,
					contentFile: availableContent[0].filename,
					confidence: Math.round(confidence * 100) / 100,
					priority: confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low'
				});
			} else {
				suggestions.push({
					type: catKey,
					title: `New ${catDef.name} Content`,
					rationale: `${catDef.name} gap detected. ${catDef.description}`,
					confidence: Math.round((confidence * 0.7) * 100) / 100,
					priority: 'medium'
				});
			}
		}
	}

	// 2. Rhythm-based suggestions
	const rhythmSuggestion = getRhythmSuggestion(currentDay);
	if (rhythmSuggestion && (!focus || focus === rhythmSuggestion.type)) {
		suggestions.push(rhythmSuggestion);
	}

	// Sort by confidence
	suggestions.sort((a, b) => b.confidence - a.confidence);

	// Limit to top 5
	const topSuggestions = suggestions.slice(0, 5);

	return json({
		dayOfWeek: currentDay,
		focus: focus || 'all',
		recentPostCount: recentPosts.length,
		categoryCoverage: Object.fromEntries(
			Object.keys(CONTENT_CATEGORIES).map((cat) => [
				cat,
				{
					lastPosted: categoryLastPosted.get(cat)
						? new Date(categoryLastPosted.get(cat)!).toISOString().split('T')[0]
						: null,
					daysSince: categoryLastPosted.has(cat)
						? Math.floor((now.getTime() - categoryLastPosted.get(cat)!) / (1000 * 60 * 60 * 24))
						: null
				}
			])
		),
		suggestions: topSuggestions,
		availableContentFiles: KNOWN_CONTENT_FILES.filter(
			(f) => !scheduledCampaigns.has(f.filename.replace('linkedin-', '').replace('.md', ''))
		)
	});
};

function getRhythmSuggestion(day: string): Suggestion | null {
	const rhythmMap: Record<string, { type: string; title: string; rationale: string }> = {
		monday: {
			type: 'pattern',
			title: 'Weekly Pattern Review',
			rationale: "Monday is for reviewing learnings. Share a pattern you discovered last week."
		},
		tuesday: {
			type: 'methodology',
			title: 'Primary Content Creation',
			rationale: "Tuesday is for creating primary content. Draft a methodology or case study post."
		},
		wednesday: {
			type: 'engagement',
			title: 'Content Derivatives',
			rationale: "Wednesday is for derivatives. Repurpose existing content into a new format."
		},
		thursday: {
			type: 'engagement',
			title: 'Community Engagement',
			rationale: "Thursday is for community. Post something that invites discussion."
		},
		friday: {
			type: 'case_study',
			title: 'Pipeline & Wins',
			rationale: "Friday is for pipeline review. Share a win or lesson from client work."
		}
	};

	const suggestion = rhythmMap[day];
	if (!suggestion) return null;

	return {
		...suggestion,
		confidence: 0.75,
		priority: 'medium'
	};
}
