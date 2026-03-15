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
	let question = '';
	let providedAnalytics: VideoAnalytics | undefined;

	try {
		const { message, videoAnalytics } = (await request.json()) as {
			message: string;
			videoAnalytics?: VideoAnalytics;
		};

		question = message;
		providedAnalytics = videoAnalytics;

		if (!message) {
			return json({ error: 'Message is required', success: false }, { status: 400 });
		}

		const apiKey = platform?.env?.ANTHROPIC_API_KEY;
		if (!apiKey) {
			// Fallback response when Anthropic is not configured.
			return json({
				message: getFallbackResponse(message, videoAnalytics),
				success: true,
				source: 'fallback'
			});
		}

		const client = new Anthropic({ apiKey });

		// Add any custom analytics context if provided
		let systemPrompt = analyticsExpertPrompt;
		if (videoAnalytics?.title) {
			systemPrompt += `\n\nCurrent video being analyzed: "${videoAnalytics.title}"`;
		}
		if (videoAnalytics?.views) {
			systemPrompt += `\nCurrent reported views: ${videoAnalytics.views}`;
		}
		if (videoAnalytics?.engagement) {
			systemPrompt += `\nCurrent reported engagement: ${videoAnalytics.engagement}`;
		}
		if (videoAnalytics?.avgWatch) {
			systemPrompt += `\nCurrent reported average watch time: ${videoAnalytics.avgWatch}`;
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

		// Return resilient fallback response on provider/API errors.
		return json({
			message: getFallbackResponse(question, providedAnalytics),
			success: true,
			source: 'fallback'
		});
	}
};

/**
 * Fallback responses when Anthropic is unavailable.
 */
function getFallbackResponse(question: string, analytics?: VideoAnalytics): string {
	const lowerQuestion = question.toLowerCase();
	const viewsText = analytics?.views || 'N/A';
	const engagementText = analytics?.engagement || 'N/A';
	const watchText = analytics?.avgWatch || 'N/A';
	const titleText = analytics?.title || 'your current top video';

	if (lowerQuestion.includes('more views') || lowerQuestion.includes('performing')) {
		return `Performance looks strong for ${titleText}. Based on your current snapshot (${viewsText} views, ${engagementText} engagement), your next lift usually comes from stronger opening hooks and clearer thumbnail/title packaging.

Run one A/B iteration this week: keep topic constant, change only title + first 20 seconds. Compare click-through and early retention to identify the winning format quickly.`;
	}

	if (lowerQuestion.includes('next') || lowerQuestion.includes('make')) {
		return `Use ${titleText} as the baseline and publish a follow-up that answers the obvious next question your audience has.

Keep format, pacing, and runtime close to your current average watch time (${watchText}) so you can compare performance cleanly across uploads.`;
	}

	if (lowerQuestion.includes('retention') || lowerQuestion.includes('audience')) {
		return `Your current average watch time is ${watchText}. To improve retention, tighten the first 30-45 seconds and bring the payoff forward.

Then review where drop-offs cluster and cut repetitive setup. Small edits there typically create the biggest completion gains.`;
	}

	if (lowerQuestion.includes('traffic') || lowerQuestion.includes('coming from')) {
		return `To diagnose traffic quality, compare sources by watch time and completion rather than raw views.

If a source delivers low watch time, adjust the hook or landing expectation for that audience segment.`;
	}

	// Default response
	return `Current snapshot: ${viewsText} views, ${engagementText} engagement, ${watchText} average watch time.

Ask about one target outcome (more views, better retention, or next-video planning), and I’ll give a focused action plan.`;
}
