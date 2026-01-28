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
		padding: var(--space-2xl) var(--space-lg);
		max-width: 900px;
	}

	.typography-hero.center {
		margin: 0 auto;
		text-align: center;
	}

	/* Eyebrow: light weight, tracked */
	.eyebrow {
		font-size: var(--text-caption);
		font-weight: var(--font-light, 300);
		color: var(--color-fg-tertiary);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		margin-bottom: var(--space-sm);
		opacity: 0;
		animation: fade-up 0.8s var(--ease-standard) 0.2s forwards;
	}

	/* Headline: dramatic weight contrast */
	.headline {
		font-size: var(--text-display);
		line-height: 1.1;
		margin: 0;
		opacity: 0;
		animation: fade-up 0.8s var(--ease-standard) 0.4s forwards;
	}

	/* Minimal variant: medium weight */
	[data-variant='minimal'] .headline {
		font-weight: var(--font-medium, 500);
		color: var(--color-fg-primary);
	}

	/* Dramatic variant: bold with secondary color mix */
	[data-variant='dramatic'] .headline {
		font-weight: var(--font-bold, 700);
		color: var(--color-fg-primary);
	}

	/* Subhead: light weight, secondary color */
	.subhead {
		font-size: var(--text-body-lg);
		font-weight: var(--font-light, 300);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin-top: var(--space-md);
		max-width: 60ch;
		opacity: 0;
		animation: fade-up 0.8s var(--ease-standard) 0.6s forwards;
	}

	.center .subhead {
		margin-left: auto;
		margin-right: auto;
	}

	/* CTA: minimal styling, focus on typography */
	.cta-wrapper {
		margin-top: var(--space-lg);
		opacity: 0;
		animation: fade-up 0.8s var(--ease-standard) 0.8s forwards;
	}

	.cta-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--text-body);
		font-weight: var(--font-medium, 500);
		color: var(--color-fg-primary);
		text-decoration: none;
		border-bottom: 1px solid var(--color-border-default);
		padding-bottom: var(--space-xs);
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			transform var(--duration-micro) var(--ease-standard);
	}

	.cta-link:hover {
		border-color: var(--color-border-emphasis);
	}

	.cta-link:hover .cta-arrow {
		transform: translateX(4px);
	}

	.cta-arrow {
		transition: transform var(--duration-micro) var(--ease-standard);
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
			padding: var(--space-xl) var(--space-md);
		}

		.headline {
			font-size: var(--text-h1);
		}

		.subhead {
			font-size: var(--text-body);
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
