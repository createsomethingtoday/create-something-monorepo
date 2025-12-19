<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<title>Webflow Asset Dashboard</title>
	<meta name="description" content="Manage your Webflow templates and assets" />
</svelte:head>

{@render children()}
