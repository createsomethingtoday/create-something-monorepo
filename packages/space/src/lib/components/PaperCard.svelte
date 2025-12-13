<script lang="ts">
	import type { Paper } from '$lib/types/paper';

	interface Props {
		paper: Paper;
		rotation?: number;
		index?: number;
	}

	let { paper, rotation = 0, index = 0 }: Props = $props();

	// Map category to display name
	const categoryDisplayNames: Record<string, string> = {
		automation: 'Automation',
		webflow: 'Webflow',
		development: 'Development',
	};

	const categoryDisplayName = categoryDisplayNames[paper.category] || paper.category;

	// Format date
	const formattedDate = paper.published_at
		? new Date(paper.published_at).toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric',
			})
		: null;
</script>

<a href={paper.route || `/experiments/${paper.slug}`} class="block h-full">
	<article
		class="paper-card animate-reveal group h-full"
		style="transform: rotate({rotation}deg); --delay: {index};"
	>
		<div class="card-wrapper relative h-full overflow-hidden">
			<!-- Image or ASCII Art -->
			<div class="ascii-container aspect-[4/3] flex items-center justify-center p-4 relative overflow-hidden">
				{#if paper.ascii_art}
					<pre class="ascii-art">{paper.ascii_art}</pre>
				{:else}
					<div class="ascii-placeholder">
						📄
					</div>
				{/if}

				<!-- Hover Arrow Button -->
				<div class="arrow-button absolute top-4 right-4">
					<div class="arrow-inner flex items-center justify-center">
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
						>
							<path
								d="M10.6696 6.276L4.93156 12.014L3.98889 11.0713L9.72622 5.33333H4.66956V4H12.0029V11.3333H10.6696V6.276Z"
								fill="currentColor"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Card Content -->
			<div class="p-2 pb-4 space-y-3">
				<!-- Metadata -->
				<div class="metadata flex items-center gap-2">
					{#if formattedDate}
						<span>{formattedDate}</span>
						<span class="dot"></span>
					{/if}
					<span>{paper.reading_time} min read</span>
				</div>

				<!-- Title -->
				<h3 class="card-title line-clamp-2 leading-tight">
					{paper.title}
				</h3>

				<!-- Badges Row -->
				<div class="flex items-center gap-2 flex-wrap">
					<!-- Category Badge with Sliding Animation -->
					<div class="inline-block">
						<div class="badge-wrapper relative overflow-hidden">
							<div class="badge">
								{categoryDisplayName}
							</div>
							<div class="badge badge-hover absolute inset-0">
								{categoryDisplayName}
							</div>
						</div>
					</div>

					<!-- Runnable Badge -->
					{#if paper.is_executable}
						<div class="runnable-badge flex items-center gap-1.5">
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
								<path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							Runnable
						</div>
					{/if}
				</div>
			</div>

			<!-- Hover Overlay Effect -->
			<div class="hover-overlay absolute inset-0 pointer-events-none"></div>
		</div>
	</article>
</a>

<style>
	.card-wrapper {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.paper-card:hover .card-wrapper {
		border-color: rgba(255, 255, 255, 0.3);
		box-shadow: 0 20px 50px rgba(255, 255, 255, 0.1);
		transform: translateY(-0.5rem);
	}

	.ascii-container {
		background: var(--color-bg-pure);
		border-bottom: 1px solid var(--color-border-default);
	}

	.ascii-art {
		color: var(--color-fg-primary);
		font-size: 0.45rem;
		line-height: 1.1;
		font-family: monospace;
		user-select: none;
		opacity: 0.9;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.paper-card:hover .ascii-art {
		opacity: 1;
	}

	.ascii-placeholder {
		color: rgba(255, 255, 255, 0.2);
		font-size: 3.75rem;
	}

	.arrow-button {
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.paper-card:hover .arrow-button {
		opacity: 1;
	}

	.arrow-inner {
		width: 2.5rem;
		height: 2.5rem;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(4px);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-full);
		color: var(--color-fg-primary);
	}

	.metadata {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-tertiary);
	}

	.dot {
		width: 0.25rem;
		height: 0.25rem;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.4);
	}

	.card-title {
		font-size: var(--text-body-lg);
		font-weight: 500;
		color: var(--color-fg-primary);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.paper-card:hover .card-title {
		color: var(--color-fg-secondary);
	}

	.badge-wrapper {
		/* Layout only */
	}

	.badge {
		padding: 0.25rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-secondary);
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.paper-card:hover .badge {
		transform: translateY(-100%);
	}

	.badge-hover {
		transform: translateY(100%);
	}

	.paper-card:hover .badge-hover {
		transform: translateY(0);
	}

	.runnable-badge {
		padding: 0.25rem 0.5rem;
		background: rgba(255, 255, 255, 0.1);
		color: var(--color-fg-primary);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-weight: 500;
		border: 1px solid var(--color-border-emphasis);
	}

	.hover-overlay {
		background: linear-gradient(to top, rgba(255, 255, 255, 0.05), transparent);
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.paper-card:hover .hover-overlay {
		opacity: 1;
	}

	/* Staggered reveal animation - CSS only */
	.animate-reveal {
		opacity: 0;
		animation: reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--delay, 0) * 100ms);
	}

	@keyframes reveal {
		from {
			opacity: 0;
			transform: translateY(20px) rotate(var(--rotation, 0deg));
		}
		to {
			opacity: 1;
			transform: translateY(0) rotate(var(--rotation, 0deg));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
		}
	}
</style>
