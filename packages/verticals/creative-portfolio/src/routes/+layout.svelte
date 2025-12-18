<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { config } from '$lib/config/runtime';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	// Minimal nav - only show when not on home
	const showNav = $derived($page.url.pathname !== '/');
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

{#if showNav}
	<nav class="nav-minimal">
		<a href="/">{$config.name}</a>
	</nav>
{/if}

<main id="main-content" tabindex="-1">
	{@render children()}
</main>

<style>
	main {
		min-height: 100vh;
	}
</style>
