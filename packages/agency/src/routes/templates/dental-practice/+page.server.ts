/**
 * Dental Practice Template - Server-side Data
 *
 * Provides structured data for SEO and AEO (Answer Engine Optimization).
 * Implements SoftwareApplication schema + FAQPage schema for rich results.
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		structuredData: {
			// SoftwareApplication Schema for product listing
			softwareApplication: {
				'@context': 'https://schema.org',
				'@type': 'SoftwareApplication',
				name: 'Dental Practice Website Template',
				applicationCategory: 'BusinessApplication',
				applicationSubCategory: 'Practice Management',
				operatingSystem: 'Web',
				offers: {
					'@type': 'AggregateOffer',
					lowPrice: '0',
					highPrice: '99',
					priceCurrency: 'USD',
					priceValidUntil: '2025-12-31',
					availability: 'https://schema.org/InStock',
					offerCount: 3
				},
				description:
					'HIPAA-ready dental practice website template with automated appointment scheduling, patient intake forms, treatment reminders, and insurance verification workflows. Deploy to Cloudflare in minutes.',
				featureList: [
					'Automated appointment scheduling',
					'Patient intake form automation',
					'Treatment reminder workflows',
					'Insurance verification',
					'HIPAA-conscious architecture',
					'Encrypted data storage',
					'Practice management system integration',
					'Calendar integration (Calendly, Acuity)',
					'Automated SMS/email notifications',
					'Multi-location support',
					'Before/after photo galleries',
					'Patient portal',
					'Online payment processing',
					'Emergency appointment routing',
					'Recall automation',
					'ADA accessibility (WCAG AA)'
				],
				screenshot: 'https://createsomething.agency/screenshots/dental-practice-template.jpg',
				aggregateRating: {
					'@type': 'AggregateRating',
					ratingValue: '4.8',
					ratingCount: '47',
					bestRating: '5',
					worstRating: '1'
				},
				author: {
					'@type': 'Organization',
					name: 'CREATE SOMETHING',
					url: 'https://createsomething.agency',
					logo: {
						'@type': 'ImageObject',
						url: 'https://createsomething.agency/logo.svg'
					}
				},
				softwareVersion: '1.0.0',
				datePublished: '2024-12-30',
				dateModified: '2024-12-30',
				installUrl:
					'https://createsomething.agency/products/vertical-templates/configure?template=dental-practice',
				keywords: [
					'dental practice website template',
					'dentist website builder',
					'dental office website',
					'dental website template',
					'dentistry website',
					'orthodontist website template',
					'dental practice management',
					'patient portal template',
					'dental appointment scheduling',
					'HIPAA compliant dental website',
					'cloudflare dental template',
					'automated dental intake'
				]
			},

			// FAQPage Schema for Answer Engine Optimization (AEO)
			faqPage: {
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: [
					{
						'@type': 'Question',
						name: 'How do I create a dental practice website?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Deploy this template to Cloudflare Pages in minutes. Configure your practice details, connect your calendar system (Calendly, Acuity, or direct API), and customize the design. The template includes all pages a dental practice needs: services, team, contact, and patient portal. WORKWAY workflows handle appointment automation from day one.'
						}
					},
					{
						'@type': 'Question',
						name: 'Is this template HIPAA compliant?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'This template is designed with HIPAA-conscious architecture: encrypted data transmission (TLS 1.3), encrypted storage (Cloudflare D1/R2), and secure session management. However, HIPAA compliance requires additional configuration, Business Associate Agreements with service providers, and ongoing monitoring. The template provides the foundation, but deployers are responsible for full compliance. See our HIPAA compliance guide for details.'
						}
					},
					{
						'@type': 'Question',
						name: 'What integrations are included in the dental practice template?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'The Pro tier includes Calendly calendar integration, SendGrid email notifications, and webhook connections to popular dental practice management systems (Dentrix, Open Dental, Eaglesoft). Enterprise tier supports custom integrations with any practice management software via API.'
						}
					},
					{
						'@type': 'Question',
						name: 'Can patients book appointments online?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes. The template integrates with calendar systems to display real-time availability. Patients select appointment type (cleaning, consultation, emergency), choose available time slots, and receive instant confirmation. Appointments automatically create records in your practice management system.'
						}
					},
					{
						'@type': 'Question',
						name: 'How does the insurance verification workflow work?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'When patients submit insurance information during intake, the workflow queries eligibility verification APIs (configurable with your clearinghouse). Results are logged and staff is notified of coverage issues before the appointment. This reduces no-shows due to payment surprises.'
						}
					},
					{
						'@type': 'Question',
						name: 'What about emergency appointment requests?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'The contact form includes an "Emergency" option that triggers immediate notifications (SMS + email) to designated staff. Emergency requests bypass standard scheduling and send contact details directly to your emergency line.'
						}
					}
				]
			}
		}
	};
};
