/**
 * Law Firm Site Configuration
 *
 * Voice: Bold, confident, modern. Precision over platitudes.
 * Structure: Editorial design, trust through outcomes, ethics visible.
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
	title: string;
	barNumber: string;
	admittedStates: string[];
	education: Education[];
	practiceAreas: string[];
	image: string;
	bio: string;
	quote?: string;
}

export interface PracticeArea {
	slug: string;
	name: string;
	description: string;
	number: string; // "01", "02", etc.
}

export interface CaseResult {
	title: string;
	practiceArea: string;
	outcome: string;
	date: string;
	client: string;
	tag: string;
}

export interface WorkflowConfig {
	consultationBooking?: string;
	followUp?: string;
	appointmentReminder?: string;
	clioIntakeWebhook?: string;
	calendlyUrl?: string;
}

export interface Partner {
	name: string;
}

export interface LawFirmConfig {
	// Identity
	name: string;
	tagline: string;
	description: string;
	location: string;

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
		headline: string[];
		subtext: string;
	};

	// Partners / Credibility
	partners: Partner[];

	// Practice Areas
	practiceAreas: PracticeArea[];

	// Attorneys (Managing Partner featured)
	attorneys: Attorney[];
	managingPartner: Attorney;

	// Case Results (Recent Wins)
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

	// Footer links
	footerLinks: {
		label: string;
		href: string;
	}[];
}

/**
 * Demo Configuration: Vanguard Law Practice
 * A boutique NYC law firm with bold, modern positioning
 */
