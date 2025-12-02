/**
 * Seed Canon References
 *
 * One-time script to populate the canon_references table by discovering
 * connections between experiments and principles.
 *
 * Usage:
 *   pnpm --filter @create-something/ltd exec tsx scripts/seed-canon-references.ts
 *
 * Or via wrangler for production:
 *   wrangler d1 execute create-something-db --remote --file=scripts/seed-canon-references.sql
 *
 * Part of "The Circle Closes" experiment.
 */

// This script generates SQL to insert canon references
// Run it locally and pipe output to a .sql file for wrangler execution

interface ExperimentReference {
	slug: string;
	domain: 'io' | 'space' | 'agency';
	title: string;
	tags: string[];
	principleMatches: string[]; // Principle IDs that match
}

// Known experiments and their principle connections
// This mapping was created by analyzing experiment content against the canon
// Updated 2025-12-02 to include all file-based experiments with tests_principles
const EXPERIMENT_REFERENCES: ExperimentReference[] = [
	// ═══════════════════════════════════════════════════════════════════
	// .space experiments (Practice)
	// ═══════════════════════════════════════════════════════════════════
	{
		slug: 'minimal-capture',
		domain: 'space',
		title: 'Minimal Capture: The Canon\'s Reach',
		tags: ['Hermeneutics', 'Design Canon', 'Heidegger', 'Gift', 'Propagation'],
		principleMatches: [
			'rams-principle-5', // Unobtrusive - tool recedes from user's attention
			'rams-principle-10', // As little as possible - stripped to essence
			'heidegger-zuhandenheit' // Ready-to-hand - the tool becomes invisible in use
		]
	},
	{
		slug: 'motion-ontology',
		domain: 'space',
		title: 'Motion Ontology: Phenomenological Animation Analysis',
		tags: ['Phenomenology', 'Animation', 'Heidegger', 'Puppeteer', 'Motion Design'],
		principleMatches: [
			'rams-principle-5', // Unobtrusive - animations that recede (zuhandenheit)
			'rams-principle-10' // As little design as possible - minimal motion
		]
	},
	{
		slug: 'workway-canon-audit',
		domain: 'space',
		title: 'WORKWAY SDK: The Hermeneutic Circle in Practice',
		tags: ['Dieter Rams', 'Canon Maintenance', 'SDK Design', 'Hermeneutic Circle', 'DX'],
		principleMatches: [
			'rams-principle-2', // Useful
			'rams-principle-6', // Honest
			'rams-principle-7', // Long-lasting
			'rams-principle-8', // Thorough
			'rams-principle-10' // As little as possible
		]
	},
	{
		slug: 'threshold-dwelling',
		domain: 'space',
		title: 'Threshold Dwelling: Miesian Floor Plan Visualization',
		tags: ['Heidegger', 'Architecture', 'Tufte', 'Mies', 'Rams', 'SVG', 'Visualization'],
		principleMatches: [
			'rams-principle-5', // Unobtrusive
			'rams-principle-10', // As little as possible
			'heidegger-dwelling', // Dwelling (Wohnen)
			'mies-less-is-more' // Less is more
		]
	},
	{
		slug: 'praxis',
		domain: 'space',
		title: 'Integration Praxis: Learning Through Practice',
		tags: ['Hermeneutic Circle', 'SDK', 'Practice', 'Subtractive Triad', 'Interactive'],
		principleMatches: [
			'rams-principle-2', // Useful
			'rams-principle-4', // Understandable
			'rams-principle-10', // As little as possible
			'heidegger-hermeneutic-circle', // Understanding through practice
			'subtractive-triad' // The meta-principle itself
		]
	},

	// ═══════════════════════════════════════════════════════════════════
	// .io experiments (Research)
	// ═══════════════════════════════════════════════════════════════════
	{
		slug: 'kickstand-triad-audit',
		domain: 'io',
		title: 'Subtractive Triad Audit: Kickstand',
		tags: ['Subtractive Triad', 'Code Audit', 'DRY', 'Dieter Rams', 'Heidegger'],
		principleMatches: [
			'subtractive-triad', // Meta: tests the triad itself
			'rams-principle-10', // As little as possible - 92% script reduction
			'heidegger-hermeneutic-circle' // Understanding through practice
		]
	},
	{
		slug: 'understanding-graphs',
		domain: 'io',
		title: 'Understanding Graphs: "Less, But Better" Codebase Navigation',
		tags: ['Hermeneutics', 'Codebase Navigation', 'Less But Better', 'Heidegger'],
		principleMatches: [
			'rams-principle-10', // As little as possible - minimal documentation
			'rams-principle-4', // Understandable - human-readable format
			'heidegger-hermeneutic-circle' // Understanding through interpretation
		]
	},
	{
		slug: 'agentic-visualization',
		domain: 'io',
		title: 'Agentic Visualization: Autonomous UI Components',
		tags: ['Visualization', 'Components', 'Tufte', 'Agentic Design'],
		principleMatches: [
			'tufte-data-ink-ratio', // Maximize data-ink ratio
			'tufte-small-multiples', // Reveal patterns through repetition
			'rams-principle-2', // Useful - components serve data revelation
			'rams-principle-5' // Unobtrusive - visualization recedes, data emerges
		]
	},
	{
		slug: 'data-patterns',
		domain: 'io',
		title: 'Revealing Data Patterns Through Agentic Components',
		tags: ['Visualization', 'Data Analysis', 'Patterns', 'Tutorial'],
		principleMatches: [
			'tufte-data-ink-ratio', // Maximize signal, minimize noise
			'rams-principle-3', // Aesthetic - form follows data
			'heidegger-aletheia' // Truth as unconcealment - patterns emerge
		]
	}
];

