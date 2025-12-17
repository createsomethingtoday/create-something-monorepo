<script lang="ts">
	/**
	 * Root Layout
	 *
	 * Contains:
	 * - Navigation
	 * - Main content slot
	 * - Footer
	 */

	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Footer from '$lib/components/Footer.svelte';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="page-wrapper">
	<Navigation />
	<main class="main-wrapper">
		{@render children()}
	</main>
	<Footer />
</div>

<style>
	.main-wrapper {
		min-height: 100vh;
	}
</style>
