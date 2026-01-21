<script lang="ts">
	/**
	 * FeatureCard Component
	 *
	 * Card variant for showcasing platform features/tools
	 * Uses base Card with specific styling
	 */
	import Card from './Card.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description: string;
		icon?: Snippet;
		href?: string;
		comingSoon?: boolean;
	}

	let { title, description, icon, href, comingSoon = false }: Props = $props();
</script>

<Card
	{title}
	{description}
	{href}
	variant="default"
	size="md"
	class="feature-card {comingSoon ? 'coming-soon' : ''}"
>
	{#snippet badge()}
		{#if comingSoon}
			<span class="soon-badge">Coming Soon</span>
		{/if}
	{/snippet}

	{#snippet headerAction()}
		{#if icon}
			<div class="feature-icon">
				{@render icon()}
			</div>
		{/if}
	{/snippet}
</Card>

<style>
	:global(.feature-card) {
		min-height: 180px;
	}

	:global(.feature-card.coming-soon) {
		opacity: 0.7;
		pointer-events: none;
	}

	.feature-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-brand);
		color: white;
		border-radius: var(--radius-md);
	}

	.soon-badge {
		padding: 0.25rem 0.5rem;
		background: var(--color-warning);
		color: var(--color-bg-pure);
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		border-radius: var(--radius-sm);
	}
</style>
