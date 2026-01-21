/**
 * Content Rhythm API
 * 
 * Enforces recurring content patterns.
 * Agent checks rhythm, identifies gaps, suggests what to post.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface RhythmDef {
	id: string;
	day_of_week: string;
	pillar: string;
	description: string;
	preferred_formats: string;
	topic_pool: string;
	last_topics: string | null;
	active: number;
}

interface Post {
	id: string;
	scheduled_for: number;
	status: string;
	content: string;
}

/**
 * GET /api/content/rhythm
 * 
 * Get rhythm status: what's planned, what's missing, what to do next
 */
export const GET: RequestHandler = async ({ platform, url }) => {
	const db = platform!.env.DB;
	
	const weeksAhead = parseInt(url.searchParams.get('weeks') || '2');
	
	try {
		// Get rhythm definitions
		const rhythmResult = await db.prepare(`
			SELECT * FROM content_rhythm WHERE active = 1
		`).all<RhythmDef>();
		
		// Get scheduled posts for the coming weeks
		const now = Date.now();
		const endDate = now + (weeksAhead * 7 * 24 * 60 * 60 * 1000);
		
		const postsResult = await db.prepare(`
			SELECT id, scheduled_for, status, content FROM social_posts
			WHERE scheduled_for >= ? AND scheduled_for <= ?
			AND status IN ('pending', 'posted')
			ORDER BY scheduled_for
		`).bind(now, endDate).all<Post>();
		
		// Build weekly view
		const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
		const rhythmByDay = Object.fromEntries(
			rhythmResult.results.map(r => [r.day_of_week, {
				...r,
				preferred_formats: JSON.parse(r.preferred_formats),
				topic_pool: JSON.parse(r.topic_pool),
				last_topics: r.last_topics ? JSON.parse(r.last_topics) : []
			}])
		);
		
		// Organize posts by day
		const postsByDay: Record<string, Post[]> = {};
		for (const post of postsResult.results) {
			const date = new Date(post.scheduled_for);
			const day = days[date.getDay()];
			if (!postsByDay[day]) postsByDay[day] = [];
			postsByDay[day].push(post);
		}
		
		// Calculate gaps and recommendations
		const today = days[new Date().getDay()];
		const gaps: Array<{ day: string; pillar: string; reason: string }> = [];
		const recommendations: Array<{
			day: string;
			pillar: string;
			formats: string[];
			suggestedTopics: string[];
			urgency: 'high' | 'medium' | 'low';
		}> = [];
		
		for (const [day, rhythm] of Object.entries(rhythmByDay)) {
			const dayPosts = postsByDay[day] || [];
			
			if (dayPosts.length === 0) {
				gaps.push({
					day,
					pillar: rhythm.pillar,
					reason: `No ${rhythm.pillar} content scheduled for ${day}`
				});
				
				// Get topics not recently used
				const availableTopics = rhythm.topic_pool.filter(
					(t: string) => !rhythm.last_topics.includes(t)
				);
				
				const daysUntil = (days.indexOf(day) - days.indexOf(today) + 7) % 7;
				
				recommendations.push({
					day,
					pillar: rhythm.pillar,
					formats: rhythm.preferred_formats,
					suggestedTopics: availableTopics.slice(0, 3),
					urgency: daysUntil <= 2 ? 'high' : daysUntil <= 4 ? 'medium' : 'low'
				});
			}
		}
		
		// Calculate adherence score
		const totalDays = Object.keys(rhythmByDay).length;
		const filledDays = totalDays - gaps.length;
		const adherenceScore = Math.round((filledDays / totalDays) * 100);
		
		return json({
			today,
			todaysRhythm: rhythmByDay[today] || null,
			adherenceScore,
			filledDays,
			totalDays,
			gaps,
			recommendations: recommendations.sort((a, b) => {
				const urgencyOrder = { high: 0, medium: 1, low: 2 };
				return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
			}),
			rhythmDefinitions: rhythmByDay,
			scheduledPosts: postsResult.results.length
		});
	} catch (error) {
		console.error('Failed to get rhythm:', error);
		return json({ error: 'Failed to get rhythm' }, { status: 500 });
	}
};

interface UpdateRhythmBody {
	day_of_week: string;
	topic_used?: string;
	update_pool?: string[];
}

/**
 * POST /api/content/rhythm
 * 
 * Update rhythm state (record topic usage, modify pool)
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	const db = platform!.env.DB;
	const body = await request.json() as UpdateRhythmBody;
	
	const { day_of_week, topic_used, update_pool } = body;
	
	if (!day_of_week) {
		return json({ error: 'Missing required field: day_of_week' }, { status: 400 });
	}
	
	try {
		// Get current rhythm
		const current = await db.prepare(`
			SELECT * FROM content_rhythm WHERE day_of_week = ?
		`).bind(day_of_week).first<RhythmDef>();
		
		if (!current) {
			return json({ error: 'Rhythm not found for day' }, { status: 404 });
		}
		
		const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
		const params: (string | null)[] = [];
		
		// Track topic usage (keep last 5)
		if (topic_used) {
			const lastTopics = current.last_topics ? JSON.parse(current.last_topics) : [];
			lastTopics.unshift(topic_used);
			const trimmedTopics = lastTopics.slice(0, 5);
			updates.push('last_topics = ?');
			params.push(JSON.stringify(trimmedTopics));
		}
		
		// Update topic pool
		if (update_pool) {
			updates.push('topic_pool = ?');
			params.push(JSON.stringify(update_pool));
		}
		
		params.push(day_of_week);
		
		await db.prepare(`
			UPDATE content_rhythm SET ${updates.join(', ')} WHERE day_of_week = ?
		`).bind(...params).run();
		
		return json({ day_of_week, updated: true });
	} catch (error) {
		console.error('Failed to update rhythm:', error);
		return json({ error: 'Failed to update rhythm' }, { status: 500 });
	}
};
