<script lang="ts">
	/**
	 * SEO Component - Comprehensive metadata for search and social
	 * 
	 * Implements:
	 * - Open Graph (Facebook, LinkedIn)
	 * - Twitter Cards
	 * - JSON-LD Structured Data (AEO)
	 * - Canonical URLs
	 */

	interface Props {
		title: string;
		description: string;
		canonical?: string;
		ogImage?: string;
		ogType?: 'website' | 'article' | 'product';
		twitterCard?: 'summary' | 'summary_large_image';
		jsonLd?: Record<string, any>;
	}

	let {
		title,
		description,
		canonical = '',
		ogImage = 'https://maverickx.com/og-image.jpg',
		ogType = 'website',
		twitterCard = 'summary_large_image',
		jsonLd
	}: Props = $props();

	const siteName = 'Maverick X';
	const fullTitle = title.includes('Maverick X') ? title : `${title} | Maverick X`;
</script>

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>{fullTitle}</title>
	<meta name="title" content={fullTitle} />
	<meta name="description" content={description} />
	
	{#if canonical}
		<link rel="canonical" href={canonical} />
	{/if}

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content={ogType} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:site_name" content={siteName} />
	{#if canonical}
		<meta property="og:url" content={canonical} />
	{/if}

	<!-- Twitter -->
	<meta name="twitter:card" content={twitterCard} />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />

	<!-- Additional SEO -->
	<meta name="robots" content="index, follow" />
	<meta name="language" content="English" />
	<meta name="revisit-after" content="7 days" />
	<meta name="author" content="Maverick X" />

	<!-- Structured Data (JSON-LD) for AEO -->
	{#if jsonLd}
		{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>`}
	{/if}
</svelte:head>

