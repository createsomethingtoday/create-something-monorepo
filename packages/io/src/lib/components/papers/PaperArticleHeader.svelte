<script lang="ts">
	import { ArtifactVisualSummary } from '@create-something/canon/domains/io';
	import { TrackedExperimentBadge } from '@create-something/canon/interactive';
	import type { Paper } from '@create-something/canon/types';
	import PaperReadingGuide from './PaperReadingGuide.svelte';

	interface Props {
		paper: Paper;
	}

	let { paper }: Props = $props();

	const tags = $derived(
		paper.tags?.map((tag) => (typeof tag === 'string' ? tag : tag.name)).filter(Boolean) ?? []
	);

	function formatDate(dateString?: string | null): string {
		if (!dateString) return '';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<header class="paper-article-header">
	<h1>{paper.title}</h1>
	<PaperReadingGuide />

	{#if paper.excerpt_long || paper.description}
		<p class="paper-excerpt">{paper.excerpt_long || paper.description}</p>
	{/if}

	<div class="paper-metadata" aria-label="Paper details">
		<span>{paper.category}</span>
		{#if paper.published_at || paper.date}
			<span>{formatDate(paper.published_at || paper.date)}</span>
		{/if}
		{#if paper.reading_time}
			<span>{paper.reading_time} minute read</span>
		{/if}
		{#if paper.difficulty_level}
			<span>{paper.difficulty_level}</span>
		{/if}
	</div>

	{#if tags.length > 0}
		<ul class="paper-tags" aria-label="Topics">
			{#each tags.slice(0, 5) as tag}
				<li>{tag}</li>
			{/each}
		</ul>
	{/if}

	<TrackedExperimentBadge {paper} showFullStats={true} />

	{#if paper.visual_summary}
		<ArtifactVisualSummary visual={paper.visual_summary} />
	{/if}

	{#if paper.ascii_art}
		<figure class="paper-artifact">
			<pre aria-label="Paper diagram">{paper.ascii_art}</pre>
		</figure>
	{/if}
</header>

<style>
	.paper-article-header {
		width: min(100% - 2rem, 64rem);
		margin-inline: auto;
		padding-block: clamp(2rem, 7vw, 5rem) clamp(1.5rem, 4vw, 3rem);
	}

	h1 {
		max-width: 22ch;
		margin: 0;
		font-size: clamp(2.1rem, 7vw, 4.75rem);
		line-height: 0.98;
		letter-spacing: -0.045em;
		color: var(--color-performance-fg-primary, currentColor);
	}

	.paper-excerpt {
		max-width: 66ch;
		margin: 1.5rem 0 0;
		font-size: clamp(1rem, 2vw, 1.2rem);
		line-height: 1.65;
		color: var(--color-performance-fg-secondary, currentColor);
	}

	.paper-metadata,
	.paper-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem 1rem;
		margin: 1.25rem 0 0;
		padding: 0;
		font-size: 0.78rem;
		color: var(--color-performance-fg-muted, #6b6b6b);
	}

	.paper-metadata span:not(:last-child)::after {
		content: ' ·';
	}

	.paper-tags {
		list-style: none;
	}

	.paper-tags li {
		padding: 0.3rem 0.55rem;
		border: 1px solid var(--color-performance-border-subtle, rgba(128, 128, 128, 0.3));
	}

	.paper-artifact {
		margin: 2rem 0 0;
		overflow-x: auto;
		border: 1px solid var(--color-performance-border-subtle, rgba(128, 128, 128, 0.3));
	}

	.paper-artifact pre {
		width: max-content;
		min-width: 100%;
		margin: 0;
		padding: 1rem;
		font-size: clamp(0.62rem, 1.7vw, 0.86rem);
		line-height: 1.35;
		color: var(--color-performance-fg-secondary, currentColor);
	}
</style>
