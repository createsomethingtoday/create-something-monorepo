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

<div class="cube-reveal">
	<div class="logo-header">
		<h3>Isometric Cube</h3>
		<span class="logo-badge">existing</span>
	</div>

	<GridCanvas
		bind:this={gridCanvas}
		logoType="cube"
		{interactionMode}
		{timelineProgress}
		{onProgressChange}
	/>

	<p class="logo-description">
		The existing CREATE SOMETHING mark. An isometric cube reveals three visible faces
		from a single vantage point—the hermeneutic circle visualized.
	</p>
</div>

<style>
	.cube-reveal {
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
		color: var(--color-fg-muted);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		text-transform: uppercase;
		letter-spacing: 0.05em;
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
