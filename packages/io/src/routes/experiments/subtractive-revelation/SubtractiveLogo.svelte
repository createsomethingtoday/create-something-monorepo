<script lang="ts">
	/**
	 * SubtractiveLogo - Interactive revelation of the isometric cube
	 *
	 * "Creation is the discipline of removing what obscures."
	 *
	 * The cube is always there. Noise conceals it.
	 * User interaction removes the noise, revealing truth.
	 */

	import { isometricBoxPath } from '@create-something/components/visual';
	import NoiseLayer from './NoiseLayer.svelte';
	import type { InteractionMode, Particle } from './types';

	interface Props {
		mode: InteractionMode;
		size?: number;
		noiseCount?: number;
		onProgressChange?: (percent: number) => void;
	}

	let { mode, size = 400, noiseCount = 300, onProgressChange }: Props = $props();

	// Generate noise particles
	function generateParticles(count: number): Particle[] {
		const particles: Particle[] = [];
		const cubeRadius = size * 0.35;
		const centerX = size / 2;
		const centerY = size / 2;

		for (let i = 0; i < count; i++) {
			// Concentrate particles around the cube area
			const angle = Math.random() * Math.PI * 2;
			const distance = Math.random() * cubeRadius * 1.2;
			const x = centerX + Math.cos(angle) * distance;
			const y = centerY + Math.sin(angle) * distance * 0.8; // Slightly flattened for isometric

			particles.push({
				id: `p-${i}`,
				x: x - 2,
				y: y - 2,
				width: 2 + Math.random() * 4,
				height: 2 + Math.random() * 4,
				opacity: 0.2 + Math.random() * 0.4,
				revealed: false,
				revealDelay: 0
			});
		}
		return particles;
	}

	let particles = $state<Particle[]>(generateParticles(noiseCount));
	let isDragging = $state(false);
	let stillnessTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	// Calculate obscuration percentage
	const obscurationPercent = $derived(() => {
		const hidden = particles.filter((p) => !p.revealed).length;
		return Math.round((hidden / particles.length) * 100);
	});

	// Notify parent of progress changes
	$effect(() => {
		onProgressChange?.(100 - obscurationPercent());
	});

	// Cube paths (always present beneath noise)
	const cubeSize = size * 0.35;
	const cubePaths = $derived(isometricBoxPath(size / 2, size / 2, cubeSize, cubeSize, cubeSize));

	// Reveal particles within radius
	function revealInRadius(x: number, y: number, radius: number) {
		let staggerIndex = 0;
		particles = particles.map((p) => {
			if (p.revealed) return p;

			const dx = p.x + p.width / 2 - x;
			const dy = p.y + p.height / 2 - y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist < radius) {
				staggerIndex++;
				return {
					...p,
					revealed: true,
					revealDelay: mode === 'dissolve' ? staggerIndex * 15 : 0
				};
			}
			return p;
		});
	}

	// Handle stillness mode
	function resetStillnessTimer() {
		if (stillnessTimer) {
			clearTimeout(stillnessTimer);
		}

		if (mode === 'stillness') {
			stillnessTimer = setTimeout(() => {
				// Auto-reveal particles gradually
				autoReveal();
			}, 2000);
		}
	}

	function autoReveal() {
		if (mode !== 'stillness') return;

		const unrevealed = particles.filter((p) => !p.revealed);
		if (unrevealed.length === 0) return;

		// Reveal 5% at a time
		const toReveal = Math.max(1, Math.floor(unrevealed.length * 0.05));
		let revealed = 0;

		particles = particles.map((p) => {
			if (p.revealed || revealed >= toReveal) return p;
			revealed++;
			return { ...p, revealed: true, revealDelay: revealed * 30 };
		});

		// Continue auto-revealing
		stillnessTimer = setTimeout(autoReveal, 500);
	}

	// Event handlers
	function handleMouseDown(event: MouseEvent) {
		if (mode === 'stillness') {
			resetStillnessTimer();
			return;
		}

		if (mode === 'wipe') {
			isDragging = true;
		}

		handleInteraction(event);
	}

	function handleMouseMove(event: MouseEvent) {
		if (mode === 'stillness') {
			resetStillnessTimer();
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
			resetStillnessTimer();
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
			resetStillnessTimer();
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

	// Initialize stillness mode
	$effect(() => {
		if (mode === 'stillness') {
			resetStillnessTimer();
		}
		return () => {
			if (stillnessTimer) clearTimeout(stillnessTimer);
		};
	});

	export function reset() {
		particles = generateParticles(noiseCount);
		if (stillnessTimer) clearTimeout(stillnessTimer);
		if (mode === 'stillness') resetStillnessTimer();
	}
</script>

<div class="subtractive-logo-wrapper">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<svg
		viewBox="0 0 {size} {size}"
		class="subtractive-logo"
		class:mode-wipe={mode === 'wipe'}
		class:mode-dissolve={mode === 'dissolve'}
		class:mode-stillness={mode === 'stillness'}
		role="application"
		aria-label="Interactive logo revelation - {mode} mode. {mode === 'wipe' ? 'Drag to reveal.' : mode === 'dissolve' ? 'Click to reveal.' : 'Be still to reveal.'}"
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
				// Reveal center area on keyboard interaction
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
		<NoiseLayer {particles} />
	</svg>

	<div class="progress-indicator">
		<span class="progress-value">{100 - obscurationPercent()}%</span>
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

	/* Cube faces - always present beneath noise */
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
