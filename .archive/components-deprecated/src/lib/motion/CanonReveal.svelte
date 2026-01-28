<script lang="ts">
	/**
	 * CanonReveal - Subtractive Text Reveal Animation
	 *
	 * Five reveal styles aligned with the Subtractive Triad philosophy:
	 *
	 * - unconcealment: Text emerges from noise (Heidegger - truth was always there)
	 * - typewriter: Char-by-char with blinking cursor (terminal-first)
	 * - threshold: Binary snap, no animation (Rams - less, but better)
	 * - decode: Random chars resolve to meaning (cipher → text)
	 * - mask: Horizontal wipe reveal (text always present, just unveiled)
	 *
	 * @example
	 * <CanonReveal
	 *   text="Creation is the discipline of removing what obscures."
	 *   reveal="decode"
	 *   duration={2000}
	 * />
	 */
	import { onMount, onDestroy } from 'svelte';

	type RevealStyle = 'unconcealment' | 'typewriter' | 'threshold' | 'decode' | 'mask';

	let {
		text,
		reveal = 'decode',
		duration = 2000,
		delay = 0,
		autoplay = true,
		class: className = '',
		onComplete
	}: {
		text: string;
		reveal?: RevealStyle;
		duration?: number;
		delay?: number;
		autoplay?: boolean;
		class?: string;
		onComplete?: () => void;
	} = $props();

	// State
	let progress = $state(0);
	let isPlaying = $state(false);
	let displayText = $state('');
	let showCursor = $state(true);
	let animationFrame: number | null = null;
	let startTime: number | null = null;
	let cursorInterval: ReturnType<typeof setInterval> | null = null;

	// Constants
	const DECODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

	// Computed display based on reveal style
	$effect(() => {
		if (reveal === 'unconcealment') {
			// Full text always, but with noise overlay handled in template
			displayText = text;
		} else if (reveal === 'typewriter') {
			const charsToShow = Math.floor(progress * text.length);
			displayText = text.slice(0, charsToShow);
		} else if (reveal === 'threshold') {
			displayText = progress >= 0.5 ? text : '';
		} else if (reveal === 'decode') {
			const resolvedChars = Math.floor(progress * text.length);
			displayText = text
				.split('')
				.map((char, i) => {
					if (char === ' ') return ' ';
					if (i < resolvedChars) return char;
					return DECODE_CHARS[Math.floor(Math.random() * DECODE_CHARS.length)];
				})
				.join('');
		} else if (reveal === 'mask') {
			displayText = text;
		}
	});

	function animate(timestamp: number) {
		if (!startTime) startTime = timestamp;
		const elapsed = timestamp - startTime;
		progress = Math.min(elapsed / duration, 1);

		if (progress < 1) {
			animationFrame = requestAnimationFrame(animate);
		} else {
			isPlaying = false;
			onComplete?.();
		}
	}

	export function play() {
		if (isPlaying) return;
		isPlaying = true;
		progress = 0;
		startTime = null;

		// Cursor blink for typewriter
		if (reveal === 'typewriter') {
			cursorInterval = setInterval(() => {
				showCursor = !showCursor;
			}, 500);
		}

		setTimeout(() => {
			animationFrame = requestAnimationFrame(animate);
		}, delay);
	}

	export function reset() {
		if (animationFrame) cancelAnimationFrame(animationFrame);
		if (cursorInterval) clearInterval(cursorInterval);
		progress = 0;
		isPlaying = false;
		startTime = null;
		displayText = reveal === 'threshold' ? '' : reveal === 'mask' ? text : '';
	}

	onMount(() => {
		if (autoplay) {
			play();
		}
	});

	onDestroy(() => {
		if (animationFrame) cancelAnimationFrame(animationFrame);
		if (cursorInterval) clearInterval(cursorInterval);
	});

	// Derived styles
	const noiseAmount = $derived(reveal === 'unconcealment' ? 1 - progress : 0);
	const maskWidth = $derived(reveal === 'mask' ? progress * 100 : 100);
	const clarity = $derived(reveal === 'unconcealment' ? progress : 1);
</script>

<div
	class="canon-reveal {reveal} {className}"
	class:playing={isPlaying}
	class:complete={progress >= 1}
>
	{#if reveal === 'unconcealment'}
		<!-- Unconcealment: text emerges from noise -->
		<span class="reveal-text" style="opacity: {clarity}; filter: blur({noiseAmount * 4}px);">
			{displayText}
		</span>
		{#if noiseAmount > 0.1}
			<span class="noise-overlay" style="opacity: {noiseAmount * 0.5};">
				{text
					.split('')
					.map((char) =>
						char === ' ' ? ' ' : DECODE_CHARS[Math.floor(Math.random() * DECODE_CHARS.length)]
					)
					.join('')}
			</span>
		{/if}
	{:else if reveal === 'typewriter'}
		<!-- Typewriter: char-by-char with cursor -->
		<span class="reveal-text mono">{displayText}</span>
		{#if isPlaying || progress < 1}
			<span class="cursor" class:visible={showCursor}>▌</span>
		{/if}
	{:else if reveal === 'threshold'}
		<!-- Threshold: binary snap -->
		<span class="reveal-text" class:visible={progress >= 0.5}>{text}</span>
	{:else if reveal === 'decode'}
		<!-- Decode: random chars resolve -->
		<span class="reveal-text mono">{displayText}</span>
	{:else if reveal === 'mask'}
		<!-- Mask: horizontal wipe -->
		<span class="reveal-text" style="clip-path: inset(0 {100 - maskWidth}% 0 0);">
			{displayText}
		</span>
	{/if}
</div>

<style>
	.canon-reveal {
		position: relative;
		display: inline-block;
		font-family: var(--font-sans, system-ui, sans-serif);
	}

	.reveal-text {
		display: inline-block;
		transition: opacity 0.1s ease;
	}

	.reveal-text.mono,
	.canon-reveal.typewriter .reveal-text,
	.canon-reveal.decode .reveal-text {
		font-family: var(--font-mono, 'JetBrains Mono', monospace);
		letter-spacing: 0.05em;
	}

	/* Unconcealment */
	.canon-reveal.unconcealment {
		position: relative;
	}

	.noise-overlay {
		position: absolute;
		top: 0;
		left: 0;
		color: var(--color-fg-muted, #737373);
		filter: blur(1px);
		user-select: none;
		pointer-events: none;
	}

	/* Typewriter */
	.cursor {
		opacity: 0;
		color: var(--color-fg-muted, #737373);
		transition: opacity 0.05s;
	}

	.cursor.visible {
		opacity: 1;
	}

	/* Threshold */
	.canon-reveal.threshold .reveal-text {
		opacity: 0;
		transition: none; /* No animation - binary */
	}

	.canon-reveal.threshold .reveal-text.visible {
		opacity: 1;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.canon-reveal {
			/* For reduced motion, show text immediately */
		}

		.reveal-text {
			opacity: 1 !important;
			filter: none !important;
			clip-path: none !important;
		}

		.noise-overlay {
			display: none;
		}

		.cursor {
			display: none;
		}
	}
</style>
