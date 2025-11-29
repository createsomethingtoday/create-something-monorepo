/**
 * Phenomenological Interpreter
 *
 * Uses Workers AI to interpret motion through Heidegger's framework.
 * Analyzes screenshots and technical data to determine disclosure vs decoration.
 */

import type { TechnicalAnalysis, PhenomenologicalAnalysis, DisclosureType } from './types';
import { PHENOMENOLOGICAL_SYSTEM_PROMPT, formatTechnicalContext } from './heideggerian-framework';

export interface InterpretationResult {
	success: boolean;
	analysis?: PhenomenologicalAnalysis;
	error?: string;
	rawResponse?: string;
}

/**
 * Default phenomenological analysis when AI fails or returns invalid data
 */
const DEFAULT_ANALYSIS: PhenomenologicalAnalysis = {
	disclosure: 'none',
	disclosureDescription: 'Unable to determine disclosure',
	mode: 'vorhandenheit',
	modeRationale: 'Analysis failed, defaulting to present-at-hand',
	judgment: 'ambiguous',
	justification: 'Insufficient data for judgment',
	recommendation: {
		action: 'modify',
		reasoning: 'Manual review recommended',
		modification: 'Review animation purpose and necessity'
	},
	confidence: 0
};

/**
 * Interpret motion phenomenologically using Workers AI
 */
export async function interpretMotion(
	ai: Ai,
	technical: TechnicalAnalysis,
	screenshot: ArrayBuffer,
	url: string
): Promise<InterpretationResult> {
	try {
		// Format technical context for the prompt
		const technicalContext = formatTechnicalContext(
			{
				animations: technical.animations,
				propertiesAnimated: technical.propertiesAnimated,
				triggerType: technical.triggerType
			},
			url
		);

		// Convert screenshot to base64 for multimodal input
		const screenshotBase64 = arrayBufferToBase64(screenshot);

		// Call Workers AI with vision model
		// Cloudflare format: type 'image' with raw base64 (no data URL prefix)
		const response = await ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
			messages: [
				{
					role: 'system',
					content: PHENOMENOLOGICAL_SYSTEM_PROMPT
				},
				{
					role: 'user',
					content: [
						{
							type: 'text',
							text: `Analyze this UI motion:\n\n${technicalContext}\n\nProvide your analysis in JSON format as specified.`
						},
						{
							type: 'image',
							image: screenshotBase64
						}
					]
				}
			],
			max_tokens: 1024,
			temperature: 0.3 // Lower temperature for more consistent analysis
		});

		// Extract response text
		const responseText =
			typeof response === 'string'
				? response
				: (response as { response?: string }).response || JSON.stringify(response);

		// Parse JSON from response
		const analysis = parseAnalysisResponse(responseText);

		return {
			success: true,
			analysis,
			rawResponse: responseText
		};
	} catch (error) {
		return {
			success: false,
			analysis: DEFAULT_ANALYSIS,
			error: error instanceof Error ? error.message : 'Unknown interpretation error'
		};
	}
}

/**
 * Parse AI response into structured analysis
 */
function parseAnalysisResponse(responseText: string): PhenomenologicalAnalysis {
	try {
		// Try to extract JSON from response
		const jsonMatch = responseText.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			return {
				...DEFAULT_ANALYSIS,
				disclosureDescription: 'Could not parse AI response as JSON'
			};
		}

		const parsed = JSON.parse(jsonMatch[0]);

		// Validate and normalize the response
		return {
			disclosure: validateDisclosure(parsed.disclosure),
			disclosureDescription: String(parsed.disclosureDescription || 'No description provided'),
			mode: validateMode(parsed.mode),
			modeRationale: String(parsed.modeRationale || 'No rationale provided'),
			judgment: validateJudgment(parsed.judgment),
			justification: String(parsed.justification || 'No justification provided'),
			recommendation: validateRecommendation(parsed.recommendation),
			confidence: validateConfidence(parsed.confidence)
		};
	} catch {
		return {
			...DEFAULT_ANALYSIS,
			disclosureDescription: 'Failed to parse AI response'
		};
	}
}

/**
 * Validate disclosure type
 */
function validateDisclosure(value: unknown): DisclosureType {
	const valid: DisclosureType[] = [
		'state_transition',
		'spatial_relationship',
		'user_confirmation',
		'hierarchy_reveal',
		'temporal_sequence',
		'none'
	];
	return valid.includes(value as DisclosureType) ? (value as DisclosureType) : 'none';
}

/**
 * Validate ontological mode
 */
function validateMode(value: unknown): 'zuhandenheit' | 'vorhandenheit' {
	return value === 'zuhandenheit' ? 'zuhandenheit' : 'vorhandenheit';
}

/**
 * Validate motion judgment
 */
function validateJudgment(value: unknown): 'functional' | 'decorative' | 'ambiguous' {
	const valid = ['functional', 'decorative', 'ambiguous'];
	return valid.includes(value as string)
		? (value as 'functional' | 'decorative' | 'ambiguous')
		: 'ambiguous';
}

/**
 * Validate recommendation structure
 */
function validateRecommendation(value: unknown): PhenomenologicalAnalysis['recommendation'] {
	if (!value || typeof value !== 'object') {
		return {
			action: 'modify',
			reasoning: 'Invalid recommendation structure'
		};
	}

	const rec = value as Record<string, unknown>;
	const validActions = ['keep', 'modify', 'remove'];
	const action = validActions.includes(rec.action as string)
		? (rec.action as 'keep' | 'modify' | 'remove')
		: 'modify';

	return {
		action,
		reasoning: String(rec.reasoning || 'No reasoning provided'),
		modification: rec.modification ? String(rec.modification) : undefined
	};
}

/**
 * Validate confidence score
 */
function validateConfidence(value: unknown): number {
	const num = Number(value);
	if (isNaN(num)) return 0.5;
	return Math.max(0, Math.min(1, num));
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/**
 * Batch interpret multiple motions
 */
export async function interpretMotionBatch(
	ai: Ai,
	items: Array<{ technical: TechnicalAnalysis; screenshot: ArrayBuffer; url: string }>
): Promise<InterpretationResult[]> {
	// Process sequentially to avoid rate limits
	const results: InterpretationResult[] = [];

	for (const item of items) {
		const result = await interpretMotion(ai, item.technical, item.screenshot, item.url);
		results.push(result);
	}

	return results;
}
