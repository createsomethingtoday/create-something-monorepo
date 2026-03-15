import type { Plugin } from '$lib/types/plugins';

// Slugs must match marketplace.json in createsomethingtoday/claude-plugins
export const PLUGINS: Plugin[] = [
	{
		slug: 'canon',
		name: 'Canon',
		description:
			'Design system enforcement based on the Subtractive Triad. Operationalizes Dieter Rams\' "Weniger, aber besser" across all CREATE SOMETHING properties.',
		category: 'Design',
		tags: ['design', 'canon', 'dieter-rams', 'subtractive-triad'],
		features: [
			'Apply DRY → Rams → Heidegger in order',
			'Enforce 10 Rams principles for artifacts',
			'Validate hermeneutic circle coherence',
			'Property-specific standards (.ltd, .io, .space, .agency)'
		],
		provides: {
			commands: [
				{ name: '/audit-canon', description: 'Check CSS Canon compliance on current file or directory' }
			],
			agents: [{ name: 'canon-auditor', description: 'Proactive compliance checks after code changes' }],
			hooks: [{ name: 'PostToolUse', description: 'Automatic checking on Write/Edit operations' }]
		},
		version: '1.1.0',
		lastUpdated: '2024-12-23',
		examples: [
			{
				prompt: '/audit-canon src/components/Button.svelte',
				description: 'Check a component for Canon token compliance'
			},
			{
				prompt: 'Review this CSS for Canon violations',
				description: 'Let the agent analyze your styles'
			}
		],
		relatedPlugins: ['hermeneutic-review', 'voice-validator']
	},
	{
		slug: 'hermeneutic-review',
		name: 'Hermeneutic Review',
		description:
			'Code review through the Subtractive Triad lens. Three-pass methodology: Unify (DRY), Remove (Rams), Reconnect (Heidegger).',
		category: 'Code Review',
		tags: ['review', 'architecture', 'subtractive-triad', 'pr-review'],
		features: [
			'Pass 1: DRY - detect duplication patterns',
			'Pass 2: Rams - question every addition',
			'Pass 3: Heidegger - verify system connection',
			'Anti-pattern detection (over-engineering, premature abstraction)'
		],
		provides: {
			commands: [
				{ name: '/review-triad', description: 'Apply Subtractive Triad review to any code' }
			],
			agents: [{ name: 'hermeneutic-reviewer', description: 'Full three-pass triad analysis on code' }],
			skills: [{ name: 'Subtractive Review', description: 'Apply the review methodology to any code' }]
		},
		version: '1.1.0',
		lastUpdated: '2024-12-23',
		examples: [
			{
				prompt: '/review-triad src/lib/utils',
				description: 'Review a directory through the Subtractive Triad'
			},
			{
				prompt: 'Review this PR using the hermeneutic method',
				description: 'Get a three-pass analysis of changes'
			}
		],
		relatedPlugins: ['canon', 'understanding-graphs']
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
		],
		provides: {
			commands: [{ name: '/audit-voice', description: 'Check content compliance against Five Principles' }],
			agents: [
				{ name: 'voice-auditor', description: 'Proactive content auditing after writing docs or README' }
			],
			skills: [{ name: 'Voice Validator', description: 'Full validation workflow for content files' }],
			hooks: [{ name: 'PostToolUse', description: 'Auto-prompt for audit after writing docs/README' }]
		},
		version: '1.2.0',
		lastUpdated: '2024-12-23',
		examples: [
			{
				prompt: '/audit-voice README.md',
				description: 'Check your README for Voice compliance'
			},
			{
				prompt: 'Is this marketing copy following the Five Principles?',
				description: 'Get feedback on content clarity and honesty'
			}
		],
		relatedPlugins: ['hermeneutic-review', 'understanding-graphs']
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
		],
		provides: {
			agents: [
				{ name: 'codebase-navigator', description: 'Navigate unfamiliar codebases using UNDERSTANDING.md' }
			],
			skills: [{ name: 'Understanding Graphs', description: 'Generate UNDERSTANDING.md for any package' }],
			hooks: [
				{ name: 'PostToolUse', description: 'Prompt to update UNDERSTANDING.md on key file changes' }
			]
		},
		version: '1.2.0',
		lastUpdated: '2024-12-23',
		examples: [
			{
				prompt: 'Generate an UNDERSTANDING.md for this package',
				description: 'Create a minimal dependency graph for the codebase'
			},
			{
				prompt: "I'm new to this codebase, help me navigate it",
				description: 'Use existing UNDERSTANDING.md to orient quickly'
			}
		],
		relatedPlugins: ['hermeneutic-review', 'voice-validator']
	}
];

export function getPlugin(slug: string): Plugin | undefined {
	return PLUGINS.find((p) => p.slug === slug);
}

export function getPluginsByCategory(category: string): Plugin[] {
	return PLUGINS.filter((p) => p.category === category);
}

export function getRelatedPlugins(slug: string): Plugin[] {
	const plugin = getPlugin(slug);
	if (!plugin?.relatedPlugins) return [];
	return plugin.relatedPlugins.map((s) => getPlugin(s)).filter((p): p is Plugin => p !== undefined);
}
