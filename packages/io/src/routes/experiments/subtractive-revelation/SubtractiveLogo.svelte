<script lang="ts">
	/**
	 * SubtractiveLogo - Interactive revelation of the isometric cube
	 *
	 * "Creation is the discipline of removing what obscures."
	 *
	 * The cube is always there. Noise conceals it.
	 * User interaction removes the noise, revealing truth.
	 *
	 * Uses SVG <animate> elements following SubtractiveTriad.svelte pattern.
	 */

	import { isometricBoxPath } from '@create-something/components/visual';
	import type { InteractionMode } from './types';

	interface Props {
		mode: InteractionMode;
		size?: number;
		noiseCount?: number;
		onProgressChange?: (percent: number) => void;
	}

	let { mode, size = 400, noiseCount = 200, onProgressChange }: Props = $props();

	// Particle state - only track revealed status, not animation
	interface Particle {
		id: string;
		x: number;
		y: number;
		width: number;
		height: number;
		opacity: number;
		revealed: boolean;
	}

	// Generate noise particles concentrated around cube
	function generateParticles(count: number): Particle[] {
		const particles: Particle[] = [];
		const cubeRadius = size * 0.35;
		const centerX = size / 2;
		const centerY = size / 2;

		for (let i = 0; i < count; i++) {
			const angle = Math.random() * Math.PI * 2;
			const distance = Math.random() * cubeRadius * 1.2;
			const x = centerX + Math.cos(angle) * distance;
			const y = centerY + Math.sin(angle) * distance * 0.8;

			particles.push({
				id: `p-${i}`,
				x: x - 2,
				y: y - 2,
				width: 2 + Math.random() * 4,
				height: 2 + Math.random() * 4,
				opacity: 0.3 + Math.random() * 0.4,
				revealed: false
			});
		}
		return particles;
	}

	let particles = $state<Particle[]>(generateParticles(noiseCount));
	let isDragging = $state(false);

	// Non-reactive timer - doesn't need to trigger updates
	let stillnessTimer: ReturnType<typeof setTimeout> | null = null;

	// Progress calculation
	const revealedCount = $derived(particles.filter((p) => p.revealed).length);
	const progress = $derived(Math.round((revealedCount / particles.length) * 100));

	// Track last reported progress to avoid spam
	let lastReportedProgress = -1;

	// Report progress changes (throttled)
	$effect(() => {
		if (progress !== lastReportedProgress) {
			lastReportedProgress = progress;
			onProgressChange?.(progress);
		}
	});

	// Cube paths
	const cubeSize = size * 0.35;
	const cubePaths = $derived(isometricBoxPath(size / 2, size / 2, cubeSize, cubeSize, cubeSize));

	// Reveal particles within radius
	function revealInRadius(x: number, y: number, radius: number) {
		particles = particles.map((p) => {
			if (p.revealed) return p;

			const dx = p.x + p.width / 2 - x;
			const dy = p.y + p.height / 2 - y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist < radius) {
				return { ...p, revealed: true };
			}
			return p;
		});
	}

	// Stillness mode - auto-reveal when user is still
	function startStillnessTimer() {
		clearStillnessTimer();
		if (mode === 'stillness') {
			stillnessTimer = setTimeout(autoReveal, 2000);
		}
	}

	function clearStillnessTimer() {
		if (stillnessTimer) {
			clearTimeout(stillnessTimer);
			stillnessTimer = null;
		}
	}

	function autoReveal() {
		if (mode !== 'stillness') return;

		const unrevealed = particles.filter((p) => !p.revealed);
		if (unrevealed.length === 0) return;

		// Reveal ~5% of remaining particles
		const toReveal = Math.max(1, Math.floor(unrevealed.length * 0.05));
		let revealed = 0;

		particles = particles.map((p) => {
			if (p.revealed || revealed >= toReveal) return p;
			revealed++;
			return { ...p, revealed: true };
		});

		// Continue revealing
		stillnessTimer = setTimeout(autoReveal, 400);
	}

	// Event handlers
	function handleMouseDown(event: MouseEvent) {
		if (mode === 'stillness') {
			startStillnessTimer();
			return;
		}
		if (mode === 'wipe') {
			isDragging = true;
		}
		handleInteraction(event);
	}

	function handleMouseMove(event: MouseEvent) {
		if (mode === 'stillness') {
			startStillnessTimer();
			return;
		}
		if (mode === 'wipe' && isDragging) {
			handleInteraction(event);
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleClick(event: MouseEvent) {
		if (mode === 'dissolve') {
			handleInteraction(event);
		}
	}

	function handleInteraction(event: MouseEvent) {
		const svg = event.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * size;
		const y = ((event.clientY - rect.top) / rect.height) * size;
		const radius = mode === 'wipe' ? 40 : 60;
		revealInRadius(x, y, radius);
	}

	// Touch handlers
	function handleTouchStart(event: TouchEvent) {
		if (mode === 'stillness') {
			startStillnessTimer();
			return;
		}
		event.preventDefault();
		if (mode === 'wipe') {
			isDragging = true;
		}
		handleTouchInteraction(event);
	}

	function handleTouchMove(event: TouchEvent) {
		if (mode === 'stillness') {
			startStillnessTimer();
			return;
		}
		event.preventDefault();
		if (mode === 'wipe' && isDragging) {
			handleTouchInteraction(event);
		}
	}

	function handleTouchEnd() {
		isDragging = false;
	}

	function handleTouchInteraction(event: TouchEvent) {
		const touch = event.touches[0];
		if (!touch) return;

		const svg = (event.currentTarget as Element).closest('svg') as SVGSVGElement;
		if (!svg) return;

		const rect = svg.getBoundingClientRect();
		const x = ((touch.clientX - rect.left) / rect.width) * size;
		const y = ((touch.clientY - rect.top) / rect.height) * size;
		const radius = mode === 'wipe' ? 40 : 60;
		revealInRadius(x, y, radius);
	}

	// Initialize/cleanup stillness mode on mode change
	$effect(() => {
		if (mode === 'stillness') {
			startStillnessTimer();
		} else {
			clearStillnessTimer();
		}
		return clearStillnessTimer;
	});

	export function reset() {
		clearStillnessTimer();
		particles = generateParticles(noiseCount);
		lastReportedProgress = -1;
		if (mode === 'stillness') {
			startStillnessTimer();
		}
	}
</script>

<div class="subtractive-logo-wrapper">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<svg
		viewBox="0 0 {size} {size}"
		class="subtractive-logo"
		class:mode-wipe={mode === 'wipe'}
		class:mode-dissolve={mode === 'dissolve'}
		class:mode-stillness={mode === 'stillness'}
		role="application"
		aria-label="Interactive logo revelation - {mode} mode"
		tabindex="0"
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		onclick={handleClick}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				revealInRadius(size / 2, size / 2, 60);
			}
		}}
	>
		<!-- Background -->
		<rect x="0" y="0" width={size} height={size} class="canvas-bg" />

		<!-- The cube (always present, always was) -->
		<g class="cube-layer">
			<path d={cubePaths.top} class="face face-top" />
			<path d={cubePaths.left} class="face face-left" />
			<path d={cubePaths.right} class="face face-right" />
		</g>

		<!-- Noise layer (obscures the truth) -->
		<g class="noise-layer">
			{#each particles as particle (particle.id)}
				<rect
					x={particle.x}
					y={particle.y}
					width={particle.width}
					height={particle.height}
					class="noise-particle"
					class:revealed={particle.revealed}
					style:--particle-opacity={particle.opacity}
				/>
			{/each}
		</g>
	</svg>

	<div class="progress-indicator">
		<span class="progress-value">{progress}%</span>
		<span class="progress-label">revealed</span>
	</div>
</div>

<style>
	.subtractive-logo-wrapper {
		position: relative;
		width: 100%;
		max-width: 400px;
	}

	.subtractive-logo {
		width: 100%;
		height: auto;
		touch-action: none;
		user-select: none;
	}

	.subtractive-logo.mode-wipe {
		cursor: crosshair;
	}

	.subtractive-logo.mode-dissolve {
		cursor: pointer;
	}

	.subtractive-logo.mode-stillness {
		cursor: default;
	}

	.canvas-bg {
		fill: var(--color-bg-pure, #000000);
	}

	/* Cube faces */
	.face {
		stroke: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}

	.face-top {
		fill: rgba(255, 255, 255, 0.25);
	}

	.face-left {
		fill: rgba(255, 255, 255, 0.12);
	}

	.face-right {
		fill: rgba(255, 255, 255, 0.05);
	}

	/* Noise particles - simple CSS transition */
	.noise-particle {
		fill: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		opacity: var(--particle-opacity, 0.4);
		transition: opacity 200ms ease-out;
	}

	.noise-particle.revealed {
		opacity: 0;
	}

	/* Progress indicator */
	.progress-indicator {
		display: flex;
		align-items: baseline;
		gap: var(--space-xs, 0.5rem);
		margin-top: var(--space-sm, 1rem);
		font-family: var(--font-mono, monospace);
	}

	.progress-value {
		font-size: var(--text-h3, 1.5rem);
		font-weight: var(--font-semibold, 600);
		color: var(--color-fg-primary, white);
	}

	.progress-label {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}
</style>
