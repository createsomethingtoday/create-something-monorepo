/**
 * The Circle Closes - Data Loader
 *
 * Loads data for the hermeneutic circle experiment:
 * - Triad audit scores (self-audit)
 * - Circle state (connections between properties)
 * - Evidence (practice validating principles)
 *
 * "The tool reveals its own concealment."
 */

import type { PageServerLoad } from './$types';

interface AuditData {
	scores: {
		dry: number;
		rams: number;
		heidegger: number;
		overall: number;
	};
	summary: {
		criticalCount: number;
		highCount: number;
		mediumCount: number;
		lowCount: number;
		totalViolations: number;
	};
	storedAt?: number;
	commitHash?: string;
	isSelfAudit?: boolean;
}

interface CircleNode {
	domain: 'ltd' | 'io' | 'space' | 'agency';
	count: number;
	active: boolean;
	label: string;
	sublabel: string;
}

interface CircleEdge {
	from: 'ltd' | 'io' | 'space' | 'agency';
	to: 'ltd' | 'io' | 'space' | 'agency';
	strength: number;
}

interface CircleState {
	nodes: CircleNode[];
	edges: CircleEdge[];
	lastUpdated: number;
}

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

export const load: PageServerLoad = async ({ platform, fetch }) => {
	const kv = platform?.env?.CIRCLE_DATA;
	const db = platform?.env?.DB;

	// Initialize with empty/loading states
	let auditData: AuditData | null = null;
	let selfAuditData: AuditData | null = null;
	let circleState: CircleState | null = null;
	let evidence: PrincipleEvidence[] = [];

	try {
		// Load audit data from KV
		if (kv) {
			const [auditRaw, selfAuditRaw] = await Promise.all([
				kv.get('audit:latest', 'json'),
				kv.get('audit:self:latest', 'json')
			]);
			auditData = auditRaw as AuditData | null;
			selfAuditData = selfAuditRaw as AuditData | null;
		}

		// Load circle state from API (which handles caching)
		const circleResponse = await fetch('/api/circle');
		if (circleResponse.ok) {
			circleState = await circleResponse.json();
		}

		// Load evidence from .space API
		// Note: In production, this would be a cross-origin fetch or KV cache
		// For now, we'll try to fetch and fall back to empty if it fails
		try {
			const evidenceResponse = await fetch('https://createsomething.space/api/evidence');
			if (evidenceResponse.ok) {
				evidence = await evidenceResponse.json();
			}
		} catch {
			// Fall back to mock data for development
			evidence = getMockEvidence();
		}
	} catch (error) {
		console.error('Failed to load circle data:', error);
	}

	// Experiment metadata
	const experiment = {
		id: 'the-circle-closes',
		slug: 'the-circle-closes',
		title: 'The Circle Closes',
		subtitle: 'A Hermeneutic Experiment',
		description:
			'Demonstrating all three arcs of the hermeneutic circle: self-audit, visibility, and feedback. The system reveals itself through itself.',
		excerpt_short: 'The hermeneutic circle made operational',
		excerpt_long:
			'This experiment unifies three demonstrations: (1) the codebase auditing itself against its own philosophy, (2) the connections between properties made visible, and (3) evidence from practice informing the canon. Together, they prove the circle can close.',
		category: 'meta',
		tags: ['Hermeneutics', 'Heidegger', 'Self-Reference', 'The Circle'],
		reading_time_minutes: 7,
		difficulty: 'advanced',
		created_at: '2025-11-28',
		updated_at: '2025-11-28'
	};

	return {
		experiment,
		auditData,
		selfAuditData,
		circleState,
		evidence
	};
};

// Mock evidence for development/fallback
function getMockEvidence(): PrincipleEvidence[] {
	return [
		{
			principleId: 'rams-10',
			experiments: [
				{
					slug: 'motion-ontology',
					title: 'Motion Ontology',
					executionCount: 47,
					completionRate: 0.82,
					avgTimeSeconds: 245,
					errorRate: 0.05
				},
				{
					slug: 'minimal-capture',
					title: 'Minimal Capture',
					executionCount: 23,
					completionRate: 0.91,
					avgTimeSeconds: 180,
					errorRate: 0.02
				}
			],
			totalExecutions: 70,
			avgCompletionRate: 0.85,
			status: 'corroborating'
		},
		{
			principleId: 'rams-5',
			experiments: [
				{
					slug: 'motion-ontology',
					title: 'Motion Ontology',
					executionCount: 47,
					completionRate: 0.82,
					avgTimeSeconds: 245,
					errorRate: 0.05
				}
			],
			totalExecutions: 47,
			avgCompletionRate: 0.82,
			status: 'corroborating'
		}
	];
}
