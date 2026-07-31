import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

// Import all SCRIPT.md files at build time
const scripts = import.meta.glob('/src/routes/presentations/*/SCRIPT.md', {
	query: '?raw',
	import: 'default',
	eager: true
});

// Presentation metadata for titles
const presentations: Record<string, { title: string; subtitle: string }> = {
	'heidegger-canon': {
		title: 'HEIDEGGER: CANON',
		subtitle: 'Use three checks to remove unnecessary parts from a system.'
	},
	'claude-code-partner': {
		title: 'CLAUDE CODE: PARTNER',
		subtitle: 'Share software work with an AI development partner.'
	},
	'beads-continuity': {
		title: 'BEADS: CONTINUITY',
		subtitle: 'Keep task context when an AI session ends.'
	},
	'cloudflare-edge': {
		title: 'CLOUDFLARE: EDGE',
		subtitle: 'Run applications globally without managing servers.'
	},
	'canon-design': {
		title: 'CANON: DESIGN',
		subtitle: 'Turn design principles into reusable interface rules.'
	},
	'deployment-dwelling': {
		title: 'DEPLOYMENT: DWELLING',
		subtitle: 'Deploy, verify the live result, and keep watching.'
	},
	workway: {
		title: 'WORKWAY',
		subtitle: 'Workflow Automation for Developers'
	},
	hub: {
		title: 'HUB',
		subtitle: 'Control which tools Codex can see and what they are allowed to do.'
	},
	'abundance-system': {
		title: 'ABUNDANCE',
		subtitle: 'The nurse staffing system, explained simply'
	},
	'developer-onboarding': {
		title: 'Developer Onboarding',
		subtitle: 'Join WORKWAY and publish your first workflow.'
	},
	'user-onboarding': {
		title: 'User Onboarding',
		subtitle: 'Connect one workflow and verify that it runs.'
	}
};

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;

	// Find the script for this presentation
	const scriptPath = `/src/routes/presentations/${slug}/SCRIPT.md`;
	const scriptContent = scripts[scriptPath] as string | undefined;

	if (!scriptContent) {
		throw error(404, {
			message: `Script not found for presentation: ${slug}`
		});
	}

	const meta = presentations[slug] || {
		title: slug,
		subtitle: 'Presentation Script'
	};

	return {
		slug,
		script: scriptContent,
		meta: {
			title: `Script: ${meta.title}`,
			description: `Narration script for ${meta.title} - ${meta.subtitle}`,
			presentationTitle: meta.title,
			presentationSubtitle: meta.subtitle
		}
	};
};
