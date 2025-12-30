/**
 * Law Firm Site Configuration
 *
 * Voice: Authoritative but approachable. Competence over cleverness.
 * Structure: Trust signals prominent, results anonymized, ethics visible.
 *
 * WORKWAY Integration:
 * - Client Intake to Matter: /contact form → Clio
 * - Consultation Booking: /schedule Calendly → Clio
 */

// Types
export interface Education {
	school: string;
	degree: string;
	year: number;
}

export interface Attorney {
	slug: string;
	name: string;
	title: string; // "Partner", "Associate", "Of Counsel"
	barNumber: string; // "CA Bar #123456"
	admittedStates: string[];
	education: Education[];
	practiceAreas: string[]; // slugs
	image: string;
	bio: string;
}

export interface PracticeArea {
	slug: string;
	name: string;
	description: string;
	icon?: string;
}

export interface CaseResult {
	title: string; // "Complex Custody Resolution"
	practiceArea: string; // slug
	outcome: string; // "Full custody awarded to client"
	year: number;
	description: string;
	// NO client names - ethics compliance
}

export interface WorkflowConfig {
	// WORKWAY workflow IDs
	consultationBooking?: string;
	followUp?: string;
	appointmentReminder?: string;

	// Legacy: External service URLs (deprecated)
	clioIntakeWebhook?: string; // Deprecated: Use WORKWAY consultation-booking workflow
	calendlyUrl?: string; // Deprecated: Use WORKWAY appointment-reminder workflow
}

export interface LawFirmConfig {
	// Identity
	name: string;
	tagline: string;
	description: string;

	// Contact
	email: string;
	phone: string;
	address: {
		street: string;
		city: string;
		state: string;
		zip: string;
		country: string;
	};

	// Social
	social: {
		linkedin?: string;
		twitter?: string;
	};

	// SEO
	url: string;
	locale: string;

	// Hero
	hero: {
		image: string;
		alt: string;
	};

	// Practice Areas (replaces services)
	practiceAreas: PracticeArea[];

	// Attorneys (replaces founders)
	attorneys: Attorney[];

	// Case Results (replaces projects)
	// Anonymized - no client names without consent
	results: CaseResult[];

	// About the Firm
	firm: {
		headline: string;
		philosophy: string;
		values: string[];
		founded: number;
	};

	// Workflow Integration
	workflows: WorkflowConfig;

	// Ethics & Compliance
	disclaimer: string;
	barAssociations: string[];

	// Recognition (optional)
	recognition?: {
		award: string;
		year: number;
	}[];

	// Statistics (for animated counters)
	statistics: {
		label: string;
		value: number;
		suffix?: string;
		prefix?: string;
	}[];

	// Testimonials
	testimonials: {
		quote: string;
		author: string;
		title?: string;
		rating?: number;
		image?: string;
	}[];

	// FAQ
	faq: {
		question: string;
		answer: string;
	}[];
}

/**
 * Demo Configuration: Morrison & Associates
 * A fictional mid-size California law firm
 * Images: Generated via Cloudflare Workers AI (Flux)
 */
