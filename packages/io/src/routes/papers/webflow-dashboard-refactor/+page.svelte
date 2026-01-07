<script lang="ts">
	/**
	 * Webflow Dashboard Refactor: From Next.js to SvelteKit
	 *
	 * Case study documenting the complete refactoring from Next.js/Vercel to
	 * SvelteKit/Cloudflare, achieving 100% feature parity while demonstrating
	 * autonomous AI workflows completing 40% missing features in 83 minutes.
	 */
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { io as ioTracking } from '@create-something/components/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let startTime = 0;
	let hasTrackedStart = $state(false);
	let hasTrackedCompletion = $state(false);

	onMount(() => {
		if (!browser) return;

		startTime = Date.now();

		const trackStart = () => {
			if (hasTrackedStart) return;
			const scrollPercent =
				(window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
			if (scrollPercent > 25) {
				ioTracking.paperStarted(data.slug);
				hasTrackedStart = true;
				window.removeEventListener('scroll', trackStart);
			}
		};

		const trackCompletion = () => {
			if (hasTrackedCompletion) return;
			const scrollPercent =
				(window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
			if (scrollPercent > 80) {
				const timeSpent = Math.floor((Date.now() - startTime) / 1000);
				ioTracking.paperCompleted(data.slug, timeSpent);
				hasTrackedCompletion = true;
				window.removeEventListener('scroll', trackCompletion);
			}
		};

		window.addEventListener('scroll', trackStart);
		window.addEventListener('scroll', trackCompletion);

		return () => {
			window.removeEventListener('scroll', trackStart);
			window.removeEventListener('scroll', trackCompletion);
		};
	});
</script>

<svelte:head>
	<title>{data.meta.title} | CREATE SOMETHING.io</title>
	<meta name="description" content={data.meta.subtitle} />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-001</div>
			<h1 class="mb-3 paper-title">{data.meta.title}</h1>
			<p class="max-w-3xl paper-subtitle">{data.meta.subtitle}</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>{data.meta.category}</span>
				<span>•</span>
				<span>{data.meta.readingTime} min read</span>
				<span>•</span>
				<span>{data.meta.difficulty}</span>
			</div>
		</div>

		<!-- Paper Content (Rendered Markdown) -->
		<div class="paper-content">
			{@html data.htmlContent}
		</div>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				This paper documents the complete Webflow Dashboard refactor, achieving 100% feature parity
				through autonomous AI workflows.
			</p>
			<div class="flex justify-between mt-4">
				<a href="/papers" class="footer-link">&larr; All Papers</a>
				<a href="/experiments" class="footer-link">View Experiments &rarr;</a>
			</div>
		</div>
	</div>
</div>

<style>
	/* Structure: Tailwind | Design: Canon */

	/* Container */
	.paper-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	/* Header */
	.paper-header {
		border-bottom: 1px solid var(--color-border-default);
	}

	.paper-id {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.paper-title {
		font-size: var(--text-h1);
	}

	.paper-subtitle {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.paper-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Paper Content Typography */
	.paper-content :global(h1) {
		font-size: var(--text-h1);
		margin-top: 3rem;
		margin-bottom: 1.5rem;
	}

	.paper-content :global(h2) {
		font-size: var(--text-h2);
		margin-top: 3rem;
		margin-bottom: 1.5rem;
	}

	.paper-content :global(h3) {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin-top: 2rem;
		margin-bottom: 1rem;
	}

	.paper-content :global(h4) {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
	}

	.paper-content :global(p) {
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: 1rem;
	}

	.paper-content :global(a) {
		color: var(--color-fg-tertiary);
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.paper-content :global(a:hover) {
		color: var(--color-fg-primary);
	}

	.paper-content :global(strong) {
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	.paper-content :global(em) {
		color: var(--color-fg-secondary);
		font-style: italic;
	}

	.paper-content :global(code) {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		font-family: monospace;
	}

	.paper-content :global(pre) {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 1rem;
		overflow-x: auto;
		margin: 1.5rem 0;
	}

	.paper-content :global(pre code) {
		background: none;
		padding: 0;
	}

	.paper-content :global(ul) {
		list-style: disc;
		color: var(--color-fg-secondary);
		padding-left: 2rem;
		margin-bottom: 1rem;
	}

	.paper-content :global(ol) {
		list-style: decimal;
		color: var(--color-fg-secondary);
		padding-left: 2rem;
		margin-bottom: 1rem;
	}

	.paper-content :global(li) {
		margin-bottom: 0.5rem;
		line-height: 1.7;
	}

	.paper-content :global(blockquote) {
		border-left: 4px solid var(--color-border-emphasis);
		padding-left: 1rem;
		margin: 1.5rem 0;
		color: var(--color-fg-tertiary);
		font-style: italic;
	}

	.paper-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1.5rem 0;
		font-size: var(--text-body-sm);
	}

	.paper-content :global(th) {
		text-align: left;
		padding: 0.75rem;
		color: var(--color-fg-secondary);
		border-bottom: 1px solid var(--color-border-emphasis);
		font-weight: 600;
	}

	.paper-content :global(td) {
		padding: 0.75rem;
		color: var(--color-fg-tertiary);
		border-bottom: 1px solid var(--color-border-default);
	}

	/* Footer */
	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}
</style>

