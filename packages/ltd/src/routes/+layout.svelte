<script lang="ts">
	import Navigation from '$lib/components/Navigation.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import '../app.css';

	let { children, data } = $props();
</script>

<svelte:head>
	<meta name="theme-color" content="#000000" />

	<!-- Favicons -->
	<link rel="icon" href="/favicon.png" type="image/png" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="icon" href="/favicon.ico" sizes="any" />
	<link rel="apple-touch-icon" href="/favicon.png" />

	<!-- Fonts -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"
		rel="stylesheet"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@200..700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="min-h-screen flex flex-col">
	<Navigation currentPath={data?.pathname || '/'} />

	<main class="flex-1">
		{@render children()}
	</main>

	<Footer />
</div>
