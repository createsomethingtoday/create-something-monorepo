/**
 * Templates Marketplace - Server-side Data
 *
 * Provides structured data for SEO and dynamic template information.
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		structuredData: {
			'@context': 'https://schema.org',
			'@type': 'ItemList',
			name: 'Vertical Website Templates',
			description:
				'Industry-specific website templates with built-in automation workflows powered by WORKWAY',
			itemListElement: [
				{
					'@type': 'SoftwareApplication',
					position: 1,
					name: 'Law Firm Website Template',
					applicationCategory: 'BusinessApplication',
					offers: {
						'@type': 'Offer',
						price: '29.00',
						priceCurrency: 'USD',
						priceValidUntil: '2025-12-31',
						availability: 'https://schema.org/InStock'
					},
					description:
						'Professional law firm website template with automated client intake, consultation booking, and appointment reminders. Ethics-compliant design.',
					featureList: [
						'Automated consultation booking',
						'Client intake forms auto-create Clio matters',
						'Appointment reminder automation',
						'Ethics-compliant disclaimers',
						'Case results showcase',
						'Attorney credentials display'
					]
				},
				{
					'@type': 'SoftwareApplication',
					position: 2,
					name: 'Medical Practice Website Template',
					applicationCategory: 'BusinessApplication',
					offers: {
						'@type': 'Offer',
						price: '29.00',
						priceCurrency: 'USD',
						priceValidUntil: '2025-12-31',
						availability: 'https://schema.org/InStock'
					},
					description:
						'Healthcare website template with HIPAA-aware patient intake forms and automated appointment scheduling.',
					featureList: [
						'Patient intake automation',
						'Appointment scheduling workflows',
						'Insurance verification',
						'HIPAA-aware form handling',
						'Provider credential displays',
						'Multi-language support'
					]
				},
				{
					'@type': 'SoftwareApplication',
					position: 3,
					name: 'Professional Services Website Template',
					applicationCategory: 'BusinessApplication',
					offers: {
						'@type': 'Offer',
						price: '29.00',
						priceCurrency: 'USD',
						priceValidUntil: '2025-12-31',
						availability: 'https://schema.org/InStock'
					},
					description:
						'B2B professional services template with automated lead qualification, proposal generation, and client onboarding.',
					featureList: [
						'Lead qualification automation',
						'Automated proposal generation',
						'Client onboarding sequences',
						'Portfolio showcase',
						'Service tier presentation',
						'ROI calculators'
					]
				},
				{
					'@type': 'SoftwareApplication',
					position: 4,
					name: 'Architecture Studio Website Template',
					applicationCategory: 'BusinessApplication',
					offers: {
						'@type': 'Offer',
						price: '29.00',
						priceCurrency: 'USD',
						priceValidUntil: '2025-12-31',
						availability: 'https://schema.org/PreOrder'
					},
					description:
						'Editorial-style template for architecture and design firms with portfolio showcases and project inquiry automation.',
					featureList: [
						'Project inquiry automation',
						'Scope assessment workflows',
						'Portfolio grid layouts',
						'Project categorization',
						'Full-screen imagery'
					]
				},
				{
					'@type': 'SoftwareApplication',
					position: 5,
					name: 'Creative Portfolio Website Template',
					applicationCategory: 'BusinessApplication',
					offers: {
						'@type': 'Offer',
						price: '29.00',
						priceCurrency: 'USD',
						priceValidUntil: '2025-12-31',
						availability: 'https://schema.org/PreOrder'
					},
					description:
						'Minimal portfolio for photographers, designers, and creative professionals with inquiry pre-qualification.',
					featureList: [
						'Project inquiry forms',
						'Gallery layouts',
						'Client list',
						'Image optimization',
						'Budget qualification'
					]
				},
				{
					'@type': 'SoftwareApplication',
					position: 6,
					name: 'Restaurant Website Template',
					applicationCategory: 'BusinessApplication',
					offers: {
						'@type': 'Offer',
						price: '29.00',
						priceCurrency: 'USD',
						priceValidUntil: '2025-12-31',
						availability: 'https://schema.org/PreOrder'
					},
					description:
						'Hospitality-focused template for restaurants with online reservations and event booking automation.',
					featureList: [
						'Reservation booking automation',
						'Menu displays',
						'Event booking',
						'Catering inquiries',
						'Photo galleries'
					]
				}
			]
		}
	};
};
