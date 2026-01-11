import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';

interface VideoAnalytics {
	title?: string;
	views?: string;
	engagement?: string;
	avgWatch?: string;
}

const analyticsExpertPrompt = `You are an expert video content strategist and analytics consultant for OUTERFIELDS, a premium content network. Your role is to help creators understand their video performance and generate content ideas based on data insights.

You have access to the following analytics data:
- Views: 2.4M
- Engagement Rate: 24.8%
- Average Watch Time: 4m 32s
- Peak Retention: 3m 15s (78% of viewers)
- Likes: 12.4K
- Comments: 2.8K
- Shares: 1.2K
- Traffic Sources: Browse Features (42%), Suggested Videos (28%), External Links (18%), Search (12%)
- Top Locations: United States (34.2%), United Kingdom (18.5%), Canada (12.8%)

Guidelines:
- Be conversational and encouraging
- Focus on actionable insights the creator can use immediately
- Suggest specific content ideas based on what's working
- Explain trends in simple terms
- Reference specific metrics to support your points
- Keep responses concise (2-3 paragraphs max)
- Sound like a knowledgeable friend, not a corporate report`;

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const { message, videoAnalytics } = await request.json() as {
			message: string;
			videoAnalytics?: VideoAnalytics;
		};

		if (!message) {
			return json({ error: 'Message is required', success: false }, { status: 400 });
		}

		const apiKey = platform?.env?.ANTHROPIC_API_KEY;
		if (!apiKey) {
			// Fallback to demo response if no API key configured
			return json({
				message: getDemoResponse(message),
				success: true,
				demo: true
			});
		}

		const client = new Anthropic({ apiKey });

		// Add any custom analytics context if provided
		let systemPrompt = analyticsExpertPrompt;
		if (videoAnalytics?.title) {
			systemPrompt += `\n\nCurrent video being analyzed: "${videoAnalytics.title}"`;
		}

		const response = await client.messages.create({
			model: 'claude-sonnet-4-20250514',
			max_tokens: 500,
			system: systemPrompt,
			messages: [{ role: 'user', content: message }]
		});

		// Extract text from response
		const textContent = response.content.find(block => block.type === 'text');
		const responseText = textContent?.type === 'text' ? textContent.text : 'I apologize, but I couldn\'t generate a response. Please try again.';

		return json({
			message: responseText,
			success: true,
			model: response.model,
			usage: {
				input_tokens: response.usage.input_tokens,
				output_tokens: response.usage.output_tokens
			}
		});
	} catch (error) {
		console.error('Claude analytics chat error:', error);

		// Return demo response on error
		return json({
			message: getDemoResponse(''),
			success: true,
			demo: true,
			error: 'Using demo mode'
		});
	}
};

/**
 * Demo responses when API key is not configured
 * These showcase what Claude would say without incurring API costs
 */
function getDemoResponse(question: string): string {
	const lowerQuestion = question.toLowerCase();

	if (lowerQuestion.includes('more views') || lowerQuestion.includes('performing')) {
		return `Looking at your analytics, this video is crushing it for a few clear reasons. Your 24.8% engagement rate is exceptional—most videos in this niche hover around 8-12%. The real magic is in your traffic sources: 42% from Browse Features means the algorithm is actively pushing your content.

The 4m 32s average watch time suggests your hook and pacing are working well. To replicate this, look at what topic you covered and how you structured the first 30 seconds. That's your formula for the next one.`;
	}

	if (lowerQuestion.includes('next') || lowerQuestion.includes('make')) {
		return `Based on what's working, I'd double down on the format that got you here. Your Browse Features traffic (42%) tells me the algorithm likes your content style. Your audience retention peaks at 3:15—that's your sweet spot for content density.

Try a follow-up that explores a related angle. If this video was "How to X," try "Why Most People Fail at X" or "The One Thing I Wish I Knew About X." Same audience, fresh perspective.`;
	}

	if (lowerQuestion.includes('retention') || lowerQuestion.includes('audience')) {
		return `Your retention is solid—78% of viewers make it to 3:15, which is above average. But here's the opportunity: you're losing 22% somewhere in that first 3 minutes.

Check your analytics for the exact drop-off points. Usually it's either a slow intro (first 30 seconds) or a segment that doesn't deliver on the hook's promise. Tighten those moments, and you could push retention over 85%.`;
	}

	if (lowerQuestion.includes('traffic') || lowerQuestion.includes('coming from')) {
		return `Your traffic breakdown is interesting: Browse Features dominates at 42%, which means the algorithm is your best friend right now. Suggested Videos at 28% shows you're appearing alongside related content.

The 18% from External Links is worth investigating—that's significant outside traffic. Check if there's a specific site or community driving those views. That could be a partnership opportunity or a place to engage directly.`;
	}

	// Default response
	return `Based on your current metrics (2.4M views, 24.8% engagement, 4:32 avg watch time), you're in a strong position. Your content is resonating with the algorithm and your audience.

What specific aspect would you like to dive deeper into? I can analyze your traffic sources, suggest content ideas, or help optimize your retention strategy.`;
}
