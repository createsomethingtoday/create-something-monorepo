<script lang="ts">
	/**
	 * ViewToggle Component
	 *
	 * Segmented control for switching between Week/Month calendar views.
	 * Canon-compliant: monochrome, inverted selection.
	 */

	import type { CalendarView } from '../stores/calendar.svelte';

	interface Props {
		value: CalendarView;
		onchange?: (view: CalendarView) => void;
	}

	let { value, onchange }: Props = $props();

	function handleClick(view: CalendarView) {
		if (view !== value) {
			onchange?.(view);
		}
	}
</script>

<div class="view-toggle" role="tablist" aria-label="Calendar view">
	<button
		class="toggle-btn"
		class:selected={value === 'week'}
		role="tab"
		aria-selected={value === 'week'}
		onclick={() => handleClick('week')}
	>
		Week
	</button>
	<button
		class="toggle-btn"
		class:selected={value === 'month'}
		role="tab"
		aria-selected={value === 'month'}
		onclick={() => handleClick('month')}
	>
		Month
	</button>
</div>

<style>
	.view-toggle {
		display: inline-flex;
		background: var(--color-bg-surface, #111111);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-md, 8px);
		padding: 2px;
		gap: 2px;
	}

	.toggle-btn {
		padding: var(--space-xs, 0.375rem) var(--space-sm, 0.75rem);
		font-size: var(--text-caption, 0.75rem);
		font-weight: 500;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		background: transparent;
		border: none;
		border-radius: var(--radius-sm, 6px);
		cursor: pointer;
		transition:
			color var(--duration-micro, 100ms) var(--ease-standard, ease),
			background var(--duration-micro, 100ms) var(--ease-standard, ease);
		font-family: inherit;
	}

	.toggle-btn:hover:not(.selected) {
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	/* Selected - inverted (Canon) */
	.toggle-btn.selected {
		background: var(--color-fg-primary, #ffffff);
		color: var(--color-bg-pure, #000000);
	}

	.toggle-btn:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.toggle-btn {
			transition: none;
		}
	}
</style>