export const siteConfig: LawFirmConfig = {
	// Identity
	name: 'Morrison & Associates',
	tagline: 'Experienced Legal Counsel',
	description:
		'A trusted San Francisco law firm providing skilled representation in family law, personal injury, and business litigation since 2010.',

	// Contact
	email: 'contact@morrisonlaw.example',
	phone: '(415) 555-0123',
	address: {
		street: '101 California Street, Suite 2800',
		city: 'San Francisco',
		state: 'CA',
		zip: '94111',
		country: 'US'
	},

	// Social
	social: {
		linkedin: 'https://linkedin.com/company/morrison-associates',
		twitter: 'https://twitter.com/morrisonlaw'
	},

	// SEO
	url: 'https://morrisonlaw.example',
	locale: 'en_US',

	// Hero
	hero: {
		image: '/images/hero-office.jpg',
		alt: 'Modern law office with San Francisco skyline view'
	},

	// Practice Areas
	practiceAreas: [
		{
			slug: 'family-law',
			name: 'Family Law',
			description:
				'Divorce, child custody, spousal support, and property division. We guide families through difficult transitions with clarity and compassion.',
			icon: 'users'
		},
		{
			slug: 'personal-injury',
			name: 'Personal Injury',
			description:
				'Auto accidents, medical malpractice, premises liability. We pursue maximum compensation for injured clients.',
			icon: 'shield'
		},
		{
			slug: 'business-law',
			name: 'Business Law',
			description:
				'Business formation, contracts, disputes, and litigation. We protect your business interests at every stage.',
			icon: 'briefcase'
		}
	],

	// Attorneys
	attorneys: [
		{
			slug: 'sarah-morrison',
			name: 'Sarah Morrison',
			title: 'Managing Partner',
			barNumber: 'CA Bar #187654',
			admittedStates: ['California', 'Nevada'],
			education: [
				{ school: 'Stanford Law School', degree: 'J.D.', year: 2005 },
				{ school: 'UC Berkeley', degree: 'B.A. Political Science', year: 2002 }
			],
			practiceAreas: ['family-law', 'business-law'],
			image: '/images/attorney-morrison.jpg',
			bio: 'Sarah founded Morrison & Associates in 2010 after five years at a leading Bay Area litigation firm. She has successfully handled over 500 family law cases and is a certified family law specialist by the California State Bar.'
		},
		{
			slug: 'james-chen',
			name: 'James Chen',
			title: 'Partner',
			barNumber: 'CA Bar #223456',
			admittedStates: ['California'],
			education: [
				{ school: 'UC Hastings College of Law', degree: 'J.D.', year: 2010 },
				{ school: 'UCLA', degree: 'B.S. Economics', year: 2007 }
			],
			practiceAreas: ['personal-injury', 'business-law'],
			image: '/images/attorney-chen.jpg',
			bio: 'James joined the firm in 2015 and became partner in 2020. He has recovered over $25 million for personal injury clients and brings meticulous attention to every case.'
		},
		{
			slug: 'maria-gonzalez',
			name: 'Maria Gonzalez',
			title: 'Associate',
			barNumber: 'CA Bar #298765',
			admittedStates: ['California'],
			education: [
				{ school: 'Santa Clara University School of Law', degree: 'J.D.', year: 2018 },
				{ school: 'San Jose State University', degree: 'B.A. Sociology', year: 2015 }
			],
			practiceAreas: ['family-law'],
			image: '/images/attorney-gonzalez.jpg',
			bio: 'Maria focuses exclusively on family law, helping clients navigate custody disputes, divorce proceedings, and domestic violence restraining orders. Fluent in Spanish.'
		}
	],

	// Case Results (anonymized)
	results: [
		{
			title: 'Complex Custody Resolution',
			practiceArea: 'family-law',
			outcome: 'Full custody awarded to client',
			year: 2024,
			description:
				'Successfully resolved an interstate custody dispute involving parental relocation. Secured primary custody for our client through careful documentation and expert testimony.'
		},
		{
			title: 'Medical Malpractice Settlement',
			practiceArea: 'personal-injury',
			outcome: '$2.3 million settlement',
			year: 2024,
			description:
				'Represented a client who suffered permanent injury due to surgical error. Negotiated settlement without trial, covering lifetime medical expenses and lost earning capacity.'
		},
		{
			title: 'Business Partnership Dissolution',
			practiceArea: 'business-law',
			outcome: 'Favorable buyout terms achieved',
			year: 2023,
			description:
				'Represented minority partner in contentious dissolution. Achieved buyout at independently appraised fair market value plus compensation for breach of fiduciary duty.'
		},
		{
			title: 'Catastrophic Auto Accident',
			practiceArea: 'personal-injury',
			outcome: '$1.8 million verdict',
			year: 2023,
			description:
				'Jury verdict for client who suffered traumatic brain injury in multi-vehicle collision. Established liability against commercial trucking company through accident reconstruction.'
		},
		{
			title: 'High-Asset Divorce',
			practiceArea: 'family-law',
			outcome: 'Equitable division including business interests',
			year: 2023,
			description:
				"Protected client's separate property claims in divorce involving multiple business entities. Achieved division reflecting true contributions while minimizing litigation costs."
		}
	],

	// About the Firm
	firm: {
		headline: 'Our Firm',
		philosophy:
			'We believe everyone deserves access to skilled legal representation. Our attorneys combine big-firm experience with personalized attention. We take time to understand your situation, explain your options clearly, and fight relentlessly for your interests.',
		values: [
			'Client-centered approach',
			'Clear communication',
			'Aggressive advocacy',
			'Ethical practice'
		],
		founded: 2010
	},

	// Workflow Integration
	workflows: {
		// WORKWAY workflow IDs for this organization
		consultationBooking: 'consultation-booking',
		followUp: 'post-meeting-follow-up',
		appointmentReminder: 'appointment-reminder',

		// Legacy: External service URLs (being replaced by WORKWAY)
		clioIntakeWebhook: '', // Deprecated: Use WORKWAY consultation-booking workflow
		calendlyUrl: '' // Deprecated: Use WORKWAY appointment-reminder workflow
	},

	// Ethics & Compliance
	disclaimer:
		'The information on this website is for general informational purposes only and does not constitute legal advice. No attorney-client relationship is formed by using this website or submitting a contact form. Prior results do not guarantee a similar outcome.',
	barAssociations: ['California State Bar', 'San Francisco Bar Association', 'American Bar Association'],

	// Statistics (animated counters)
	statistics: [
		{ label: 'Years Experience', value: 15, suffix: '+' },
		{ label: 'Cases Won', value: 2500, suffix: '+' },
		{ label: 'Client Satisfaction', value: 98, suffix: '%' },
		{ label: 'Recovered', value: 50, prefix: '$', suffix: 'M+' }
	],

	// Testimonials
	testimonials: [
		{
			quote: 'Sarah Morrison and her team guided us through one of the most difficult times in our lives. Her expertise in family law and compassionate approach made all the difference.',
			author: 'Former Client',
			title: 'Family Law Matter',
			rating: 5
		},
		{
			quote: 'After my accident, I was overwhelmed. James Chen handled everything professionally and secured a settlement that covered all my medical expenses and more.',
			author: 'Former Client',
			title: 'Personal Injury Case',
			rating: 5
		},
		{
			quote: 'The business litigation team at Morrison & Associates protected our company interests while keeping costs reasonable. Highly recommend.',
			author: 'Former Client',
			title: 'Business Litigation',
			rating: 5
		},
		{
			quote: 'Clear communication throughout the entire process. They explained every step and were always available to answer my questions.',
			author: 'Former Client',
			title: 'Divorce Proceedings',
			rating: 5
		}
	],

	// FAQ
	faq: [
		{
			question: 'How much does a consultation cost?',
			answer: 'We offer a free initial consultation for all new clients. During this meeting, we will discuss your situation, explain your options, and outline potential strategies. There is no obligation to retain our services after the consultation.'
		},
		{
			question: 'How long will my case take?',
			answer: 'Every case is unique, and timelines vary based on complexity, court schedules, and whether matters can be resolved through negotiation or require trial. During your consultation, we can provide a realistic estimate based on your specific circumstances.'
		},
		{
			question: 'What are your fees?',
			answer: 'We offer flexible fee arrangements depending on the type of case. Personal injury cases are typically handled on contingency (no fee unless we win). Family law and business matters may be billed hourly or on a flat-fee basis. We discuss all fees transparently during your initial consultation.'
		},
		{
			question: 'Do I have a case?',
			answer: 'The best way to determine if you have a viable case is to schedule a free consultation. Our attorneys will review your situation, assess the relevant facts, and provide an honest evaluation of your options.'
		},
		{
			question: 'Can I handle my legal matter without an attorney?',
			answer: 'While you have the right to represent yourself, legal matters often involve complex procedures and deadlines. An experienced attorney can protect your rights, avoid costly mistakes, and often achieve better outcomes. We are happy to discuss whether professional representation makes sense for your situation.'
		}
	]
};
