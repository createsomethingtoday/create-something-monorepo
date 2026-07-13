<script lang="ts">
	/**
	 * TypographyHero - Weight Contrast for Impact
	 *
	 * In monochrome, typography carries all hierarchy.
	 * Weight variation (100-900) creates visual rhythm without color.
	 *
	 * Pattern: Monochrome (ELEMENT) 2024 SOTD, Shuka Design
	 * Canon: Structure through type, not decoration
	 */

	interface Props {
		eyebrow?: string;
		headline: string;
		subhead?: string;
		cta?: {
			text: string;
			href: string;
		};
		align?: 'left' | 'center';
		variant?: 'minimal' | 'dramatic';
	}

	let { eyebrow, headline, subhead, cta, align = 'left', variant = 'minimal' }: Props = $props();
</script>

<div class="typography-hero" class:center={align === 'center'} data-variant={variant}>
	{#if eyebrow}
		<p class="eyebrow">{eyebrow}</p>
	{/if}

	<h1 class="headline">{headline}</h1>

	{#if subhead}
		<p class="subhead">{subhead}</p>
	{/if}

	{#if cta}
		<div class="cta-wrapper">
			<a href={cta.href} class="cta-link">
				<span class="cta-text">{cta.text}</span>
				<span class="cta-arrow" aria-hidden="true">→</span>
			</a>
		</div>
	{/if}
</div>

<style>
	.typography-hero {
		padding: var(--space-performance-2xl) var(--space-performance-lg);
		max-width: 900px;
	}

	.typography-hero.center {
		margin: 0 auto;
		text-align: center;
	}

	/* Eyebrow: light weight, tracked */
	.eyebrow {
		font-size: var(--text-performance-caption);
		font-weight: var(--font-performance-light, 300);
		color: var(--color-performance-fg-tertiary);
		letter-spacing: var(--tracking-performance-wide);
		text-transform: uppercase;
		margin-bottom: var(--space-performance-sm);
		opacity: 0;
		animation: fade-up 0.8s var(--ease-performance-standard) 0.2s forwards;
	}

	/* Headline: dramatic weight contrast */
	.headline {
		font-size: var(--text-performance-display);
		line-height: 1.1;
		margin: 0;
		opacity: 0;
		animation: fade-up 0.8s var(--ease-performance-standard) 0.4s forwards;
	}

	/* Minimal variant: medium weight */
	[data-variant='minimal'] .headline {
		font-weight: var(--font-performance-medium, 500);
		color: var(--color-performance-fg-primary);
	}

	/* Dramatic variant: bold with secondary color mix */
	[data-variant='dramatic'] .headline {
		font-weight: var(--font-performance-bold, 700);
		color: var(--color-performance-fg-primary);
	}

	/* Subhead: light weight, secondary color */
	.subhead {
		font-size: var(--text-performance-body-lg);
		font-weight: var(--font-performance-light, 300);
		color: var(--color-performance-fg-secondary);
		line-height: 1.6;
		margin-top: var(--space-performance-md);
		max-width: 60ch;
		opacity: 0;
		animation: fade-up 0.8s var(--ease-performance-standard) 0.6s forwards;
	}

	.center .subhead {
		margin-left: auto;
		margin-right: auto;
	}

	/* CTA: minimal styling, focus on typography */
	.cta-wrapper {
		margin-top: var(--space-performance-lg);
		opacity: 0;
		animation: fade-up 0.8s var(--ease-performance-standard) 0.8s forwards;
	}

	.cta-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-performance-sm);
		font-size: var(--text-performance-body);
		font-weight: var(--font-performance-medium, 500);
		color: var(--color-performance-fg-primary);
		text-decoration: none;
		padding-bottom: var(--space-performance-xs);
		transition:
			border-color var(--duration-performance-micro) var(--ease-performance-standard),
			transform var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.cta-link:hover {
		border-color: var(--color-performance-border-emphasis);
	}

	.cta-link:hover .cta-arrow {
		transform: translateX(4px);
	}

	.cta-arrow {
		transition: transform var(--duration-performance-micro) var(--ease-performance-standard);
	}

	@keyframes fade-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Responsive: scale down on mobile */
	@media (max-width: 768px) {
		.typography-hero {
			padding: var(--space-performance-xl) var(--space-performance-md);
		}

		.headline {
			font-size: var(--text-performance-h1);
		}

		.subhead {
			font-size: var(--text-performance-body);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.eyebrow,
		.headline,
		.subhead,
		.cta-wrapper {
			animation: none;
			opacity: 1;
			transform: none;
		}

		.cta-link:hover .cta-arrow {
			transform: none;
		}
	}
</style>
