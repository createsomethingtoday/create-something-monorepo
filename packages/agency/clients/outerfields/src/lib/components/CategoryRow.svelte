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
	<div class="category-header-wrapper">
		<div class="category-header">
			<div class="category-labels">
				<h2 class="category-title">{title}</h2>
				<p class="category-meta">{videos.length} {videos.length === 1 ? 'video' : 'videos'}</p>
			</div>
			<div class="scroll-controls">
				<button
					class="scroll-button"
					class:disabled={!canScrollLeft}
					onclick={() => scroll('left')}
					aria-label="Scroll left"
					disabled={!canScrollLeft}
				>
					<ChevronLeft size={20} />
				</button>
				<button
					class="scroll-button"
					class:disabled={!canScrollRight}
					onclick={() => scroll('right')}
					aria-label="Scroll right"
					disabled={!canScrollRight}
				>
					<ChevronRight size={20} />
				</button>
			</div>
		</div>
	</div>

	<div
		class="cards-container"
		class:show-left-fade={canScrollLeft}
		class:show-right-fade={canScrollRight}
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
		max-width: var(--container-max-width);
		margin: 0 auto var(--space-2xl);
		padding: 0 1.25rem;
	}

	.category-header-wrapper {
		margin: 0;
	}

	.category-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.7rem;
		gap: 0.8rem;
	}

	.category-labels {
		display: grid;
		gap: 0.05rem;
	}

	.category-title {
		font-size: clamp(1.25rem, 1.6vw + 0.6rem, 1.75rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.category-meta {
		margin: 0;
		font-size: 0.82rem;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.scroll-controls {
		display: flex;
		gap: var(--space-xs);
	}

	.scroll-button {
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: var(--radius-full);
		color: var(--color-fg-primary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.scroll-button:hover:not(.disabled) {
		background: rgba(255, 255, 255, 0.14);
		border-color: rgba(255, 255, 255, 0.24);
		transform: translateY(-1px);
	}

	.scroll-button.disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.cards-container {
		position: relative;
		overflow-x: auto;
		overflow-y: hidden;
		scroll-behavior: smooth;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none; /* Firefox */
		-ms-overflow-style: none; /* IE/Edge */
		padding: 0.15rem 0;
	}

	.cards-container::-webkit-scrollbar {
		display: none; /* Chrome/Safari */
	}

	.cards-container::before,
	.cards-container::after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2rem;
		pointer-events: none;
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
		z-index: 5;
	}

	.cards-container::before {
		left: 0;
		background: linear-gradient(to right, var(--color-bg-pure), rgba(30, 30, 30, 0));
	}

	.cards-container::after {
		right: 0;
		background: linear-gradient(to left, var(--color-bg-pure), rgba(30, 30, 30, 0));
	}

	.cards-container.show-left-fade::before {
		opacity: 1;
	}

	.cards-container.show-right-fade::after {
		opacity: 1;
	}

	.cards-inner {
		display: flex;
		gap: var(--space-md);
		width: max-content;
		min-width: 100%;
		padding: 0.1rem 0.15rem 0.3rem;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.category-title {
			font-size: var(--text-h3);
		}

		.category-meta {
			font-size: 0.75rem;
		}

		.cards-inner {
			gap: var(--space-sm);
			padding-bottom: 0.25rem;
		}

		.scroll-controls {
			display: none; /* Hide buttons on mobile, rely on touch scroll */
		}

		.cards-container::before,
		.cards-container::after {
			display: none;
		}
	}
</style>
