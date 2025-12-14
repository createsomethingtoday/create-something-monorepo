/**
 * Praxis Tool
 *
 * Execute praxis exercises with automated triad-audit and reflection.
 * Canon: Understanding emerges through practice, not passive reading.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { isAuthenticated, loadAuth } from '../auth/storage.js';
import { LMSClient } from '../client/lms-api.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const praxisTool: Tool = {
	name: 'learn_praxis',
	description: `Execute a praxis exercise.

Praxis exercises apply learning through hands-on practice:
1. Run automated triad-audit on your current work
2. Reflect on what the audit reveals
3. Submit your reflection for progress tracking

The hermeneutic spiral: reading → practice → reflection → deeper reading.`,
	inputSchema: {
		type: 'object' as const,
		properties: {
			praxisId: {
				type: 'string',
				description: 'The praxis exercise ID (from learn_lesson output)'
			},
			targetPath: {
				type: 'string',
				description: 'Path to audit (defaults to current directory)'
			},
			reflection: {
				type: 'string',
				description: 'Your reflection on the audit results (minimum 100 characters)'
			}
		},
		required: ['praxisId', 'reflection']
	}
};

const MIN_REFLECTION_LENGTH = 100;

interface AuditResult {
	scores: {
		dry: number;
		rams: number;
		heidegger: number;
		overall: number;
	};
	violations: Array<{
		level: string;
		severity: string;
		message: string;
		file?: string;
	}>;
	summary: string;
}

async function runTriadAudit(targetPath: string): Promise<AuditResult | null> {
	try {
		// Try to run triad-audit if available
		const { stdout } = await execAsync(`npx triad-audit "${targetPath}" --json`, {
			timeout: 60000 // 1 minute timeout
		});

		return JSON.parse(stdout);
	} catch {
		// triad-audit not available or failed
		return null;
	}
}

function formatAuditResult(audit: AuditResult): string {
	const { scores, violations } = audit;

	const highViolations = violations.filter((v) => v.severity === 'high');
	const mediumViolations = violations.filter((v) => v.severity === 'medium');

	let result = `## Triad Audit Results

| Level | Score |
|-------|-------|
| DRY (Implementation) | ${scores.dry.toFixed(1)} |
| Rams (Artifact) | ${scores.rams.toFixed(1)} |
| Heidegger (System) | ${scores.heidegger.toFixed(1)} |
| **Overall** | **${scores.overall.toFixed(1)}** |

`;

	if (highViolations.length > 0) {
		result += `### High Priority Violations\n\n`;
		for (const v of highViolations.slice(0, 5)) {
			result += `- **${v.level}**: ${v.message}${v.file ? ` (${v.file})` : ''}\n`;
		}
		if (highViolations.length > 5) {
			result += `- ... and ${highViolations.length - 5} more\n`;
		}
		result += '\n';
	}

	if (mediumViolations.length > 0) {
		result += `### Medium Priority Violations\n\n`;
		for (const v of mediumViolations.slice(0, 3)) {
			result += `- **${v.level}**: ${v.message}${v.file ? ` (${v.file})` : ''}\n`;
		}
		if (mediumViolations.length > 3) {
			result += `- ... and ${mediumViolations.length - 3} more\n`;
		}
		result += '\n';
	}

	if (violations.length === 0) {
		result += `No violations detected. Your code aligns with the Subtractive Triad.\n\n`;
	}

	return result;
}

export async function handlePraxis(
	args: Record<string, unknown> | undefined
): Promise<{ type: 'text'; text: string }[]> {
	if (!isAuthenticated()) {
		return [
			{
				type: 'text' as const,
				text: `# Not Authenticated

Run \`learn_authenticate\` with your email to start.`
			}
		];
	}

	const auth = loadAuth();
	if (!auth) {
		return [
			{
				type: 'text' as const,
				text: 'Error: Failed to load authentication state.'
			}
		];
	}

	const praxisId = args?.praxisId as string;
	const targetPath = (args?.targetPath as string) || process.cwd();
	const reflection = args?.reflection as string;

	if (!praxisId) {
		return [
			{
				type: 'text' as const,
				text: 'Error: praxisId is required. Get it from the lesson output.'
			}
		];
	}

	if (!reflection || reflection.length < MIN_REFLECTION_LENGTH) {
		return [
			{
				type: 'text' as const,
				text: `# Reflection Required

Praxis requires a reflection of at least ${MIN_REFLECTION_LENGTH} characters.

A good praxis reflection addresses:
- **What the audit revealed**: Patterns you hadn't noticed
- **Connection to the lesson**: How theory became practice
- **Intended changes**: Specific improvements you'll make
- **Remaining questions**: What you're still uncertain about

Example:
"The triad-audit revealed 3 DRY violations I hadn't noticed—constants duplicated across components. This connects to the lesson's point about 'Have I built this before?' being the first question. I'll consolidate these into a shared constants file. I'm still unclear on how to distinguish between helpful abstraction and premature DRY optimization."`
			}
		];
	}

	// Run triad-audit
	const auditResult = await runTriadAudit(targetPath);

	try {
		const client = new LMSClient(auth.tokens);

		// Start the praxis attempt
		await client.startPraxis(praxisId);

		// Submit with audit data
		const submission = {
			reflection,
			auditScores: auditResult?.scores,
			auditViolationCount: auditResult?.violations.length ?? 0,
			targetPath
		};

		// Calculate score and pass status based on reflection quality
		const score = Math.min(100, reflection.length / 5); // Simple heuristic
		const passed = reflection.length >= MIN_REFLECTION_LENGTH;
		const feedback = auditResult
			? `Audit score: ${auditResult.scores.overall.toFixed(1)}/10`
			: 'Run with triad-audit for detailed feedback';

		await client.submitPraxis(praxisId, submission, feedback, score, passed);

		let response = `# Praxis Complete ✓

**Exercise**: ${praxisId}
**Target**: ${targetPath}

`;

		if (auditResult) {
			response += formatAuditResult(auditResult);
		} else {
			response += `## Audit

triad-audit not available. Install with: \`npm install -g @create-something/triad-audit\`

`;
		}

		response += `## Your Reflection

${reflection}

---

`;

		response += `Use \`learn_status\` to see your updated progress.
Use \`learn_lesson\` to continue learning.`;

		return [
			{
				type: 'text' as const,
				text: response
			}
		];
	} catch (error) {
		return [
			{
				type: 'text' as const,
				text: `Error submitting praxis: ${error instanceof Error ? error.message : 'Unknown error'}`
			}
		];
	}
}
