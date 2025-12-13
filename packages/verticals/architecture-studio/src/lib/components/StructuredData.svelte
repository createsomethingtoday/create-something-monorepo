<script lang="ts">
	import { siteConfig } from '$lib/config/site';

	interface Props {
		type?: 'organization' | 'project';
		page?: 'home' | 'projects' | 'services' | 'studio' | 'contact';
	}

	let { type = 'organization', page = 'home' }: Props = $props();

	// Organization schema
	const organizationSchema = {
		'@context': 'https://schema.org',
		'@type': 'ArchitectureBusiness',
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
		sameAs: [siteConfig.social.instagram, siteConfig.social.pinterest].filter(Boolean),
		hasOfferCatalog: {
			'@type': 'OfferCatalog',
			name: 'Services',
			itemListElement: siteConfig.services.map((service, index) => ({
				'@type': 'Offer',
				itemOffered: {
					'@type': 'Service',
					name: service.name,
					description: service.description
				},
				position: index + 1
			}))
		}
	};

	// WebSite schema
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

	// BreadcrumbList schemas
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
		projects: {
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
					name: 'Projects',
					item: `${siteConfig.url}/projects`
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
		studio: {
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
					name: 'Studio',
					item: `${siteConfig.url}/studio`
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
