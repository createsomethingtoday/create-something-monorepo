/**
 * Canon Patterns Library
 *
 * Documented interaction patterns showing how to compose Canon components
 * for common UI scenarios. Each pattern includes:
 * - Example implementation
 * - Accessibility considerations
 * - Philosophical rationale
 *
 * Philosophy: Patterns are recipes, not ingredients. They show the "how"
 * of composition, leaving the "what" to individual components.
 */

// Form Patterns
export { default as FormLayout } from './FormLayout.svelte';
export { default as FormValidation } from './FormValidation.svelte';
export { default as MultiStepForm } from './MultiStepForm.svelte';

// Empty State Patterns
export { default as EmptyState } from './EmptyState.svelte';
export { default as FirstTimeUser } from './FirstTimeUser.svelte';

// Loading Patterns
export { default as LoadingSkeleton } from './LoadingSkeleton.svelte';
export { default as LoadingOverlay } from './LoadingOverlay.svelte';

// Error Patterns
export { default as InlineError } from './InlineError.svelte';
export { default as ErrorBoundary } from './ErrorBoundary.svelte';

// Pattern metadata for documentation
export const PATTERN_CATEGORIES = {
	forms: {
		name: 'Forms',
		description: 'Layout, validation, and multi-step form patterns',
		patterns: ['FormLayout', 'FormValidation', 'MultiStepForm']
	},
	emptyStates: {
		name: 'Empty States',
		description: 'Handling no-data and first-time user scenarios',
		patterns: ['EmptyState', 'FirstTimeUser']
	},
	loading: {
		name: 'Loading',
		description: 'Skeleton screens and loading indicators',
		patterns: ['LoadingSkeleton', 'LoadingOverlay']
	},
	errors: {
		name: 'Error Handling',
		description: 'Inline errors and error boundaries',
		patterns: ['InlineError', 'ErrorBoundary']
	}
} as const;

export type PatternCategory = keyof typeof PATTERN_CATEGORIES;
