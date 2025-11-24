<script lang="ts">
	import { Navigation, Footer, Analytics } from '@create-something/components';
	import '../app.css';

	let { children, data } = $props();

	const navLinks = [
		{ label: 'Masters', href: '/masters' },
		{ label: 'Principles', href: '/principles' },
		{ label: 'Patterns', href: '/patterns' },
		{ label: 'Standards', href: '/standards' },
		{ label: 'Voice', href: '/voice' },
		{ label: 'Ethos', href: '/ethos' }
	];

	const quickLinks = [
		{ label: 'Masters', href: '/masters' },
		{ label: 'Principles', href: '/principles' },
		{ label: 'Patterns', href: '/patterns' },
		{ label: 'Standards', href: '/standards' },
		{ label: 'Voice', href: '/voice' },
		{ label: 'Ethos', href: '/ethos' }
	];
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

<Analytics property="ltd" />

<div class="min-h-screen flex flex-col">
	<Navigation
		logo="CREATE SOMETHING"
		logoSuffix=".ltd"
		links={navLinks}
		currentPath={data?.pathname || '/'}
	/>

	<main class="flex-1">
		{@render children()}
	</main>

	<Footer
		mode="ltd"
		showNewsletter={false}
		aboutText="The philosophical foundation for the Create Something ecosystem. Curated wisdom from masters who embody 'less, but better.'"
		quickLinks={quickLinks}
		showSocial={true}
	/>
</div>