export const siteConfig: LawFirmConfig = {
	// Identity
	name: 'Vanguard',
	tagline: 'Redefining Legal Excellence',
	description:
		'A modern practice built on the foundations of precision, integrity, and uncompromising strategy. We don\'t just practice law; we architect solutions.',
	location: 'Boutique Legal Firm / NYC',

	// Contact
	email: 'contact@vanguardlaw.example',
	phone: '+1 (212) 555-0198',
	address: {
		street: '5th Avenue',
		city: 'New York City',
		state: 'NY',
		zip: '10001',
		country: 'US'
	},

	// Social
	social: {
		linkedin: 'https://linkedin.com/company/vanguard-law'
	},

	// SEO
	url: 'https://vanguardlaw.example',
	locale: 'en_US',

	// Hero
	hero: {
		image: '/images/hero-office.jpg',
		alt: 'Monochrome architectural shot of modern pillars and glass',
		headline: ['REDEFINING', 'LEGAL', 'EXCELLENCE.'],
		subtext:
			'A modern practice built on the foundations of precision, integrity, and uncompromising strategy. We don\'t just practice law; we architect solutions.'
	},

	// Partners / Credibility Badges
	partners: [
		{ name: 'Forbes Legal' },
		{ name: 'Chambers & Partners' },
		{ name: 'Martindale-Hubbell' },
		{ name: 'Super Lawyers' }
	],

	// Practice Areas
	practiceAreas: [
		{
			slug: 'corporate-governance',
			name: 'Corporate Governance',
			description: 'Navigating complex regulatory landscapes for Fortune 500 entities.',
			number: '01'
		},
		{
			slug: 'intellectual-property',
			name: 'Intellectual Property',
			description: 'Protecting the intangible assets that define your competitive edge.',
			number: '02'
		},
		{
			slug: 'digital-commerce',
			name: 'Digital Commerce',
			description: 'Modern legal structures for the evolving global fintech economy.',
			number: '03'
		},
		{
			slug: 'dispute-resolution',
			name: 'Dispute Resolution',
			description: 'Elite litigation strategies to protect your commercial interests.',
			number: '04'
		}
	],

	// Managing Partner (Featured)
	managingPartner: {
		slug: 'julian-thorne',
		name: 'Julian Thorne',
		title: 'Managing Partner',
		barNumber: 'NY Bar #4567890',
		admittedStates: ['New York', 'Delaware', 'District of Columbia'],
		education: [
			{ school: 'Columbia Law School', degree: 'J.D.', year: 1998 },
			{ school: 'Yale University', degree: 'B.A. Economics', year: 1995 }
		],
		practiceAreas: ['corporate-governance', 'dispute-resolution'],
		image: '/images/attorney-morrison.jpg',
		bio: 'With over two decades of high-stakes litigation and boardroom advisory experience, Julian founded Vanguard to offer a more agile, intellectually rigorous approach to legal challenges.',
		quote: 'Precision is the highest form of law.'
	},

	// Attorneys
	attorneys: [
		{
			slug: 'julian-thorne',
			name: 'Julian Thorne',
			title: 'Managing Partner',
			barNumber: 'NY Bar #4567890',
			admittedStates: ['New York', 'Delaware', 'District of Columbia'],
			education: [
				{ school: 'Columbia Law School', degree: 'J.D.', year: 1998 },
				{ school: 'Yale University', degree: 'B.A. Economics', year: 1995 }
			],
			practiceAreas: ['corporate-governance', 'dispute-resolution'],
			image: '/images/attorney-morrison.jpg',
			bio: 'With over two decades of high-stakes litigation and boardroom advisory experience, Julian founded Vanguard to offer a more agile, intellectually rigorous approach to legal challenges.',
			quote: 'Precision is the highest form of law.'
		},
		{
			slug: 'victoria-chen',
			name: 'Victoria Chen',
			title: 'Partner',
			barNumber: 'NY Bar #5678901',
			admittedStates: ['New York', 'California'],
			education: [
				{ school: 'Stanford Law School', degree: 'J.D.', year: 2005 },
				{ school: 'MIT', degree: 'B.S. Computer Science', year: 2002 }
			],
			practiceAreas: ['intellectual-property', 'digital-commerce'],
			image: '/images/attorney-chen.jpg',
			bio: 'Victoria brings a unique blend of technical expertise and legal acumen to complex IP and fintech matters.'
		},
		{
			slug: 'marcus-rivera',
			name: 'Marcus Rivera',
			title: 'Partner',
			barNumber: 'NY Bar #6789012',
			admittedStates: ['New York', 'New Jersey'],
			education: [
				{ school: 'NYU School of Law', degree: 'J.D.', year: 2008 },
				{ school: 'Georgetown University', degree: 'B.A. Government', year: 2005 }
			],
			practiceAreas: ['corporate-governance', 'dispute-resolution'],
			image: '/images/attorney-gonzalez.jpg',
			bio: 'Marcus specializes in corporate governance and has represented clients in over $2 billion in M&A transactions.'
		}
	],

	// Recent Wins
	results: [
		{
			title: '$240M Merger Resolution',
			practiceArea: 'corporate-governance',
			outcome: 'Antitrust Clearance',
			date: 'October 2023',
			client: 'Lead Counsel for Tech Unicorn',
			tag: 'Antitrust Clearance'
		},
		{
			title: 'IP Defense Landmark Case',
			practiceArea: 'intellectual-property',
			outcome: 'Patent Retained',
			date: 'August 2023',
			client: 'Global Pharmaceutical Client',
			tag: 'Patent Retained'
		},
		{
			title: 'Real Estate Acquisition',
			practiceArea: 'corporate-governance',
			outcome: 'Closed $85M',
			date: 'June 2023',
			client: 'Downtown Manhattan Portfolio',
			tag: 'Closed $85M'
		}
	],

	// About the Firm
	firm: {
		headline: 'Our Approach',
		philosophy:
			'We believe the best legal counsel is invisible—anticipating problems before they arise, structuring deals that endure, and resolving disputes with surgical precision. Our clients don\'t just hire attorneys; they gain strategic partners.',
		values: [
			'Precision over volume',
			'Strategy over tactics',
			'Results over rhetoric',
			'Integrity always'
		],
		founded: 2001
	},

	// Workflow Integration
	workflows: {
		consultationBooking: 'consultation-booking',
		followUp: 'post-meeting-follow-up',
		appointmentReminder: 'appointment-reminder',
		clioIntakeWebhook: '',
		calendlyUrl: ''
	},

	// Ethics & Compliance
	disclaimer:
		'The information on this website is for general informational purposes only and does not constitute legal advice. No attorney-client relationship is formed by using this website or submitting a contact form. Prior results do not guarantee a similar outcome.',
	barAssociations: [
		'New York State Bar',
		'American Bar Association',
		'New York City Bar Association'
	],

	// Statistics
	statistics: [
		{ label: 'Years Experience', value: 24, suffix: '+' },
		{ label: 'Matters Closed', value: 800, suffix: '+' },
		{ label: 'Client Retention', value: 96, suffix: '%' },
		{ label: 'Total Recovered', value: 2.1, prefix: '$', suffix: 'B+' }
	],

	// Testimonials
	testimonials: [
		{
			quote:
				'Vanguard\'s approach to our merger was exceptional. They anticipated every regulatory hurdle and navigated us through seamlessly.',
			author: 'CEO',
			title: 'Fortune 500 Technology Company',
			rating: 5
		},
		{
			quote:
				'Julian and his team protected our intellectual property with the same rigor they would their own. Unmatched expertise.',
			author: 'General Counsel',
			title: 'Global Pharmaceutical',
			rating: 5
		},
		{
			quote:
				'Strategic, precise, and relentless. Vanguard doesn\'t just practice law—they architect outcomes.',
			author: 'Managing Director',
			title: 'Private Equity Firm',
			rating: 5
		}
	],

	// FAQ
	faq: [
		{
			question: 'What distinguishes Vanguard from larger firms?',
			answer:
				'We combine big-firm capability with boutique attention. Every matter is handled by senior partners, not delegated to junior associates. Our clients get direct access to the expertise they\'re paying for.'
		},
		{
			question: 'How does the initial consultation work?',
			answer:
				'We begin with a strategic conversation to understand your objectives and assess how we can add value. This initial evaluation is complimentary and confidential.'
		},
		{
			question: 'What are your fee structures?',
			answer:
				'We offer flexible arrangements including hourly, fixed-fee, and success-based structures depending on the nature of the engagement. Transparency in billing is fundamental to our practice.'
		},
		{
			question: 'Do you handle matters outside New York?',
			answer:
				'Yes. Our partners are admitted in multiple jurisdictions, and we maintain relationships with local counsel nationwide and internationally for complex cross-border matters.'
		}
	],

	// Footer Links
	footerLinks: [
		{ label: 'Privacy Policy', href: '/privacy' },
		{ label: 'Disclosures', href: '/terms' },
		{ label: 'LinkedIn', href: 'https://linkedin.com/company/vanguard-law' }
	]
};
