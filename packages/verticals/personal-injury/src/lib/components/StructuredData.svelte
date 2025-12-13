<script lang="ts">
	import { getSiteConfigFromContext } from '$lib/config/context';

	const siteConfig = getSiteConfigFromContext();

	interface Props {
		type?: 'organization' | 'legalService' | 'attorney';
		page?: 'home' | 'accident-types' | 'about' | 'attorneys' | 'contact' | 'results' | 'schedule' | 'free-case-review';
	}

	let { type = 'organization', page = 'home' }: Props = $props();

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
			name: 'Case Types',
			itemListElement: siteConfig.accidentTypes.map((type, index) => ({
				'@type': 'Offer',
				itemOffered: {
					'@type': 'Service',
					name: type.name,
					description: type.description
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
		'accident-types': {
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
					name: 'Case Types',
					item: `${siteConfig.url}/accident-types`
				}
			]
		},
		'free-case-review': {
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
					name: 'Free Case Review',
					item: `${siteConfig.url}/free-case-review`
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

	// Combine schemas based on page
	const schemas = $derived(() => {
		const result = [organizationSchema, breadcrumbSchemas[page]];

		if (page === 'home') {
			result.push(webSiteSchema);
		}

		return result;
	});
</script>

<svelte:head>
	{#each schemas() as schema}
		{@html `<script type="application/ld+json">${JSON.stringify(schema)}</script>`}
	{/each}
</svelte:head>
