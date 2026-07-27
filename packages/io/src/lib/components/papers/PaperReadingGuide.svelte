<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getPaperReadingGuide } from '$lib/papers/reading-guides';

	interface Props {
		compact?: boolean;
	}

	let { compact = false }: Props = $props();
	const guide = $derived(getPaperReadingGuide(page.url.pathname));
	const headingId = $derived(`paper-start-${page.url.pathname.split('/').filter(Boolean).at(-1)}`);

	function openRecordAndFocusSummary() {
		const record = document.querySelector<HTMLDetailsElement>('details[data-paper-record]');
		if (!record) return;
		record.open = true;
		requestAnimationFrame(() => record.querySelector<HTMLElement>('summary')?.focus());
	}

	onMount(() => {
		const record = document.querySelector<HTMLDetailsElement>('details[data-paper-record]');
		if (!record) return;

		function openForCurrentTarget() {
			const targetId = decodeURIComponent(window.location.hash.slice(1));
			const target = targetId ? document.getElementById(targetId) : null;
			record!.open = !!target && (target === record || record!.contains(target));
		}

		openForCurrentTarget();
		window.addEventListener('hashchange', openForCurrentTarget);
		return () => window.removeEventListener('hashchange', openForCurrentTarget);
	});
</script>

{#if guide}
	<section class:compact class="paper-reading-guide" aria-labelledby={headingId}>
		<p class="guide-label">{guide.mode === 'tool' ? 'Use this tool' : 'Start here'}</p>
		<h2 id={headingId}>{guide.question}</h2>
		<p class="guide-thesis">{guide.thesis}</p>

		<div class="guide-path">
			<div>
				<p class="path-label">What to inspect</p>
				<p>{guide.evidence}</p>
			</div>
			<div>
				<p class="path-label">Where it stops</p>
				<p>{guide.limit}</p>
			</div>
		</div>

		<div class="guide-actions">
			{#if guide.mode !== 'tool'}
				<a class="guide-record-link" href="#full-paper" onclick={openRecordAndFocusSummary}>Read the full paper</a>
			{/if}
			<a class="guide-continuation" href={guide.continueHref}>
				<span>Continue</span>
				<strong>{guide.continueLabel}</strong>
			</a>
		</div>
	</section>
{/if}

<style>
	.paper-reading-guide {
		box-sizing: border-box;
		width: min(100%, 52rem);
		margin: clamp(1.5rem, 4vw, 3rem) auto;
		padding: clamp(1.25rem, 3vw, 2rem);
		border: 1px solid var(--color-performance-border-subtle, rgba(128, 128, 128, 0.3));
		background: var(--color-performance-bg-subtle, rgba(128, 128, 128, 0.06));
		color: var(--color-performance-fg-primary, currentColor);
	}

	.paper-reading-guide.compact {
		margin-inline: 0;
	}

	.guide-label,
	.path-label,
	.guide-continuation span {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 650;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-performance-fg-muted, #6b6b6b);
	}

	h2 {
		max-width: 32ch;
		margin: 0.5rem 0 0;
		font-size: clamp(1.35rem, 3vw, 2rem);
		line-height: 1.15;
		letter-spacing: -0.02em;
	}

	.guide-thesis {
		max-width: 62ch;
		margin: 0.9rem 0 0;
		font-size: clamp(1rem, 2vw, 1.15rem);
		line-height: 1.6;
		color: var(--color-performance-fg-secondary, currentColor);
	}

	.guide-path {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1px;
		margin-top: 1.5rem;
		background: var(--color-performance-border-subtle, rgba(128, 128, 128, 0.25));
		border: 1px solid var(--color-performance-border-subtle, rgba(128, 128, 128, 0.25));
	}

	.guide-path > div {
		padding: 1rem;
		background: var(--color-performance-bg-pure, #fff);
	}

	.guide-path p:last-child {
		margin: 0.45rem 0 0;
		font-size: 0.92rem;
		line-height: 1.5;
		color: var(--color-performance-fg-secondary, currentColor);
	}

	.guide-continuation {
		display: inline-flex;
		align-items: baseline;
		gap: 0.65rem;
		color: inherit;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.25em;
	}

	.guide-continuation strong {
		font-size: 0.95rem;
	}

	.guide-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.75rem 1.5rem;
		margin-top: 1.25rem;
	}

	.guide-record-link {
		font-size: 0.95rem;
		font-weight: 650;
		color: inherit;
		text-underline-offset: 0.25em;
	}

	@media (max-width: 640px) {
		.guide-path {
			grid-template-columns: 1fr;
		}
	}

	:global(details.paper-record-disclosure) {
		box-sizing: border-box;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		margin-block: 1.5rem 3rem;
		border-top: 1px solid var(--color-performance-border-subtle, rgba(128, 128, 128, 0.3));
	}

	:global(details.paper-record-disclosure > summary) {
		padding: 1rem 0;
		font-size: 0.9rem;
		font-weight: 650;
		cursor: pointer;
		color: var(--color-performance-fg-secondary, currentColor);
	}

	:global(details.paper-record-disclosure[open] > summary) {
		margin-bottom: 1.5rem;
	}

	:global(.paper-record-body) {
		display: flow-root;
		box-sizing: border-box;
		max-width: 100%;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	:global(.paper-record-body pre),
	:global(.paper-record-body table),
	:global(.paper-record-body svg),
	:global(.paper-record-body img) {
		max-width: 100%;
	}

	:global(.paper-record-body pre),
	:global(.paper-record-body table) {
		display: block;
		overflow-x: auto;
	}
</style>
