/**
 * Configuration Wizard State
 *
 * Manages the multi-step wizard for Vertical Templates checkout.
 * Steps: Template → Subdomain → Business Info → Content → Review
 *
 * Canon: The infrastructure recedes; configuration flows naturally.
 */

import { writable, derived, get } from 'svelte/store';

export interface SiteConfig {
	name: string;
	tagline?: string;
	email?: string;
	phone?: string;
	address?: string;
	social?: {
		twitter?: string;
		linkedin?: string;
		instagram?: string;
	};
	// Template-specific fields populated in content step
	[key: string]: unknown;
}

export interface WizardState {
	step: 1 | 2 | 3 | 4 | 5;
	templateId: string | null;
	subdomain: string;
	subdomainValid: boolean;
	subdomainChecking: boolean;
	config: Partial<SiteConfig>;
	tier: 'solo' | 'team';
}

const initialState: WizardState = {
	step: 1,
	templateId: null,
	subdomain: '',
	subdomainValid: false,
	subdomainChecking: false,
	config: {},
	tier: 'solo'
};

function createWizardStore() {
	const { subscribe, set, update } = writable<WizardState>(initialState);

	return {
		subscribe,

		// Step navigation
		nextStep: () =>
			update((state) => ({
				...state,
				step: Math.min(state.step + 1, 5) as WizardState['step']
			})),

		prevStep: () =>
			update((state) => ({
				...state,
				step: Math.max(state.step - 1, 1) as WizardState['step']
			})),

		goToStep: (step: WizardState['step']) => update((state) => ({ ...state, step })),

		// Template selection
		selectTemplate: (templateId: string) =>
			update((state) => ({
				...state,
				templateId
			})),

		// Subdomain
		setSubdomain: (subdomain: string) =>
			update((state) => ({
				...state,
				subdomain,
				subdomainValid: false
			})),

		setSubdomainValid: (valid: boolean) =>
			update((state) => ({
				...state,
				subdomainValid: valid
			})),

		setSubdomainChecking: (checking: boolean) =>
			update((state) => ({
				...state,
				subdomainChecking: checking
			})),

		// Config
		updateConfig: (partial: Partial<SiteConfig>) =>
			update((state) => ({
				...state,
				config: { ...state.config, ...partial }
			})),

		// Tier
		setTier: (tier: 'solo' | 'team') => update((state) => ({ ...state, tier })),

		// Reset
		reset: () => set(initialState),

		// Get current state (for checkout)
		getState: () => get({ subscribe })
	};
}

export const wizardState = createWizardStore();

// Derived stores
export const currentStep = derived(wizardState, ($state) => $state.step);
export const selectedTemplate = derived(wizardState, ($state) => $state.templateId);
export const canProceed = derived(wizardState, ($state) => {
	switch ($state.step) {
		case 1:
			return $state.templateId !== null;
		case 2:
			return $state.subdomain.length >= 3 && $state.subdomainValid;
		case 3:
			return !!$state.config.name;
		case 4:
			return true; // Content is optional per template
		case 5:
			return true;
		default:
			return false;
	}
});

// Template definitions (matches templates-platform database)
export const TEMPLATES = [
	{
		id: 'tpl_architecture_studio',
		slug: 'architecture-studio',
		name: 'Architecture Studio',
		description: 'Light, editorial template for architecture firms',
		category: 'Professional',
		icon: 'Building2',
		preview: 'https://architecture-studio-template.pages.dev'
	},
	{
		id: 'tpl_creative_portfolio',
		slug: 'creative-portfolio',
		name: 'Creative Portfolio',
		description: 'Minimal portfolio for photographers and designers',
		category: 'Creative',
		icon: 'Palette',
		preview: 'https://creative-portfolio-template.pages.dev'
	},
	{
		id: 'tpl_professional_services',
		slug: 'professional-services',
		name: 'Professional Services',
		description: 'Sophisticated template for consultancies',
		category: 'Professional',
		icon: 'Briefcase',
		preview: 'https://professional-services-template.pages.dev'
	},
	{
		id: 'tpl_law_firm',
		slug: 'law-firm',
		name: 'Law Firm',
		description: 'Purpose-built for attorneys and legal practices',
		category: 'Professional',
		icon: 'Scale',
		preview: 'https://law-firm-template.pages.dev'
	},
	{
		id: 'tpl_medical_practice',
		slug: 'medical-practice',
		name: 'Medical Practice',
		description: 'For clinics and healthcare providers',
		category: 'Healthcare',
		icon: 'Stethoscope',
		preview: 'https://medical-practice-template.pages.dev'
	},
	{
		id: 'tpl_restaurant',
		slug: 'restaurant',
		name: 'Restaurant',
		description: 'For restaurants, cafes, and hospitality',
		category: 'Hospitality',
		icon: 'UtensilsCrossed',
		preview: 'https://restaurant-template.pages.dev'
	}
];

// Pricing (must match Stripe product catalog)
export const PRICING = {
	solo: { monthly: 29, label: 'Solo', description: 'For individuals and small teams' },
	team: { monthly: 79, label: 'Team', description: 'For growing businesses' }
} as const;
