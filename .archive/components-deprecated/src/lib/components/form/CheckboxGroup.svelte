<script lang="ts">
	/**
	 * CheckboxGroup Component
	 *
	 * A fieldset wrapper for grouping related checkboxes with proper accessibility.
	 * Uses native fieldset/legend for screen reader support.
	 *
	 * Canon: The group disappears; only the options remain.
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/** Group legend/label */
		legend: string;
		/** Helper description below legend */
		description?: string;
		/** Error message (shows error state when set) */
		error?: string | null;
		/** Whether at least one checkbox is required */
		required?: boolean;
		/** Whether all checkboxes are disabled */
		disabled?: boolean;
		/** Layout direction */
		orientation?: 'vertical' | 'horizontal';
		/** Size variant (applies to all checkboxes) */
		size?: 'sm' | 'md' | 'lg';
		/** Checkbox children (use Checkbox components) */
		children: Snippet;
	}

	let {
		legend,
		description,
		error = null,
		required = false,
		disabled = false,
		orientation = 'vertical',
		size = 'md',
		children
	}: Props = $props();

	const groupId = `checkboxgroup-${crypto.randomUUID().slice(0, 8)}`;
	const descriptionId = `${groupId}-description`;
	const errorId = `${groupId}-error`;
</script>

<fieldset
	class="checkbox-group"
	class:checkbox-group-horizontal={orientation === 'horizontal'}
	class:checkbox-group-sm={size === 'sm'}
	class:checkbox-group-lg={size === 'lg'}
	class:has-error={error}
	{disabled}
	aria-describedby={error ? errorId : description ? descriptionId : undefined}
>
	<legend class="checkbox-group-legend">
		{legend}
		{#if required}
			<span class="required-indicator" aria-hidden="true">*</span>
		{/if}
	</legend>

	{#if description && !error}
		<p id={descriptionId} class="checkbox-group-description">
			{description}
		</p>
	{/if}

	<div class="checkbox-group-items">
		{@render children()}
	</div>

	{#if error}
		<p id={errorId} class="checkbox-group-error" role="alert">
			{error}
		</p>
	{/if}
</fieldset>

<style>
	.checkbox-group {
		border: none;
		padding: 0;
		margin: 0;
		min-width: 0;
	}

	/* Legend */
	.checkbox-group-legend {
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
	.checkbox-group-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0 0 var(--space-sm) 0;
	}

	/* Items container */
	.checkbox-group-items {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.checkbox-group-horizontal .checkbox-group-items {
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	/* Error message */
	.checkbox-group-error {
		font-size: var(--text-caption);
		color: var(--color-error);
		margin: var(--space-xs) 0 0 0;
	}

	/* Disabled state */
	.checkbox-group:disabled {
		opacity: 0.5;
	}

	/* Size variants */
	.checkbox-group-sm .checkbox-group-legend {
		font-size: var(--text-caption);
	}

	.checkbox-group-sm .checkbox-group-items {
		gap: var(--space-xs);
	}

	.checkbox-group-lg .checkbox-group-legend {
		font-size: var(--text-body);
	}

	.checkbox-group-lg .checkbox-group-items {
		gap: var(--space-md);
	}
</style>
