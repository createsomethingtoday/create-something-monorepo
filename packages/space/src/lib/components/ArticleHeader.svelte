<script lang="ts">
	import TrackedExperimentBadge from './TrackedExperimentBadge.svelte';
	import type { Paper } from '$lib/types/paper';

	interface Props {
		paper: Paper;
	}

	let { paper }: Props = $props();

	const categoryDisplayNames: Record<string, string> = {
		automation: 'Automation',
		webflow: 'Webflow',
		development: 'Development',
	};

	const categoryDisplayName = categoryDisplayNames[paper.category] || paper.category;


	const formatDate = (dateString?: string) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};
</script>

<header class="w-full max-w-5xl mx-auto px-6 py-12 animate-reveal">
	<!-- ASCII Art Hero -->
	<div class="ascii-hero mb-8">
		<div class="aspect-[21/9] flex items-center justify-center p-8">
			{#if paper.ascii_art}
				<pre class="ascii-art">{paper.ascii_art}</pre>
			{:else}
				<pre class="ascii-placeholder">{`
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
	<div class="mb-6 animate-slide-in" style="--delay: 2">
		<span class="category-tag">
			{categoryDisplayName}
		</span>
	</div>

	<!-- Title -->
	<h1 class="article-title mb-6 animate-reveal" style="--delay: 3">
		{paper.title}
	</h1>

	<!-- Excerpt -->
	{#if paper.excerpt_long}
		<p class="excerpt mb-8 max-w-3xl animate-reveal" style="--delay: 4">
			{paper.excerpt_long}
		</p>
	{/if}

	<!-- Metadata Row -->
	<div class="metadata-row flex flex-wrap items-center gap-6 animate-reveal" style="--delay: 5">
		<!-- Published Date -->
		{#if paper.published_at || paper.date}
			<div class="metadata-item flex items-center gap-2">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
				</svg>
				<span>{formatDate((paper.published_at || paper.date) ?? undefined)}</span>
			</div>
		{/if}

		<!-- Reading Time -->
		<div class="metadata-item flex items-center gap-2">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>{paper.reading_time} min read</span>
		</div>

		<!-- Difficulty -->
		{#if paper.difficulty_level}
			<div class="difficulty-item flex items-center gap-2">
				<div class="difficulty-dot"></div>
				<span class="difficulty-text">
					{paper.difficulty_level}
				</span>
			</div>
		{/if}

		<!-- Technical Focus Tags -->
		{#if paper.technical_focus}
			<div class="flex items-center gap-2">
				<span class="tags-label">Tags:</span>
				<div class="flex gap-2">
					{#each paper.technical_focus.split(',').slice(0, 3) as tech}
						<span class="tech-tag">
							{tech.trim()}
						</span>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Tracked Experiment Badge -->
	<div class="mt-8 animate-reveal" style="--delay: 6">
		<TrackedExperimentBadge {paper} showFullStats={true} />
	</div>
</header>

<style>
	.ascii-hero {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.ascii-art {
		color: var(--color-fg-secondary);
		font-size: 0.7rem;
		line-height: 1.2;
		font-family: monospace;
		user-select: none;
		opacity: 0.9;
	}

	@media (min-width: 640px) {
		.ascii-art {
			font-size: 0.9rem;
		}
	}

	.ascii-placeholder {
		color: var(--color-fg-tertiary);
		font-size: 0.8rem;
		line-height: 1.2;
		font-family: monospace;
		user-select: none;
	}

	.category-tag {
		display: inline-block;
		padding: 0.5rem 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.article-title {
		font-size: clamp(2rem, 5vw, 3.5rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1.2;
	}

	.excerpt {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		line-height: 1.6;
	}

	@media (min-width: 640px) {
		.excerpt {
			font-size: 1.25rem;
		}
	}

	.metadata-row {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		border-top: 1px solid var(--color-border-default);
		padding-top: 1.5rem;
	}

	.difficulty-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: var(--radius-full);
		background: var(--color-fg-secondary);
	}

	.difficulty-text {
		color: var(--color-fg-secondary);
	}

	.tags-label {
		color: var(--color-fg-muted);
	}

	.tech-tag {
		padding: 0.25rem 0.5rem;
		font-size: var(--text-caption);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-tertiary);
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
</style>
