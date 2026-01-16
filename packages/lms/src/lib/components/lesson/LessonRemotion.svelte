<script lang="ts">
	/**
	 * LessonRemotion - Remotion Player wrapper for animations
	 * 
	 * Embeds Remotion compositions inline for complex visualizations.
	 * Falls back to static content if Remotion isn't available.
	 */
	import { onMount } from 'svelte';
	import { Play, Pause, RotateCcw } from 'lucide-svelte';

	let {
		compositionId,
		caption = '',
		width = 800,
		height = 450,
		fps = 30,
		durationInFrames = 150,
		class: className = ''
	}: {
		compositionId: string;
		caption?: string;
		width?: number;
		height?: number;
		fps?: number;
		durationInFrames?: number;
		class?: string;
	} = $props();

	let playerContainer: HTMLDivElement;
	let isPlaying = $state(false);
	let currentFrame = $state(0);
	let remotionLoaded = $state(false);
	let loadError = $state(false);

	// For now, we'll show a placeholder since Remotion Player requires React
	// In production, this would load the actual Remotion player via a React wrapper
	onMount(() => {
		// Check if Remotion compositions are available
		// This is a placeholder - real implementation would load @remotion/player
		const checkRemotion = async () => {
			try {
				// Simulated check - in reality would import from motion-studio
				remotionLoaded = false; // Set to true when real player is integrated
			} catch (e) {
				loadError = true;
			}
		};
		
		checkRemotion();
	});

	function togglePlay() {
		isPlaying = !isPlaying;
	}

	function reset() {
		currentFrame = 0;
		isPlaying = false;
	}

	// Simulate playback for demo
	$effect(() => {
		if (isPlaying && currentFrame < durationInFrames) {
			const timer = setTimeout(() => {
				currentFrame++;
			}, 1000 / fps);
			return () => clearTimeout(timer);
		} else if (currentFrame >= durationInFrames) {
			isPlaying = false;
		}
	});

	const progress = $derived((currentFrame / durationInFrames) * 100);
</script>

<section class="lesson-remotion {className}">
	<div class="remotion-label">
		<span class="label-icon">▶</span>
		<span>Animation: {compositionId}</span>
	</div>
	
	<div 
		class="remotion-container"
		bind:this={playerContainer}
		style="aspect-ratio: {width} / {height};"
	>
		{#if loadError}
			<div class="remotion-error">
				<p>Animation not available</p>
			</div>
		{:else if !remotionLoaded}
			<!-- Placeholder until real Remotion integration -->
			<div class="remotion-placeholder">
				<div class="placeholder-content">
					<div class="composition-id">{compositionId}</div>
					<p class="placeholder-text">
						{#if compositionId === 'ToolReceding'}
							The hammer disappears when hammering.
							<br /><br />
							<em>Watch the focus shift from tool to work.</em>
						{:else if compositionId === 'IDEvsTerminal'}
							From chrome to canvas.
							<br /><br />
							<em>Watch the interface dissolve.</em>
						{:else}
							Animation composition
						{/if}
					</p>
				</div>
				
				<div class="placeholder-progress">
					<div class="progress-fill" style="width: {progress}%"></div>
				</div>
			</div>
		{:else}
			<!-- Real Remotion player would go here -->
			<div class="remotion-player">
				<!-- <Player component={} ... /> -->
			</div>
		{/if}
	</div>

	<div class="remotion-controls">
		<button class="control-btn" onclick={togglePlay}>
			{#if isPlaying}
				<Pause size={18} />
			{:else}
				<Play size={18} />
			{/if}
		</button>
		<button class="control-btn" onclick={reset}>
			<RotateCcw size={18} />
		</button>
		<span class="frame-count">
			{currentFrame} / {durationInFrames}
		</span>
	</div>

	{#if caption}
		<p class="remotion-caption">{caption}</p>
	{/if}
</section>

<style>
	.lesson-remotion {
		max-width: 900px;
		margin: var(--space-2xl) auto;
		padding: 0 var(--space-lg);
	}

	.remotion-label {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-md);
	}

	.label-icon {
		color: var(--color-success);
	}

	.remotion-container {
		background: #000;
		border-radius: var(--radius-lg);
		overflow: hidden;
		position: relative;
	}

	.remotion-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: var(--space-xl);
		color: #fff;
	}

	.placeholder-content {
		text-align: center;
		max-width: 500px;
	}

	.composition-id {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: #737373;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		margin-bottom: var(--space-lg);
	}

	.placeholder-text {
		font-size: var(--text-h3);
		font-weight: var(--font-light);
		line-height: 1.5;
		margin: 0;
	}

	.placeholder-text em {
		font-size: var(--text-body);
		color: #737373;
	}

	.placeholder-progress {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: #333;
	}

	.progress-fill {
		height: 100%;
		background: #fff;
		transition: width 33ms linear;
	}

	.remotion-error {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-muted);
	}

	.remotion-controls {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}

	.control-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.control-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-fg-primary);
	}

	.frame-count {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-left: var(--space-sm);
	}

	.remotion-caption {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-align: center;
		margin-top: var(--space-md);
		margin-bottom: 0;
	}
</style>
