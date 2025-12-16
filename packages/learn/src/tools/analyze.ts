/**
 * Analyze Reflection Tool
 *
 * Parse reflection text for depth, Triad concepts, questions, and action items.
 * Canon: Analysis reveals what reflection already contains.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ReflectionAnalysis } from '../reflection/storage.js';
import { addReflection } from '../reflection/storage.js';

export const analyzeTool: Tool = {
	name: 'learn_analyze_reflection',
	description: `Analyze reflection text for depth and Triad alignment.

Detects:
- Depth level: surface (describes), applied (connects), integrated (transforms)
- Triad concepts: DRY, Rams, Heidegger keywords
- Questions raised
- Action items implied

Returns analysis score (0-100) and structured insights.

Example:
{
  "reflection": "I noticed duplication in these components. Unifying them would reduce maintenance burden and make the system clearer. Next, I'll extract the common pattern."
}`,
	inputSchema: {
		type: 'object' as const,
		properties: {
			reflection: {
				type: 'string',
				description: 'The reflection text to analyze'
			},
			lessonId: {
				type: 'string',
				description: 'Optional lesson ID this reflection relates to'
			},
			pathId: {
				type: 'string',
				description: 'Optional path ID this reflection relates to'
			},
			praxisId: {
				type: 'string',
				description: 'Optional praxis exercise ID this reflection relates to'
			},
			store: {
				type: 'boolean',
				description: 'Whether to store this reflection (default: true)'
			}
		},
		required: ['reflection']
	}
};

/**
 * Analyze reflection depth based on indicators
 */
function analyzeDepth(text: string): 'surface' | 'applied' | 'integrated' {
	const lowerText = text.toLowerCase();

	// Integrated: transformation, system-level thinking, methodology internalization
	const integratedIndicators = [
		'transforms',
		'now i understand',
		'this changes how i',
		'my approach is',
		'principle',
		'methodology',
		'systemic',
		'interconnected',
		'holistic'
	];

	// Applied: connections, practical insights, concrete actions
	const appliedIndicators = [
		'because',
		'therefore',
		'this means',
		'i will',
		'next i',
		'connects to',
		'relates to',
		'similar to',
		'pattern',
		'unify',
		'reduce'
	];

	// Surface: description, observation without analysis
	// Default if no deeper indicators found

	const hasIntegrated = integratedIndicators.some((indicator) => lowerText.includes(indicator));
	if (hasIntegrated) return 'integrated';

	const hasApplied = appliedIndicators.some((indicator) => lowerText.includes(indicator));
	if (hasApplied) return 'applied';

	return 'surface';
}

/**
 * Extract Triad concepts from reflection
 */
function extractTriadConcepts(text: string): {
	dry: string[];
	rams: string[];
	heidegger: string[];
} {
	const lowerText = text.toLowerCase();

	const dryKeywords = [
		'duplication',
		'duplicate',
		'repeated',
		'reuse',
		'shared',
		'common',
		'abstract',
		'unify',
		'centralize',
		'single source'
	];

	const ramsKeywords = [
		'unnecessary',
		'remove',
		'simplify',
		'minimal',
		'essential',
		'clarity',
		'clean',
		'strip',
		'reduce',
		'fewer'
	];

	const heideggerKeywords = [
		'system',
		'whole',
		'connection',
		'relationship',
		'context',
		'interconnected',
		'serve',
		'purpose',
		'coherent',
		'holistic'
	];

	const findMatches = (keywords: string[]): string[] => {
		return keywords.filter((keyword) => lowerText.includes(keyword));
	};

	return {
		dry: findMatches(dryKeywords),
		rams: findMatches(ramsKeywords),
		heidegger: findMatches(heideggerKeywords)
	};
}

/**
 * Extract questions from reflection
 */
function extractQuestions(text: string): string[] {
	const sentences = text.split(/[.!?]+/).map((s) => s.trim());
	return sentences.filter((s) => s.includes('?') || s.toLowerCase().startsWith('why'));
}

/**
 * Extract action items from reflection
 */
function extractActionItems(text: string): string[] {
	const sentences = text.split(/[.!?]+/).map((s) => s.trim());

	const actionIndicators = [
		'i will',
		'i should',
		'next',
		'plan to',
		'going to',
		'need to',
		'must',
		'should'
	];

	return sentences.filter((sentence) => {
		const lower = sentence.toLowerCase();
		return actionIndicators.some((indicator) => lower.includes(indicator));
	});
}

/**
 * Calculate analysis score
 */
function calculateScore(analysis: Omit<ReflectionAnalysis, 'score'>): number {
	let score = 0;

	// Depth contributes 40 points
	const depthScores = { surface: 10, applied: 25, integrated: 40 };
	score += depthScores[analysis.depth];

	// Triad coverage contributes 30 points (10 per level)
	if (analysis.triadConcepts.dry.length > 0) score += 10;
	if (analysis.triadConcepts.rams.length > 0) score += 10;
	if (analysis.triadConcepts.heidegger.length > 0) score += 10;

	// Questions contribute 15 points
	score += Math.min(analysis.questions.length * 5, 15);

	// Action items contribute 15 points
	score += Math.min(analysis.actionItems.length * 5, 15);

	return Math.min(score, 100);
}

export async function handleAnalyze(
	args: Record<string, unknown>
): Promise<{ type: 'text'; text: string }[]> {
	const reflection = args.reflection as string;
	const lessonId = args.lessonId as string | undefined;
	const pathId = args.pathId as string | undefined;
	const praxisId = args.praxisId as string | undefined;
	const store = args.store !== false; // Default to true

	if (!reflection) {
		return [
			{
				type: 'text' as const,
				text: 'Error: "reflection" parameter is required.'
			}
		];
	}

	// Perform analysis
	const depth = analyzeDepth(reflection);
	const triadConcepts = extractTriadConcepts(reflection);
	const questions = extractQuestions(reflection);
	const actionItems = extractActionItems(reflection);

	const analysis: ReflectionAnalysis = {
		depth,
		triadConcepts,
		questions,
		actionItems,
		score: 0 // Will be calculated next
	};

	analysis.score = calculateScore(analysis);

	// Store if requested
	if (store) {
		addReflection(reflection, analysis, { lessonId, pathId, praxisId });
	}

	// Format output
	const depthEmoji = {
		surface: '🌊',
		applied: '🔧',
		integrated: '🧬'
	}[depth];

	const triadSummary = `
**DRY** (${triadConcepts.dry.length}): ${triadConcepts.dry.join(', ') || 'none'}
**Rams** (${triadConcepts.rams.length}): ${triadConcepts.rams.join(', ') || 'none'}
**Heidegger** (${triadConcepts.heidegger.length}): ${triadConcepts.heidegger.join(', ') || 'none'}
`.trim();

	const questionsList =
		questions.length > 0
			? '\n\n**Questions Raised**:\n' + questions.map((q) => `- ${q}`).join('\n')
			: '';

	const actionsList =
		actionItems.length > 0
			? '\n\n**Action Items**:\n' + actionItems.map((a) => `- ${a}`).join('\n')
			: '';

	return [
		{
			type: 'text' as const,
			text: `# Reflection Analysis

**Score**: ${analysis.score}/100
**Depth**: ${depthEmoji} ${depth}

## Triad Concepts Detected

${triadSummary}${questionsList}${actionsList}

---

**Interpretation**:
- **Surface**: Describes observations without connections
- **Applied**: Makes connections and plans actions
- **Integrated**: Shows transformation in thinking or methodology

${store ? `\nThis reflection has been stored in \`~/.create-something/reflections.json\`.` : ''}`
		}
	];
}
