<script lang="ts">
	import PaperCard from './PaperCard.svelte';
	import type { Paper } from '@create-something/components/types';

	interface Props {
		papers: Paper[];
		title?: string;
		subtitle?: string;
	}

	let { papers, title = 'Latest Articles', subtitle }: Props = $props();

	// Define rotation patterns for cards (subtle tilted effect)
	const rotations = [-1, 1, -0.5, 0.5, -1.5, 1.5, -1, 1];
</script>

<section class="papers-section py-16 px-6">
	<div class="max-w-7xl mx-auto">
		<!-- Section Header -->
		<div class="mb-12">
			<h2 class="section-title font-bold mb-2">
				{title}
			</h2>
			{#if subtitle}
				<p class="section-subtitle">{subtitle}</p>
			{/if}
		</div>

		<!-- Responsive Grid - Matches Webflow inspiration -->
		<ul class="papers-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 highlight-grid" role="list">
			{#each papers as paper, index (paper.id)}
				<li class="highlight-item" style="--index: {index}">
					<PaperCard
						{paper}
						rotation={rotations[index % rotations.length]}
						{index}
					/>
				</li>
			{/each}
		</ul>

		<!-- Empty State -->
		{#if papers.length === 0}
			<div class="text-center py-24 animate-fade-in">
				<div class="empty-icon mb-6">📄</div>
				<h3 class="empty-title font-semibold mb-3">No papers yet</h3>
				<p class="empty-text">
					Check back soon for technical content and case studies.
				</p>
			</div>
		{/if}
	</div>
</section>

<style>
	.papers-section {
		background: var(--color-bg-pure);
	}

	.papers-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.section-title {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
	}

	.empty-icon {
		font-size: 3.75rem;
	}

	.empty-title {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
	}

	.empty-text {
		color: var(--color-fg-tertiary);
	}

	/* Fade in animation - CSS only */
	.animate-fade-in {
		opacity: 0;
		animation: fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	@keyframes fade-in {
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-fade-in {
			animation: none;
			opacity: 1;
		}
	}
</style>
