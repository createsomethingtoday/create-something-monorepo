<script lang="ts">
	/**
	 * InteractionModes - Mode selector for subtractive revelation
	 *
	 * Three modes, each mapping to Heideggerian concepts:
	 * - Wipe: Zuhandenheit (tool recedes into use)
	 * - Dissolve: Gelassenheit (letting-be)
	 * - Stillness: Meditation (contemplative revelation)
	 */

	import type { InteractionMode } from './types';

	interface Props {
		mode: InteractionMode;
		onModeChange: (mode: InteractionMode) => void;
		onReset: () => void;
	}

	let { mode, onModeChange, onReset }: Props = $props();

	const modes: { id: InteractionMode; label: string; description: string }[] = [
		{
			id: 'wipe',
			label: 'Wipe',
			description: 'Drag to clear the noise. The tool recedes into use.'
		},
		{
			id: 'dissolve',
			label: 'Dissolve',
			description: 'Click to dissolve areas. Letting-be reveals truth.'
		},
		{
			id: 'stillness',
			label: 'Stillness',
			description: 'Be still. Noise fades with contemplation.'
		}
	];
</script>

<div class="interaction-modes">
	<div class="mode-tabs" role="tablist">
		{#each modes as m (m.id)}
			<button
				class="mode-tab"
				class:active={mode === m.id}
				role="tab"
				aria-selected={mode === m.id}
				onclick={() => onModeChange(m.id)}
			>
				{m.label}
			</button>
		{/each}
	</div>

	<p class="mode-description">
		{modes.find((m) => m.id === mode)?.description}
	</p>

	<button class="reset-button" onclick={onReset}> Reset </button>
</div>

<style>
	.interaction-modes {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm, 1rem);
		width: 100%;
		max-width: 400px;
	}

	.mode-tabs {
		display: flex;
		gap: var(--space-xs, 0.5rem);
		background: var(--color-bg-surface, #111111);
		padding: var(--space-xs, 0.5rem);
		border-radius: var(--radius-lg, 12px);
	}

	.mode-tab {
		flex: 1;
		padding: var(--space-xs, 0.5rem) var(--space-sm, 1rem);
		background: transparent;
		border: none;
		border-radius: var(--radius-md, 8px);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		font-family: var(--font-mono, monospace);
		font-size: var(--text-body-sm, 0.875rem);
		cursor: pointer;
		transition: all var(--duration-micro, 200ms) var(--ease-standard, ease);
	}

	.mode-tab:hover {
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		background: var(--color-hover, rgba(255, 255, 255, 0.05));
	}

	.mode-tab.active {
		background: var(--color-bg-subtle, #1a1a1a);
		color: var(--color-fg-primary, white);
	}

	.mode-description {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		font-style: italic;
		text-align: center;
		margin: 0;
		min-height: 2.5em;
	}

	.reset-button {
		align-self: center;
		padding: var(--space-xs, 0.5rem) var(--space-md, 1.618rem);
		background: transparent;
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-md, 8px);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		font-family: var(--font-mono, monospace);
		font-size: var(--text-caption, 0.75rem);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all var(--duration-micro, 200ms) var(--ease-standard, ease);
	}

	.reset-button:hover {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}
</style>
