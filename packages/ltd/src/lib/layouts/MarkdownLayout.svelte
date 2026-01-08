<script lang="ts">
	/**
	 * Markdown Layout - .ltd
	 *
	 * Universal layout for all markdown content (patterns, canon pages).
	 * Provides structure and PageActions integration.
	 */
	import { PageActions } from '@create-something/components';

	interface Props {
		title?: string;
		subtitle?: string;
		category?: string;
		publishedAt?: string;
	}

	let { title, subtitle, category, publishedAt }: Props = $props();
</script>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-3xl mx-auto">
		<a href={category === 'Pattern' ? '/patterns' : '/canon'} class="typ-body-sm fg-muted hover:fg-tertiary transition-opacity mb-8 inline-block">
			← All {category === 'Pattern' ? 'Patterns' : 'Canon'}
		</a>
		{#if category}
			<p class="typ-body-sm tracking-widest uppercase fg-tertiary mb-4">{category}</p>
		{/if}
		{#if title}
			<h1 class="mb-6">{title}</h1>
		{/if}
		{#if subtitle}
			<p class="typ-h3 fg-secondary leading-relaxed">{subtitle}</p>
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
	<div class="max-w-3xl mx-auto prose prose-ltd">
		<slot />
	</div>
</article>

<!-- Page Actions -->
<PageActions />

<style>
	/* Canon typography and spacing */
	:global(.prose-ltd h2) {
		margin-top: var(--space-xl);
		margin-bottom: var(--space-md);
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	:global(.prose-ltd h3) {
		margin-top: var(--space-lg);
		margin-bottom: var(--space-sm);
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	:global(.prose-ltd p) {
		margin-bottom: var(--space-md);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.8;
	}

	:global(.prose-ltd ul),
	:global(.prose-ltd ol) {
		margin-bottom: var(--space-md);
		padding-left: var(--space-lg);
	}

	:global(.prose-ltd li) {
		margin-bottom: var(--space-sm);
		color: var(--color-fg-secondary);
	}

	:global(.prose-ltd blockquote) {
		border-left: 2px solid var(--color-border-emphasis);
		padding-left: var(--space-md);
		margin: var(--space-lg) 0;
		font-style: italic;
		color: var(--color-fg-tertiary);
	}

	:global(.prose-ltd table) {
		width: 100%;
		margin: var(--space-lg) 0;
		border-collapse: collapse;
		border: 1px solid var(--color-border-default);
	}

	:global(.prose-ltd th) {
		background: var(--color-bg-subtle);
		padding: var(--space-sm);
		text-align: left;
		font-weight: 600;
		border-bottom: 1px solid var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	:global(.prose-ltd td) {
		padding: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
	}

	:global(.prose-ltd code) {
		background: var(--color-bg-subtle);
		padding: 0.2em 0.4em;
		border-radius: var(--radius-sm);
		font-family: 'Stack Sans Mono', monospace;
		font-size: 0.9em;
		color: var(--color-fg-primary);
	}

	:global(.prose-ltd pre) {
		background: var(--color-bg-subtle);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		overflow-x: auto;
		margin: var(--space-lg) 0;
	}

	:global(.prose-ltd pre code) {
		background: none;
		padding: 0;
	}
</style>
