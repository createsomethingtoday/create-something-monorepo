<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { Toast } from '$lib/components/ui';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="app-container">
	{@render children()}
	<Toast />
</div>

<style>
	.app-container {
		min-height: 100vh;
		background: var(--webflow-bg-primary);
		color: var(--webflow-fg-primary);
	}
</style>
