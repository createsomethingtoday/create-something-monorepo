/**
 * Subtractive Triad Assessment
 *
 * Questions and recommendation engine for the discovery path.
 * Maps user responses to appropriate products or services.
 *
 * Phase 2: Assessment fully routes to a single recommendation.
 * User never sees "tier" - only the appropriate offering.
 *
 * Discovery Path Flow:
 * - Complexity = Low, Budget = Learning → Products (accessible tier)
 * - Complexity = High, Budget = Implementation → Consulting (commercial tier)
 */

import type { ServiceTier } from '../data/services';

// Q1: What's accumulating in your business?
// Maps to Triad levels: implementation (DRY), artifact (Rams), system (Heidegger)
// Reduced to 3 options - one per triad level for contemplative focus
export const accumulatingOptions = [
	{
		id: 'tech_debt',
		label: 'Technical debt',
		description: 'Code, dependencies, and workarounds that compound',
		triad: 'implementation' as const
	},
	{
		id: 'process_sprawl',
		label: 'Process sprawl',
		description: 'Tools and workflows that no longer earn their place',
		triad: 'artifact' as const
	},
	{
		id: 'disconnected_systems',
		label: 'Disconnected systems',
		description: 'Parts optimizing locally while the whole suffers',
		triad: 'system' as const
	}
];

// Q3: What's stopping you from removing it?
// Maps to service recommendations
// Reduced to 3 options - core blockers that map to actionable services
export const blockerOptions = [
	{
		id: 'where_to_start',
		label: "Don't know where to start",
		description: 'The problem feels too big to approach',
		service: 'automation' as const
	},
	{
		id: 'bandwidth',
		label: 'No internal bandwidth',
		description: 'Team is already at capacity',
		service: 'partnership' as const
	},
	{
		id: 'complexity',
		label: 'Technical complexity',
		description: 'Systems are interconnected and fragile',
		service: 'agentic-systems' as const
	}
];

export type TriadLevel = 'implementation' | 'artifact' | 'system';

// All offering IDs (products + consulting services)
export type OfferingType =
	// Products (accessible tier)
	| 'ai-readiness-assessment'
	| 'triad-audit-template'
	| 'canon-css-starter'
	| 'vertical-templates'
	| 'automation-recipes'
	| 'agent-in-a-box'
	// Consulting services (commercial tier)
	| 'advisory'
	| 'transformation'
	| 'automation'
	| 'partnership'
	| 'agentic-systems'
	| 'web-development';

// Legacy alias for backward compatibility
export type ServiceType = OfferingType;

export interface AssessmentAnswers {
	accumulating: string[];
	removalInsight: string;
	blockers: string[];
}

export interface AssessmentAnalysis {
	triadLevel: TriadLevel;
	primaryBlocker: string;
	complexity: 'simple' | 'moderate' | 'complex';
	tier: ServiceTier; // Phase 2: Determined tier
}

export interface AssessmentRecommendation {
	offering: OfferingType; // Renamed from 'service' for clarity
	service: OfferingType; // Legacy alias
	offeringName: string;
	serviceName: string; // Legacy alias
	caseStudy: string;
	caseStudyName: string;
	headline: string;
	insight: string;
	tier: ServiceTier;
	isProductized: boolean;
}

export interface AssessmentResult {
	answers: AssessmentAnswers;
	analysis: AssessmentAnalysis;
	recommendation: AssessmentRecommendation;
}

// Service metadata for display
export const serviceMetadata: Record<
	ServiceType,
	{ name: string; description: string; caseStudy: string; caseStudyName: string }
> = {
	'web-development': {
		name: 'Web Development',
		description: 'Fast, focused web presence built on solid foundations',
		caseStudy: '/work/arc-for-gmail',
		caseStudyName: 'Arc for Gmail'
	},
	automation: {
		name: 'AI Automation Systems',
		description: 'Remove manual work through intelligent automation',
		caseStudy: '/work/viralytics',
		caseStudyName: 'Viralytics'
	},
	'agentic-systems': {
		name: 'Agentic Systems Engineering',
		description: 'Long-running AI agents that handle complexity autonomously',
		caseStudy: '/work/kickstand',
		caseStudyName: 'Kickstand'
	},
	partnership: {
		name: 'Ongoing Systems Partnership',
		description: 'Continuous optimization without adding to your team',
		caseStudy: '/work/kickstand',
		caseStudyName: 'Kickstand'
	},
	transformation: {
		name: 'AI-Native Transformation',
		description: 'Help your team embrace subtractive thinking',
		caseStudy: '/work/kickstand',
		caseStudyName: 'Kickstand'
	},
	advisory: {
		name: 'Strategic Advisory',
		description: 'Clarity on what to remove and why',
		caseStudy: '/work/kickstand',
		caseStudyName: 'Kickstand'
	}
};

