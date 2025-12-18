<script lang="ts">
	/**
	 * Root Layout - Header + Footer + Contact Modal
	 * Maverick X
	 */

	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ContactModal from '$lib/components/ContactModal.svelte';
	import type { LayoutData } from './$types';

	interface Props {
		children: import('svelte').Snippet;
		data: LayoutData;
	}

	interface ContactModalContext {
		categoryId?: string;
		productId?: string;
		applicationId?: string;
	}

	let { children, data }: Props = $props();
	const globalContent = data.globalContent;

	// Check if we're on an admin route - admin has its own layout
	const isAdmin = $derived($page.url.pathname.startsWith('/admin'));

	let contactModalOpen = $state(false);
	let modalContext = $state<ContactModalContext>({});

	function openContactModal(context?: ContactModalContext) {
		modalContext = context ?? {};
		contactModalOpen = true;
	}

	function closeContactModal() {
		contactModalOpen = false;
		modalContext = {};
	}

	// Listen for custom event from anywhere in the app
	onMount(() => {
		if (!browser) return;

		const handleOpenModal = (e: Event) => {
			const customEvent = e as CustomEvent<ContactModalContext>;
			openContactModal(customEvent.detail);
		};
		window.addEventListener('openContactModal', handleOpenModal);

		return () => {
			window.removeEventListener('openContactModal', handleOpenModal);
		};
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<a href="#main-content" class="skip-link">Skip to main content</a>

{#if !isAdmin}
	<Header onContactClick={openContactModal} />
{/if}

<main id="main-content" tabindex="-1">
	{@render children()}
</main>

{#if !isAdmin}
	<Footer onContactClick={openContactModal} content={globalContent?.footer} />

	<!-- Contact Modal -->
	<ContactModal
		isOpen={contactModalOpen}
		onClose={closeContactModal}
		defaultCategoryId={modalContext.categoryId}
		defaultProductId={modalContext.productId}
		defaultApplicationId={modalContext.applicationId}
		content={globalContent?.contact}
	/>
{/if}

<style>
	main {
		min-height: 100vh;
	}
</style>
