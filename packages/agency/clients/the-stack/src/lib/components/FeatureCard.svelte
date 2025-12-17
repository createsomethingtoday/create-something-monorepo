<script lang="ts">
	/**
	 * FeatureCard Component
	 *
	 * Card with:
	 * - Square image (1:1 aspect ratio)
	 * - Eyebrow text
	 * - Title
	 * - Description
	 * - CTA button
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
		<div class="player_content">
			<div class="margin-bottom-16">
				<p class="text-size-eyebrow">{eyebrow}</p>
			</div>
			<div class="margin-bottom-24">
				<p class="heading-style-h2">{title}</p>
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
	}

	.player_content {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
</style>
