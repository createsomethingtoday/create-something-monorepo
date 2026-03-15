<script lang="ts">
	/**
	 * StickyCTA Component - Contextual Engagement
	 *
	 * The CTA evolves based on journey depth:
	 * - Early (25-50%): Soft invitation to explore
	 * - Mid (50-75%): Acknowledge understanding, invite dialogue
	 * - Late (75%+): Ready to act, direct invitation
	 *
	 * Principle: The ask matches the visitor's readiness.
	 * No extraction before understanding is established.
	 *
	 * @example
	 * <StickyCTA
	 *   href="/contact"
	 *   messages={{ early: 'Learn more', mid: 'Get in touch', late: 'Start now' }}
	 * />
	 */

	import { onMount } from 'svelte';

	interface Props {
		href?: string;
		showAfterPercent?: number;
		messages?: {
			early: string;
			mid: string;
			late: string;
		};
	}

	let {
		href = '/contact',
		showAfterPercent = 25,
		messages = {
			early: 'Learn more',
			mid: 'Get in touch',
			late: 'Start now'
		}
	}: Props = $props();

	let visible = $state(false);
	let journeyDepth = $state<'early' | 'mid' | 'late'>('early');

	onMount(() => {
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
	<div class="sticky-cta" class:late={journeyDepth === 'late'}>
		<a {href} class="sticky-cta-button">
			{messages[journeyDepth]}
			<span class="sticky-cta-arrow" aria-hidden="true">→</span>
		</a>
	</div>
{/if}

<style>
	.sticky-cta {
		position: fixed;
		bottom: var(--space-lg, 2.618rem);
		right: var(--space-lg, 2.618rem);
		z-index: 50;
		animation: slideUp var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)) forwards;
	}

	@media (max-width: 768px) {
		.sticky-cta {
			bottom: var(--space-md, 1.618rem);
			right: var(--space-md, 1.618rem);
			left: var(--space-md, 1.618rem);
		}

		.sticky-cta-button {
			width: 100%;
			justify-content: center;
		}
	}

	.sticky-cta-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs, 0.5rem);
		background: var(--color-fg-primary, #fff);
		color: var(--color-bg-pure, #000);
		padding: var(--space-sm, 1rem) var(--space-lg, 2.618rem);
		border-radius: var(--radius-full, 9999px);
		font-weight: 600;
		font-size: var(--text-body-sm, 0.875rem);
		text-decoration: none;
		box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
		transition:
			transform var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			box-shadow var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.sticky-cta-button:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1));
	}

	.sticky-cta-button:active {
		transform: translateY(0) scale(0.98);
	}

	.sticky-cta-arrow {
		transition: transform var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.sticky-cta-button:hover .sticky-cta-arrow {
		transform: translateX(2px);
	}

	/* Late journey state - more prominent */
	.late .sticky-cta-button {
		box-shadow:
			var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1)),
			0 0 20px rgba(255, 255, 255, 0.1);
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
		.sticky-cta {
			animation: none;
			opacity: 1;
			transform: none;
		}

		.sticky-cta-button,
		.sticky-cta-arrow {
			transition: none;
		}

		.sticky-cta-button:hover,
		.sticky-cta-button:active {
			transform: none;
		}
	}
</style>
