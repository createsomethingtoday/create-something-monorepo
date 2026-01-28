<script lang="ts">
	/**
	 * HeroSectionEnhanced - Parallax Depth + Typography Impact
	 *
	 * Combines award-winning patterns:
	 * - Parallax depth (Baseborn Studio)
	 * - Typography weight contrast (Monochrome/Shuka)
	 *
	 * Canon: Motion and type create hierarchy without color
	 */

	import { HeroParallax } from '@create-something/canon/motion';
	import { TypographyHero } from '@create-something/canon/typography';
	import { siteConfig } from '$lib/config/context';

	interface Props {
		image?: string;
		alt?: string;
		headline?: string;
		subhead?: string;
	}

	let { image, alt, headline, subhead }: Props = $props();

	// Reactive defaults from store
	const effectiveImage = $derived(image ?? $siteConfig.hero.image);
	const effectiveAlt = $derived(alt ?? $siteConfig.hero.alt);
	const effectiveHeadline = $derived(
		headline ?? $siteConfig.name ?? 'Architecture as Philosophy'
	);
	const effectiveSubhead = $derived(
		subhead ?? $siteConfig.tagline ?? 'Where structure enables dwelling'
	);
</script>

<HeroParallax image={effectiveImage} alt={effectiveAlt}>
	<div class="hero-content">
		<TypographyHero
			headline={effectiveHeadline}
			subhead={effectiveSubhead}
			align="center"
			variant="dramatic"
		/>
	</div>
</HeroParallax>

<style>
	.hero-content {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
		z-index: 3;
	}

	.hero-content :global(.typography-hero) {
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
	}
</style>
