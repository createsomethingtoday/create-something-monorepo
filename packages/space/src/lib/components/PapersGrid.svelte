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

<section class="papers-grid-section py-16 px-6">
	<div class="max-w-7xl mx-auto">
		<!-- Section Header -->
		<div class="mb-12">
			<h2 class="section-title mb-2">
				{title}
			</h2>
			{#if subtitle}
				<p class="section-subtitle">{subtitle}</p>
			{/if}
		</div>

		<!-- Adaptive Grid - Adjusts layout based on item count -->
		<div class="{papers.length <= 3
			? 'grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto'
			: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'}">
			{#each papers as paper, index (paper.id)}
				<PaperCard
					{paper}
					rotation={rotations[index % rotations.length]}
					{index}
				/>
			{/each}
		</div>

		<!-- Empty State -->
		{#if papers.length === 0}
			<div class="empty-state text-center py-24 animate-fade-in">
				<div class="empty-icon">📄</div>
				<h3 class="empty-title">No papers yet</h3>
				<p class="empty-subtitle">
					Check back soon for technical content and case studies.
				</p>
			</div>
		{/if}
	</div>
</section>

<style>
	.papers-grid-section {
		background: var(--color-bg-pure);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.section-subtitle {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-lg);
	}

	.empty-state {

	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1.5rem;
	}

	.empty-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 0.75rem;
	}

	.empty-subtitle {
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
