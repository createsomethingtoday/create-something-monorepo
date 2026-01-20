import type { PaperMeta } from '../types';

export const meta: PaperMeta = {
	slug: 'ground-evidence-based-claims',
	title: 'Ground: Evidence-Based Claims for AI Code Analysis',
	subtitle: 'Computation-Constrained Verification Prevents False Positives in Agentic Development',
	description:
		'A tool that blocks AI agents from claiming code is dead, duplicated, or orphaned without first computing the evidence. Applied to two production codebases, Ground eliminated false positives while finding 93+ real DRY violations.',
	category: 'case-study',
	readingTime: 15,
	difficulty: 'intermediate',
	date: '2026-01-18',
	keywords: [
		'Ground',
		'Evidence-Based Claims',
		'DRY Violations',
		'Dead Code Detection',
		'Cloudflare Workers',
		'MCP',
		'Subtractive Triad'
	]
};
