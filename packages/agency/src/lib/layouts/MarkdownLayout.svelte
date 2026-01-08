<script lang="ts">
	/**
	 * Markdown Layout - .agency
	 *
	 * Universal layout for work case studies.
	 * Provides structure and PageActions integration.
	 */
	import { PageActions } from '@create-something/components';

	interface Props {
		title?: string;
		subtitle?: string;
		description?: string;
		category?: string;
		industry?: string;
		metrics?: string[];
		publishedAt?: string;
	}

	let { title, subtitle, description, category, industry, metrics, publishedAt }: Props = $props();
</script>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-4xl mx-auto">
		<div class="mb-6">
			<a href="/work" class="typ-body-sm fg-muted hover:fg-tertiary transition-opacity">← Back to Work</a>
		</div>
		{#if industry}
			<p class="typ-body-sm tracking-widest uppercase fg-tertiary mb-4">{industry}</p>
		{/if}
		{#if title}
			<h1 class="mb-6">{title}</h1>
		{/if}
		{#if subtitle}
			<p class="typ-h2 fg-tertiary leading-relaxed mb-8">{subtitle}</p>
		{/if}
		{#if metrics && metrics.length > 0}
			<div class="flex flex-wrap gap-4 typ-body-sm fg-muted">
				{#each metrics as metric}
					<span>• {metric}</span>
				{/each}
			</div>
		{/if}
		{#if publishedAt}
			<p class="typ-caption fg-muted mt-4">
				Published {new Date(publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
			</p>
		{/if}
	</div>
</section>

<!-- Content -->
<article class="py-16 px-6">
	<div class="max-w-3xl mx-auto prose prose-agency">
		<slot />
	</div>
</article>

<!-- Page Actions -->
<PageActions />

<style>
	/* Agency typography and spacing */
	:global(.prose-agency h2) {
		margin-top: var(--space-xl);
		margin-bottom: var(--space-md);
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	:global(.prose-agency h3) {
		margin-top: var(--space-lg);
		margin-bottom: var(--space-sm);
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	:global(.prose-agency p) {
		margin-bottom: var(--space-md);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.8;
	}

	:global(.prose-agency ul),
	:global(.prose-agency ol) {
		margin-bottom: var(--space-md);
		padding-left: var(--space-lg);
	}

	:global(.prose-agency li) {
		margin-bottom: var(--space-sm);
		color: var(--color-fg-secondary);
	}

	:global(.prose-agency blockquote) {
		border-left: 2px solid var(--color-border-emphasis);
		padding-left: var(--space-md);
		margin: var(--space-lg) 0;
		font-style: italic;
		color: var(--color-fg-tertiary);
	}

	:global(.prose-agency strong) {
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	:global(.prose-agency code) {
		background: var(--color-bg-subtle);
		padding: 0.2em 0.4em;
		border-radius: var(--radius-sm);
		font-family: 'Stack Sans Mono', monospace;
		font-size: 0.9em;
		color: var(--color-fg-primary);
	}

	:global(.prose-agency pre) {
		background: var(--color-bg-subtle);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		overflow-x: auto;
		margin: var(--space-lg) 0;
	}

	:global(.prose-agency pre code) {
		background: none;
		padding: 0;
	}

	/* Preserve agency-specific card styles */
	:global(.prose-agency .card-surface) {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	:global(.prose-agency .section-border) {
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-xl);
	}
</style>
