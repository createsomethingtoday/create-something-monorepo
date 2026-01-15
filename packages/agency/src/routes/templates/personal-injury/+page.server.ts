/**
 * Personal Injury Template - Server-side Data
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
				name: 'Personal Injury Law Firm Website Template',
				applicationCategory: 'BusinessApplication',
				applicationSubCategory: 'Legal Practice Management',
				operatingSystem: 'Web',
				offers: {
					'@type': 'AggregateOffer',
					lowPrice: '0',
					highPrice: '249',
					priceCurrency: 'USD',
					priceValidUntil: '2026-12-31',
					availability: 'https://schema.org/InStock',
					offerCount: 3
				},
				description:
					'High-conversion personal injury law firm website template with integrated case intake, lead qualification, and practice management automation.',
				featureList: [
					'Conversion-focused hero design',
					'Integrated case intake form',
					'Lead qualification workflows',
					'Case severity screening',
					'24/7 availability badges',
					'Recovery results showcase',
					'Contingency fee calculator',
					'Accident type pages',
					'Attorney profiles',
					'Clio/MyCase integration',
					'Hot lead alerts (Slack)',
					'ADA accessibility (WCAG AA)'
				],
				screenshot: 'https://createsomething.agency/screenshots/personal-injury-template.jpg',
				aggregateRating: {
					'@type': 'AggregateRating',
					ratingValue: '4.9',
					ratingCount: '41',
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
						name: 'How do I create a personal injury law firm website?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Deploy this template to Cloudflare Pages in minutes. Add your firm details, attorneys, and case types. The template includes conversion-optimized pages for each accident type, attorney profiles, and recovery results. WORKWAY workflows handle case intake and lead qualification automatically.'
						}
					},
					{
						'@type': 'Question',
						name: 'Does this template include case intake automation?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes. The Pro tier includes intelligent case intake that screens leads based on severity, statute of limitations, and fault. Qualified leads are automatically added to your practice management system (Clio, MyCase, PracticePanther). Hot leads trigger immediate Slack notifications.'
						}
					},
					{
						'@type': 'Question',
						name: 'What practice management integrations are available?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'The Pro tier includes webhook integrations for Clio, MyCase, and PracticePanther. Case intake submissions automatically create contacts and matters in your PM system. Enterprise tier supports custom integrations with any legal software via API.'
						}
					},
					{
						'@type': 'Question',
						name: 'Can I display case results on the website?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes. The template includes a recovery results section with ethics-compliant display. Client names are never shown without consent, and all results include the required "prior results do not guarantee" disclaimer.'
						}
					},
					{
						'@type': 'Question',
						name: 'Is the template optimized for personal injury SEO?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes. The template generates dedicated pages for each accident type (car accidents, truck accidents, medical malpractice, etc.) with schema markup, local SEO signals, and conversion-optimized content. Each page targets specific injury keywords.'
						}
					}
				]
			}
		}
	};
};
