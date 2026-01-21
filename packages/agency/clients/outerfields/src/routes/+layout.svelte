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

<div class="page-wrapper">
	<Navigation user={data.user} />
	<main class="main-wrapper">
		{@render children()}
	</main>
	<Footer />
</div>

<MiniPlayer />

<style>
	.page-wrapper {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
		overflow-x: hidden;
		max-width: 100vw;
	}

	.main-wrapper {
		flex: 1;
		overflow-x: hidden;
		max-width: 100%;
	}
</style>
