/**
 * Fashion Boutique Template - Server-side Data
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
				name: 'Fashion Boutique Website Template',
				applicationCategory: 'BusinessApplication',
				applicationSubCategory: 'E-commerce',
				operatingSystem: 'Web',
				offers: {
					'@type': 'AggregateOffer',
					lowPrice: '0',
					highPrice: '299',
					priceCurrency: 'USD',
					priceValidUntil: '2026-12-31',
					availability: 'https://schema.org/InStock',
					offerCount: 3
				},
				description:
					'Editorial fashion boutique website template with asymmetric product grid, quick-add functionality, category filtering, and newsletter integration.',
				featureList: [
					'Editorial typography',
					'Asymmetric product grid',
					'Quick-add to cart',
					'Category sidebar filters',
					'Search functionality',
					'Newsletter signup',
					'Product hover effects',
					'Pagination',
					'Mobile responsive',
					'Light/dark mode',
					'SEO optimized',
					'E-commerce ready'
				],
				screenshot: 'https://createsomething.agency/screenshots/fashion-boutique-template.jpg',
				aggregateRating: {
					'@type': 'AggregateRating',
					ratingValue: '4.9',
					ratingCount: '42',
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
						name: 'How do I create a fashion boutique website?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Deploy this template to Cloudflare Pages in minutes. Add your products, configure categories, and connect your payment processor. The template includes product grids, filtering, search, and cart functionality. WORKWAY workflows handle order notifications and inventory alerts.'
						}
					},
					{
						'@type': 'Question',
						name: 'What e-commerce platforms does this integrate with?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'The Pro tier includes integrations with Shopify, Stripe, and Square. You can manage products through the built-in CMS or sync from your existing e-commerce platform. Enterprise tier supports custom integrations.'
						}
					},
					{
						'@type': 'Question',
						name: 'Can I customize the product grid layout?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes. The template supports multiple grid layouts including the default asymmetric editorial grid, standard grid, and masonry layouts. You can also customize the number of columns and product card styles.'
						}
					},
					{
						'@type': 'Question',
						name: 'Does this template support inventory management?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes. The Pro tier includes inventory tracking with low-stock alerts via WORKWAY workflows. You can set stock levels per product and variant, and automatically notify your team when items need reordering.'
						}
					}
				]
			}
		}
	};
};
