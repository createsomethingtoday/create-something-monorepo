<script lang="ts">
	/**
	 * Structured Data Component for Schema.org JSON-LD
	 *
	 * Supports: LocalBusiness, ProfessionalService, Organization, Person
	 *
	 * Usage:
	 * <StructuredData
	 *   type="ProfessionalService"
	 *   {config}
	 * />
	 */

	type SchemaType =
		| 'LocalBusiness'
		| 'ProfessionalService'
		| 'LegalService'
		| 'AccountingService'
		| 'Organization'
		| 'Person'
		| 'CreativeWork'
		| 'WebSite';

	interface SiteConfig {
		name: string;
		url: string;
		description: string;
		email?: string;
		phone?: string;
		address?: {
			street?: string;
			city: string;
			state?: string;
			zip?: string;
			country: string;
		};
		social?: Record<string, string>;
		services?: Array<{ name: string; description?: string }>;
		hours?: string[];
		priceRange?: string;
		geo?: {
			latitude: number;
			longitude: number;
		};
	}

	interface Props {
		type: SchemaType;
		config: SiteConfig;
		additionalData?: Record<string, unknown>;
	}

	let { type, config, additionalData = {} }: Props = $props();

	// Build social links array
	const sameAs = config.social
		? Object.values(config.social).filter(Boolean)
		: [];

	// Build schema based on type
	function buildSchema() {
		const base = {
			'@context': 'https://schema.org',
			'@type': type,
			name: config.name,
			description: config.description,
			url: config.url
		};

		// Add contact info
		const contact: Record<string, unknown> = {};
		if (config.email) contact.email = config.email;
		if (config.phone) contact.telephone = config.phone;

		// Add address
		const address = config.address
			? {
					'@type': 'PostalAddress',
					...(config.address.street && { streetAddress: config.address.street }),
					addressLocality: config.address.city,
					...(config.address.state && { addressRegion: config.address.state }),
					...(config.address.zip && { postalCode: config.address.zip }),
					addressCountry: config.address.country
				}
			: undefined;

		// Add geo coordinates
		const geo = config.geo
			? {
					'@type': 'GeoCoordinates',
					latitude: config.geo.latitude,
					longitude: config.geo.longitude
				}
			: undefined;

		// Add services for professional types
		const hasService =
			config.services &&
			['ProfessionalService', 'LegalService', 'AccountingService', 'LocalBusiness'].includes(type);

		const services = hasService
			? config.services!.map((s) => ({
					'@type': 'Service',
					name: s.name,
					...(s.description && { description: s.description })
				}))
			: undefined;

		return {
			...base,
			...contact,
			...(address && { address }),
			...(geo && { geo }),
			...(sameAs.length > 0 && { sameAs }),
			...(config.hours && { openingHours: config.hours }),
			...(config.priceRange && { priceRange: config.priceRange }),
			...(services && { hasOfferCatalog: { '@type': 'OfferCatalog', itemListElement: services } }),
			...additionalData
		};
	}

	const schema = buildSchema();
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(schema)}</script>`}
</svelte:head>
