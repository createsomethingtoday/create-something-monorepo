<script lang="ts">
	/**
	 * ContentCard Component
	 *
	 * Blog/article style card with image, perfect for series, episodes, etc.
	 */
	import Card from './Card.svelte';
	import { Heart, Bookmark, Share2 } from 'lucide-svelte';

	interface Props {
		title: string;
		description?: string;
		image: string;
		imageAlt?: string;
		category?: string;
		date?: string;
		duration?: string;
		href?: string;
		showActions?: boolean;
	}

	let {
		title,
		description,
		image,
		imageAlt,
		category,
		date,
		duration,
		href,
		showActions = false
	}: Props = $props();

	// Format meta string
	const metaString = $derived([date, duration].filter(Boolean).join(' • '));
</script>

<Card
	{title}
	{description}
	{image}
	{imageAlt}
	tag={category}
	{date}
	meta={metaString}
	{href}
	variant="default"
	size="md"
	aspectRatio="video"
	class="content-card"
>
	{#snippet footer()}
		{#if showActions}
			<div class="card-actions">
				<button class="action-btn" aria-label="Like">
					<Heart size={16} />
				</button>
				<button class="action-btn" aria-label="Bookmark">
					<Bookmark size={16} />
				</button>
				<button class="action-btn" aria-label="Share">
					<Share2 size={16} />
				</button>
			</div>
			<a href={href} class="read-more">Read more →</a>
		{/if}
	{/snippet}
</Card>

<style>
	.card-actions {
		display: flex;
		gap: var(--space-xs);
	}

	.action-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-muted);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.action-btn:hover {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		border-color: var(--color-border-emphasis);
	}

	.read-more {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-brand);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.read-more:hover {
		color: var(--color-brand-hover);
	}
</style>
