<script lang="ts">
	/**
	 * LessonHero - Opening hook section with CanonReveal
	 * 
	 * Big question that draws the reader in.
	 * Uses decode or unconcealment reveal style.
	 */
	import { CanonReveal } from '@create-something/canon/motion';

	type RevealStyle = 'decode' | 'unconcealment' | 'typewriter' | 'threshold' | 'mask';

	let {
		text,
		subtitle = '',
		reveal = 'decode' as RevealStyle,
		duration = 2500,
		class: className = ''
	}: {
		text: string;
		subtitle?: string;
		reveal?: RevealStyle;
		duration?: number;
		class?: string;
	} = $props();
</script>

<section class="lesson-hero {className}">
	<div class="hero-content">
		<CanonReveal
			{text}
			{reveal}
			{duration}
			class="hero-text"
		/>
		{#if subtitle}
			<p class="hero-subtitle">{subtitle}</p>
		{/if}
	</div>
</section>

<style>
	.lesson-hero {
		min-height: 60vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-base);
	}

	.hero-content {
		max-width: 800px;
		text-align: center;
	}

	:global(.hero-text) {
		font-size: var(--text-display) !important;
		font-weight: var(--font-light) !important;
		line-height: 1.2 !important;
		color: var(--color-fg-primary) !important;
	}

	.hero-subtitle {
		margin-top: var(--space-lg);
		font-size: var(--text-body-lg);
		color: var(--color-fg-muted);
		opacity: 0;
		animation: fadeIn 0.5s ease forwards;
		animation-delay: 2s;
	}

	@keyframes fadeIn {
		to {
			opacity: 1;
		}
	}
</style>
