<script lang="ts">
	import { config } from '$lib/config/runtime';

	interface Props {
		title?: string;
		description?: string;
		canonical?: string;
		ogImage?: string;
	}

	let {
		title,
		description = $config.bio,
		canonical,
		ogImage = '/og-image.jpg'
	}: Props = $props();

	const fullTitle = title ? `${title} — ${$config.name}` : `${$config.name} — ${$config.role}`;
	const canonicalUrl = canonical ? `${$config.url}${canonical}` : $config.url;
	const ogImageUrl = ogImage.startsWith('http') ? ogImage : `${$config.url}${ogImage}`;
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />

	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImageUrl} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImageUrl} />
</svelte:head>
