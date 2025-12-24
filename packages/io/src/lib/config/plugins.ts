import type { Plugin } from '$lib/types/plugins';

export const PLUGINS: Plugin[] = [
	{
		slug: 'canon-maintenance',
		name: 'Canon Maintenance',
		description:
			'Design system enforcement based on the Subtractive Triad. Operationalizes Dieter Rams\' "Weniger, aber besser" across all CREATE SOMETHING properties.',
		category: 'Design',
		tags: ['design', 'canon', 'dieter-rams', 'subtractive-triad'],
		features: [
			'Apply DRY → Rams → Heidegger in order',
			'Enforce 10 Rams principles for artifacts',
			'Validate hermeneutic circle coherence',
			'Property-specific standards (.ltd, .io, .space, .agency)'
		]
	},
	{
		slug: 'hermeneutic-reviewer',
		name: 'Hermeneutic Reviewer',
		description:
			'Code review through the Subtractive Triad lens. Three-pass methodology: Unify (DRY), Remove (Rams), Reconnect (Heidegger).',
		category: 'Code Review',
		tags: ['review', 'architecture', 'subtractive-triad', 'pr-review'],
		features: [
			'Pass 1: DRY - detect duplication patterns',
			'Pass 2: Rams - question every addition',
			'Pass 3: Heidegger - verify system connection',
			'Anti-pattern detection (over-engineering, premature abstraction)'
		]
	},
	{
		slug: 'voice-validator',
		name: 'Voice Validator',
		description:
			'Content validation against the Five Principles: Clarity over cleverness, Specificity over generality, Honesty over polish, Useful over interesting, Grounded over trendy.',
		category: 'Content',
		tags: ['voice', 'content', 'writing', 'five-principles'],
		features: [
			'Forbidden pattern scan (marketing jargon)',
			'Specificity audit (numbers, baselines, evidence)',
			'Honesty check (failures, limitations documented)',
			'Utility test (actionable, reproducible)'
		]
	},
	{
		slug: 'understanding-graphs',
		name: 'Understanding Graphs',
		description:
			'Create UNDERSTANDING.md files—minimal dependency graphs for codebase comprehension. "Less, but better" applied to documentation.',
		category: 'Documentation',
		tags: ['documentation', 'dependencies', 'onboarding', 'navigation'],
		features: [
			'Document understanding-critical relationships only',
			'Generate critical paths (User Action → Result)',
			'Identify key files with purpose/deps/consumers',
			'Capture common traps and solutions'
		]
	}
];

export function getPlugin(slug: string): Plugin | undefined {
	return PLUGINS.find(p => p.slug === slug);
}

export function getPluginsByCategory(category: string): Plugin[] {
	return PLUGINS.filter(p => p.category === category);
}
