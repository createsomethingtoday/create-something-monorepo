<script lang="ts">
	import '../app.css';
	import { siteConfig } from '$lib/config/site';

	let { children } = $props();
</script>

<svelte:head>
	<title>{siteConfig.name} | {siteConfig.tagline}</title>
	<meta name="description" content={siteConfig.description} />
</svelte:head>

<div class="relative flex min-h-screen flex-col">
	{@render children()}
</div>
