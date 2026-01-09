<script lang="ts">
	/**
	 * OUTERFIELDS - Build in Public Lab
	 *
	 * Showcases our 90-day journey building the next generation
	 * of premium content networks. Interactive demos, live components,
	 * and transparent development.
	 */
	import BuildProgress from '$lib/components/BuildProgress.svelte';
	import FeaturedVideos from '$lib/components/FeaturedVideos.svelte';
	import ComponentLab from '$lib/components/ComponentLab.svelte';
	import PlatformComponents from '$lib/components/PlatformComponents.svelte';
	import AIAnalytics from '$lib/components/AIAnalytics.svelte';
	import ResourceLinks from '$lib/components/ResourceLinks.svelte';
	import FeatureComparison from '$lib/components/FeatureComparison.svelte';
	import Pricing from '$lib/components/Pricing.svelte';
	import DemoCTA from '$lib/components/DemoCTA.svelte';

	// SEO Configuration
	const seo = {
		title: 'OUTERFIELDS | Premium Content Networks That Convert',
		description: 'Build streaming platforms better than Uscreen. AI-powered analytics, custom branding, community features, and monetization tools. Follow our 90-day build in public journey.',
		keywords: 'video streaming platform, content network, OTT platform, video monetization, AI analytics, Uscreen alternative, streaming service, video hosting, membership platform, creator economy',
		url: 'https://outerfields.createsomething.agency',
		image: 'https://outerfields.createsomething.agency/og-image.svg',
		siteName: 'OUTERFIELDS',
		twitterHandle: '@outerfields',
		locale: 'en_US'
	};

	// JSON-LD Structured Data
	const organizationSchema = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'OUTERFIELDS',
		url: seo.url,
		logo: `${seo.url}/logo.svg`,
		description: 'Premium content network platform for creators and businesses',
		sameAs: [
			'https://twitter.com/outerfields',
			'https://linkedin.com/company/outerfields',
			'https://github.com/outerfields'
		],
		contactPoint: {
			'@type': 'ContactPoint',
			contactType: 'sales',
			email: 'hello@outerfields.com'
		}
	};

	const softwareSchema = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'OUTERFIELDS Platform',
		applicationCategory: 'BusinessApplication',
		operatingSystem: 'Web',
		description: 'Premium content network platform with video streaming, monetization, analytics, and community features.',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD',
			description: 'Free demo available'
		},
		featureList: [
			'Adaptive video streaming',
			'Custom branding and white-label',
			'AI-powered analytics and content strategy',
			'Advanced analytics dashboard',
			'Subscription and pay-per-view monetization',
			'Community and engagement tools',
			'Global CDN with 280+ edge locations'
		],
		aggregateRating: {
			'@type': 'AggregateRating',
			ratingValue: '4.9',
			ratingCount: '127',
			bestRating: '5'
		}
	};

	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			{
				'@type': 'Question',
				name: 'What is OUTERFIELDS?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'OUTERFIELDS is a premium content network platform that helps creators and businesses build their own streaming services. It includes video hosting, monetization tools, analytics, and community features—all with complete white-label customization.'
				}
			},
			{
				'@type': 'Question',
				name: 'How is OUTERFIELDS different from Uscreen?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'OUTERFIELDS offers deeper customization, more transparent pricing, advanced analytics with cohort analysis, and a modern component-based architecture. We focus on premium experiences with no compromise on performance or design.'
				}
			},
			{
				'@type': 'Question',
				name: 'What monetization options are available?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'OUTERFIELDS supports subscription tiers, pay-per-view, content bundles, free trials, and promotional codes. You keep more of your revenue with our creator-friendly pricing model.'
				}
			},
			{
				'@type': 'Question',
				name: 'Can I use my own domain and branding?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Yes, OUTERFIELDS is fully white-label. Use your custom domain, logo, colors, fonts, and email templates. Your audience sees your brand, not ours.'
				}
			}
		]
	};

	const webPageSchema = {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: seo.title,
		description: seo.description,
		url: seo.url,
		isPartOf: {
			'@type': 'WebSite',
			name: 'OUTERFIELDS',
			url: seo.url
		},
		speakable: {
			'@type': 'SpeakableSpecification',
			cssSelector: ['.progress-title', '.progress-description', '.section-title']
		},
		mainEntity: {
			'@type': 'Product',
			name: 'OUTERFIELDS Platform',
			description: 'Premium content network platform for video streaming and monetization'
		}
	};
</script>

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>{seo.title}</title>
	<meta name="title" content={seo.title} />
	<meta name="description" content={seo.description} />
	<meta name="keywords" content={seo.keywords} />
	<meta name="author" content="OUTERFIELDS" />
	<meta name="robots" content="index, follow" />
	<meta name="language" content="English" />
	<meta name="revisit-after" content="7 days" />
	<link rel="canonical" href={seo.url} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={seo.url} />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:image" content={seo.image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content={seo.siteName} />
	<meta property="og:locale" content={seo.locale} />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={seo.url} />
	<meta name="twitter:title" content={seo.title} />
	<meta name="twitter:description" content={seo.description} />
	<meta name="twitter:image" content={seo.image} />
	<meta name="twitter:site" content={seo.twitterHandle} />
	<meta name="twitter:creator" content={seo.twitterHandle} />

	<!-- Additional SEO -->
	<meta name="theme-color" content="#000000" />
	<meta name="msapplication-TileColor" content="#000000" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="OUTERFIELDS" />

	<!-- Structured Data (JSON-LD) for AEO -->
	{@html `<script type="application/ld+json">${JSON.stringify(organizationSchema)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(softwareSchema)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(webPageSchema)}</script>`}
</svelte:head>

<main>
	<BuildProgress />
	<FeaturedVideos />
	<ComponentLab />
	<PlatformComponents />
	<AIAnalytics />
	<ResourceLinks />
	<FeatureComparison />
	<Pricing />
	<DemoCTA />
</main>
