/**
 * Evidence Collection API
 *
 * Aggregates experiment execution metrics by principle.
 * Part of "The Circle Closes" experiment - the feedback arc
 * where practice informs philosophy.
 *
 * Returns evidence for which principles are being validated
 * through experimental practice.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fileBasedExperiments } from '$lib/config/fileBasedExperiments';

// CORS headers for cross-origin requests from .ltd
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

// Handle preflight requests
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { headers: corsHeaders });
};

interface PrincipleEvidence {
	principleId: string;
	experiments: {
		slug: string;
		title: string;
		executionCount: number;
		completionRate: number;
		avgTimeSeconds: number;
		errorRate: number;
	}[];
	totalExecutions: number;
	avgCompletionRate: number;
	status: 'corroborating' | 'refuting' | 'insufficient';
}

// Thresholds for evidence classification
const THRESHOLDS = {
	minExecutions: 10, // Need at least 10 executions for significance
	corroborationCompletionRate: 0.75, // 75%+ completion = corroborating
	refutationCompletionRate: 0.40 // <40% completion = refuting
};

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env?.DB;
	const kv = platform?.env?.CACHE; // Use CACHE, not CIRCLE_DATA (which is .ltd only)

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500, headers: corsHeaders });
	}

	// Optional: filter by specific principle
	const principleId = url.searchParams.get('principle');

	try {
		// Short-lived cache to reduce DB load while staying fresh
		if (kv && !principleId) {
			const cached = await kv.get('evidence:all', 'json');
			if (cached) {
				return json(cached, { headers: corsHeaders });
			}
		}

		// Build map of principle -> experiments
		const principleExperiments: Record<string, typeof fileBasedExperiments> = {};

		for (const exp of fileBasedExperiments) {
			if (exp.tests_principles) {
				for (const principle of exp.tests_principles) {
					if (!principleExperiments[principle]) {
						principleExperiments[principle] = [];
					}
					principleExperiments[principle].push(exp);
				}
			}
		}

		// Filter if specific principle requested
		const principlesToQuery = principleId
			? { [principleId]: principleExperiments[principleId] || [] }
			: principleExperiments;

		// Collect evidence for each principle
		const evidence: PrincipleEvidence[] = [];

		for (const [principle, experiments] of Object.entries(principlesToQuery)) {
			if (!experiments || experiments.length === 0) {
				continue;
			}

			const experimentEvidence: PrincipleEvidence['experiments'] = [];
			let totalExecutions = 0;
			let weightedCompletionSum = 0;

			for (const exp of experiments) {
				// Query execution stats for this experiment
				// Note: file-based experiments use their ID prefixed with 'file-'
				const stats = await db
					.prepare(
						`SELECT
							COUNT(*) as execution_count,
							AVG(CASE WHEN completed = 1 THEN 1.0 ELSE 0.0 END) as completion_rate,
							AVG(time_spent_seconds) as avg_time,
							AVG(CAST(errors_encountered AS FLOAT) / NULLIF(
								json_array_length(commands_executed), 0
							)) as error_rate
						FROM experiment_executions
						WHERE paper_id = ?`
					)
					.bind(exp.id)
					.first<{
						execution_count: number;
						completion_rate: number;
						avg_time: number;
						error_rate: number;
					}>();

				const execCount = stats?.execution_count ?? 0;
				const compRate = stats?.completion_rate ?? 0;

				experimentEvidence.push({
					slug: exp.slug,
					title: exp.title,
					executionCount: execCount,
					completionRate: compRate,
					avgTimeSeconds: stats?.avg_time ?? 0,
					errorRate: stats?.error_rate ?? 0
				});

				totalExecutions += execCount;
				weightedCompletionSum += compRate * execCount;
			}

			// Calculate aggregate metrics
			const avgCompletionRate =
				totalExecutions > 0 ? weightedCompletionSum / totalExecutions : 0;

			// Determine evidence status
			let status: PrincipleEvidence['status'] = 'insufficient';
			if (totalExecutions >= THRESHOLDS.minExecutions) {
				if (avgCompletionRate >= THRESHOLDS.corroborationCompletionRate) {
					status = 'corroborating';
				} else if (avgCompletionRate <= THRESHOLDS.refutationCompletionRate) {
					status = 'refuting';
				}
			}

			evidence.push({
				principleId: principle,
				experiments: experimentEvidence,
				totalExecutions,
				avgCompletionRate,
				status
			});
		}

		// Cache the full result (short TTL for now during development)
		if (kv && !principleId) {
			await kv.put('evidence:all', JSON.stringify(evidence), {
				expirationTtl: 300 // 5 minute cache
			});
		}

		return json(evidence, { headers: corsHeaders });
	} catch (error) {
		console.error('Failed to collect evidence:', error);
		return json({ error: 'Failed to collect evidence' }, { status: 500, headers: corsHeaders });
	}
};
