<script lang="ts">
	/**
	 * TextField Component
	 *
	 * A fully accessible text input with label, description, and error handling.
	 * Follows Canon design system tokens for consistent styling.
	 *
	 * Canon: The form field disappears; only the input remains.
	 */

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
		autocomplete?: string;
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
	const fieldId = id || `textfield-${crypto.randomUUID().slice(0, 8)}`;
	const descriptionId = `${fieldId}-description`;
	const errorId = `${fieldId}-error`;

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
		gap: var(--space-xs);
	}

	/* Label */
	.textfield-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
	}

	.required-indicator {
		color: var(--color-error);
		margin-left: 2px;
	}

	/* Input */
	.textfield-input {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-family: inherit;
		transition: border-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
		min-height: 44px; /* WCAG touch target */
	}

	.textfield-input::placeholder {
		color: var(--color-fg-muted);
	}

	.textfield-input:hover:not(:disabled):not(:focus) {
		border-color: var(--color-border-emphasis);
	}

	.textfield-input:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
		box-shadow: 0 0 0 3px var(--color-focus);
	}

	.textfield-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: var(--color-bg-subtle);
	}

	.textfield-input:read-only {
		background: var(--color-bg-subtle);
		cursor: default;
	}

	/* Error state */
	.has-error .textfield-input {
		border-color: var(--color-error);
	}

	.has-error .textfield-input:focus {
		box-shadow: 0 0 0 3px var(--color-error-muted);
	}

	/* Size variants */
	.textfield-sm .textfield-input {
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
		min-height: 36px;
	}

	.textfield-sm .textfield-label {
		font-size: var(--text-caption);
	}

	.textfield-lg .textfield-input {
		padding: var(--space-md) var(--space-lg);
		font-size: var(--text-body-lg);
		min-height: 52px;
	}

	.textfield-lg .textfield-label {
		font-size: var(--text-body);
	}

	/* Description */
	.textfield-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Error message */
	.textfield-error {
		font-size: var(--text-caption);
		color: var(--color-error);
		margin: 0;
	}
</style>
