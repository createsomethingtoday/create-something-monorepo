<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import SavvyCalButton from './SavvyCalButton.svelte';

	let container: HTMLElement;
	let scrollProgress = $state(0);
	let phase = $state<'reading' | 'striking' | 'fading' | 'coalescing' | 'complete'>('reading');

	// The words. Simple. Declarative.
	const words = [
		{ text: 'We', keep: true },
		{ text: 'help', keep: false },
		{ text: 'businesses', keep: false },
		{ text: 'identify', keep: false },
		{ text: 'operational', keep: false },
		{ text: 'inefficiencies', keep: false },
		{ text: 'and', keep: false },
		{ text: 'implement', keep: false },
		{ text: 'AI-powered', keep: false },
		{ text: 'automation', keep: false },
		{ text: 'solutions', keep: false },
		{ text: 'that', keep: false },
		{ text: 'streamline', keep: false },
		{ text: 'workflows', keep: false },
		{ text: 'and', keep: false },
		{ text: 'remove', keep: true },
		{ text: 'what', keep: true },
		{ text: 'obscures.', keep: true }
	];

	// Derived states from scroll - no library needed
	// Extended phases for smoother coalescing
	let strikeProgress = $derived(
		Math.max(0, Math.min(1, (scrollProgress - 0.1) / 0.25))
	);

	let fadeProgress = $derived(
		Math.max(0, Math.min(1, (scrollProgress - 0.35) / 0.15))
	);

	let coalesceProgress = $derived(
		Math.max(0, Math.min(1, (scrollProgress - 0.5) / 0.35))
	);

	// CTA fades in gradually from 0.8 to 1.0
	let ctaOpacity = $derived(
		Math.max(0, Math.min(1, (scrollProgress - 0.8) / 0.15))
	);

	// Above-fold CTA fades out as scroll begins (visible at start, hidden by 0.15)
	let aboveFoldOpacity = $derived(
		Math.max(0, 1 - scrollProgress / 0.15)
	);

	// Update phase based on scroll - CSS handles transitions, not View Transitions API
	// View Transitions are for navigation, not scroll-driven state changes
	$effect(() => {
		phase =
			scrollProgress < 0.1 ? 'reading' :
			scrollProgress < 0.35 ? 'striking' :
			scrollProgress < 0.5 ? 'fading' :
			scrollProgress < 0.85 ? 'coalescing' : 'complete';
	});

	onMount(() => {
		if (!browser) return;

		let ticking = false;
		function handleScroll() {
			if (!ticking) {
				requestAnimationFrame(() => {
					const rect = container.getBoundingClientRect();
					const containerHeight = container.offsetHeight;
					const viewportHeight = window.innerHeight;

					// Progress: 0 when container top hits viewport top, 1 when container bottom hits viewport bottom
					const scrolled = -rect.top;
					const scrollable = containerHeight - viewportHeight;
					scrollProgress = Math.max(0, Math.min(1, scrolled / scrollable));

					ticking = false;
				});
				ticking = true;
			}
		}

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll();

		return () => window.removeEventListener('scroll', handleScroll);
	});
</script>

<div class="revelation-container" bind:this={container}>
	<div class="text-wrapper">
		<p class="revelation-text" class:coalesced={phase === 'coalescing' || phase === 'complete'}>
			{#each words as word, i}
				{@const wordStrike = Math.max(0, Math.min(1, (strikeProgress - i * 0.03) / 0.3))}
				{@const wordFade = word.keep ? 1 : 1 - fadeProgress}
				<span
					class="word"
					class:keep={word.keep}
					class:removing={!word.keep && phase !== 'reading'}
					class:hidden={!word.keep && (phase === 'coalescing' || phase === 'complete')}
					style="--strike: {wordStrike}; --fade: {wordFade};"
				>
					{word.text}
					{#if !word.keep}
						<span class="strike"></span>
					{/if}
				</span>
			{/each}
		</p>

		<!-- Above-fold CTA: visible immediately, fades out on scroll -->
		<div
			class="above-fold-cta"
			style="--above-fold-opacity: {aboveFoldOpacity};"
			class:hidden={aboveFoldOpacity <= 0}
		>
			<SavvyCalButton variant="primary" size="lg" />
			<span class="scroll-hint">or scroll to learn more</span>
		</div>

		<!-- Scroll-driven CTA: appears after reveal complete -->
		<a
			href="/services"
			class="cta"
			style="--cta-opacity: {ctaOpacity}; --cta-translate: {(1 - ctaOpacity) * 12}px;"
			class:visible={ctaOpacity > 0}
		>
			See how
			<span class="arrow">→</span>
		</a>
	</div>
</div>

<style>
	.revelation-container {
		min-height: 400vh;
		position: relative;
	}

	.text-wrapper {
		position: sticky;
		top: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: var(--space-xl);
	}

	.revelation-text {
		max-width: 800px;
		font-size: var(--text-h1);
		font-weight: var(--font-medium);
		line-height: var(--leading-tight);
		letter-spacing: var(--tracking-tight);
		color: var(--color-fg-primary);
		text-align: center;
		transition: font-size 0.8s cubic-bezier(0.4, 0, 0.2, 1),
					font-weight 0.8s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.revelation-text.coalesced {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
	}

	.word {
		position: relative;
		display: inline-block;
		margin-right: 0.3em;
		opacity: var(--fade, 1);
		max-width: 20ch;
		overflow: hidden;
		vertical-align: bottom;
		transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
					max-width 0.8s cubic-bezier(0.4, 0, 0.2, 1),
					margin 0.8s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.word.keep {
		font-weight: var(--font-semibold);
	}

	.word.hidden {
		max-width: 0;
		margin-right: 0;
		opacity: 0;
	}

	.strike {
		position: absolute;
		left: 0;
		top: 55%;
		height: 0.12em;
		width: calc(var(--strike, 0) * 100%);
		background: var(--color-fg-primary);
		transform: translateY(-50%);
		pointer-events: none;
	}

	.cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		margin-top: var(--space-lg);
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		background: transparent;
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-full);
		opacity: var(--cta-opacity, 0);
		transform: translateY(var(--cta-translate, 12px));
		pointer-events: none;
		transition: border-color var(--duration-micro) var(--ease-standard),
					background var(--duration-micro) var(--ease-standard);
	}

	.cta.visible {
		pointer-events: auto;
	}

	.cta:hover {
		border-color: var(--color-fg-tertiary);
		background: var(--color-hover);
	}

	.cta .arrow {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.cta:hover .arrow {
		transform: translateX(4px);
	}

	/* Above-fold CTA */
	.above-fold-cta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		margin-top: var(--space-lg);
		opacity: var(--above-fold-opacity, 1);
		transition: opacity 0.3s var(--ease-standard);
	}

	.above-fold-cta.hidden {
		pointer-events: none;
	}

	.scroll-hint {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	@media (max-width: 768px) {
		.text-wrapper {
			padding: var(--space-lg);
		}

		.revelation-text {
			font-size: var(--text-h2);
		}

		.revelation-text.coalesced {
			font-size: var(--text-h1);
		}
	}
</style>
