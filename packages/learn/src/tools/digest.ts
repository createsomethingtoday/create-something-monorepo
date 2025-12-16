/**
 * Digest Tool
 *
 * Generate weekly audit summary with trends and recommendations.
 * Canon: The digest reveals patterns across time.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getReflectionStats } from '../reflection/storage.js';

export const digestTool: Tool = {
	name: 'learn_digest',
	description: `Generate a weekly Triad audit digest.

Analyzes audit history and reflections to provide:
- Score trends (improving/declining/stable)
- Violation patterns
- Reflection coverage
- Prioritized recommendations

Returns a comprehensive weekly summary.

Example:
{
  "auditPath": ".triad-audit/history.json",
  "days": 7
}`,
	inputSchema: {
		type: 'object' as const,
		properties: {
			auditPath: {
				type: 'string',
				description: 'Path to triad-audit history.json file (default: .triad-audit/history.json)'
			},
			days: {
				type: 'number',
				description: 'Number of days to include in digest (default: 7)'
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
 * Analyze audit entries within time window
 */
function analyzeAuditWindow(
	entries: AuditEntry[],
	days: number
): {
	avgScores: { dry: number; rams: number; heidegger: number; overall: number };
	trend: { dry: number; rams: number; heidegger: number; overall: number };
	totalViolations: number;
	criticalViolations: number;
	auditCount: number;
} | null {
	if (entries.length === 0) return null;

	const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
	const recentEntries = entries.filter(
		(e) => new Date(e.timestamp).getTime() >= cutoffTime
	);

	if (recentEntries.length === 0) return null;

	// Calculate averages
	const avgScores = recentEntries.reduce(
		(acc, e) => {
			acc.dry += e.scores.dry;
			acc.rams += e.scores.rams;
			acc.heidegger += e.scores.heidegger;
			acc.overall += e.scores.overall;
			return acc;
		},
		{ dry: 0, rams: 0, heidegger: 0, overall: 0 }
	);

	const count = recentEntries.length;
	avgScores.dry /= count;
	avgScores.rams /= count;
	avgScores.heidegger /= count;
	avgScores.overall /= count;

	// Calculate trend (first half vs second half)
	const trend = { dry: 0, rams: 0, heidegger: 0, overall: 0 };
	if (count >= 4) {
		const midpoint = Math.floor(count / 2);
		const firstHalf = recentEntries.slice(0, midpoint);
		const secondHalf = recentEntries.slice(midpoint);

		const avgFirst = firstHalf.reduce(
			(acc, e) => {
				acc.dry += e.scores.dry;
				acc.rams += e.scores.rams;
				acc.heidegger += e.scores.heidegger;
				acc.overall += e.scores.overall;
				return acc;
			},
			{ dry: 0, rams: 0, heidegger: 0, overall: 0 }
		);
		avgFirst.dry /= firstHalf.length;
		avgFirst.rams /= firstHalf.length;
		avgFirst.heidegger /= firstHalf.length;
		avgFirst.overall /= firstHalf.length;

		const avgSecond = secondHalf.reduce(
			(acc, e) => {
				acc.dry += e.scores.dry;
				acc.rams += e.scores.rams;
				acc.heidegger += e.scores.heidegger;
				acc.overall += e.scores.overall;
				return acc;
			},
			{ dry: 0, rams: 0, heidegger: 0, overall: 0 }
		);
		avgSecond.dry /= secondHalf.length;
		avgSecond.rams /= secondHalf.length;
		avgSecond.heidegger /= secondHalf.length;
		avgSecond.overall /= secondHalf.length;

		trend.dry = avgSecond.dry - avgFirst.dry;
		trend.rams = avgSecond.rams - avgFirst.rams;
		trend.heidegger = avgSecond.heidegger - avgFirst.heidegger;
		trend.overall = avgSecond.overall - avgFirst.overall;
	}

	// Sum violations
	const totalViolations = recentEntries.reduce((sum, e) => sum + e.violations.total, 0);
	const criticalViolations = recentEntries.reduce((sum, e) => sum + e.violations.critical, 0);

	return {
		avgScores,
		trend,
		totalViolations,
		criticalViolations,
		auditCount: count
	};
}

/**
 * Format trend indicator
 */
function formatTrend(value: number): string {
	if (value > 0.5) return `📈 +${value.toFixed(1)}`;
	if (value < -0.5) return `📉 ${value.toFixed(1)}`;
	return `➡️ ${value >= 0 ? '+' : ''}${value.toFixed(1)}`;
}

