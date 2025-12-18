<script lang="ts">
	import PaperCard from './PaperCard.svelte';
	import type { Paper } from '$lib/types/paper';

	interface Props {
		papers: Paper[];
		title?: string;
		subtitle?: string;
	}

	let { papers, title = 'Latest Articles', subtitle }: Props = $props();

	// Define rotation patterns for cards (subtle tilted effect)
	const rotations = [-1, 1, -0.5, 0.5, -1.5, 1.5, -1, 1];
</script>

<section class="papers-grid py-16 px-6">
	<div class="max-w-7xl mx-auto">
		<!-- Section Header -->
		<div class="mb-12">
			<h2 class="grid-title mb-2">
				{title}
			</h2>
			{#if subtitle}
				<p class="grid-subtitle">{subtitle}</p>
			{/if}
		</div>

		<!-- Responsive Grid - Matches Webflow inspiration -->
		<ul class="papers-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" role="list">
			{#each papers as paper, index (paper.id)}
				<li>
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
			<div class="empty-state text-center py-24 animate-fade-in">
				<div class="empty-icon mb-6">📄</div>
				<h3 class="empty-title mb-3">No papers yet</h3>
				<p class="empty-description">
					Check back soon for technical content and case studies.
				</p>
			</div>
		{/if}
	</div>
</section>

<style>
	.papers-grid {
		background: var(--color-bg-pure);
	}

	.papers-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.grid-title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.grid-subtitle {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-lg);
	}

	.empty-icon {
		font-size: 3.75rem;
	}

	.empty-title {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.empty-description {
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
