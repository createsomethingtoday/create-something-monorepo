<script lang="ts">
	import { TrackedExperimentBadge } from "@create-something/canon/interactive";
	import type { Paper } from "$lib/types/paper";
	import ArtifactVisualSummary from './ArtifactVisualSummary.svelte';

	interface Props {
		paper: Paper;
		prioritizeTitle?: boolean;
		orientation?: {
			question: string;
			action: string;
			evidence: string;
			limit: string;
			nextLabel: string;
			nextHref: string;
		} | null;
	}

	let { paper, prioritizeTitle = false, orientation = null }: Props = $props();

	const categoryDisplayNames: Record<string, string> = {
		automation: 'Automation',
		webflow: 'Webflow',
		development: 'Development',
	};

	const categoryDisplayName = $derived(categoryDisplayNames[paper.category] || paper.category);

	const difficultyLevels: Record<string, string> = {
		Beginner: 'difficulty-beginner',
		Intermediate: 'difficulty-intermediate',
		Advanced: 'difficulty-advanced',
	};

	const difficultyClass = $derived(
		difficultyLevels[paper.difficulty_level || ''] || 'difficulty-default'
	);

	const formatDate = (dateString: string | undefined = undefined) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};
</script>

<header class="article-header w-full max-w-5xl mx-auto px-6 py-12 animate-reveal" class:prioritize-title={prioritizeTitle}>
	<!-- ASCII Art Hero -->
	<div class="ascii-hero mb-8 overflow-hidden">
		<div class="ascii-hero-frame aspect-[21/9] flex items-center justify-center p-8">
			{#if paper.ascii_art}
				<pre class="ascii-art ascii-art-real">{paper.ascii_art}</pre>
			{:else}
				<pre class="ascii-art ascii-art-placeholder">{`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║                     [ASCII ART HERO]                      ║
  ║                      PLACEHOLDER                          ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
`}</pre>
			{/if}
		</div>
	</div>

	<!-- Category Tag -->
	<div class="category-row mb-6 animate-slide-in" style="--delay: 2">
		<span class="category-tag">
			{categoryDisplayName}
		</span>
	</div>

	<!-- Title -->
	<h1 class="article-title mb-6 animate-reveal" style="--delay: 3">
		{paper.title}
	</h1>

	{#if orientation}
		<section class="experiment-orientation" aria-labelledby="experiment-question">
			<p class="orientation-label">Start here</p>
			<h2 id="experiment-question">{orientation.question}</h2>
			<p>{orientation.action}</p>
			<div class="orientation-checks">
				<p><strong>What counts as evidence</strong>{orientation.evidence}</p>
				<p><strong>Keep in mind</strong>{orientation.limit}</p>
			</div>
			<a href={orientation.nextHref}>{orientation.nextLabel} →</a>
		</section>
	{/if}

	<!-- Excerpt -->
	{#if paper.excerpt_long}
		<p class="article-excerpt mb-8 max-w-3xl animate-reveal" style="--delay: 4">
			{paper.excerpt_long}
		</p>
	{/if}

	<!-- Metadata Row -->
	<div class="metadata-row flex flex-wrap items-center gap-6 pt-6 animate-reveal" style="--delay: 5">
		<!-- Published Date -->
		{#if paper.published_at || paper.date}
			<div class="flex items-center gap-2">
				<svg
					class="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					stroke-width="1.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
					/>
				</svg>
				<span>{formatDate(paper.published_at || paper.date)}</span>
			</div>
		{/if}

		<!-- Reading Time -->
		<div class="flex items-center gap-2">
			<svg
				class="w-4 h-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				stroke-width="1.5"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>{paper.reading_time} min read</span>
		</div>

		<!-- Difficulty -->
		{#if paper.difficulty_level}
			<div class="flex items-center gap-2 {difficultyClass}">
				<div class="difficulty-indicator"></div>
				<span class="difficulty-text">
					{paper.difficulty_level}
				</span>
			</div>
		{/if}

		<!-- Technical Focus Tags -->
		{#if paper.technical_focus}
			<div class="flex items-center gap-2">
				<span class="tag-label">Tags:</span>
				<div class="flex gap-2">
					{#each paper.technical_focus.split(",").slice(0, 3) as tech}
						<span class="tech-tag">
							{tech.trim()}
						</span>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Tracked Experiment Badge -->
	<div class="experiment-badge mt-8 animate-reveal" style="--delay: 6">
		<TrackedExperimentBadge {paper} showFullStats={true} />
	</div>

	{#if paper.visual_summary}
		<div class="visual-summary animate-reveal" style="--delay: 7">
			<ArtifactVisualSummary visual={paper.visual_summary} />
		</div>
	{/if}
</header>

<style>
	.ascii-hero {
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-lg);
	}

	.prioritize-title {
		display: flex;
		flex-direction: column;
	}

	.prioritize-title .category-row { order: 1; }
	.prioritize-title .article-title { order: 2; }
	.prioritize-title .experiment-orientation { order: 3; }
	.prioritize-title .article-excerpt { order: 4; }
	.prioritize-title .metadata-row { order: 5; }
	.prioritize-title .ascii-hero { order: 6; margin-top: 2rem; margin-bottom: 0; }
	.prioritize-title .experiment-badge { order: 7; }
	.prioritize-title .visual-summary { order: 8; }

	.experiment-orientation { max-width: 52rem; margin-block: 0 2rem; padding: clamp(1.25rem, 3vw, 2rem); border: 1px solid var(--color-performance-border-subtle); background: var(--color-performance-bg-surface); }
	.orientation-label { margin: 0 0 .5rem; font-size: .75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
	.experiment-orientation h2 { margin: 0; max-width: 24ch; font-size: clamp(1.4rem, 3vw, 2rem); line-height: 1.12; }
	.experiment-orientation > p:not(.orientation-label) { max-width: 58ch; line-height: 1.6; }
	.orientation-checks { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-block: 1.25rem; }
	.orientation-checks p { margin: 0; line-height: 1.5; }
	.orientation-checks strong { display: block; margin-bottom: .2rem; font-size: .75rem; text-transform: uppercase; }
	@media (max-width: 38rem) { .orientation-checks { grid-template-columns: 1fr; } }

	.ascii-art {
		font-family: monospace;
		tab-size: 2;
		user-select: none;
		white-space: pre;
	}

	.ascii-art-real {
		color: var(--color-performance-fg-secondary);
		font-size: clamp(0.7rem, 1.5vw, 0.9rem);
		line-height: 1.2;
		opacity: 0.9;
	}

	.ascii-art-placeholder {
		color: var(--color-performance-fg-muted);
		font-size: 0.8rem;
		line-height: 1.4;
	}

	.category-tag {
		display: inline-block;
		padding: 0.5rem 1rem;
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body-sm);
		font-weight: 500;
		color: var(--color-performance-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.article-title {
		font-size: clamp(2rem, 5vw, 3.75rem);
		font-weight: bold;
		color: var(--color-performance-fg-primary);
		line-height: 1.2;
	}

	.article-excerpt {
		font-size: clamp(1.125rem, 2vw, 1.25rem);
		color: var(--color-performance-fg-muted);
		line-height: 1.6;
	}

	.metadata-row {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	.difficulty-indicator {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: var(--radius-performance-scale-full);
	}

	/* Difficulty level colors - using Canon semantic tokens */
	.difficulty-beginner .difficulty-indicator {
		background-color: var(--color-performance-success);
	}

	.difficulty-beginner .difficulty-text {
		color: var(--color-performance-success);
	}

	.difficulty-intermediate .difficulty-indicator {
		background-color: var(--color-performance-warning);
	}

	.difficulty-intermediate .difficulty-text {
		color: var(--color-performance-warning);
	}

	.difficulty-advanced .difficulty-indicator {
		background-color: var(--color-performance-error);
	}

	.difficulty-advanced .difficulty-text {
		color: var(--color-performance-error);
	}

	.difficulty-default .difficulty-indicator {
		background-color: var(--color-performance-fg-primary);
	}

	.difficulty-default .difficulty-text {
		color: var(--color-performance-fg-primary);
	}

	.tag-label {
		color: var(--color-performance-fg-muted);
	}

	.tech-tag {
		padding: 0.25rem 0.5rem;
		font-size: var(--text-performance-caption);
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-sm);
		color: var(--color-performance-fg-tertiary);
	}

	.animate-reveal {
		opacity: 0;
		transform: translateY(12px);
		animation: reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--delay, 0) * 100ms);
	}

	.animate-slide-in {
		opacity: 0;
		transform: translateX(-12px);
		animation: slide-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--delay, 0) * 100ms);
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slide-in {
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal,
		.animate-slide-in {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}

	@media (max-width: 640px) {
		.article-header {
			padding: 1.5rem 1rem 2rem;
		}

		.ascii-hero {
			margin-bottom: 1.5rem;
			overflow-x: auto;
			border-radius: var(--radius-performance-scale-md);
			-webkit-overflow-scrolling: touch;
		}

		.ascii-hero-frame {
			aspect-ratio: 16 / 7;
			min-width: max-content;
			padding: 1rem;
			justify-content: flex-start;
		}

		.ascii-art-real {
			font-size: 0.5rem;
			line-height: 1.25;
		}

		.ascii-art-placeholder {
			font-size: 0.46rem;
		}

		.category-tag {
			padding: 0.375rem 0.625rem;
			font-size: var(--text-performance-caption);
		}

		.article-title {
			font-size: 2.125rem;
			line-height: 1.12;
		}

		.article-excerpt {
			font-size: var(--text-performance-body);
			line-height: 1.55;
		}

		.metadata-row {
			gap: 0.875rem;
			padding-top: 1rem;
		}

		.tech-tag {
			white-space: normal;
		}
	}
</style>
