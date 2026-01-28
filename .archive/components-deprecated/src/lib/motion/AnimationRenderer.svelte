<script lang="ts">
	/**
	 * AnimationRenderer - Renders animation specs in Svelte
	 * 
	 * Reads from shared animation specs (same ones used by Remotion)
	 * and renders them as interactive web animations.
	 * 
	 * This ensures visual consistency between web and video output.
	 */
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	// Types imported inline to avoid build issues
	interface Keyframe {
		at: number;
		opacity?: number;
		scale?: number;
		blur?: number;
		x?: number;
		y?: number;
		rotation?: number;
		easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
	}

	interface AnimationPhase {
		id: string;
		label: string;
		start: number;
		end: number;
	}

	interface AnimationSpec {
		id: string;
		name: string;
		description: string;
		duration: number;
		fps?: number;
		canvas: {
			width: number;
			height: number;
			background: string;
		};
		phases: AnimationPhase[];
		elements: unknown[];
		reveal?: {
			text: string;
			style: 'fade' | 'mask' | 'typewriter';
			startPhase: number;
		};
	}

	import type { Snippet } from 'svelte';

	let {
		spec,
		autoplay = false,
		showControls = true,
		caption = '',
		class: className = '',
		children
	}: {
		spec: AnimationSpec;
		autoplay?: boolean;
		showControls?: boolean;
		caption?: string;
		class?: string;
		children?: Snippet<[{ progress: number; interpolate: typeof interpolate }]>;
	} = $props();

	let isPlaying = $state(false);
	let progress = tweened(0, { duration: spec.duration, easing: cubicOut });

	function play() {
		if (isPlaying) return;
		isPlaying = true;
		progress.set(0, { duration: 0 });
		progress.set(1, { duration: spec.duration });
	}

	function pause() {
		isPlaying = false;
	}

	function togglePlay() {
		if (isPlaying) {
			pause();
		} else {
			play();
		}
	}

	function reset() {
		isPlaying = false;
		progress.set(0, { duration: 0 });
	}

	// Auto-stop when complete
	$effect(() => {
		if ($progress >= 1) {
			isPlaying = false;
		}
	});

	// Autoplay on mount
	$effect(() => {
		if (autoplay) {
			play();
		}
	});

	// Get current phase
	const currentPhase = $derived(
		spec.phases.find(p => $progress >= p.start && $progress < p.end) ?? spec.phases[spec.phases.length - 1]
	);

	// Interpolate keyframe values
	function interpolate(keyframes: Keyframe[], prop: keyof Omit<Keyframe, 'at' | 'easing'>): number | undefined {
		if (!keyframes || keyframes.length === 0) return undefined;
		
		let before: Keyframe | null = null;
		let after: Keyframe | null = null;
		
		for (const kf of keyframes) {
			if (kf.at <= $progress && kf[prop] !== undefined) before = kf;
			if (kf.at >= $progress && !after && kf[prop] !== undefined) after = kf;
		}
		
		if (!before && !after) return undefined;
		if (!after) return before?.[prop] as number;
		if (!before) return after[prop] as number;
		if (before === after) return before[prop] as number;
		
		const beforeVal = before[prop] as number;
		const afterVal = after[prop] as number;
		const localProgress = (($progress - before.at) / (after.at - before.at));
		
		// Simple ease-out
		const eased = 1 - Math.pow(1 - localProgress, 2);
		
		return beforeVal + (afterVal - beforeVal) * eased;
	}

	// Reveal text opacity
	const revealOpacity = $derived(
		spec.reveal && $progress >= spec.reveal.startPhase
			? ($progress - spec.reveal.startPhase) / (1 - spec.reveal.startPhase)
			: 0
	);
</script>

<section class="animation-renderer {className}">
	<div class="animation-label">
		<span class="label-icon">▶</span>
		<span>{spec.name}</span>
	</div>
	
	<div 
		class="animation-container"
		style="
			aspect-ratio: {spec.canvas.width} / {spec.canvas.height};
			background: {spec.canvas.background};
		"
	>
		<!-- Phase label -->
		<div class="phase-label">{currentPhase?.label ?? ''}</div>
		
		<!-- Render elements based on spec.id for now -->
		<!-- In a full implementation, this would dynamically render based on spec.elements -->
		{@render children?.({ progress: $progress, interpolate })}
		
		<!-- Reveal text -->
		{#if spec.reveal && revealOpacity > 0}
			<div class="reveal-text" style="opacity: {revealOpacity};">
				{spec.reveal.text}
			</div>
		{/if}
		
		<!-- Progress bar -->
		<div class="progress-bar">
			<div class="progress-fill" style="width: {$progress * 100}%"></div>
		</div>
	</div>

	{#if showControls}
		<div class="controls">
			<button class="control-btn" onclick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
				{#if isPlaying}
					<span class="icon-pause">❚❚</span>
				{:else}
					<span class="icon-play">▶</span>
				{/if}
			</button>
			<button class="control-btn" onclick={reset} aria-label="Reset">
				<span class="icon-reset">↺</span>
			</button>
			<span class="progress-label">
				{Math.round($progress * 100)}%
			</span>
		</div>
	{/if}

	{#if caption}
		<p class="caption">{caption}</p>
	{/if}
</section>

<style>
	.animation-renderer {
		max-width: 900px;
		margin: var(--space-2xl, 3rem) auto;
		padding: 0 var(--space-lg, 1.5rem);
	}

	.animation-label {
		display: flex;
		align-items: center;
		gap: var(--space-sm, 0.5rem);
		font-family: var(--font-mono, monospace);
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, #666);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-md, 1rem);
	}

	.label-icon {
		color: var(--color-success, #22c55e);
	}

	.animation-container {
		border-radius: var(--radius-lg, 0.75rem);
		overflow: hidden;
		position: relative;
	}

	.phase-label {
		position: absolute;
		top: 24px;
		left: 0;
		right: 0;
		text-align: center;
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		color: #666;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		z-index: 10;
	}

	.reveal-text {
		position: absolute;
		bottom: 40px;
		left: 0;
		right: 0;
		text-align: center;
		font-size: 18px;
		font-weight: 300;
		color: #fff;
		z-index: 10;
	}

	.progress-bar {
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
		transition: width 50ms linear;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: var(--space-sm, 0.5rem);
		margin-top: var(--space-md, 1rem);
	}

	.control-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--color-bg-surface, #1a1a1a);
		border: 1px solid var(--color-border-subtle, #333);
		border-radius: var(--radius-md, 0.5rem);
		color: var(--color-fg-secondary, #999);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.control-btn:hover {
		background: var(--color-bg-elevated, #222);
		color: var(--color-fg-primary, #fff);
	}

	.icon-play, .icon-pause, .icon-reset {
		font-size: 14px;
		line-height: 1;
	}

	.progress-label {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, #666);
		margin-left: var(--space-sm, 0.5rem);
	}

	.caption {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted, #666);
		text-align: center;
		margin-top: var(--space-md, 1rem);
		margin-bottom: 0;
	}
</style>
