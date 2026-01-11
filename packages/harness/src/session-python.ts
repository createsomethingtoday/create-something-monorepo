/**
 * Python Agent Bridge
 *
 * Connects TypeScript harness to Python agent server.
 * Enables hybrid architecture: Cloudflare for routing, Python for compute.
 */

import type { BeadsIssue } from './types.js';

// Agent server configuration
const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:8000';
const AGENT_API_KEY = process.env.AGENT_API_KEY || '';

/**
 * Result from Python agent execution
 */
export interface PythonAgentResult {
	success: boolean;
	output: string;
	model: string;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
	toolCalls: Record<string, unknown>[];
	iterations: number;
	runId: string;
	timestamp: string;
}

/**
 * Session result compatible with harness
 */
export interface SessionResult {
	outcome: 'success' | 'failed' | 'partial';
	model: string;
	costUsd: number;
	numTurns: number;
	summary: string;
	runId?: string;
}

/**
 * Session options for Python agent
 */
export interface SessionOptions {
	maxTurns?: number;
	skills?: string[];
	agentType?: string;
	model?: string;
	ralphConfig?: {
		prompt: string;
		maxIterations: number;
		completionPromise?: string;
	};
}

/**
 * Run a session with Python agent server.
 *
 * This bridges the TypeScript harness to Python agent execution,
 * enabling the hybrid architecture where Cloudflare handles routing
 * and Python handles actual agent compute.
 *
 * @param issue - Beads issue to work on
 * @param options - Session configuration
 * @returns Session result
 */
export async function runSessionWithPython(
	issue: BeadsIssue,
	options: SessionOptions = {}
): Promise<SessionResult> {
	// Build task from issue
	const task = buildTaskFromIssue(issue);

	// Detect agent type from labels
	const agentType = options.agentType || detectAgentType(issue);

	// Extract skills from labels
	const skills = options.skills || extractSkillsFromLabels(issue.labels);

	// Build request body
	const body = {
		task,
		agent_type: agentType,
		model: options.model || 'claude-sonnet-4-20250514',
		skills,
		max_turns: options.maxTurns || 50,
		ralph_config: options.ralphConfig,
	};

	try {
		const response = await fetch(`${AGENT_SERVER_URL}/run`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(AGENT_API_KEY && { Authorization: `Bearer ${AGENT_API_KEY}` }),
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			throw new Error(`Agent server returned ${response.status}: ${response.statusText}`);
		}

		const result = (await response.json()) as {
			success: boolean;
			output: string;
			model: string;
			input_tokens: number;
			output_tokens: number;
			cost_usd: number;
			tool_calls: Record<string, unknown>[];
			iterations: number;
			run_id: string;
			timestamp: string;
		};

		return {
			outcome: result.success ? 'success' : 'failed',
			model: result.model,
			costUsd: result.cost_usd,
			numTurns: result.iterations,
			summary: result.output.slice(0, 500),
			runId: result.run_id,
		};
	} catch (error) {
		console.error('Python agent session failed:', error);
		return {
			outcome: 'failed',
			model: options.model || 'claude-sonnet-4-20250514',
			costUsd: 0,
			numTurns: 0,
			summary: `Agent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}

/**
 * Build task description from Beads issue
 */
function buildTaskFromIssue(issue: BeadsIssue): string {
	let task = issue.title;

	if (issue.description) {
		task += '\n\n' + issue.description;
	}

	// Add acceptance criteria if present (from seed metadata)
	const acceptance = issue.metadata?.seed?.acceptance;
	if (acceptance && acceptance.length > 0) {
		task += '\n\n## Acceptance Criteria\n';
		task += acceptance.map((a) => `- ${a.test}${a.verify ? ` (verify: ${a.verify})` : ''}`).join('\n');
	}

	return task;
}

/**
 * Detect agent type from issue labels
 */
function detectAgentType(issue: BeadsIssue): string {
	const labels = issue.labels || [];

	if (labels.includes('template-deploy') || labels.includes('deploy')) {
		return 'template-deployer';
	}

	if (labels.includes('content') || labels.includes('paper') || labels.includes('lesson')) {
		return 'content';
	}

	if (labels.includes('research') || labels.includes('explore')) {
		return 'research';
	}

	return 'default';
}

/**
 * Extract skill names from labels
 *
 * Convention: labels prefixed with "skill:" map to skills
 * e.g., "skill:cloudflare-patterns" -> "cloudflare-patterns"
 */
function extractSkillsFromLabels(labels: string[]): string[] {
	const skills: string[] = [];

	for (const label of labels) {
		if (label.startsWith('skill:')) {
			skills.push(label.slice(6)); // Remove "skill:" prefix
		}
	}

	// Default skills based on scope labels
	if (labels.includes('io')) {
		skills.push('voice-canon');
	}

	if (labels.includes('space')) {
		skills.push('sveltekit-conventions', 'css-canon');
	}

	if (labels.includes('agency')) {
		skills.push('cloudflare-patterns');
	}

	return [...new Set(skills)]; // Deduplicate
}

/**
 * Check if Python agent server is available
 */
export async function checkPythonAgentHealth(): Promise<boolean> {
	try {
		const response = await fetch(`${AGENT_SERVER_URL}/health`, {
			method: 'GET',
			headers: {
				...(AGENT_API_KEY && { Authorization: `Bearer ${AGENT_API_KEY}` }),
			},
		});

		if (response.ok) {
			const data = (await response.json()) as { status: string };
			return data.status === 'ok';
		}

		return false;
	} catch {
		return false;
	}
}

/**
 * Get Python agent server info
 */
export async function getPythonAgentInfo(): Promise<Record<string, string> | null> {
	try {
		const response = await fetch(`${AGENT_SERVER_URL}/`, {
			method: 'GET',
			headers: {
				...(AGENT_API_KEY && { Authorization: `Bearer ${AGENT_API_KEY}` }),
			},
		});

		if (response.ok) {
			return (await response.json()) as Record<string, string>;
		}

		return null;
	} catch {
		return null;
	}
}
