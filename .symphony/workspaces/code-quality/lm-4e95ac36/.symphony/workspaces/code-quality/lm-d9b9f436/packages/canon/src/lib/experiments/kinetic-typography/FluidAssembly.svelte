<script lang="ts">
	/**
	 * FluidAssembly - Kinetic Typography Component
	 *
	 * Text animation as data revelation. Characters scatter then converge,
	 * while emphasized words gain weight to show semantic importance.
	 *
	 * "Above all else, show the data." — Edward Tufte
	 *
	 * The weight transition IS the data layer.
	 */

	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		text: string;
		emphasis?: number[]; // Word indices to emphasize (gain weight)
		duration?: number; // Total animation duration in ms
		class?: string;
	}

	let {
		text,
		emphasis = [],
		duration = 800,
		class: className = ''
	}: Props = $props();

	// Animation state
	let container: HTMLElement;
	let hasAnimated = $state(false);
	let progress = $state(0);
	let reducedMotion = $state(false);

	// Parse text into words and characters
	const words = $derived(text.split(' '));

	// Phase thresholds (as percentage of duration)
	const PHASES = {
		scatter: { start: 0, end: 0.2 },
		converge: { start: 0.2, end: 0.6 },
		solidify: { start: 0.6, end: 0.8 },
		emphasize: { start: 0.8, end: 1.0 }
	};

	// Current phase based on progress
	let phase = $derived<'idle' | 'scatter' | 'converge' | 'solidify' | 'emphasize' | 'complete'>(
		!hasAnimated ? 'idle' :
		progress < PHASES.scatter.end ? 'scatter' :
		progress < PHASES.converge.end ? 'converge' :
		progress < PHASES.solidify.end ? 'solidify' :
		progress < PHASES.emphasize.end ? 'emphasize' : 'complete'
	);

	// Generate deterministic scatter positions for each character
	function getScatterOffset(charIndex: number, totalChars: number): { x: number; y: number } {
		// Use character index to create pseudo-random but deterministic offsets
		const seed = charIndex * 137.5; // Golden angle approximation
		const angle = (seed % 360) * (Math.PI / 180);
		const distance = 20 + (charIndex % 5) * 10; // 20-60px

		return {
			x: Math.cos(angle) * distance,
			y: Math.sin(angle) * distance
		};
	}

	// Calculate character opacity based on phase
	function getCharOpacity(charIndex: number, totalChars: number): number {
		if (!hasAnimated || reducedMotion) return 1;

		const charProgress = progress - (charIndex * 0.01); // Slight stagger
		const normalizedProgress = Math.max(0, charProgress);

		if (normalizedProgress < PHASES.scatter.end) {
			// Fade in during scatter
			return Math.min(1, normalizedProgress / PHASES.scatter.end * 0.6);
		} else if (normalizedProgress < PHASES.converge.end) {
			// Continue fading in during converge
			const convergeProgress = (normalizedProgress - PHASES.converge.start) /
				(PHASES.converge.end - PHASES.converge.start);
			return 0.6 + convergeProgress * 0.4;
		}
		return 1;
	}

	// Calculate character transform based on phase
	function getCharTransform(charIndex: number, totalChars: number): string {
		if (!hasAnimated || reducedMotion) return 'translate(0, 0)';

		const offset = getScatterOffset(charIndex, totalChars);
		const charProgress = progress - (charIndex * 0.005); // Slight stagger

		if (charProgress < PHASES.scatter.end) {
			// Full scatter position
			return `translate(${offset.x}px, ${offset.y}px)`;
		} else if (charProgress < PHASES.converge.end) {
			// Interpolate from scatter to final position
			const convergeProgress = (charProgress - PHASES.converge.start) /
				(PHASES.converge.end - PHASES.converge.start);
			const easedProgress = easeOutCubic(convergeProgress);
			const x = offset.x * (1 - easedProgress);
			const y = offset.y * (1 - easedProgress);
			return `translate(${x}px, ${y}px)`;
		}

		return 'translate(0, 0)';
	}

	// Calculate word weight based on emphasis and phase
	// Using dramatic range (300 → 700) for visible hierarchy
	function getWordWeight(wordIndex: number): number {
		const baseWeight = 300;      // Light
		const emphasisWeight = 700;  // Bold - maximum contrast

		if (!emphasis.includes(wordIndex)) return baseWeight;
		if (!hasAnimated || reducedMotion) return emphasisWeight;

		if (progress < PHASES.emphasize.start) return baseWeight;

		const emphasisProgress = (progress - PHASES.emphasize.start) /
			(PHASES.emphasize.end - PHASES.emphasize.start);
		const easedProgress = easeOutCubic(emphasisProgress);

		return baseWeight + (emphasisWeight - baseWeight) * easedProgress;
	}

	// Calculate word opacity based on emphasis
	// Non-emphasized words dim slightly, emphasized words stay bright
	function getWordOpacity(wordIndex: number): number {
		const baseOpacity = 0.6;     // Dimmed for non-emphasis
		const emphasisOpacity = 1.0; // Full brightness

		if (!hasAnimated || reducedMotion) {
			return emphasis.includes(wordIndex) ? emphasisOpacity : baseOpacity;
		}

		if (progress < PHASES.emphasize.start) return 1; // All bright until emphasis phase

		const emphasisProgress = (progress - PHASES.emphasize.start) /
			(PHASES.emphasize.end - PHASES.emphasize.start);
		const easedProgress = easeOutCubic(emphasisProgress);

		if (emphasis.includes(wordIndex)) {
			return emphasisOpacity; // Emphasized words stay at full opacity
		} else {
			// Non-emphasized words dim
			return 1 - (1 - baseOpacity) * easedProgress;
		}
	}

	// Easing function
	function easeOutCubic(t: number): number {
		return 1 - Math.pow(1 - t, 3);
	}

	// Animation loop
	function animate() {
		if (reducedMotion) {
			progress = 1;
			return;
		}

		const startTime = performance.now();

		function tick(currentTime: number) {
			const elapsed = currentTime - startTime;
			progress = Math.min(1, elapsed / duration);

			if (progress < 1) {
				requestAnimationFrame(tick);
			}
		}

		requestAnimationFrame(tick);
	}

	onMount(() => {
		if (!browser) return;

		// Check for reduced motion preference
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !hasAnimated) {
					hasAnimated = true;
					animate();
					observer.disconnect();
				}
			},
			{ threshold: 0.5 }
		);

		observer.observe(container);

		return () => observer.disconnect();
	});

	// Count total characters for offset calculations
	let totalChars = $derived(text.replace(/ /g, '').length);
