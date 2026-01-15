/**
 * Restaurant Template - Server-side Data
 *
 * Provides structured data for SEO and AEO (Answer Engine Optimization).
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		structuredData: {
			softwareApplication: {
				'@context': 'https://schema.org',
				'@type': 'SoftwareApplication',
				name: 'Restaurant Website Template',
				applicationCategory: 'BusinessApplication',
				applicationSubCategory: 'Restaurant Management',
				operatingSystem: 'Web',
				offers: {
					'@type': 'AggregateOffer',
					lowPrice: '0',
					highPrice: '199',
					priceCurrency: 'USD',
					priceValidUntil: '2026-12-31',
					availability: 'https://schema.org/InStock',
					offerCount: 3
				},
				description:
					'Avant-garde restaurant website template with bold editorial design, online reservations, menu management, and private events coordination.',
				featureList: [
					'Bold editorial design',
					'Split-screen hero',
					'Chef\'s choice showcase',
					'Online reservation integration',
					'Menu management',
					'Private events inquiry',
					'Hours & location display',
					'Social media integration',
					'OpenTable/Resy integration',
					'Mobile responsive',
					'Dark theme optimized',
					'Multi-location support'
				],
				screenshot: 'https://createsomething.agency/screenshots/restaurant-template.jpg',
				aggregateRating: {
					'@type': 'AggregateRating',
					ratingValue: '4.8',
					ratingCount: '35',
					bestRating: '5',
					worstRating: '1'
				},
				author: {
					'@type': 'Organization',
					name: 'CREATE SOMETHING',
					url: 'https://createsomething.agency'
				},
				softwareVersion: '2.0.0',
				datePublished: '2024-12-30',
				dateModified: '2026-01-15'
			},

			faqPage: {
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: [
					{
						'@type': 'Question',
						name: 'How do I create a restaurant website?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Deploy this template to Cloudflare Pages in minutes. Add your restaurant details, menu items, and connect your reservation system. The template includes pages for menu, reservations, private events, and contact. WORKWAY workflows handle reservation confirmations and event inquiries.'
						}
					},
					{
						'@type': 'Question',
						name: 'What reservation systems does this integrate with?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'The Pro tier includes integrations with OpenTable, Resy, and Yelp Reservations. Enterprise tier supports custom integrations with any reservation system via API.'
						}
					},
					{
						'@type': 'Question',
						name: 'Can I manage my menu through the website?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes. The template includes a menu management system where you can add, edit, and organize menu items by category. You can mark items as featured, add dietary tags, and update prices in real-time.'
						}
					},
					{
						'@type': 'Question',
						name: 'Does this template support private events?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes. The template includes a private events section where you can showcase your event spaces, capacities, and features. Inquiry forms are automated with WORKWAY to notify your events team.'
						}
					}
				]
			}
		}
	};
};
