import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const { message, videoAnalytics } = await request.json();

		if (!message) {
			return json({ error: 'Message is required' }, { status: 400 });
		}

		const ai = platform?.env?.AI;
		if (!ai) {
			return json({ error: 'AI service not available' }, { status: 503 });
		}

		// Build context from video analytics
		const analyticsContext = videoAnalytics ? `
Video Analytics Context:
- Title: ${videoAnalytics.title}
- Views: ${videoAnalytics.views}
- Engagement Rate: 24.8%
- Average Watch Time: 4m 32s
- Peak Retention: 3m 15s (78% of viewers)
- Likes: 12.4K
- Comments: 2.8K
- Shares: 1.2K
- Traffic Sources: Browse Features (42%), Suggested Videos (28%), External Links (18%), Search (12%)
- Top Locations: United States (34.2%), United Kingdom (18.5%), Canada (12.8%)
` : '';

		// System prompt for the AI assistant
		const systemPrompt = `You are an expert video content strategist and analytics consultant. Your role is to help creators understand their video performance and generate content ideas based on data insights.

${analyticsContext}

Guidelines:
- Be conversational and encouraging
- Focus on actionable insights
- Suggest specific content ideas based on what's working
- Explain trends in simple terms
- Ask clarifying questions when helpful
- Keep responses concise (2-3 paragraphs max)`;

		// Call Cloudflare Workers AI
		const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: message }
			],
			stream: false
		});

		return json({
			message: response.response || 'I apologize, but I couldn\'t generate a response. Please try again.',
			success: true
		});
	} catch (error) {
		console.error('Analytics chat error:', error);
		return json(
			{
				error: 'Failed to process your message',
				success: false
			},
			{ status: 500 }
		);
	}
};
