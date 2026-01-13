<script lang="ts">
	/**
	 * OUTERFIELDS Root Layout
	 *
	 * Contains:
	 * - Navigation
	 * - Main content slot
	 * - Footer
	 * - Persistent mini video player
	 */

	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import MiniPlayer from '$lib/components/MiniPlayer.svelte';
	import { authStore } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	interface Props {
		children: import('svelte').Snippet;
		data: {
			user: {
				id: string;
				email: string;
				name: string;
				membership: boolean;
				createdAt: string;
			} | null;
		};
	}

	let { children, data }: Props = $props();

	// Initialize auth store when data loads
	onMount(() => {
		if (data.user) {
			authStore.setUser(data.user);
		} else {
			authStore.setUnauthenticated();
		}
	});
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

<div class="page-wrapper">
	<Navigation user={data.user} />
	<main id="main-content" class="main-wrapper" tabindex="-1">
		{@render children()}
	</main>
	<Footer />
</div>

<MiniPlayer />

<style>
	.skip-link {
		position: absolute;
		top: -100%;
		left: 0;
		padding: 0.5rem 1rem;
		background: var(--color-primary);
		color: var(--color-fg-primary);
		z-index: 100;
		border-radius: 0 0 0.25rem 0;
	}

	.skip-link:focus {
		top: 0;
	}

	.page-wrapper {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.main-wrapper {
		flex: 1;
	}
</style>
