<script lang="ts">
	/**
	 * Tracked Paper Component
	 *
	 * Wraps the Paper component with learning event tracking.
	 * Records when users start and complete reading papers.
	 *
	 * Canon: The tracking infrastructure disappears; only the learning remains.
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { io as ioTracking } from '@create-something/canon/utils';
	import Paper from './Paper.svelte';

	interface Props {
		title: string;
		subtitle?: string;
		paperId?: string;
		paperSlug: string; // Used for tracking
		category?: string;
		readTime?: string;
		level?: string;
		author?: string;
		date?: string;
		children?: any;
	}

	let {
		title,
		subtitle,
		paperId,
		paperSlug,
		category,
		readTime,
		level,
		author,
		date,
		children
	}: Props = $props();

	let startTime = 0;
	let isVisible = $state(false);
	let hasTrackedStart = $state(false);
	let hasTrackedCompletion = $state(false);

	// Track when paper comes into view
	let observer: IntersectionObserver | null = null;

	onMount(() => {
		if (!browser) return;

		startTime = Date.now();

		// Track paper start when user scrolls 25% down the page
		const trackStart = () => {
			if (hasTrackedStart) return;

			const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
			if (scrollPercent > 25) {
				ioTracking.paperStarted(paperSlug);
				hasTrackedStart = true;
				window.removeEventListener('scroll', trackStart);
			}
		};

		// Track paper completion when user reaches 80% scroll
		const trackCompletion = () => {
			if (hasTrackedCompletion) return;

			const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
			if (scrollPercent > 80) {
				const timeSpent = Math.floor((Date.now() - startTime) / 1000);
				ioTracking.paperCompleted(paperSlug, timeSpent);
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

	onDestroy(() => {
		if (browser && hasTrackedStart && !hasTrackedCompletion) {
			// Track partial read time on navigation away
			const timeSpent = Math.floor((Date.now() - startTime) / 1000);
			ioTracking.paperCompleted(paperSlug, timeSpent);
		}
	});

	// Public method for reflection tracking (can be called by parent components)
	export function trackReflection(reflectionLength: number) {
		ioTracking.paperReflected(paperSlug, reflectionLength);
	}
</script>

<Paper {title} {subtitle} {paperId} {category} {readTime} {level} {author} {date}>
	{#if children?.abstract}
		{#snippet abstract()}
			{@render children?.abstract?.()}
		{/snippet}
	{/if}

	{#if children?.metrics}
		{#snippet metrics()}
			{@render children?.metrics?.()}
		{/snippet}
	{/if}

	{#if children?.content}
		{#snippet content()}
			{@render children?.content?.()}
		{/snippet}
	{:else if children}
		{@render children?.()}
	{/if}

	{#if children?.references}
		{#snippet references()}
			{@render children?.references?.()}
		{/snippet}
	{/if}

	{#if children?.footer}
		{#snippet footer()}
			{@render children?.footer?.()}
		{/snippet}
	{/if}
</Paper>
