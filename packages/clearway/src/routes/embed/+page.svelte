<script lang="ts">
	import { page } from '$app/stores';
	import Widget from '../../embed/Widget.svelte';

	// Get params from URL: /embed?facility=thestack&theme=dark&email=user@example.com
	const facilitySlug = $page.url.searchParams.get('facility') || 'thestack';
	const theme = ($page.url.searchParams.get('theme') as 'light' | 'dark') || 'dark';
	const courtType = $page.url.searchParams.get('court_type') || undefined;
	const memberEmail = $page.url.searchParams.get('email') || undefined;
</script>

<svelte:head>
	<title>Book a Court | CLEARWAY</title>
	<style>
		/* Reset for iframe embedding */
		html, body {
			margin: 0;
			padding: 0;
			background: transparent;
			overflow-x: hidden;
			overflow-y: auto;
		}
	</style>
</svelte:head>

<div class="embed-wrapper" data-theme={theme}>
	<Widget {facilitySlug} {theme} {courtType} {memberEmail} />
</div>

<style>
	.embed-wrapper {
		min-height: 100vh;
		height: auto;
		padding: var(--space-md, 1rem);
	}

	.embed-wrapper[data-theme='dark'] {
		background: var(--color-bg-pure, #000000);
	}

	.embed-wrapper[data-theme='light'] {
		background: var(--color-bg-pure, #ffffff);
	}
</style>
