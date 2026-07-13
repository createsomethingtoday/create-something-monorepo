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
	const fallbackFieldId = `textarea-${crypto.randomUUID().slice(0, 8)}`;
	const fieldId = $derived(id || fallbackFieldId);
	const descriptionId = $derived(`${fieldId}-description`);
	const errorId = $derived(`${fieldId}-error`);

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
		gap: var(--space-performance-xs);
	}

	/* Label */
	.textarea-label {
		font-size: var(--text-performance-body-sm);
		font-weight: var(--font-performance-medium);
		color: var(--color-performance-fg-secondary);
	}

	.required-indicator {
		color: var(--color-performance-error);
		margin-left: 2px;
	}

	/* Input */
	.textarea-input {
		box-sizing: border-box;
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body);
		font-family: inherit;
		line-height: var(--leading-performance-relaxed);
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard),
			box-shadow var(--duration-performance-micro) var(--ease-performance-standard);
		min-height: 100px;
	}

	.textarea-input::placeholder {
		color: var(--color-performance-fg-muted);
	}

	.textarea-input:hover:not(:disabled):not(:focus) {
		border-color: var(--color-performance-border-emphasis);
	}

	.textarea-input:focus {
		outline: none;
		border-color: var(--color-performance-border-emphasis);
		box-shadow: 0 0 0 3px var(--color-performance-focus);
	}

	.textarea-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: var(--color-performance-bg-subtle);
	}

	.textarea-input:read-only {
		background: var(--color-performance-bg-subtle);
		cursor: default;
	}

	/* Error state */
	.has-error .textarea-input {
		border-color: var(--color-performance-error);
	}

	.has-error .textarea-input:focus {
		box-shadow: 0 0 0 3px var(--color-performance-error-muted);
	}

	/* Size variants */
	.textarea-sm .textarea-input {
		padding: var(--space-performance-xs) var(--space-performance-sm);
		font-size: var(--text-performance-body-sm);
		min-height: 80px;
	}

	.textarea-sm .textarea-label {
		font-size: var(--text-performance-caption);
	}

	.textarea-lg .textarea-input {
		padding: var(--space-performance-md) var(--space-performance-lg);
		font-size: var(--text-performance-body-lg);
		min-height: 120px;
	}

	.textarea-lg .textarea-label {
		font-size: var(--text-performance-body);
	}

	/* Footer with description/error and char count */
	.textarea-footer {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-performance-sm);
	}

	/* Description */
	.textarea-description {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin: 0;
		flex: 1;
	}

	/* Error message */
	.textarea-error {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-error);
		margin: 0;
		flex: 1;
	}

	/* Character count */
	.textarea-charcount {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		font-family: var(--font-performance-mono);
		flex-shrink: 0;
	}

	.textarea-charcount.near-limit {
		color: var(--color-performance-warning);
	}
</style>
