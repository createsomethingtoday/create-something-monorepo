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

{#if showNav}
	<nav class="nav-minimal">
		<a href="/">{$config.name}</a>
	</nav>
{/if}

<main>
	{@render children()}
</main>

<style>
	main {
		min-height: 100vh;
	}
</style>
