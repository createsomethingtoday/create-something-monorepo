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

<a href="#main-content" class="skip-link">Skip to main content</a>

<div class="page-wrapper">
	<Navigation />
	<main id="main-content" class="main-wrapper" tabindex="-1">
		{@render children()}
	</main>
	<Footer />
</div>

<style>
	.main-wrapper {
		min-height: 100vh;
	}

	/* Skip Link - Hidden by default, visible on focus for keyboard users */
	:global(.skip-link) {
		position: fixed;
		top: -100%;
		left: 50%;
		transform: translateX(-50%);
		z-index: 9999;
		padding: 1rem 2rem;
		background: var(--green);
		color: var(--black);
		font-family: var(--font-coolvetica);
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		text-decoration: none;
		border-radius: 0 0 0.5rem 0.5rem;
		transition: top 0.2s ease;
	}

	:global(.skip-link:focus) {
		top: 0;
		outline: 2px solid var(--white);
		outline-offset: 2px;
	}
</style>
