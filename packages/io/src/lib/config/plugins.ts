export interface Plugin {
	slug: string;
	name: string;
	description: string;
	category: string;
	tags: string[];
	features: string[];
}

export const PLUGINS: Plugin[] = [
	{
		slug: 'canon-maintenance',
		name: 'Canon Maintenance',
		description: 'Maintain and enforce CREATE Something design canon based on Dieter Rams principles.',
		category: 'Design',
		tags: ['design', 'canon', 'standards'],
		features: [
			'Enforce Tailwind structure + Canon aesthetics',
			'Audit files for canonical compliance',
			'Apply Subtractive Triad analysis'
		]
	},
	{
		slug: 'hermeneutic-reviewer',
		name: 'Hermeneutic Reviewer',
		description: 'Review code through the Subtractive Triad lens using DRY → Rams → Heidegger analysis.',
		category: 'Code Review',
		tags: ['review', 'architecture', 'philosophy'],
		features: [
			'Apply DRY principle at implementation level',
			'Enforce Rams aesthetic minimalism',
			'Validate Heideggerian system coherence'
		]
	},
	{
		slug: 'voice-audit',
		name: 'Voice Audit',
		description: 'Run Voice compliance check on content files against Five Principles.',
		category: 'Content',
		tags: ['voice', 'content', 'validation'],
		features: [
			'Check voice consistency',
			'Validate tone across content',
			'Ensure principle adherence'
		]
	},
	{
		slug: 'understanding-graphs',
		name: 'Understanding Graphs',
		description: 'Create and maintain UNDERSTANDING.md files showing minimal dependency graphs.',
		category: 'Documentation',
		tags: ['documentation', 'dependencies', 'clarity'],
		features: [
			'Generate dependency graphs',
			'Create UNDERSTANDING.md files',
			'Track codebase relationships'
		]
	}
];

export function getPlugin(slug: string): Plugin | undefined {
	return PLUGINS.find(p => p.slug === slug);
}

export function getPluginsByCategory(category: string): Plugin[] {
	return PLUGINS.filter(p => p.category === category);
}
