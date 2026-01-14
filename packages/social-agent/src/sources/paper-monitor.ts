/**
 * Paper Monitor
 *
 * Watches for new papers and experiments on createsomething.io.
 * Generates ideas to promote new research.
 */

import type { SourceMonitor, IdeaCandidate } from '../types';

// Papers that should be promoted on social media
const PAPER_ROUTES = [
	'/papers/norvig-partnership',
	'/papers/harness-agent-sdk-migration',
	'/papers/subtractive-triad',
	'/papers/zuhandenheit-tooling'
];

// Experiments that make good social content
const EXPERIMENT_PATTERNS = [
	'nba-live',
	'hermeneutic-debugging',
	'workway-canon-audit',
	'threshold-dwelling',
	'subtractive-form'
];

export class PaperMonitor implements SourceMonitor {
	name = 'paper';
	private knownPapers: Set<string> = new Set();
	private baseUrl: string;

	constructor(baseUrl = 'https://createsomething.io') {
		this.baseUrl = baseUrl;
	}

	/**
	 * Poll for new papers/experiments
	 *
	 * In production, this would:
	 * 1. Fetch the papers index from createsomething.io/api/papers
	 * 2. Compare against known papers
	 * 3. Generate ideas for new ones
	 */
	async poll(): Promise<IdeaCandidate[]> {
		// In production, fetch from API
		// For now, return empty - new papers trigger manually or via webhook
		return [];
	}

	/**
	 * Analyze a new paper and generate an idea
	 * Called when a new paper is published
	 */
	analyzePaper(paper: PaperInfo): IdeaCandidate {
		const priority = this.calculatePaperPriority(paper);

		return {
			source: 'paper',
			sourceId: `paper:${paper.slug}`,
			rawContent: this.generateRawContent(paper),
			suggestedPlatforms: ['linkedin', 'twitter'],
			priority,
			metadata: {
				slug: paper.slug,
				title: paper.title,
				abstract: paper.abstract,
				url: `${this.baseUrl}/papers/${paper.slug}`
			}
		};
	}

	/**
	 * Analyze a new experiment
	 */
	analyzeExperiment(experiment: ExperimentInfo): IdeaCandidate {
		const priority = this.calculateExperimentPriority(experiment);

		return {
			source: 'paper',
			sourceId: `experiment:${experiment.slug}`,
			rawContent: this.generateExperimentContent(experiment),
			suggestedPlatforms: ['linkedin', 'twitter'],
			priority,
			metadata: {
				slug: experiment.slug,
				title: experiment.title,
				url: `${this.baseUrl}/experiments/${experiment.slug}`,
				type: 'experiment'
			}
		};
	}

	/**
	 * Calculate priority based on paper content
	 */
	private calculatePaperPriority(paper: PaperInfo): number {
		let priority = 50;

		// Boost for papers with metrics
		if (/\d+%|\$\d+|\d+x/.test(paper.abstract || '')) {
			priority += 15;
		}

		// Boost for papers about methodology
		if (/triad|methodology|framework|pattern/i.test(paper.title)) {
			priority += 10;
		}

		// Boost for papers with case studies
		if (/case study|experiment|results/i.test(paper.title)) {
			priority += 10;
		}

		return Math.min(100, priority);
	}

	/**
	 * Calculate priority based on experiment content
	 */
	private calculateExperimentPriority(experiment: ExperimentInfo): number {
		let priority = 45;

		// Boost for interactive experiments
		if (experiment.interactive) {
			priority += 15;
		}

		// Boost for experiments with visual output
		if (experiment.hasVisualization) {
			priority += 10;
		}

		// Boost for featured experiments
		if (EXPERIMENT_PATTERNS.some((p) => experiment.slug.includes(p))) {
			priority += 20;
		}

		return Math.min(100, priority);
	}

	/**
	 * Generate raw content from paper details
	 */
	private generateRawContent(paper: PaperInfo): string {
		return `
Type: Research Paper
Title: ${paper.title}
URL: ${this.baseUrl}/papers/${paper.slug}
${paper.abstract ? `Abstract: ${paper.abstract}` : ''}

Generate a social post that:
- Announces the new paper
- Shares the key insight or finding
- Provides a teaser that makes people want to read more
- Links to the full paper (in comment for LinkedIn)
`.trim();
	}

	/**
	 * Generate raw content from experiment details
	 */
	private generateExperimentContent(experiment: ExperimentInfo): string {
		return `
Type: Interactive Experiment
Title: ${experiment.title}
URL: ${this.baseUrl}/experiments/${experiment.slug}
${experiment.description ? `Description: ${experiment.description}` : ''}

Generate a social post that:
- Invites people to try the experiment
- Explains what insight it demonstrates
- Includes a specific call-to-action
- For Twitter: make it a thread showing the experiment in action
`.trim();
	}

	/**
	 * Mark a paper as known (to avoid duplicate promotion)
	 */
	markKnown(slug: string): void {
		this.knownPapers.add(slug);
	}

	/**
	 * Check if a paper has been promoted
	 */
	isKnown(slug: string): boolean {
		return this.knownPapers.has(slug);
	}
}

// =============================================================================
// Types
// =============================================================================

interface PaperInfo {
	slug: string;
	title: string;
	abstract?: string;
	authors?: string[];
	publishedAt?: string;
}

interface ExperimentInfo {
	slug: string;
	title: string;
	description?: string;
	interactive?: boolean;
	hasVisualization?: boolean;
}