export async function handleDigest(
	args: Record<string, unknown>
): Promise<{ type: 'text'; text: string }[]> {
	const auditPath = (args.auditPath as string) || '.triad-audit/history.json';
	const days = (args.days as number) || 7;

	// Resolve to absolute path if relative
	const resolvedPath = auditPath.startsWith('/')
		? auditPath
		: join(process.cwd(), auditPath);

	// Load audit history
	let auditAnalysis = null;
	if (existsSync(resolvedPath)) {
		try {
			const content = readFileSync(resolvedPath, 'utf-8');
			const history = JSON.parse(content) as AuditEntry[];
			auditAnalysis = analyzeAuditWindow(history, days);
		} catch (error) {
			console.error('Error reading audit history:', error);
		}
	}

	// Load reflection stats
	const reflectionStats = getReflectionStats();

	// Generate digest
	let digest = `# Weekly Triad Digest\n\n`;
	digest += `**Period**: Last ${days} days\n\n`;
	digest += `---\n\n`;

	// Audit summary
	if (auditAnalysis) {
		digest += `## Audit Summary\n\n`;
		digest += `**Audits Run**: ${auditAnalysis.auditCount}\n`;
		digest += `**Total Violations**: ${auditAnalysis.totalViolations}\n`;
		digest += `**Critical Violations**: ${auditAnalysis.criticalViolations}\n\n`;

		digest += `### Average Scores\n\n`;
		digest += `| Level | Score | Trend |\n`;
		digest += `|-------|-------|-------|\n`;
		digest += `| DRY | ${auditAnalysis.avgScores.dry.toFixed(1)}/10 | ${formatTrend(auditAnalysis.trend.dry)} |\n`;
		digest += `| Rams | ${auditAnalysis.avgScores.rams.toFixed(1)}/10 | ${formatTrend(auditAnalysis.trend.rams)} |\n`;
		digest += `| Heidegger | ${auditAnalysis.avgScores.heidegger.toFixed(1)}/10 | ${formatTrend(auditAnalysis.trend.heidegger)} |\n`;
		digest += `| **Overall** | **${auditAnalysis.avgScores.overall.toFixed(1)}/10** | **${formatTrend(auditAnalysis.trend.overall)}** |\n\n`;
	} else {
		digest += `## Audit Summary\n\n`;
		digest += `*No audit data found for the last ${days} days.*\n\n`;
		digest += `Run \`triad-audit\` on your codebase to track methodology adherence.\n\n`;
	}

	digest += `---\n\n`;

	// Reflection summary
	digest += `## Reflection Summary\n\n`;
	if (reflectionStats.totalReflections > 0) {
		digest += `**Total Reflections**: ${reflectionStats.totalReflections}\n`;
		digest += `**Average Score**: ${reflectionStats.averageScore.toFixed(1)}/100\n\n`;

		digest += `### Depth Distribution\n\n`;
		digest += `- 🌊 **Surface**: ${reflectionStats.depthDistribution.surface} (${((reflectionStats.depthDistribution.surface / reflectionStats.totalReflections) * 100).toFixed(0)}%)\n`;
		digest += `- 🔧 **Applied**: ${reflectionStats.depthDistribution.applied} (${((reflectionStats.depthDistribution.applied / reflectionStats.totalReflections) * 100).toFixed(0)}%)\n`;
		digest += `- 🧬 **Integrated**: ${reflectionStats.depthDistribution.integrated} (${((reflectionStats.depthDistribution.integrated / reflectionStats.totalReflections) * 100).toFixed(0)}%)\n\n`;

		digest += `### Triad Coverage\n\n`;
		digest += `Reflections mentioning each level:\n`;
		digest += `- **DRY**: ${reflectionStats.triadCoverage.dry} (${((reflectionStats.triadCoverage.dry / reflectionStats.totalReflections) * 100).toFixed(0)}%)\n`;
		digest += `- **Rams**: ${reflectionStats.triadCoverage.rams} (${((reflectionStats.triadCoverage.rams / reflectionStats.totalReflections) * 100).toFixed(0)}%)\n`;
		digest += `- **Heidegger**: ${reflectionStats.triadCoverage.heidegger} (${((reflectionStats.triadCoverage.heidegger / reflectionStats.totalReflections) * 100).toFixed(0)}%)\n\n`;
	} else {
		digest += `*No reflections recorded yet.*\n\n`;
		digest += `Use \`learn_analyze_reflection\` to analyze and store your insights.\n\n`;
	}

	digest += `---\n\n`;

	// Recommendations
	digest += `## Recommendations\n\n`;

	if (auditAnalysis) {
		const weakest =
			auditAnalysis.avgScores.dry <= auditAnalysis.avgScores.rams &&
			auditAnalysis.avgScores.dry <= auditAnalysis.avgScores.heidegger
				? 'DRY'
				: auditAnalysis.avgScores.rams <= auditAnalysis.avgScores.heidegger
					? 'Rams'
					: 'Heidegger';

		digest += `### Focus Area: ${weakest}\n\n`;
		digest += `Your ${weakest} score is lowest. Consider:\n\n`;

		if (weakest === 'DRY') {
			digest += `1. Use \`learn_recommend\` to get DRY-focused lessons\n`;
			digest += `2. Review codebase for duplication patterns\n`;
			digest += `3. Practice unification refactorings\n`;
		} else if (weakest === 'Rams') {
			digest += `1. Use \`learn_recommend\` to get Rams-focused lessons\n`;
			digest += `2. Audit features: what can be removed?\n`;
			digest += `3. Apply the justification question to each component\n`;
		} else {
			digest += `1. Use \`learn_recommend\` to get Heidegger-focused lessons\n`;
			digest += `2. Map system relationships\n`;
			digest += `3. Ask how each part serves the whole\n`;
		}
	} else {
		digest += `1. Run \`triad-audit\` to establish baseline\n`;
		digest += `2. Use \`learn_recommend\` for personalized lessons\n`;
		digest += `3. Track reflections with \`learn_analyze_reflection\`\n`;
	}

	digest += `\n---\n\n`;
	digest += `**Next Digest**: Run this tool again in ${days} days to track progress.\n`;

	return [{ type: 'text' as const, text: digest }];
}