</script>

<div
	class="fluid-assembly {className}"
	class:animated={hasAnimated}
	class:reduced-motion={reducedMotion}
	bind:this={container}
	aria-label={text}
>
	{#each words as word, wordIndex}
		<span
			class="word"
			class:emphasis={emphasis.includes(wordIndex)}
			style="font-weight: {getWordWeight(wordIndex)}; opacity: {getWordOpacity(wordIndex)};"
		>
			{#each word.split('') as char, charIndex}
				{@const globalCharIndex = words.slice(0, wordIndex).join('').length + charIndex}
				<span
					class="char"
					style="
						opacity: {getCharOpacity(globalCharIndex, totalChars)};
						transform: {getCharTransform(globalCharIndex, totalChars)};
					"
				>
					{char}
				</span>
			{/each}
		</span>
		{#if wordIndex < words.length - 1}
			<span class="space">&nbsp;</span>
		{/if}
	{/each}
</div>

<style>
	.fluid-assembly {
		display: inline-block;
		font-family: var(--font-sans);
		font-size: var(--text-display);
		font-weight: var(--font-regular);
		line-height: var(--leading-tight);
		letter-spacing: var(--tracking-tight);
		color: var(--color-fg-primary);
	}

	.word {
		display: inline-block;
		transition:
			font-weight var(--duration-standard) var(--ease-standard),
			opacity var(--duration-standard) var(--ease-standard);
	}

	.word.emphasis {
		color: var(--color-fg-primary);
	}

	.char {
		display: inline-block;
		transition:
			opacity var(--duration-micro) var(--ease-standard),
			transform var(--duration-standard) var(--ease-standard);
		will-change: transform, opacity;
	}

	.space {
		display: inline-block;
		width: 0.3em;
	}

	/* Initial state before animation */
	.fluid-assembly:not(.animated) .char {
		opacity: 0;
	}

	/* Reduced motion: show final state immediately */
	.fluid-assembly.reduced-motion .char {
		opacity: 1 !important;
		transform: none !important;
	}

	.fluid-assembly.reduced-motion .word.emphasis {
		font-weight: var(--font-bold);
	}

	@media (prefers-reduced-motion: reduce) {
		.char {
			transition: none;
			opacity: 1 !important;
			transform: none !important;
		}

		.word {
			transition: none;
		}

		.word.emphasis {
			font-weight: var(--font-semibold);
		}
	}
</style>
