/**
 * Content Intelligence API
 * 
 * Combines industry research with CREATE SOMETHING methodology
 * to suggest content that resonates with your LinkedIn audience.
 * 
 * Uses codified format research from $lib/social/formats
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	FORMATS,
	HOOK_TEMPLATES,
	WEEKLY_PILLARS,
	getFormatForGoal,
	getTodaysPillar,
	getHooksForFormat,
	getFormatsByEngagement
} from '$lib/social/formats';
import type { FormatType, FormatSpec, ContentPillar } from '$lib/social/formats';

/**
 * GET /api/social/intelligence
 * 
 * Get content suggestions based on day and methodology
 */
export const GET: RequestHandler = async ({ url }) => {
	const dayParam = url.searchParams.get('day');
	const topic = url.searchParams.get('topic');
	
	// Get pillar for the day
	const pillar = dayParam 
		? WEEKLY_PILLARS.find(p => p.day === dayParam) || getTodaysPillar()
		: getTodaysPillar();
	
	// Get recommended formats with full specs
	const recommendedFormats = pillar.recommendedFormats.map(formatType =>
		FORMATS[formatType]
	);
	
	// Get primary format details
	const primaryFormat = FORMATS[pillar.recommendedFormats[0]];
	const hooks = getHooksForFormat(pillar.recommendedFormats[0]);
	
	// Filter topics if search provided
	const topicIdeas = topic 
		? pillar.topicIdeas.filter(t => t.toLowerCase().includes(topic.toLowerCase()))
		: pillar.topicIdeas;
	
	return json({
		day: pillar.day,
		theme: pillar.theme,
		description: pillar.description,
		methodologyAngle: pillar.methodologyAngle,
		
		suggestion: {
			format: primaryFormat.type,
			engagementRate: primaryFormat.engagementRate,
			tips: primaryFormat.tips,
			structure: primaryFormat.structure,
			topicIdeas,
			hookTemplates: hooks.map(h => ({
				template: h.template,
				example: h.example
			}))
		},
		
		alternativeFormats: recommendedFormats.slice(1).map(f => ({
			type: f.type,
			engagementRate: f.engagementRate,
			bestFor: f.bestFor.slice(0, 3)
		})),
		
		allFormats: getFormatsByEngagement().map(f => ({
			type: f.type,
			engagementRate: f.engagementRate,
			description: f.description
		})),
		
		weeklyPillars: WEEKLY_PILLARS.map(p => ({
			day: p.day,
			theme: p.theme,
			formats: p.recommendedFormats
		}))
	});
};

/**
 * POST /api/social/intelligence
 * 
 * Get format recommendation based on content goal
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json() as { 
		content_goal?: 'engagement' | 'reach' | 'leads' | 'thought_leadership' | 'trust';
		research_topic?: string;
		target_audience?: string;
	};
	
	const { content_goal = 'engagement', research_topic, target_audience } = body;
	
	// Get recommended format for goal
	const recommendedType = getFormatForGoal(content_goal);
	const format = FORMATS[recommendedType];
	const hooks = getHooksForFormat(recommendedType);
	
	// Build rationale
	const rationales: Record<string, string> = {
		engagement: `Carousels have the highest engagement rate at ${FORMATS.carousel.engagementRate}%`,
		reach: 'Polls generate the highest impressions for maximum visibility',
		leads: 'Educational carousels drive 4x more leads than promotional content',
		thought_leadership: 'Video builds personal connection with 1.4x engagement boost',
		trust: 'Authentic multi-image posts humanize your brand and build trust'
	};
	
	return json({
		goal: content_goal,
		
		recommendation: {
			format: format.type,
			rationale: rationales[content_goal],
			engagementRate: format.engagementRate,
			description: format.description
		},
		
		formatDetails: {
			bestFor: format.bestFor,
			avoid: format.avoid,
			specs: format.specs,
			tips: format.tips,
			structure: format.structure,
			methodologyFit: format.methodologyFit,
			algorithmNotes: format.algorithmNotes
		},
		
		hookTemplates: hooks.map(h => ({
			template: h.template,
			example: h.example
		})),
		
		researchPrompt: research_topic 
			? `Research "${research_topic}" for ${target_audience || 'design/tech professionals'} to inform content`
			: null,
		
		keyPrinciples: [
			'Relevance beats reach - speak to specific audience',
			'Consistency beats creativity - repeat strategic messages',
			'Native content outperforms links (50-70% more reach)',
			'Conversational tone (+56% engagement vs formal)',
			'Hook in first 3 seconds or lose them'
		]
	});
};
