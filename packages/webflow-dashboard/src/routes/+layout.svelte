<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { Toast, FeedbackButton } from '$lib/components';

	interface LayoutData {
		user: { email: string } | null;
	}

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
	<title>Webflow Asset Dashboard</title>
	<meta name="description" content="Manage your Webflow templates and assets" />
</svelte:head>

{@render children()}
<Toast />

{#if data.user}
	<FeedbackButton />
{/if}
