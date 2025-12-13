<script lang="ts">
	/**
	 * StickyCTA Component - Heideggerian Contextual Engagement
	 *
	 * The CTA evolves based on journey depth:
	 * - Early (25-50%): Soft invitation to explore
	 * - Mid (50-75%): Acknowledge understanding, invite dialogue
	 * - Late (75%+): Ready to act, direct invitation
	 *
	 * Principle: The ask matches the visitor's readiness.
	 * No extraction before understanding is established.
	 */

	import { onMount } from 'svelte';

	interface Props {
		href?: string;
		showAfterPercent?: number; // Percentage of page scrolled before showing
	}

	let {
		href = '/contact',
		showAfterPercent = 25
	}: Props = $props();

	let visible = $state(false);
	let journeyDepth = $state<'early' | 'mid' | 'late'>('early');
	let prefersReducedMotion = $state(false);

	// Contextual messages based on journey depth
	// Voice: specificity over generality
	const messages = {
		early: 'See all projects',
		mid: 'Schedule a site visit',
		late: 'Inquire'
	};

	$effect(() => {
		// This runs when journeyDepth changes
	});

	onMount(() => {
		prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		function handleScroll() {
			const scrollTop = window.scrollY;
			const docHeight = document.documentElement.scrollHeight - window.innerHeight;
			const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

			// Show after threshold
			visible = scrollPercent > showAfterPercent;

			// Update journey depth
			if (scrollPercent > 75) {
				journeyDepth = 'late';
			} else if (scrollPercent > 50) {
				journeyDepth = 'mid';
			} else {
				journeyDepth = 'early';
			}
		}

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll();

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});
</script>

{#if visible}
	<div
		class="sticky-cta animate-slide-up"
		class:sticky-cta--late={journeyDepth === 'late'}
	>
		<a {href} class="sticky-cta-button btn-canon">
			{messages[journeyDepth]}
			<span class="sticky-cta-arrow" aria-hidden="true">&rarr;</span>
		</a>
	</div>
{/if}

<style>
	.sticky-cta {
		position: fixed;
		bottom: var(--space-lg);
		right: var(--space-lg);
		z-index: var(--z-fixed);
	}

	@media (max-width: 768px) {
		.sticky-cta {
			bottom: var(--space-md);
			right: var(--space-md);
			left: var(--space-md);
		}

		.sticky-cta-button {
			width: 100%;
			justify-content: center;
		}
	}

	.sticky-cta-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-full);
		font-weight: var(--font-semibold);
		font-size: var(--text-body-sm);
		text-decoration: none;
		box-shadow: var(--shadow-lg);
		transition:
			transform var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
	}

	.sticky-cta-button:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-xl);
	}

	.sticky-cta-button:active {
		transform: translateY(0) scale(0.98);
	}

	.sticky-cta-arrow {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.sticky-cta-button:hover .sticky-cta-arrow {
		transform: translateX(2px);
	}

	/* Late journey state - more prominent, visitor is ready */
	.sticky-cta--late .sticky-cta-button {
		box-shadow: var(--shadow-xl), var(--shadow-glow-sm);
	}

	/* Animation */
	.animate-slide-up {
		animation: slideUp 0.2s ease-out forwards;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.sticky-cta-button,
		.sticky-cta-arrow,
		.animate-slide-up {
			transition: none;
			animation: none;
			opacity: 1;
			transform: none;
		}

		.sticky-cta-button:hover {
			transform: none;
		}

		.sticky-cta-button:active {
			transform: none;
		}
	}
</style>
