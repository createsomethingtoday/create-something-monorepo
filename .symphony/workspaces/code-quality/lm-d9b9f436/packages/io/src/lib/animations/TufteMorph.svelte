<script lang="ts">
	/**
	 * TufteMorph - Svelte version of the card morph animation
	 * 
	 * Single card morphing from desktop to mobile using Tufte principles.
	 * Camera zooms in during transformation.
	 */
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicInOut, cubicOut } from 'svelte/easing';
	import { TrendingUp } from 'lucide-svelte';

	// Card data
	const CARD = {
		title: 'Revenue',
		value: '$47.2K',
		trend: [32, 35, 38, 41, 39, 44, 47.2],
		change: 12.3,
	};

	// Animation state
	let progress = tweened(0, { duration: 2000, easing: cubicInOut });
	let zoom = tweened(1, { duration: 2000, easing: cubicInOut });
	let isPlaying = $state(false);
	let hasPlayed = $state(false);

	// Derived interpolations
	const width = $derived(320 + ($progress * 40));
	const height = $derived(200 - ($progress * 120));
	const padding = $derived(24 - ($progress * 8));
	const borderRadius = $derived(16 - ($progress * 6));
	const borderOpacity = $derived(0.15 - ($progress * 0.1));
	const shadowOpacity = $derived(0.2 * (1 - $progress));
	const isRow = $derived($progress > 0.5);
	const valueSize = $derived(42 - ($progress * 14));
	const labelSize = $derived(13 - ($progress * 1));
	const sparklineWidth = $derived(260 - ($progress * 204));
	const sparklineHeight = $derived(50 - ($progress * 32));
	const badgeOpacity = $derived(Math.max(0, 1 - $progress * 3));
	const changeTextOpacity = $derived(Math.max(0, ($progress - 0.6) * 2.5));

	// Sparkline path
	const sparklinePath = $derived.by(() => {
		const min = Math.min(...CARD.trend);
		const max = Math.max(...CARD.trend);
		const range = max - min || 1;
		const w = sparklineWidth;
		const h = sparklineHeight;
		
		return CARD.trend.map((value, i) => {
			const x = (i / (CARD.trend.length - 1)) * w;
			const y = h - ((value - min) / range) * (h - 4) - 2;
			return `${x},${y}`;
		}).join(' ');
	});

	async function play() {
		if (isPlaying) return;
		
		isPlaying = true;
		hasPlayed = true;
		
		// Reset
		progress.set(0, { duration: 0 });
		zoom.set(1, { duration: 0 });
		
		// Hold at desktop (1s)
		await new Promise(r => setTimeout(r, 1000));
		
		// Zoom in + morph (2s)
		progress.set(1, { duration: 2000, easing: cubicInOut });
		zoom.set(1.6, { duration: 2000, easing: cubicInOut });
		await new Promise(r => setTimeout(r, 2000));
		
		// Hold at mobile (1s)
		await new Promise(r => setTimeout(r, 1000));
		
		// Zoom out (1s)
		await zoom.set(1, { duration: 1000, easing: cubicOut });
		
		// Hold (0.5s)
		await new Promise(r => setTimeout(r, 500));
		
		isPlaying = false;
	}

	function reset() {
		progress.set(0, { duration: 500 });
		zoom.set(1, { duration: 500 });
		hasPlayed = false;
	}
</script>

<div class="morph-container">
	<!-- Animation viewport -->
	<div class="viewport">
		<div 
			class="camera"
			style="transform: scale({$zoom})"
		>
			<div
				class="card"
				style="
					width: {width}px;
					height: {height}px;
					padding: {padding}px;
					border-radius: {borderRadius}px;
					border: 1px solid rgba(255, 255, 255, {borderOpacity});
					box-shadow: 0 8px 32px rgba(0, 0, 0, {shadowOpacity});
					flex-direction: {isRow ? 'row' : 'column'};
					align-items: {isRow ? 'center' : 'flex-start'};
					justify-content: {isRow ? 'space-between' : 'flex-start'};
				"
			>
				<!-- Value + Label -->
				<div class="value-group" class:row={isRow}>
					<span class="value" style="font-size: {valueSize}px">
						{CARD.value}
					</span>
					<span 
						class="label" 
						style="font-size: {labelSize}px"
						class:uppercase={$progress < 0.5}
					>
						{CARD.title}
					</span>
				</div>

				<!-- Desktop badge -->
				{#if !isRow}
					<div class="badge" style="opacity: {badgeOpacity}">
						<TrendingUp size={12} color="#44aa44" />
						<span>+{CARD.change}%</span>
					</div>
				{/if}

				<!-- Sparkline area -->
				<div class="sparkline-area" class:row={isRow}>
					<svg width={sparklineWidth} height={sparklineHeight}>
						<polyline
							points={sparklinePath}
							fill="none"
							stroke="rgba(255, 255, 255, 0.5)"
							stroke-width={$progress > 0.5 ? 1.5 : 2}
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>

					<!-- Mobile inline change -->
					{#if isRow}
						<span class="change-inline" style="opacity: {changeTextOpacity}">
							+{CARD.change}%
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Phase label -->
		<div class="phase-label" class:visible={hasPlayed}>
			{$progress < 0.5 ? 'DESKTOP' : 'MOBILE (TUFTE)'}
		</div>
	</div>

	<!-- Controls -->
	<div class="controls">
		<button class="play-btn" onclick={play} disabled={isPlaying}>
			{isPlaying ? 'Playing...' : hasPlayed ? 'Replay' : 'Play Animation'}
		</button>
		{#if hasPlayed && !isPlaying}
			<button class="reset-btn" onclick={reset}>Reset</button>
		{/if}
	</div>
</div>

<style>
	.morph-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.viewport {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		background: #000;
		border-radius: 0.75rem;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.camera {
		transform-origin: center center;
		transition: transform 0.1s linear;
	}

	.card {
		background: rgba(255, 255, 255, 0.03);
		display: flex;
		position: relative;
		overflow: hidden;
	}

	.value-group {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0;
	}

	.value-group.row {
		flex-direction: row;
		align-items: baseline;
		gap: 10px;
	}

	.value {
		font-family: Inter, system-ui, sans-serif;
		font-weight: 600;
		color: #fff;
		line-height: 1;
	}

	.label {
		font-family: Inter, system-ui, sans-serif;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		margin-top: 6px;
		letter-spacing: 0;
	}

	.label.uppercase {
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.value-group.row .label {
		margin-top: 0;
	}

	.badge {
		position: absolute;
		top: 24px;
		right: 24px;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border-radius: 12px;
		background: rgba(68, 170, 68, 0.2);
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		font-weight: 600;
		color: #44aa44;
	}

	.sparkline-area {
		display: flex;
		align-items: center;
		gap: 0;
		margin-top: 20px;
		width: 100%;
	}

	.sparkline-area.row {
		gap: 16px;
		margin-top: 0;
		width: auto;
	}

	.change-inline {
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		font-weight: 500;
		color: #44aa44;
	}

	.phase-label {
		position: absolute;
		bottom: 16px;
		left: 50%;
		transform: translateX(-50%);
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.3);
		letter-spacing: 0.1em;
		opacity: 0;
		transition: opacity 0.3s;
	}

	.phase-label.visible {
		opacity: 1;
	}

	.controls {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.play-btn, .reset-btn {
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		padding: 8px 16px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: all 0.2s;
	}

	.play-btn:hover:not(:disabled), .reset-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
	}

	.play-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
