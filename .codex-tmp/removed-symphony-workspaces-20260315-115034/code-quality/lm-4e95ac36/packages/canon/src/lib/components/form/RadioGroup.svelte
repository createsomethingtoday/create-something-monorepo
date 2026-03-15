<script lang="ts">
	/**
	 * RadioGroup Component
	 *
	 * A fieldset wrapper for grouping radio buttons with proper accessibility.
	 * Provides arrow key navigation and manages the selected value.
	 *
	 * Canon: The group disappears; only the selection remains.
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/** Currently selected value (bindable) */
		value?: string;
		/** Group legend/label */
		legend: string;
		/** Group name attribute (shared by all radios) */
		name: string;
		/** Helper description below legend */
		description?: string;
		/** Error message (shows error state when set) */
		error?: string | null;
		/** Whether a selection is required */
		required?: boolean;
		/** Whether all radios are disabled */
		disabled?: boolean;
		/** Layout direction */
		orientation?: 'vertical' | 'horizontal';
		/** Size variant (applies to all radios) */
		size?: 'sm' | 'md' | 'lg';
		/** Radio children (use Radio components) */
		children: Snippet;
		/** Called when selection changes */
		onchange?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		legend,
		name,
		description,
		error = null,
		required = false,
		disabled = false,
		orientation = 'vertical',
		size = 'md',
		children,
		onchange
	}: Props = $props();

	const groupId = `radiogroup-${crypto.randomUUID().slice(0, 8)}`;
	const descriptionId = `${groupId}-description`;
	const errorId = `${groupId}-error`;

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.type === 'radio' && target.checked) {
			value = target.value;
			onchange?.(target.value);
		}
	}
</script>

<fieldset
	class="radio-group"
	class:radio-group-horizontal={orientation === 'horizontal'}
	class:radio-group-sm={size === 'sm'}
	class:radio-group-lg={size === 'lg'}
	class:has-error={error}
	{disabled}
	role="radiogroup"
	aria-required={required ? 'true' : undefined}
	aria-describedby={error ? errorId : description ? descriptionId : undefined}
	onchange={handleChange}
>
	<legend class="radio-group-legend">
		{legend}
		{#if required}
			<span class="required-indicator" aria-hidden="true">*</span>
		{/if}
	</legend>

	{#if description && !error}
		<p id={descriptionId} class="radio-group-description">
			{description}
		</p>
	{/if}

	<div class="radio-group-items">
		{@render children()}
	</div>

	{#if error}
		<p id={errorId} class="radio-group-error" role="alert">
			{error}
		</p>
	{/if}
</fieldset>

<style>
	.radio-group {
		border: none;
		padding: 0;
		margin: 0;
		min-width: 0;
	}

	/* Legend */
	.radio-group-legend {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		padding: 0;
		margin-bottom: var(--space-xs);
	}

	.required-indicator {
		color: var(--color-error);
		margin-left: 2px;
	}

	/* Description */
	.radio-group-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0 0 var(--space-sm) 0;
	}

	/* Items container */
	.radio-group-items {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.radio-group-horizontal .radio-group-items {
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	/* Error message */
	.radio-group-error {
		font-size: var(--text-caption);
		color: var(--color-error);
		margin: var(--space-xs) 0 0 0;
	}

	/* Disabled state */
	.radio-group:disabled {
		opacity: 0.5;
	}

	/* Size variants */
	.radio-group-sm .radio-group-legend {
		font-size: var(--text-caption);
	}

	.radio-group-sm .radio-group-items {
		gap: var(--space-xs);
	}

	.radio-group-lg .radio-group-legend {
		font-size: var(--text-body);
	}

	.radio-group-lg .radio-group-items {
		gap: var(--space-md);
	}
</style>
