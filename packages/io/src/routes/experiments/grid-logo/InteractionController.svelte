<script lang="ts">
	import type { InteractionMode } from './types';

	interface Props {
		mode: InteractionMode;
		timelineProgress: number;
		onModeChange: (mode: InteractionMode) => void;
		onTimelineChange: (progress: number) => void;
		onReset: () => void;
	}

	let { mode, timelineProgress, onModeChange, onTimelineChange, onReset }: Props = $props();

	const modes: { value: InteractionMode; label: string; description: string }[] = [
		{ value: 'click', label: 'Click', description: 'Zuhandenheit' },
		{ value: 'drag', label: 'Drag', description: 'Gelassenheit' },
		{ value: 'timeline', label: 'Timeline', description: 'Vorhandenheit' }
	];

	function handleTimelineInput(event: Event) {
		const target = event.target as HTMLInputElement;
		onTimelineChange(parseFloat(target.value));
	}
</script>

<div class="interaction-controller">
	<div class="mode-tabs">
		{#each modes as m}
			<button
				class="mode-tab"
				class:active={mode === m.value}
				onclick={() => onModeChange(m.value)}
				aria-pressed={mode === m.value}
			>
				<span class="tab-label">{m.label}</span>
				<span class="tab-description">{m.description}</span>
			</button>
		{/each}
	</div>

	{#if mode === 'timeline'}
		<div class="timeline-control">
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={timelineProgress}
				oninput={handleTimelineInput}
				class="timeline-slider"
				aria-label="Reveal progress"
			/>
			<span class="timeline-value">{Math.round(timelineProgress * 100)}%</span>
		</div>
	{/if}

	<button class="reset-button" onclick={onReset}>
		Reset Grid
	</button>
</div>

<style>
	.interaction-controller {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.mode-tabs {
		display: flex;
		gap: var(--space-xs);
	}

	.mode-tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			background var(--duration-micro) var(--ease-standard),
			border-color var(--duration-micro) var(--ease-standard);
	}

	.mode-tab:hover {
		background: var(--color-hover);
	}

	.mode-tab.active {
		background: var(--color-active);
		border-color: var(--color-border-emphasis);
	}

	.tab-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.tab-description {
		font-size: var(--text-caption);
		font-family: var(--font-mono);
		color: var(--color-fg-muted);
		text-transform: lowercase;
	}

	.timeline-control {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		width: 100%;
		max-width: 300px;
	}

	.timeline-slider {
		flex: 1;
		height: 4px;
		appearance: none;
		background: var(--color-border-default);
		border-radius: var(--radius-full);
		cursor: pointer;
	}

	.timeline-slider::-webkit-slider-thumb {
		appearance: none;
		width: 16px;
		height: 16px;
		background: var(--color-fg-primary);
		border-radius: var(--radius-full);
		cursor: pointer;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.timeline-slider::-webkit-slider-thumb:hover {
		transform: scale(1.2);
	}

	.timeline-slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		background: var(--color-fg-primary);
		border: none;
		border-radius: var(--radius-full);
		cursor: pointer;
	}

	.timeline-value {
		min-width: 3em;
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-align: right;
	}

	.reset-button {
		padding: var(--space-xs) var(--space-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			color var(--duration-micro) var(--ease-standard),
			border-color var(--duration-micro) var(--ease-standard);
	}

	.reset-button:hover {
		color: var(--color-fg-primary);
		border-color: var(--color-border-emphasis);
	}
</style>
