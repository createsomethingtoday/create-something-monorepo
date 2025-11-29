/**
 * Form Patterns
 *
 * Forms should be invisible until error—minimal friction, maximum clarity.
 *
 * @principle Every field must earn its existence. If you can remove it, remove it.
 */

/**
 * Input Field Pattern
 *
 * The canonical input:
 * - Label always visible (not placeholder-only)
 * - Border subtle by default, emphasized on focus
 * - Error state clear but not aggressive
 * - Helper text below for context
 */
export const inputPattern = {
	name: 'Input Field',
	principles: [
		'Label above input, always visible',
		'Placeholder is hint, not label',
		'Focus state obvious but not jarring',
		'Error message replaces helper text'
	],
	structure: {
		label: 'Above input, associated via htmlFor/id',
		input: 'Full width of container, adequate height (44px touch target)',
		helper: 'Below input, muted color',
		error: 'Below input, replaces helper, error color'
	},
	states: {
		default: 'Subtle border (border-default)',
		focus: 'Emphasized border (border-emphasis), optional ring',
		error: 'Error border, error message visible',
		disabled: 'Reduced opacity, cursor not-allowed'
	},
	accessibility: [
		'Label associated via for/id',
		'aria-describedby for helper/error text',
		'aria-invalid="true" on error',
		'Required fields marked with aria-required'
	]
} as const;

/**
 * Form Layout Pattern
 *
 * Single column for simplicity. Multi-column only when semantically related.
 */
export const formLayoutPattern = {
	name: 'Form Layout',
	principles: [
		'Single column by default',
		'Multi-column only for related fields (city/state/zip)',
		'Logical field order (name before email)',
		'Group related fields with fieldset/legend'
	],
	spacing: {
		betweenFields: 'var(--space-md)', // ~26px
		betweenGroups: 'var(--space-lg)', // ~42px
		beforeSubmit: 'var(--space-lg)' // ~42px
	},
	structure: {
		title: 'Optional, H2 or H3',
		description: 'Optional, below title',
		fields: 'Stacked vertically',
		actions: 'Primary button left or full-width on mobile'
	}
} as const;

/**
 * Validation Pattern
 *
 * Validate on blur for fields, on submit for form.
 */
export const validationPattern = {
	name: 'Form Validation',
	principles: [
		'Validate on blur, not on change (reduces noise)',
		'Show error immediately after blur if invalid',
		'Clear error when user starts fixing',
		'Submit validation as final check'
	],
	timing: {
		onBlur: 'Validate field, show error if invalid',
		onChange: 'Clear error if now valid (but don\'t validate)',
		onSubmit: 'Validate all, focus first error'
	},
	errorMessages: {
		required: 'This field is required',
		email: 'Enter a valid email address',
		minLength: 'Must be at least {n} characters',
		pattern: 'Format: {expected format}'
	},
	accessibility: [
		'Error messages announced by screen readers',
		'Focus moves to first error on submit',
		'aria-live="polite" on error container'
	]
} as const;

/**
 * Button Pattern (in forms)
 *
 * Primary action obvious, secondary subtle.
 */
export const formButtonPattern = {
	name: 'Form Buttons',
	principles: [
		'One primary action per form',
		'Primary button uses primary style',
		'Cancel/secondary uses ghost or secondary style',
		'Loading state replaces button text'
	],
	layout: {
		single: 'Full width on mobile, auto on desktop',
		multiple: 'Primary right, secondary left (or stacked on mobile)'
	},
	states: {
		default: 'Ready to submit',
		loading: 'Spinner + "Submitting..." text',
		disabled: 'Reduced opacity, cursor not-allowed',
		success: 'Optional checkmark + "Done" briefly'
	}
} as const;

/**
 * Newsletter Signup Pattern
 *
 * Minimal friction—email only, optional name.
 */
export const newsletterPattern = {
	name: 'Newsletter Signup',
	principles: [
		'Email is only required field',
		'Single button "Subscribe"',
		'Inline success message, no redirect',
		'Clear value proposition above form'
	],
	variants: {
		inline: 'Email + button on same row',
		stacked: 'Email above button, full width',
		withName: 'Name + email, only if personalization needed'
	}
} as const;

export const formPatterns = {
	input: inputPattern,
	layout: formLayoutPattern,
	validation: validationPattern,
	button: formButtonPattern,
	newsletter: newsletterPattern
} as const;
