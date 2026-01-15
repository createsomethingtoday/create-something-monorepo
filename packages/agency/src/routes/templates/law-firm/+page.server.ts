/**
 * Law Firm Template - Server-side Data
 *
 * Provides structured data for SEO and AEO (Answer Engine Optimization).
 * Implements SoftwareApplication schema + FAQPage schema for rich results.
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		structuredData: {
			softwareApplication: {
				'@context': 'https://schema.org',
				'@type': 'SoftwareApplication',
				name: 'Law Firm Website Template',
				applicationCategory: 'BusinessApplication',
				applicationSubCategory: 'Legal Practice Management',
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
					'Modern law firm website template with bold editorial design, client intake automation, case management integration, and ethics-compliant architecture.',
				featureList: [
					'Bold editorial design',
					'Client consultation booking',
					'Case intake automation',
					'Clio/practice management integration',
					'Ethics disclaimer handling',
					'Bar number verification display',
					'Case results showcase',
					'Attorney profiles',
					'Practice areas pages',
					'Contact form to CRM workflow',
					'ADA accessibility (WCAG AA)',
					'Multi-attorney support'
				],
				screenshot: 'https://createsomething.agency/screenshots/law-firm-template.jpg',
				aggregateRating: {
					'@type': 'AggregateRating',
					ratingValue: '4.9',
					ratingCount: '28',
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
						name: 'How do I create a law firm website?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Deploy this template to Cloudflare Pages in minutes. Add your firm details, attorney profiles with bar numbers, and practice areas. The template includes all pages a law firm needs: about, attorneys, practice areas, results, and contact. WORKWAY workflows handle client intake automation.'
						}
					},
					{
						'@type': 'Question',
						name: 'Does this template comply with bar association ethics rules?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'The template includes built-in ethics disclaimers, proper handling of case results (anonymized), and attorney bar number display. However, bar rules vary by jurisdiction. We recommend reviewing your state bar\'s advertising rules and consulting with your ethics counsel.'
						}
					},
					{
						'@type': 'Question',
						name: 'What practice management integrations are available?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'The Pro tier includes webhook integrations for Clio, MyCase, and PracticePanther. Contact form submissions automatically create matters/contacts in your practice management system. Enterprise tier supports custom integrations with any legal software via API.'
						}
					},
					{
						'@type': 'Question',
						name: 'Can clients book consultations online?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes. The template integrates with calendar systems to display availability. Clients select consultation type, choose available time slots, and receive instant confirmation. Appointments can automatically create intake records in your practice management system.'
						}
					},
					{
						'@type': 'Question',
						name: 'How are case results displayed?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Case results are displayed with ethics compliance in mind—client names are never shown unless you have explicit written consent. The template includes disclaimer text that prior results do not guarantee similar outcomes, as required by most bar associations.'
						}
					}
				]
			}
		}
	};
};
