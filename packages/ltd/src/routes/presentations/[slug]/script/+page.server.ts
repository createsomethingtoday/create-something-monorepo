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
		subtitle: 'Install the CREATE SOMETHING Methodology'
	},
	'claude-code-partner': {
		title: 'CLAUDE CODE: PARTNER',
		subtitle: 'AI-Native Development Environment'
	},
	'beads-continuity': {
		title: 'BEADS: CONTINUITY',
		subtitle: 'Agent-Native Task Tracking'
	},
	'cloudflare-edge': {
		title: 'CLOUDFLARE: EDGE',
		subtitle: 'Infrastructure That Disappears'
	},
	'canon-design': {
		title: 'CANON: DESIGN',
		subtitle: 'Tailwind for Structure, Canon for Aesthetics'
	},
	'deployment-dwelling': {
		title: 'DEPLOYMENT: DWELLING',
		subtitle: 'Ship to Production'
	},
	workway: {
		title: 'WORKWAY',
		subtitle: 'Workflow Automation for Developers'
	},
	'developer-onboarding': {
		title: 'Developer Onboarding',
		subtitle: 'WORKWAY Platform'
	},
	'user-onboarding': {
		title: 'User Onboarding',
		subtitle: 'Enable a Workflow'
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
