<script lang="ts">
	import { getSiteConfigFromContext } from '$lib/config/context';

	const siteConfig = getSiteConfigFromContext();

	interface Props {
		type?: 'organization' | 'service' | 'localBusiness';
		page?: 'home' | 'services' | 'about' | 'team' | 'contact';
	}

	let { type = 'organization', page = 'home' }: Props = $props();

	// Organization schema (base for all pages)
	const organizationSchema = {
		'@context': 'https://schema.org',
		'@type': 'ProfessionalService',
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
		sameAs: [siteConfig.social.instagram, siteConfig.social.pinterest].filter(Boolean),
		hasOfferCatalog: {
			'@type': 'OfferCatalog',
			name: 'Services',
			itemListElement: siteConfig.services.map((service, index) => ({
				'@type': 'Offer',
				itemOffered: {
					'@type': 'Service',
					name: service
				},
				position: index + 1
			}))
		}
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
		services: {
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
					name: 'Services',
					item: `${siteConfig.url}/services`
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
		team: {
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
					name: 'Team',
					item: `${siteConfig.url}/team`
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
