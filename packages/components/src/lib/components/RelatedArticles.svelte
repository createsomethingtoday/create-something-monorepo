<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { Paper } from '@create-something/components/types';

	interface Props {
		papers: Paper[];
		currentPaperId: string;
	}

	let { papers, currentPaperId }: Props = $props();

	// Filter out current paper and limit to 4
	const relatedPapers = $derived(
		papers.filter((p) => p.id !== currentPaperId).slice(0, 4)
	);

	// Map category to display name
	const categoryDisplayNames: Record<string, string> = {
		automation: 'Automation',
		webflow: 'Webflow',
		development: 'Development',
		infrastructure: 'Infrastructure',
		analytics: 'Analytics',
		authentication: 'Authentication',
		dashboard: 'Dashboard',
		research: 'Research',
		tutorial: 'Tutorial',
		methodology: 'Methodology'
	};

	const getCategoryDisplayName = (category: string) => {
		return categoryDisplayNames[category] || category;
	};

	// Format date
	const formatDate = (dateString?: string | null) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};
</script>

{#if relatedPapers.length > 0}
	<section class="related-section w-full max-w-5xl mx-auto px-6 py-16">
		<div in:fly={{ y: 20, duration: 600 }}>
			<h2 class="section-title mb-8">Related Articles</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#each relatedPapers as paper, index (paper.id)}
					<div in:fly={{ y: 20, duration: 500, delay: index * 100 }}>
						<a href={`/experiments/${paper.slug}`} class="group block h-full">
							<article class="related-card h-full overflow-hidden">
								<!-- ASCII Art Thumbnail -->
								<div class="thumbnail-container aspect-[16/9] flex items-center justify-center p-4">
									{#if paper.ascii_thumbnail || paper.ascii_art}
										<pre class="ascii-art text-[0.35rem] sm:text-[0.4rem] leading-[1.1] font-mono select-none">{paper.ascii_thumbnail || paper.ascii_art}</pre>
									{:else}
										<pre class="ascii-placeholder text-[0.4rem] leading-tight font-mono select-none">
  ╔═════════════╗
  ║   ASCII     ║
  ║ THUMBNAIL   ║
  ╚═════════════╝
</pre>
									{/if}
								</div>

								<!-- Content -->
								<div class="p-5 space-y-3">
									<!-- Metadata -->
									<div class="meta-row flex items-center gap-2 text-xs">
										<span class="capitalize">{getCategoryDisplayName(paper.category)}</span>
										{#if paper.published_at || paper.date}
											<span class="meta-separator">•</span>
											<span>{formatDate(paper.published_at || paper.date)}</span>
										{/if}
										<span class="meta-separator">•</span>
										<span>{paper.reading_time} min</span>
									</div>

									<!-- Title -->
									<h3 class="related-title text-lg font-semibold line-clamp-2 leading-snug">
										{paper.title}
									</h3>

									<!-- Excerpt -->
									{#if paper.excerpt_short}
										<p class="related-excerpt text-sm line-clamp-2 leading-relaxed">
											{paper.excerpt_short}
										</p>
									{/if}

									<!-- Read More Arrow -->
									<div class="read-more flex items-center gap-2 text-sm group-hover:gap-3 transition-all">
										<span>Read more</span>
										<svg
											class="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</div>
								</div>

								<!-- Hover Overlay -->
								<div class="hover-overlay absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
							</article>
						</a>
					</div>
				{/each}
			</div>
		</div>
	</section>
{/if}

<style>
	/* Section */
	.related-section {
		border-top: 1px solid var(--color-border-default);
	}

	.section-title {
		font-size: 1.875rem;
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	/* Card */
	.related-card {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.related-card:hover {
		border-color: var(--color-border-strong);
		box-shadow: var(--shadow-lg), 0 0 20px var(--color-hover);
	}

	/* Thumbnail */
	.thumbnail-container {
		background: var(--color-bg-pure);
		border-bottom: 1px solid var(--color-border-default);
	}

	.ascii-art {
		color: var(--color-fg-primary);
		opacity: 0.8;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.group:hover .ascii-art {
		opacity: 1;
	}

	.ascii-placeholder {
		color: var(--color-fg-muted);
	}

	/* Metadata */
	.meta-row {
		color: var(--color-fg-muted);
	}

	.meta-separator {
		color: var(--color-fg-subtle);
	}

	/* Title */
	.related-title {
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.group:hover .related-title {
		color: var(--color-fg-secondary);
	}

	/* Excerpt */
	.related-excerpt {
		color: var(--color-fg-tertiary);
	}

	/* Read More */
	.read-more {
		color: var(--color-fg-secondary);
	}

	/* Hover Overlay */
	.hover-overlay {
		background: linear-gradient(to top, var(--color-hover), transparent);
	}
</style>
