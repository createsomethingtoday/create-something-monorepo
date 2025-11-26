/**
 * Motion Analyzer API
 *
 * Proxies to the motion-extractor Worker for technical extraction,
 * then adds phenomenological interpretation via Workers AI.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MOTION_EXTRACTOR_URL = 'https://motion-extractor.createsomething.workers.dev';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const { url, trigger, options = {} } = await request.json();

		if (!url) {
			throw error(400, 'Missing URL');
		}

		// Extract technical data from the Worker
		const extractionResponse = await fetch(MOTION_EXTRACTOR_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ url, trigger, options })
		});

		const extractionData = await extractionResponse.json();

		if (!extractionData.success) {
			return json({
				success: false,
				error: extractionData.error || 'Extraction failed',
				technical: {
					animations: [],
					transitions: [],
					timing: { totalDuration: 0, longestAnimation: 0, averageDuration: 0 },
					propertiesAnimated: [],
					debug: extractionData.debug
				},
				phenomenological: null,
				metadata: { url, analyzedAt: new Date().toISOString(), duration: 0 }
			});
		}

		// Build technical analysis
		const technical = {
			animations: extractionData.animations || [],
			transitions: extractionData.transitions || [],
			timing: extractionData.timing || { totalDuration: 0, longestAnimation: 0, averageDuration: 0 },
			propertiesAnimated: extractionData.propertiesAnimated || [],
			debug: {
				...extractionData.debug,
				puppeteerUsed: true,
				realHoverTriggered: extractionData.debug?.hoverTriggered
			}
		};

		// Generate phenomenological interpretation via Workers AI
		let phenomenological = null;

		if (platform?.env?.AI) {
			const prompt = buildPrompt(url, trigger, technical);
			const aiResponse = await platform.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
				messages: [{ role: 'user', content: prompt }],
				max_tokens: 1000
			});

			phenomenological = parseAIResponse(aiResponse.response || '');
		}

		// Fallback if no AI
		if (!phenomenological) {
			phenomenological = generateFallbackAnalysis(technical, trigger);
		}

		return json({
			success: true,
			technical,
			phenomenological,
			metadata: {
				url,
				analyzedAt: new Date().toISOString(),
				duration: extractionData.debug?.captureTime || 0
			}
		});
	} catch (e) {
		console.error('Motion analysis error:', e);
		return json(
			{
				success: false,
				error: e instanceof Error ? e.message : 'Analysis failed',
				technical: null,
				phenomenological: null,
				metadata: { url: '', analyzedAt: new Date().toISOString(), duration: 0 }
			},
			{ status: 500 }
		);
	}
};

function buildPrompt(
	url: string,
	trigger: { type: string; selector?: string },
	technical: { animations: unknown[]; transitions: unknown[]; timing: { totalDuration: number }; propertiesAnimated: string[] }
): string {
	return `Analyze this UI animation as a motion design expert.

URL: ${url}
Trigger: ${trigger.type}${trigger.selector ? ` on ${trigger.selector}` : ''}
Animations: ${technical.animations.length}
Transitions: ${technical.transitions.length}
Duration: ${technical.timing.totalDuration}ms
Properties: ${technical.propertiesAnimated.join(', ') || 'none'}

Respond in this exact JSON format:
{
  "disclosure": "state_transition|spatial_relationship|user_confirmation|hierarchy_reveal|temporal_sequence|none",
  "disclosureDescription": "What the motion communicates to the user",
  "mode": "zuhandenheit|vorhandenheit",
  "modeRationale": "Why this mode - does it support or obstruct?",
  "judgment": "functional|decorative|ambiguous",
  "justification": "Why this judgment",
  "recommendation": {
    "action": "keep|modify|remove",
    "reasoning": "Why this action",
    "modification": "If modify, what change"
  },
  "confidence": 0.0-1.0
}

Zuhandenheit = motion supports user intention, recedes into background
Vorhandenheit = motion demands attention, obstructs flow
Functional = motion reveals necessary information
Decorative = motion exists only for visual interest

Respond ONLY with the JSON, no markdown.`;
}

function parseAIResponse(response: string): ReturnType<typeof generateFallbackAnalysis> | null {
	try {
		const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
		const parsed = JSON.parse(cleaned);

		return {
			disclosure: parsed.disclosure || 'none',
			disclosureDescription: parsed.disclosureDescription || 'Unable to determine',
			mode: parsed.mode === 'zuhandenheit' ? 'zuhandenheit' : 'vorhandenheit',
			modeRationale: parsed.modeRationale || 'Unable to determine',
			judgment: ['functional', 'decorative', 'ambiguous'].includes(parsed.judgment)
				? parsed.judgment
				: 'ambiguous',
			justification: parsed.justification || 'Unable to determine',
			recommendation: {
				action: ['keep', 'modify', 'remove'].includes(parsed.recommendation?.action)
					? parsed.recommendation.action
					: 'keep',
				reasoning: parsed.recommendation?.reasoning || 'Unable to determine',
				modification: parsed.recommendation?.modification
			},
			confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5
		};
	} catch {
		return null;
	}
}

function generateFallbackAnalysis(
	technical: { animations: unknown[]; transitions: unknown[]; timing: { totalDuration: number } },
	trigger: { type: string }
) {
	const hasMotion = technical.animations.length > 0 || technical.transitions.length > 0;
	const duration = technical.timing.totalDuration;

	return {
		disclosure: hasMotion ? 'state_transition' : 'none',
		disclosureDescription: hasMotion
			? `Motion triggered by ${trigger.type} event`
			: 'No motion detected',
		mode: duration < 300 ? 'zuhandenheit' : 'vorhandenheit',
		modeRationale: duration < 300
			? 'Quick motion supports user flow'
			: 'Longer motion may obstruct user intention',
		judgment: hasMotion ? (duration < 500 ? 'functional' : 'ambiguous') : 'ambiguous',
		justification: hasMotion
			? `${technical.animations.length + technical.transitions.length} motion elements detected`
			: 'No motion to evaluate',
		recommendation: {
			action: 'keep' as const,
			reasoning: 'Motion analysis requires manual review',
			modification: undefined
		},
		confidence: 0.5
	};
}
