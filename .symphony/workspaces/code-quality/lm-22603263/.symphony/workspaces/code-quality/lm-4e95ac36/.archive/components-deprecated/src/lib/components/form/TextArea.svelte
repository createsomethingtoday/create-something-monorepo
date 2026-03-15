<script lang="ts">
	/**
	 * TextArea Component
	 *
	 * A fully accessible multi-line text input with label, description, and error handling.
	 * Follows Canon design system tokens for consistent styling.
	 *
	 * Canon: The form field disappears; only the input remains.
	 */

	interface Props {
		/** Input value (bindable) */
		value?: string;
		/** Field label */
		label?: string;
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
		/** Minimum length */
		minlength?: number;
		/** Maximum length */
		maxlength?: number;
		/** Number of visible text rows */
		rows?: number;
		/** Whether textarea can be resized */
		resize?: 'none' | 'vertical' | 'horizontal' | 'both';
		/** Size variant */
		size?: 'sm' | 'md' | 'lg';
		/** Called on input change */
		oninput?: (event: Event & { currentTarget: HTMLTextAreaElement }) => void;
		/** Called on blur */
		onblur?: (event: FocusEvent & { currentTarget: HTMLTextAreaElement }) => void;
		/** Called on focus */
		onfocus?: (event: FocusEvent & { currentTarget: HTMLTextAreaElement }) => void;
	}

	let {
		value = $bindable(''),
		label,
		placeholder,
		description,
		error = null,
		required = false,
		disabled = false,
		readonly = false,
		name,
		id,
		minlength,
		maxlength,
		rows = 4,
		resize = 'vertical',
		size = 'md',
		oninput,
		onblur,
		onfocus
	}: Props = $props();

	// Generate unique ID if not provided
	const fieldId = id || `textarea-${crypto.randomUUID().slice(0, 8)}`;
	const descriptionId = `${fieldId}-description`;
	const errorId = `${fieldId}-error`;

	// Determine aria-describedby based on what's shown
	const ariaDescribedBy = $derived(
		[error ? errorId : null, description ? descriptionId : null].filter(Boolean).join(' ') || undefined
	);

	// Character count for maxlength
	const charCount = $derived(value?.length ?? 0);
	const showCharCount = $derived(maxlength !== undefined);
</script>

<div class="textarea" class:textarea-sm={size === 'sm'} class:textarea-lg={size === 'lg'} class:has-error={error}>
	{#if label}
		<label for={fieldId} class="textarea-label">
			{label}
			{#if required}
				<span class="required-indicator" aria-hidden="true">*</span>
			{/if}
		</label>
	{/if}

	<textarea
		id={fieldId}
		{name}
		bind:value
		{placeholder}
		{disabled}
		{readonly}
		{required}
		{minlength}
		{maxlength}
		{rows}
		class="textarea-input"
		style:resize
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={ariaDescribedBy}
		aria-required={required ? 'true' : undefined}
		{oninput}
		{onblur}
		{onfocus}
	></textarea>

	<div class="textarea-footer">
		{#if error}
			<p id={errorId} class="textarea-error" role="alert">
				{error}
			</p>
		{:else if description}
			<p id={descriptionId} class="textarea-description">
				{description}
			</p>
		{:else}
			<span></span>
		{/if}

		{#if showCharCount}
			<span class="textarea-charcount" class:near-limit={maxlength && charCount > maxlength * 0.9}>
				{charCount}/{maxlength}
			</span>
		{/if}
	</div>
</div>

<style>
	.textarea {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	/* Label */
	.textarea-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
	}

	.required-indicator {
		color: var(--color-error);
		margin-left: 2px;
	}

	/* Input */
	.textarea-input {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-family: inherit;
		line-height: var(--leading-relaxed);
		transition: border-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
		min-height: 100px;
	}

	.textarea-input::placeholder {
		color: var(--color-fg-muted);
	}

	.textarea-input:hover:not(:disabled):not(:focus) {
		border-color: var(--color-border-emphasis);
	}

	.textarea-input:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
		box-shadow: 0 0 0 3px var(--color-focus);
	}

	.textarea-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: var(--color-bg-subtle);
	}

	.textarea-input:read-only {
		background: var(--color-bg-subtle);
		cursor: default;
	}

	/* Error state */
	.has-error .textarea-input {
		border-color: var(--color-error);
	}

	.has-error .textarea-input:focus {
		box-shadow: 0 0 0 3px var(--color-error-muted);
	}

	/* Size variants */
	.textarea-sm .textarea-input {
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
		min-height: 80px;
	}

	.textarea-sm .textarea-label {
		font-size: var(--text-caption);
	}

	.textarea-lg .textarea-input {
		padding: var(--space-md) var(--space-lg);
		font-size: var(--text-body-lg);
		min-height: 120px;
	}

	.textarea-lg .textarea-label {
		font-size: var(--text-body);
	}

	/* Footer with description/error and char count */
	.textarea-footer {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-sm);
	}

	/* Description */
	.textarea-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
		flex: 1;
	}

	/* Error message */
	.textarea-error {
		font-size: var(--text-caption);
		color: var(--color-error);
		margin: 0;
		flex: 1;
	}

	/* Character count */
	.textarea-charcount {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
		flex-shrink: 0;
	}

	.textarea-charcount.near-limit {
		color: var(--color-warning);
	}
</style>
