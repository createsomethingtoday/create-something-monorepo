<script lang="ts">
	/**
	 * Related Papers Card
	 *
	 * Shows related .io research papers for an experiment.
	 * Cross-property link: Practice (.space) → Research (.io).
	 */

	import { getRelatedPapers, type RelatedPaper } from '$lib/utils/relatedPapers';

	interface Props {
		experimentSlug: string;
	}

	let { experimentSlug }: Props = $props();

	const papers = $derived(getRelatedPapers(experimentSlug));
</script>

{#if papers.length > 0}
	<section class="related-papers">
		<h3 class="section-title">Related Research</h3>
		<p class="section-description">Theoretical grounding for this experiment</p>

		<div class="papers-grid">
			{#each papers as paper}
				<a
					href="https://createsomething.io/papers/{paper.slug}"
					target="_blank"
					rel="noopener noreferrer"
					class="paper-card"
				>
					<h4 class="paper-title">{paper.title}</h4>
					<p class="paper-excerpt">{paper.excerpt}</p>
					<div class="paper-meta">
						<span>{paper.readingTime} min read</span>
						<span class="arrow">→</span>
					</div>
				</a>
			{/each}
		</div>
	</section>
{/if}

<style>
	.related-papers {
		margin-top: var(--space-performance-xl);
		padding: var(--space-performance-lg);
		border-radius: var(--radius-performance-scale-lg);
	}

	.section-title {
		font-size: var(--text-performance-h3);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-xs);
	}

	.section-description {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin-bottom: var(--space-performance-md);
	}

	.papers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-performance-md);
	}

	.paper-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
		text-decoration: none;
		transition:
			border-color var(--duration-performance-micro) var(--ease-performance-standard),
			transform var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.paper-card:hover {
		border-color: var(--color-performance-border-emphasis);
		transform: translateY(-2px);
	}

	.paper-title {
		font-size: var(--text-performance-body);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-xs);
	}

	.paper-excerpt {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		flex-grow: 1;
		line-height: 1.5;
	}

	.paper-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--space-performance-sm);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.arrow {
		transition: transform var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.paper-card:hover .arrow {
		transform: translateX(4px);
	}
</style>
