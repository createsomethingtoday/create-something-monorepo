<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Footer from '$lib/components/Footer.svelte';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

<Navigation />

<main id="main-content" tabindex="-1">
	{@render children()}
</main>

<Footer />

<style>
	main {
		min-height: 100vh;
	}
</style>
