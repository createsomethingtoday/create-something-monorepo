<script lang="ts">
	/**
	 * FeatureCard Component
	 *
	 * Card matching Webflow player_item structure:
	 * - Square image with hover scale animation
	 * - Eyebrow text
	 * - Title (h2)
	 * - Description
	 * - Secondary CTA button
	 */

	interface Props {
		image: string;
		eyebrow: string;
		title: string;
		description: string;
		href?: string;
		ctaText?: string;
	}

	let { image, eyebrow, title, description, href = '/about', ctaText = 'Learn More' }: Props = $props();
</script>

<li class="player_item">
	<div class="margin-bottom-40">
		<div class="player_visual shadow-card">
			<img src={image} loading="lazy" alt="" class="img-cover" />
		</div>
	</div>
	<div class="max-width-440">
		<div class="w-layout-vflex">
			<div class="margin-bottom-16">
				<p class="text-size-eyebrow">{eyebrow}</p>
			</div>
			<div class="margin-bottom-24">
				<h3 class="heading-style-h2">{title}</h3>
			</div>
			<div class="margin-bottom-24">
				<p class="text-size-medium">{description}</p>
			</div>
			<a href={href} class="button is-secondary">
				<p>{ctaText}</p>
			</a>
		</div>
	</div>
</li>

<style>
	.player_item {
		flex: 1;
	}

	.player_visual {
		aspect-ratio: 1;
		border-radius: var(--player-radius);
		width: 100%;
		position: relative;
		overflow: hidden;
		will-change: transform;
		transform: scale(1);
		transition: transform 0.6s var(--ease-stack);
	}

	.player_item:hover .player_visual {
		transform: scale(1.03);
	}

	.w-layout-vflex {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	/* Font family overrides for this component */
	.text-size-eyebrow {
		font-family: var(--font-satoshi);
	}

	.heading-style-h2 {
		font-family: var(--font-coolvetica);
	}

	.text-size-medium {
		font-family: var(--font-satoshi);
	}

	.button p {
		font-family: var(--font-satoshi);
		margin: 0;
	}
</style>
