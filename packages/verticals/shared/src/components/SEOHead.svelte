<script lang="ts">
	/**
	 * Shared SEO Head Component
	 *
	 * Usage in templates:
	 * <SEOHead
	 *   {config}
	 *   title="Page Title"
	 *   description="Page description"
	 * />
	 *
	 * Requires siteConfig to have: name, url, description
	 */

	interface SiteConfig {
		name: string;
		url: string;
		description: string;
		locale?: string;
		tagline?: string;
		bio?: string;
		role?: string;
		address?: {
			city?: string;
			state?: string;
			country?: string;
		};
	}

	interface Props {
		config: SiteConfig;
		title?: string;
		description?: string;
		canonical?: string;
		ogImage?: string;
		ogType?: 'website' | 'article' | 'profile';
		noindex?: boolean;
	}

	let {
		config,
		title,
		description,
		canonical,
		ogImage = '/og-image.jpg',
		ogType = 'website',
		noindex = false
	}: Props = $props();

	// Flexible description fallback
	const defaultDescription = config.description || config.bio || '';

	// Flexible title construction
	const titleSuffix = config.tagline || config.role || config.description?.slice(0, 50);
	const fullTitle = title
		? `${title} | ${config.name}`
		: titleSuffix
			? `${config.name} | ${titleSuffix}`
			: config.name;

	const canonicalUrl = canonical ? `${config.url}${canonical}` : config.url;
	const ogImageUrl = ogImage.startsWith('http') ? ogImage : `${config.url}${ogImage}`;
</script>

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>{fullTitle}</title>
	<meta name="title" content={fullTitle} />
	<meta name="description" content={description || defaultDescription} />
	<link rel="canonical" href={canonicalUrl} />

	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{/if}

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content={ogType} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description || defaultDescription} />
	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:site_name" content={config.name} />
	{#if config.locale}
		<meta property="og:locale" content={config.locale} />
	{/if}

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description || defaultDescription} />
	<meta name="twitter:image" content={ogImageUrl} />

	<!-- Additional SEO -->
	<meta name="author" content={config.name} />
	{#if config.address}
		{#if config.address.state && config.address.country}
			<meta name="geo.region" content="{config.address.country}-{config.address.state}" />
		{/if}
		{#if config.address.city}
			<meta name="geo.placename" content={config.address.city} />
		{/if}
	{/if}
</svelte:head>
