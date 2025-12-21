<script lang="ts">
	import GridCanvas from './GridCanvas.svelte';
	import type { InteractionMode } from './types';

	interface Props {
		interactionMode: InteractionMode;
		timelineProgress?: number;
		onProgressChange?: (progress: number) => void;
	}

	let { interactionMode, timelineProgress = 0, onProgressChange }: Props = $props();

	let gridCanvas: GridCanvas;

	export function reset() {
		gridCanvas?.reset();
	}
</script>

<div class="cs-lettermark">
	<div class="logo-header">
		<h3>CS Lettermark</h3>
		<span class="logo-badge">new</span>
	</div>

	<GridCanvas
		bind:this={gridCanvas}
		logoType="cs-lettermark"
		{interactionMode}
		{timelineProgress}
		{onProgressChange}
	/>

	<p class="logo-description">
		A Morphic-inspired lettermark. "C" and "S" emerge from the same grid geometry—
		demonstrating that different forms can arise from shared structure.
	</p>
</div>

<style>
	.cs-lettermark {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.logo-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.logo-header h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.logo-badge {
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-caption);
		font-family: var(--font-mono);
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-full);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.cs-lettermark .logo-badge {
		color: var(--color-info);
		border-color: var(--color-info-border);
	}

	.logo-description {
		max-width: 320px;
		margin-top: var(--space-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		text-align: center;
		line-height: var(--leading-relaxed);
	}
</style>
