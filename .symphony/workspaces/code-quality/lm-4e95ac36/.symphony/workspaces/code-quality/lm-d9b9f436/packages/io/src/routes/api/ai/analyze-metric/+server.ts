import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

interface MetricAnalysisRequest {
	metric?: string;
	label?: string;
	context?: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const { metric, label, context } = (await request.json()) as MetricAnalysisRequest;

		if (!metric && !label) {
			return json({ error: 'metric or label required' }, { status: 400 });
		}

		// Check if Workers AI binding is available
		if (!platform?.env?.AI) {
			console.warn('⚠️  Workers AI not available - using heuristics fallback');
			return json(analyzeMetricHeuristic(metric, label));
		}

		// Use Workers AI to understand metric semantics
		const prompt = `Analyze this metric and determine if lower values are better (like response time, errors, latency) or if higher values are better (like success rate, throughput, revenue).

Metric name: ${metric || 'unknown'}
Label: ${label || 'unknown'}
Context: ${context || 'general'}

Respond with ONLY a JSON object (no markdown, no explanation) in this exact format:
{
  "lowerIsBetter": true or false,
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation"
}`;

		const response = await platform.env.AI.run('@cf/meta/llama-3.2-1b-instruct', {
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 256
		});

		// Parse AI response
		let aiResponse;
		try {
			// Extract JSON from response (model might wrap it in markdown)
			const text = response.response || '';
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				aiResponse = JSON.parse(jsonMatch[0]);
			} else {
				throw new Error('No JSON found in response');
			}
		} catch (parseError) {
			console.error('Failed to parse AI response:', parseError);
			return json(analyzeMetricHeuristic(metric, label));
		}

		// Validate response
		if (typeof aiResponse.lowerIsBetter !== 'boolean') {
			console.warn('Invalid AI response, using heuristics');
			return json(analyzeMetricHeuristic(metric, label));
		}

		return json({
			lowerIsBetter: aiResponse.lowerIsBetter,
			confidence: aiResponse.confidence || 0.8,
			reasoning: aiResponse.reasoning || 'AI analysis',
			source: 'ai'
		});
	} catch (error) {
		console.error('Error in AI metric analysis:', error);
		// Fallback to heuristic-based analysis
		const { metric, label } = (await request
			.json()
			.catch(() => ({ metric: '', label: '' }))) as MetricAnalysisRequest;
		return json(analyzeMetricHeuristic(metric || '', label || ''));
	}
};

/**
 * Heuristic-based fallback for metric analysis
 * Used when AI is unavailable or fails
 */
function analyzeMetricHeuristic(
	metric: string = '',
	label: string = ''
): { lowerIsBetter: boolean; confidence: number; reasoning: string; source: string } {
	const combined = `${metric} ${label}`.toLowerCase();

	// Metrics where lower is better
	const lowerIsBetterKeywords = [
		'response',
		'time',
		'latency',
		'duration',
		'error',
		'failure',
		'loss',
		'cost',
		'delay',
		'wait',
		'load',
		'bounce',
		'churn',
		'miss'
	];

	// Metrics where higher is better
	const higherIsBetterKeywords = [
		'success',
		'rate',
		'throughput',
		'revenue',
		'profit',
		'conversion',
		'engagement',
		'score',
		'hit',
		'cache',
		'uptime',
		'availability'
	];

	let lowerScore = 0;
	let higherScore = 0;

	for (const keyword of lowerIsBetterKeywords) {
		if (combined.includes(keyword)) lowerScore++;
	}

	for (const keyword of higherIsBetterKeywords) {
		if (combined.includes(keyword)) higherScore++;
	}

	// Special case: "error rate" or "failure rate" - lower is better
	if (combined.includes('error') || combined.includes('failure')) {
		lowerScore += 2;
	}

	const lowerIsBetter = lowerScore > higherScore;
	const confidence = Math.min(0.9, Math.max(lowerScore, higherScore) * 0.3);

	return {
		lowerIsBetter,
		confidence: confidence || 0.5,
		reasoning: `Heuristic analysis based on keywords`,
		source: 'heuristic'
	};
}
