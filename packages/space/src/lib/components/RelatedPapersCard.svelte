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
		margin-top: var(--space-xl);
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.section-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-md);
	}

	.papers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-md);
	}

	.paper-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			transform var(--duration-micro) var(--ease-standard);
	}

	.paper-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}

	.paper-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.paper-excerpt {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		flex-grow: 1;
		line-height: 1.5;
	}

	.paper-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.arrow {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.paper-card:hover .arrow {
		transform: translateX(4px);
	}
</style>
