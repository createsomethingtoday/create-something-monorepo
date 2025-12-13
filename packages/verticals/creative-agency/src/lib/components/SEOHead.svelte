<script lang="ts">
	import { siteConfig } from '$lib/config/site';

	interface Props {
		title?: string;
		description?: string;
		canonical?: string;
		ogImage?: string;
		noindex?: boolean;
	}

	let {
		title,
		description = siteConfig.description,
		canonical,
		ogImage = '/og-image.jpg',
		noindex = false
	}: Props = $props();

	const fullTitle = title ? `${title} | ${siteConfig.name}` : `${siteConfig.name} | ${siteConfig.tagline}`;
	const canonicalUrl = canonical ? `${siteConfig.url}${canonical}` : siteConfig.url;
	const ogImageUrl = ogImage.startsWith('http') ? ogImage : `${siteConfig.url}${ogImage}`;
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="title" content={fullTitle} />
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />

	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{/if}

	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:site_name" content={siteConfig.name} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImageUrl} />
</svelte:head>
