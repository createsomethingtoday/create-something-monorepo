<script lang="ts">
	/**
	 * CategoryRow Component
	 * Netflix-style horizontal scrolling category with video cards.
	 * Responsive: shows 1-2 cards on mobile, 3-4 on tablet, 5-6 on desktop.
	 */
	import VideoCard from './VideoCard.svelte';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';

	interface Video {
		id: string;
		title: string;
		thumbnail: string;
		duration: string;
		tier: 'free' | 'preview' | 'gated';
		category: string;
		episodeNumber?: number;
	}

	interface Props {
		title: string;
		videos: Video[];
		/** Use links to /watch/[id] instead of click handlers */
		useLinks?: boolean;
		/** Handler for video clicks (used if useLinks is false) */
		onVideoClick?: (videoId: string) => void;
	}

	let { title, videos, useLinks = false, onVideoClick }: Props = $props();

	function getVideoHref(videoId: string): string | undefined {
		return useLinks ? `/watch/${videoId}` : undefined;
	}

	let scrollContainer: HTMLDivElement;
	let canScrollLeft = $state(false);
	let canScrollRight = $state(true);

	function scroll(direction: 'left' | 'right') {
		if (!scrollContainer) return;

		const scrollAmount = scrollContainer.clientWidth * 0.8;
		const targetScroll = direction === 'left'
			? scrollContainer.scrollLeft - scrollAmount
			: scrollContainer.scrollLeft + scrollAmount;

		scrollContainer.scrollTo({
			left: targetScroll,
			behavior: 'smooth'
		});
	}

	function updateScrollButtons() {
		if (!scrollContainer) return;

		canScrollLeft = scrollContainer.scrollLeft > 0;
		canScrollRight = scrollContainer.scrollLeft < (scrollContainer.scrollWidth - scrollContainer.clientWidth - 10);
	}

	function handleScroll() {
		updateScrollButtons();
	}

	$effect(() => {
		if (scrollContainer) {
			updateScrollButtons();
		}
	});
</script>

<section class="category-row">
	<div class="category-header">
		<h2 class="category-title">{title}</h2>
		<div class="scroll-controls">
			<button
				class="scroll-button"
				class:disabled={!canScrollLeft}
				onclick={() => scroll('left')}
				aria-label="Scroll left"
				disabled={!canScrollLeft}
			>
				<ChevronLeft size={24} />
			</button>
			<button
				class="scroll-button"
				class:disabled={!canScrollRight}
				onclick={() => scroll('right')}
				aria-label="Scroll right"
				disabled={!canScrollRight}
			>
				<ChevronRight size={24} />
			</button>
		</div>
	</div>

	<div
		class="cards-container"
		bind:this={scrollContainer}
		onscroll={handleScroll}
	>
		<div class="cards-inner">
			{#each videos as video (video.id)}
				<VideoCard
					{...video}
					href={getVideoHref(video.id)}
					onClick={useLinks ? undefined : () => onVideoClick?.(video.id)}
				/>
			{/each}
		</div>
	</div>
</section>

<style>
	.category-row {
		width: 100%;
		margin-bottom: var(--space-2xl);
	}

	.category-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);
		padding: 0 var(--space-lg);
	}

	.category-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.scroll-controls {
		display: flex;
		gap: var(--space-xs);
	}

	.scroll-button {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.05);
		border: none;
		border-radius: var(--radius-full);
		color: var(--color-fg-primary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.scroll-button:hover:not(.disabled) {
		background: rgba(255, 255, 255, 0.1);
	}

	.scroll-button.disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.cards-container {
		overflow-x: auto;
		overflow-y: hidden;
		scroll-behavior: smooth;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none; /* Firefox */
		-ms-overflow-style: none; /* IE/Edge */
	}

	.cards-container::-webkit-scrollbar {
		display: none; /* Chrome/Safari */
	}

	.cards-inner {
		display: flex;
		gap: var(--space-md);
		padding: 0 var(--space-lg);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.category-header {
			padding: 0 var(--space-md);
		}

		.category-title {
			font-size: var(--text-h3);
		}

		.cards-inner {
			padding: 0 var(--space-md);
			gap: var(--space-sm);
		}

		.scroll-controls {
			display: none; /* Hide buttons on mobile, rely on touch scroll */
		}
	}

	@media (max-width: 480px) {
		.category-header {
			padding: 0 var(--space-sm);
		}

		.cards-inner {
			padding: 0 var(--space-sm);
		}
	}
</style>
