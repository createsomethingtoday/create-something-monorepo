<script lang="ts">
	/**
	 * FormField Component
	 *
	 * Form field wrapper with label, validation, and error display.
	 * Supports real-time inline validation with visual feedback.
	 *
	 * Canon principle: Validation should guide, not punish.
	 *
	 * @example
	 * <FormField
	 *   label="Email"
	 *   error={emailError}
	 *   required
	 * >
	 *   <input type="email" bind:value={email} />
	 * </FormField>
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/** Field label */
		label?: string;
		/** Field name (for accessibility) */
		name?: string;
		/** Error message */
		error?: string;
		/** Success state */
		success?: boolean;
		/** Helper text */
		hint?: string;
		/** Required field */
		required?: boolean;
		/** Show validation state only after blur */
		validateOnBlur?: boolean;
		/** Field content */
		children: Snippet;
	}

	let {
		label,
		name,
		error,
		success = false,
		hint,
		required = false,
		validateOnBlur = true,
		children
	}: Props = $props();

	let touched = $state(false);
	let fieldId = $state(name || `field-${Math.random().toString(36).slice(2, 9)}`);

	// Show error only after field has been touched (if validateOnBlur)
	const showError = $derived(error && (!validateOnBlur || touched));
	const showSuccess = $derived(success && touched && !error);

	function handleBlur() {
		touched = true;
	}
</script>

<div
	class="form-field"
	class:has-error={showError}
	class:has-success={showSuccess}
>
	{#if label}
		<label for={fieldId} class="field-label">
			{label}
			{#if required}
				<span class="required-indicator" aria-hidden="true">*</span>
			{/if}
		</label>
	{/if}

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="field-input" onblur={handleBlur}>
		{@render children()}
	</div>

	{#if showError}
		<div class="field-error" role="alert" aria-live="polite">
			<svg class="error-icon" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
				<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
				<path d="M12 8v5M12 15v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
			</svg>
			<span>{error}</span>
		</div>
	{:else if showSuccess}
		<div class="field-success" aria-live="polite">
			<svg class="success-icon" viewBox="0 0 24 24" fill="currentColor">
				<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
			</svg>
		</div>
	{:else if hint}
		<div class="field-hint">
			{hint}
		</div>
	{/if}
</div>

<style>
	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs, 0.5rem);
	}

	.field-label {
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 500;
		color: var(--color-fg-primary, #fff);
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.required-indicator {
		color: var(--color-error, #d44d4d);
	}

	.field-input {
		position: relative;
	}

	/* Style child inputs */
	.field-input :global(input),
	.field-input :global(select),
	.field-input :global(textarea) {
		width: 100%;
		background: var(--color-bg-surface, #111);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-md, 8px);
		padding: var(--space-sm, 1rem);
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-primary, #fff);
		transition:
			border-color var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			box-shadow var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.field-input :global(input:focus),
	.field-input :global(select:focus),
	.field-input :global(textarea:focus) {
		outline: none;
		border-color: var(--color-border-strong, rgba(255, 255, 255, 0.3));
		box-shadow: 0 0 0 3px var(--color-focus, rgba(255, 255, 255, 0.5));
	}

	.field-input :global(input::placeholder),
	.field-input :global(textarea::placeholder) {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	/* Error state */
	.has-error .field-input :global(input),
	.has-error .field-input :global(select),
	.has-error .field-input :global(textarea) {
		border-color: var(--color-error, #d44d4d);
	}

	.has-error .field-input :global(input:focus),
	.has-error .field-input :global(select:focus),
	.has-error .field-input :global(textarea:focus) {
		box-shadow: 0 0 0 3px var(--color-error-muted, rgba(212, 77, 77, 0.2));
	}

	/* Success state */
	.has-success .field-input :global(input),
	.has-success .field-input :global(select),
	.has-success .field-input :global(textarea) {
		border-color: var(--color-success, #44aa44);
	}

	.has-success .field-input :global(input:focus),
	.has-success .field-input :global(select:focus),
	.has-success .field-input :global(textarea:focus) {
		box-shadow: 0 0 0 3px var(--color-success-muted, rgba(68, 170, 68, 0.2));
	}

	.field-error {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-error, #d44d4d);
		animation: slideIn var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.error-icon {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}

	.field-success {
		display: flex;
		align-items: center;
		color: var(--color-success, #44aa44);
		animation: slideIn var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.success-icon {
		width: 16px;
		height: 16px;
	}

	.field-hint {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.field-input :global(input),
		.field-input :global(select),
		.field-input :global(textarea),
		.field-error,
		.field-success {
			transition: none;
			animation: none;
		}
	}
</style>
