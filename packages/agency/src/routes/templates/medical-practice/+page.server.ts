/**
 * Medical Practice Template - Server-side Data
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
				name: 'Medical Practice Website Template',
				applicationCategory: 'BusinessApplication',
				applicationSubCategory: 'Practice Management',
				operatingSystem: 'Web',
				offers: {
					'@type': 'AggregateOffer',
					lowPrice: '0',
					highPrice: '149',
					priceCurrency: 'USD',
					priceValidUntil: '2026-12-31',
					availability: 'https://schema.org/InStock',
					offerCount: 3
				},
				description:
					'HIPAA-conscious medical practice website template with Tufte-inspired design. Patient scheduling, secure intake forms, EHR integration, and automated follow-up workflows.',
				featureList: [
					'Tufte-inspired data visualization',
					'Real-time physician availability',
					'Patient satisfaction tracking',
					'Secure video consultations',
					'HIPAA-conscious architecture',
					'Encrypted data storage',
					'EHR integration ready',
					'Automated appointment reminders',
					'Patient intake automation',
					'Multi-specialty support',
					'Clinical outcomes display',
					'Faculty credentials management'
				],
				screenshot: 'https://createsomething.agency/screenshots/medical-practice-template.jpg',
				aggregateRating: {
					'@type': 'AggregateRating',
					ratingValue: '4.9',
					ratingCount: '32',
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
						name: 'How do I create a medical practice website?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Deploy this template to Cloudflare Pages in minutes. Configure your practice details, add physician profiles, and connect your scheduling system. The template includes pages for services, team, outcomes, and patient contact. WORKWAY workflows handle appointment and follow-up automation.'
						}
					},
					{
						'@type': 'Question',
						name: 'Is this template HIPAA compliant?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'This template uses HIPAA-conscious architecture: TLS 1.3 encryption, encrypted storage via Cloudflare D1/R2, and secure session management. Full HIPAA compliance requires Cloudflare Enterprise plan, Business Associate Agreements, and additional configuration. See our HIPAA compliance guide.'
						}
					},
					{
						'@type': 'Question',
						name: 'What EHR systems does this integrate with?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'The Pro tier includes webhook integrations for common EHR systems. Enterprise tier supports custom integrations with Epic, Cerner, Athenahealth, and other systems via FHIR APIs or custom connectors.'
						}
					},
					{
						'@type': 'Question',
						name: 'Can patients book appointments online?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes. The template displays real-time physician availability and allows patients to select appointment types, view available slots, and receive instant confirmation. Appointments sync with your practice management system.'
						}
					},
					{
						'@type': 'Question',
						name: 'How does the patient satisfaction tracking work?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'The template includes a Tufte-style sparkline visualization showing rolling satisfaction scores. Data can be pulled from your survey system or manually updated. The display builds trust by showing consistent care quality.'
						}
					}
				]
			}
		}
	};
};
