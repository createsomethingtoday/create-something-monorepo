/**
 * Recommend Tool
 *
 * Read triad-audit history and recommend lessons based on weakest areas.
 * Canon: Weakness reveals where growth dwells.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export const recommendTool: Tool = {
	name: 'learn_recommend',
	description: `Recommend lessons based on Triad audit scores.

Reads .triad-audit/history.json to identify weakest Triad level (DRY, Rams, Heidegger).
Maps weakness to relevant learning paths and exercises.

Returns prioritized lesson recommendations with rationale.

Example:
{
  "auditPath": ".triad-audit/history.json"
}`,
	inputSchema: {
		type: 'object' as const,
		properties: {
			auditPath: {
				type: 'string',
				description: 'Path to triad-audit history.json file (default: .triad-audit/history.json)'
			},
			limit: {
				type: 'number',
				description: 'Maximum number of recommendations (default: 3)'
			}
		}
	}
};

interface AuditEntry {
	timestamp: string;
	scores: {
		dry: number;
		rams: number;
		heidegger: number;
		overall: number;
	};
	violations: {
		total: number;
		critical: number;
		high: number;
		medium: number;
		low: number;
	};
}

/**
 * Lesson recommendations mapped to Triad levels
 */
const LESSON_MAP = {
	dry: [
		{
			pathId: 'subtractive-triad',
			lessonId: 'dry-unify',
			title: 'DRY: The Discipline of Unification',
			rationale: 'Learn to identify and eliminate duplication at the implementation level.'
		},
		{
			pathId: 'subtractive-triad',
			lessonId: 'dry-patterns',
			title: 'DRY Patterns in Practice',
			rationale: 'Recognize common duplication patterns and their solutions.'
		}
	],
	rams: [
		{
			pathId: 'subtractive-triad',
			lessonId: 'rams-remove',
			title: 'Rams: Less, But Better',
			rationale: 'Understand the discipline of removing what does not earn its existence.'
		},
		{
			pathId: 'subtractive-triad',
			lessonId: 'rams-justification',
			title: 'The Justification Question',
			rationale: 'Every artifact must answer: "Does this earn its existence?"'
		}
	],
	heidegger: [
		{
			pathId: 'subtractive-triad',
			lessonId: 'heidegger-reconnect',
			title: 'Heidegger: The Hermeneutic Circle',
			rationale: 'Learn how parts and whole mutually define each other.'
		},
		{
			pathId: 'subtractive-triad',
			lessonId: 'heidegger-system',
			title: 'System Coherence',
			rationale: 'Every component must serve the whole, or be reconnected until it does.'
		}
	]
};

/**
 * Load and analyze audit history
 */
function analyzeAuditHistory(auditPath: string): {
	weakestLevel: 'dry' | 'rams' | 'heidegger';
	currentScores: { dry: number; rams: number; heidegger: number };
	trend: 'improving' | 'declining' | 'stable';
	recentViolations: { total: number; critical: number; high: number };
} | null {
	try {
		if (!existsSync(auditPath)) {
			return null;
		}

		const content = readFileSync(auditPath, 'utf-8');
		const history = JSON.parse(content) as AuditEntry[];

		if (history.length === 0) {
			return null;
		}

		// Get most recent entry
		const latest = history[history.length - 1];
		const currentScores = {
			dry: latest.scores.dry,
			rams: latest.scores.rams,
			heidegger: latest.scores.heidegger
		};

		// Find weakest level
		const weakestLevel =
			currentScores.dry <= currentScores.rams && currentScores.dry <= currentScores.heidegger
				? 'dry'
				: currentScores.rams <= currentScores.heidegger
					? 'rams'
					: 'heidegger';

		// Calculate trend (compare last 5 entries)
		let trend: 'improving' | 'declining' | 'stable' = 'stable';
		if (history.length >= 5) {
			const recent5 = history.slice(-5);
			const avgRecent = recent5.reduce((sum, e) => sum + e.scores.overall, 0) / 5;

			const previous5 = history.slice(-10, -5);
			if (previous5.length >= 5) {
				const avgPrevious = previous5.reduce((sum, e) => sum + e.scores.overall, 0) / 5;
				const delta = avgRecent - avgPrevious;

				if (delta > 0.5) trend = 'improving';
				else if (delta < -0.5) trend = 'declining';
			}
		}

		return {
			weakestLevel,
			currentScores,
			trend,
			recentViolations: {
				total: latest.violations.total,
				critical: latest.violations.critical,
				high: latest.violations.high
			}
		};
	} catch (error) {
		console.error('Error analyzing audit history:', error);
		return null;
	}
}

export async function handleRecommend(
	args: Record<string, unknown>
): Promise<{ type: 'text'; text: string }[]> {
	const auditPath = (args.auditPath as string) || '.triad-audit/history.json';
	const limit = (args.limit as number) || 3;

	// Resolve to absolute path if relative
	const resolvedPath = auditPath.startsWith('/')
		? auditPath
		: join(process.cwd(), auditPath);

	const analysis = analyzeAuditHistory(resolvedPath);

	if (!analysis) {
		return [
			{
				type: 'text' as const,
				text: `# No Audit History Found

Could not find or parse audit history at: \`${auditPath}\`

To get personalized recommendations:
1. Run \`triad-audit\` on your codebase
2. Use this tool to identify weakest areas
3. Follow recommended lessons

Or explore all lessons with \`learn_status\`.`
			}
		];
	}

	const { weakestLevel, currentScores, trend, recentViolations } = analysis;

	// Get recommendations for weakest level
	const recommendations = LESSON_MAP[weakestLevel].slice(0, limit);

	const trendEmoji = {
		improving: '📈',
		declining: '📉',
		stable: '➡️'
	}[trend];

	const scoresSummary = `
**DRY**: ${currentScores.dry}/10
**Rams**: ${currentScores.rams}/10
**Heidegger**: ${currentScores.heidegger}/10
`.trim();

	const recommendationsList = recommendations
		.map(
			(rec, idx) => `
${idx + 1}. **${rec.title}**
   - Path: \`${rec.pathId}\`
   - Lesson: \`${rec.lessonId}\`
   - Rationale: ${rec.rationale}

   *Access with*: \`learn_lesson pathId="${rec.pathId}" lessonId="${rec.lessonId}"\`
`
		)
		.join('\n');

	return [
		{
			type: 'text' as const,
			text: `# Lesson Recommendations

Based on your recent Triad audit scores.

## Current Scores

${scoresSummary}

**Trend**: ${trendEmoji} ${trend}
**Violations**: ${recentViolations.total} total (${recentViolations.critical} critical, ${recentViolations.high} high)

## Weakest Area: ${weakestLevel.toUpperCase()}

Your ${weakestLevel} score is lowest. Here are recommended lessons:

${recommendationsList}

---

**Next Steps**:
1. Start with the first recommended lesson
2. Complete the praxis exercise
3. Run \`triad-audit\` again to measure improvement
4. Use \`learn_analyze_reflection\` to track your insights

*Audit file*: \`${auditPath}\``
		}
	];
}
