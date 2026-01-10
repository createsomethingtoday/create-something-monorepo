<script lang="ts">
	import { siteConfig } from '$lib/config/context';

	interface Props {
		title?: string;
		description?: string;
		canonical?: string;
		ogImage?: string;
		ogType?: 'website' | 'article';
		noindex?: boolean;
	}

	let {
		title,
		description,
		canonical,
		ogImage = '/og-image.jpg',
		ogType = 'website',
		noindex = false
	}: Props = $props();

	// Reactive computed values from store
	const effectiveDescription = $derived(description ?? $siteConfig.description);
	const fullTitle = $derived(title ? `${title} | ${$siteConfig.name}` : $siteConfig.name);
	const canonicalUrl = $derived(canonical ? `${$siteConfig.url}${canonical}` : $siteConfig.url);
	const ogImageUrl = $derived(ogImage.startsWith('http') ? ogImage : `${$siteConfig.url}${ogImage}`);
</script>

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>{fullTitle}</title>
	<meta name="title" content={fullTitle} />
	<meta name="description" content={effectiveDescription} />
	<link rel="canonical" href={canonicalUrl} />

	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{/if}

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content={ogType} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={effectiveDescription} />
	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:locale" content={$siteConfig.locale} />
	<meta property="og:site_name" content={$siteConfig.name} />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={canonicalUrl} />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={effectiveDescription} />
	<meta name="twitter:image" content={ogImageUrl} />

	<!-- Additional SEO -->
	<meta name="author" content={$siteConfig.name} />
	<meta name="geo.region" content="{$siteConfig.address.country}-{$siteConfig.address.state}" />
	<meta name="geo.placename" content={$siteConfig.address.city} />
</svelte:head>