// Principle descriptions for reference comments
const PRINCIPLE_DESCRIPTIONS: Record<string, string> = {
	// Dieter Rams
	'rams-principle-1': 'Innovative - don\'t copy, interpret',
	'rams-principle-2': 'Useful - every element serves purpose',
	'rams-principle-3': 'Aesthetic - visual harmony through restraint',
	'rams-principle-4': 'Understandable - self-evident interfaces',
	'rams-principle-5': 'Unobtrusive - tools recede to background',
	'rams-principle-6': 'Honest - no false promises',
	'rams-principle-7': 'Long-lasting - avoid trends',
	'rams-principle-8': 'Thorough - down to last detail',
	'rams-principle-9': 'Environmentally friendly - performance is sustainability',
	'rams-principle-10': 'As little as possible - remove until it breaks',
	// Edward Tufte
	'tufte-data-ink-ratio': 'Maximize the data-ink ratio',
	'tufte-chartjunk': 'Avoid chartjunk',
	'tufte-small-multiples': 'Use small multiples to reveal patterns',
	'tufte-layering': 'Layer and separate information',
	'tufte-narrative': 'Data graphics should tell a story',
	// Martin Heidegger
	'heidegger-zuhandenheit': 'Zuhandenheit - tools recede when used effectively',
	'heidegger-vorhandenheit': 'Vorhandenheit - broken tools become visible',
	'heidegger-hermeneutic-circle': 'Understanding parts through whole, whole through parts',
	'heidegger-aletheia': 'Aletheia - truth as unconcealment',
	'heidegger-dwelling': 'Dwelling - being at home in the world',
	// Ludwig Mies van der Rohe
	'mies-less-is-more': 'Less is more - distillation to essence',
	'mies-god-details': 'God is in the details',
	'mies-structural-honesty': 'Express how things work',
	'mies-universal-space': 'Spaces that serve multiple purposes',
	// Charles & Ray Eames
	'eames-best-most-least': 'The best for the most for the least',
	'eames-constraints': 'Embrace constraints as guides',
	'eames-take-pleasure': 'Take your pleasure seriously',
	'eames-details-connections': 'Details make the design',
	// The Canon (CREATE SOMETHING)
	'subtractive-triad': 'DRY → Rams → Heidegger: Unify, Remove, Reconnect',
	'hermeneutic-workflow': 'The feedback loop between properties',
	'being-modes': 'Each property is a mode of being'
};

function generateId(): string {
	return 'ref-' + Math.random().toString(36).substring(2, 10);
}

function generateSQL(): string {
	const statements: string[] = [
		'-- Canon References Seed',
		'-- Generated by seed-canon-references.ts',
		`-- Generated at: ${new Date().toISOString()}`,
		'',
		'-- Clear existing references (optional - comment out to preserve)',
		'-- DELETE FROM canon_references;',
		''
	];

	for (const exp of EXPERIMENT_REFERENCES) {
		statements.push(`-- ${exp.title} (${exp.domain}/${exp.slug})`);

		for (const principleId of exp.principleMatches) {
			const description = PRINCIPLE_DESCRIPTIONS[principleId] || principleId;
			const id = generateId();

			statements.push(`INSERT INTO canon_references (id, principle_id, reference_type, reference_slug, reference_domain, description) VALUES (
  '${id}',
  '${principleId}',
  'experiment',
  '${exp.slug}',
  '${exp.domain}',
  'Applies: ${description}'
);`);
		}
		statements.push('');
	}

	statements.push('-- Summary:');
	statements.push(`-- Total references created: ${EXPERIMENT_REFERENCES.reduce((sum, exp) => sum + exp.principleMatches.length, 0)}`);
	statements.push(`-- Experiments linked: ${EXPERIMENT_REFERENCES.length}`);
	statements.push('');

	return statements.join('\n');
}

// Generate and output the SQL
console.log(generateSQL());

// Also output a summary to stderr
console.error('\n=== Canon References Seed ===');
console.error(`Experiments: ${EXPERIMENT_REFERENCES.length}`);
console.error(`References: ${EXPERIMENT_REFERENCES.reduce((sum, exp) => sum + exp.principleMatches.length, 0)}`);
console.error('\nTo apply:');
console.error('  1. Save output to seed.sql: pnpm --filter @create-something/ltd exec tsx scripts/seed-canon-references.ts > seed.sql');
console.error('  2. Execute via wrangler: wrangler d1 execute create-something-db --remote --file=seed.sql');
