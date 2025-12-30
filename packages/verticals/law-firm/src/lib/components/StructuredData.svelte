<script lang="ts">
	import { getSiteConfigFromContext } from '$lib/config/context';

	const siteConfig = getSiteConfigFromContext();

	interface Props {
		type?: 'organization' | 'legalService' | 'attorney';
		page?: 'home' | 'practice-areas' | 'about' | 'attorneys' | 'contact' | 'results' | 'schedule';
		includeFAQ?: boolean;
		includeTemplate?: boolean;
	}

	let { type = 'organization', page = 'home', includeFAQ = false, includeTemplate = false }: Props = $props();

	// Law Firm organization schema
	const organizationSchema = {
		'@context': 'https://schema.org',
		'@type': 'LegalService',
		'@id': `${siteConfig.url}/#organization`,
		name: siteConfig.name,
		description: siteConfig.description,
		url: siteConfig.url,
		telephone: siteConfig.phone,
		email: siteConfig.email,
		address: {
			'@type': 'PostalAddress',
			streetAddress: siteConfig.address.street,
			addressLocality: siteConfig.address.city,
			addressRegion: siteConfig.address.state,
			postalCode: siteConfig.address.zip,
			addressCountry: siteConfig.address.country
		},
		openingHoursSpecification: [
			{
				'@type': 'OpeningHoursSpecification',
				dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
				opens: '09:00',
				closes: '18:00'
			}
		],
		sameAs: [siteConfig.social?.linkedin, siteConfig.social?.twitter].filter(Boolean),
		hasOfferCatalog: {
			'@type': 'OfferCatalog',
			name: 'Practice Areas',
			itemListElement: siteConfig.practiceAreas.map((area, index) => ({
				'@type': 'Offer',
				itemOffered: {
					'@type': 'Service',
					name: area.name,
					description: area.description
				},
				position: index + 1
			}))
		},
		// Law firm specific
		memberOf: siteConfig.barAssociations?.map((assoc) => ({
			'@type': 'Organization',
			name: assoc
		}))
	};

	// WebSite schema for home page
	const webSiteSchema = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		'@id': `${siteConfig.url}/#website`,
		url: siteConfig.url,
		name: siteConfig.name,
		description: siteConfig.description,
		publisher: {
			'@id': `${siteConfig.url}/#organization`
		}
	};

	// BreadcrumbList for navigation
	const breadcrumbSchemas: Record<string, object> = {
		home: {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Home',
					item: siteConfig.url
				}
			]
		},
		'practice-areas': {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Home',
					item: siteConfig.url
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'Practice Areas',
					item: `${siteConfig.url}/practice-areas`
				}
			]
		},
		about: {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Home',
					item: siteConfig.url
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'About',
					item: `${siteConfig.url}/about`
				}
			]
		},
		attorneys: {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Home',
					item: siteConfig.url
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'Attorneys',
					item: `${siteConfig.url}/attorneys`
				}
			]
		},
		results: {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Home',
					item: siteConfig.url
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'Case Results',
					item: `${siteConfig.url}/results`
				}
			]
		},
		contact: {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Home',
					item: siteConfig.url
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'Contact',
					item: `${siteConfig.url}/contact`
				}
			]
		},
		schedule: {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Home',
					item: siteConfig.url
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'Schedule Consultation',
					item: `${siteConfig.url}/schedule`
				}
			]
		}
	};

	// FAQPage schema for AEO (AI Engine Optimization)
	const faqPageSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: siteConfig.faq?.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: item.answer
			}
		}))
	};

	// SoftwareApplication schema for template (AEO)
	const softwareApplicationSchema = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Law Firm Website Template',
		applicationCategory: 'WebApplication',
		operatingSystem: 'Any',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD',
			availability: 'https://schema.org/InStock',
			description: 'Free law firm website template with optional WORKWAY automation'
		},
		description: 'Production-ready law firm website template with automated consultation booking, appointment reminders, and client follow-up workflows powered by WORKWAY.',
		featureList: [
			'Automated consultation booking',
			'Appointment reminder workflows',
			'Post-meeting follow-up automation',
			'CRM integration (HubSpot, Clio)',
			'Calendar integration (Calendly)',
			'SEO optimized with Schema.org',
			'Mobile responsive design',
			'Cloudflare Pages hosting'
		],
		provider: {
			'@type': 'Organization',
			name: 'CREATE SOMETHING',
			url: 'https://createsomething.agency'
		},
		aggregateRating: {
			'@type': 'AggregateRating',
			ratingValue: '5.0',
			reviewCount: '1'
		},
		screenshot: `${siteConfig.url}/og-image.jpg`
	};

	// Combine schemas based on page
	const schemas = $derived(() => {
		const result = [organizationSchema, breadcrumbSchemas[page]];

		if (page === 'home') {
			result.push(webSiteSchema);

			// Add template schema for home page (for template discovery)
			if (includeTemplate) {
				result.push(softwareApplicationSchema);
			}
		}

		// Add FAQ schema when requested
		if (includeFAQ && siteConfig.faq?.length > 0) {
			result.push(faqPageSchema);
		}

		return result;
	});
</script>

<svelte:head>
	{#each schemas() as schema}
		{@html `<script type="application/ld+json">${JSON.stringify(schema)}</script>`}
	{/each}
</svelte:head>
