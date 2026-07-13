<script lang="ts">
	/**
	 * TextField Component
	 *
	 * A fully accessible text input with label, description, and error handling.
	 * Follows Canon design system tokens for consistent styling.
	 *
	 * Canon: The form field disappears; only the input remains.
	 */

	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props {
		/** Input value (bindable) */
		value?: string;
		/** Field label */
		label?: string;
		/** Input type */
		type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search' | 'number';
		/** Placeholder text */
		placeholder?: string;
		/** Helper description below input */
		description?: string;
		/** Error message (shows error state when set) */
		error?: string | null;
		/** Whether field is required */
		required?: boolean;
		/** Whether field is disabled */
		disabled?: boolean;
		/** Whether field is readonly */
		readonly?: boolean;
		/** Input name attribute */
		name?: string;
		/** Input id (auto-generated if not provided) */
		id?: string;
		/** Autocomplete attribute */
		autocomplete?: HTMLInputAttributes['autocomplete'];
		/** Input pattern for validation */
		pattern?: string;
		/** Minimum length */
		minlength?: number;
		/** Maximum length */
		maxlength?: number;
		/** Size variant */
		size?: 'sm' | 'md' | 'lg';
		/** Called on input change */
		oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void;
		/** Called on blur */
		onblur?: (event: FocusEvent & { currentTarget: HTMLInputElement }) => void;
		/** Called on focus */
		onfocus?: (event: FocusEvent & { currentTarget: HTMLInputElement }) => void;
	}

	let {
		value = $bindable(''),
		label,
		type = 'text',
		placeholder,
		description,
		error = null,
		required = false,
		disabled = false,
		readonly = false,
		name,
		id,
		autocomplete,
		pattern,
		minlength,
		maxlength,
		size = 'md',
		oninput,
		onblur,
		onfocus
	}: Props = $props();

	// Generate unique ID if not provided
	const fallbackFieldId = `textfield-${crypto.randomUUID().slice(0, 8)}`;
	const fieldId = $derived(id || fallbackFieldId);
	const descriptionId = $derived(`${fieldId}-description`);
	const errorId = $derived(`${fieldId}-error`);

	// Determine aria-describedby based on what's shown
	const ariaDescribedBy = $derived(
		[error ? errorId : null, description ? descriptionId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="textfield" class:textfield-sm={size === 'sm'} class:textfield-lg={size === 'lg'} class:has-error={error}>
	{#if label}
		<label for={fieldId} class="textfield-label">
			{label}
			{#if required}
				<span class="required-indicator" aria-hidden="true">*</span>
			{/if}
		</label>
	{/if}

	<input
		{type}
		id={fieldId}
		{name}
		bind:value
		{placeholder}
		{disabled}
		{readonly}
		{required}
		{autocomplete}
		{pattern}
		{minlength}
		{maxlength}
		class="textfield-input"
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={ariaDescribedBy}
		aria-required={required ? 'true' : undefined}
		{oninput}
		{onblur}
		{onfocus}
	/>

	{#if error}
		<p id={errorId} class="textfield-error" role="alert">
			{error}
		</p>
	{:else if description}
		<p id={descriptionId} class="textfield-description">
			{description}
		</p>
	{/if}
</div>

<style>
	.textfield {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	/* Label */
	.textfield-label {
		font-size: var(--text-performance-body-sm);
		font-weight: var(--font-performance-medium);
		color: var(--color-performance-fg-secondary);
	}

	.required-indicator {
		color: var(--color-performance-error);
		margin-left: 2px;
	}

	/* Input */
	.textfield-input {
		box-sizing: border-box;
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body);
		font-family: inherit;
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard),
			box-shadow var(--duration-performance-micro) var(--ease-performance-standard);
		min-height: 44px; /* WCAG touch target */
	}

	.textfield-input::placeholder {
		color: var(--color-performance-fg-muted);
	}

	.textfield-input:hover:not(:disabled):not(:focus) {
		border-color: var(--color-performance-border-emphasis);
	}

	.textfield-input:focus {
		outline: none;
		border-color: var(--color-performance-border-emphasis);
		box-shadow: 0 0 0 3px var(--color-performance-focus);
	}

	.textfield-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: var(--color-performance-bg-subtle);
	}

	.textfield-input:read-only {
		background: var(--color-performance-bg-subtle);
		cursor: default;
	}

	/* Error state */
	.has-error .textfield-input {
		border-color: var(--color-performance-error);
	}

	.has-error .textfield-input:focus {
		box-shadow: 0 0 0 3px var(--color-performance-error-muted);
	}

	/* Size variants */
	.textfield-sm .textfield-input {
		padding: var(--space-performance-xs) var(--space-performance-sm);
		font-size: var(--text-performance-body-sm);
		min-height: 36px;
	}

	.textfield-sm .textfield-label {
		font-size: var(--text-performance-caption);
	}

	.textfield-lg .textfield-input {
		padding: var(--space-performance-md) var(--space-performance-lg);
		font-size: var(--text-performance-body-lg);
		min-height: 52px;
	}

	.textfield-lg .textfield-label {
		font-size: var(--text-performance-body);
	}

	/* Description */
	.textfield-description {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin: 0;
	}

	/* Error message */
	.textfield-error {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-error);
		margin: 0;
	}
</style>