// Triad level headlines
const triadHeadlines: Record<TriadLevel, string> = {
	implementation: 'You have duplication at the implementation level',
	artifact: 'Your artifacts need subtractive review',
	system: 'Your systems need reconnection'
};

// Generate personalized insight based on triad level and user's removal insight
function generateInsight(triadLevel: TriadLevel, removalInsight: string): string {
	const triadInsights: Record<TriadLevel, string> = {
		implementation:
			'The accumulation you describe points to the first question of the Subtractive Triad: "Have I built this before?" When duplication persists, it obscures what actually creates value.',
		artifact:
			'What you want to remove suggests asking: "Does this earn its existence?" Features and processes that can\'t justify themselves consume attention that belongs elsewhere.',
		system:
			'Your challenge connects to the deepest question: "Does this serve the whole?" When systems disconnect, each part optimizes locally while the whole suffers.'
	};

	return triadInsights[triadLevel];
}

// Determine complexity based on number of selections
function determineComplexity(answers: AssessmentAnswers): 'simple' | 'moderate' | 'complex' {
	const totalSelections = answers.accumulating.length + answers.blockers.length;
	if (totalSelections <= 2) return 'simple';
	if (totalSelections <= 4) return 'moderate';
	return 'complex';
}

/**
 * Analyze assessment responses and generate recommendations
 */
export function analyzeResponses(answers: AssessmentAnswers): AssessmentResult {
	// Count triad level mentions from Q1
	const triadCounts: Record<TriadLevel, number> = {
		implementation: 0,
		artifact: 0,
		system: 0
	};

	answers.accumulating.forEach((id) => {
		const option = accumulatingOptions.find((o) => o.id === id);
		if (option) {
			triadCounts[option.triad]++;
		}
	});

	// Determine primary triad level (most selected)
	const triadLevel = (Object.entries(triadCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
		'implementation') as TriadLevel;

	// Map blockers to services from Q3
	const serviceVotes: Record<string, number> = {};
	answers.blockers.forEach((id) => {
		const option = blockerOptions.find((o) => o.id === id);
		if (option) {
			serviceVotes[option.service] = (serviceVotes[option.service] || 0) + 1;
		}
	});

	// Determine recommended service (most voted)
	const service = (Object.entries(serviceVotes).sort(([, a], [, b]) => b - a)[0]?.[0] ||
		'automation') as ServiceType;

	const meta = serviceMetadata[service];
	const complexity = determineComplexity(answers);

	return {
		answers,
		analysis: {
			triadLevel,
			primaryBlocker: answers.blockers[0] || 'where_to_start',
			complexity
		},
		recommendation: {
			service,
			serviceName: meta.name,
			caseStudy: meta.caseStudy,
			caseStudyName: meta.caseStudyName,
			headline: triadHeadlines[triadLevel],
			insight: generateInsight(triadLevel, answers.removalInsight)
		}
	};
}

/**
 * Generate a unique session ID for tracking
 */
export function generateSessionId(): string {
	return `assessment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Step definitions for the assessment
 * Narrative arc: Recognition → Articulation → Resolution
 */
export const assessmentSteps = [
	{
		id: 'accumulating',
		question: "What's accumulating?",
		subtext: 'Select what resonates',
		type: 'checkbox' as const,
		options: accumulatingOptions
	},
	{
		id: 'removal',
		question: 'Name what you would remove',
		subtext: 'The thing that keeps coming up',
		type: 'text' as const,
		placeholder: 'In a sentence...',
		maxLength: 280
	},
	{
		id: 'blockers',
		question: "What's in the way?",
		subtext: 'Select the core blocker',
		type: 'checkbox' as const,
		options: blockerOptions
	}
];
