<script lang="ts">
	/**
	 * Select Component
	 *
	 * A styled native select element with label, description, and error handling.
	 * Uses the native select for maximum accessibility and mobile support.
	 *
	 * Canon: The select disappears; only the choice remains.
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/** Selected value (bindable) */
		value?: string;
		/** Select label */
		label?: string;
		/** Placeholder option text */
		placeholder?: string;
		/** Helper description below select */
		description?: string;
		/** Error message (shows error state when set) */
		error?: string | null;
		/** Whether selection is required */
		required?: boolean;
		/** Whether select is disabled */
		disabled?: boolean;
		/** Select name attribute */
		name?: string;
		/** Select id (auto-generated if not provided) */
		id?: string;
		/** Size variant */
		size?: 'sm' | 'md' | 'lg';
		/** Option children (use <option> elements) */
		children: Snippet;
		/** Called on selection change */
		onchange?: (event: Event & { currentTarget: HTMLSelectElement }) => void;
	}

	let {
		value = $bindable(''),
		label,
		placeholder,
		description,
		error = null,
		required = false,
		disabled = false,
		name,
		id,
		size = 'md',
		children,
		onchange
	}: Props = $props();

	// Generate unique ID if not provided
	const fieldId = id || `select-${crypto.randomUUID().slice(0, 8)}`;
	const descriptionId = `${fieldId}-description`;
	const errorId = `${fieldId}-error`;

	// Determine aria-describedby based on what's shown
	const ariaDescribedBy = $derived(
		[error ? errorId : null, description ? descriptionId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="select" class:select-sm={size === 'sm'} class:select-lg={size === 'lg'} class:has-error={error}>
	{#if label}
		<label for={fieldId} class="select-label">
			{label}
			{#if required}
				<span class="required-indicator" aria-hidden="true">*</span>
			{/if}
		</label>
	{/if}

	<div class="select-wrapper">
		<select
			id={fieldId}
			{name}
			bind:value
			{disabled}
			{required}
			class="select-input"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={ariaDescribedBy}
			aria-required={required ? 'true' : undefined}
			{onchange}
		>
			{#if placeholder}
				<option value="" disabled selected={!value}>{placeholder}</option>
			{/if}
			{@render children()}
		</select>
		<span class="select-arrow" aria-hidden="true">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="6 9 12 15 18 9" />
			</svg>
		</span>
	</div>

	{#if error}
		<p id={errorId} class="select-error" role="alert">
			{error}
		</p>
	{:else if description}
		<p id={descriptionId} class="select-description">
			{description}
		</p>
	{/if}
</div>

<style>
	.select {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	/* Label */
	.select-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
	}

	.required-indicator {
		color: var(--color-error);
		margin-left: 2px;
	}

	/* Select wrapper for custom arrow */
	.select-wrapper {
		position: relative;
	}

	/* Native select */
	.select-input {
		width: 100%;
		padding: var(--space-sm) var(--space-xl) var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-family: inherit;
		appearance: none;
		cursor: pointer;
		transition: border-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
		min-height: 44px; /* WCAG touch target */
	}

	.select-input:hover:not(:disabled) {
		border-color: var(--color-border-emphasis);
	}

	.select-input:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
		box-shadow: 0 0 0 3px var(--color-focus);
	}

	.select-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: var(--color-bg-subtle);
	}

	/* Custom arrow */
	.select-arrow {
		position: absolute;
		right: var(--space-sm);
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--color-fg-muted);
	}

	.select-arrow svg {
		width: 20px;
		height: 20px;
	}

	/* Error state */
	.has-error .select-input {
		border-color: var(--color-error);
	}

	.has-error .select-input:focus {
		box-shadow: 0 0 0 3px var(--color-error-muted);
	}

	/* Size variants */
	.select-sm .select-input {
		padding: var(--space-xs) var(--space-lg) var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
		min-height: 36px;
	}

	.select-sm .select-label {
		font-size: var(--text-caption);
	}

	.select-sm .select-arrow svg {
		width: 16px;
		height: 16px;
	}

	.select-lg .select-input {
		padding: var(--space-md) var(--space-2xl) var(--space-md) var(--space-lg);
		font-size: var(--text-body-lg);
		min-height: 52px;
	}

	.select-lg .select-label {
		font-size: var(--text-body);
	}

	.select-lg .select-arrow svg {
		width: 24px;
		height: 24px;
	}

	/* Description */
	.select-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Error message */
	.select-error {
		font-size: var(--text-caption);
		color: var(--color-error);
		margin: 0;
	}
</style>
