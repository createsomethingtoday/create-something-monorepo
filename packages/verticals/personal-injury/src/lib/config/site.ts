/**
 * Personal Injury Law Firm Site Configuration
 *
 * Voice: Urgent but trustworthy. Results-focused. Compassionate.
 * Structure: 24/7 availability prominent, contingency clear, results visible.
 *
 * WORKWAY Integration:
 * - PI Intake to Clio: /api/intake → WORKWAY → Clio contact + matter
 * - Case Screening: Auto-qualify based on severity, fault, statute
 * - Hot Lead Alert: Severe/catastrophic → Slack notification
 */

// Injury severity levels for case screening
export type InjurySeverity =
	| 'minor' // Soft tissue, no treatment
	| 'moderate' // ER visit, some treatment
	| 'serious' // Hospital stay, ongoing treatment
	| 'severe' // Surgery, permanent impairment
	| 'catastrophic'; // TBI, paralysis, wrongful death

// Types
export interface Education {
	school: string;
	degree: string;
	year: number;
}

export interface Attorney {
	slug: string;
	name: string;
	title: string; // "Founding Partner", "Associate"
	barNumber: string; // "CA Bar #123456"
	admittedStates: string[];
	education: Education[];
	practiceAreas: string[]; // accident type slugs
	image: string;
	bio: string;
}

// Accident/Case types specific to PI
export interface AccidentType {
	slug: string;
	name: string;
	description: string;
	icon: string; // Lucide icon name
	averageSettlement?: string; // e.g., "$50,000 - $500,000"
	statuteOfLimitations?: string; // e.g., "2 years in California"
	commonInjuries?: string[];
	keyFactors?: string[]; // What makes these cases strong
}

// Settlement/Verdict result
export interface RecoveryResult {
	title: string; // "Multi-Vehicle Highway Collision"
	accidentType: string; // slug
	recoveryAmount: number; // 2300000 (for sorting/display)
	recoveryDisplay: string; // "$2.3 Million Settlement"
	year: number;
	description: string;
	injuryType?: string; // "Traumatic Brain Injury"
	resolution: 'settlement' | 'verdict';
	// NO client names - ethics compliance
}

// Case screening configuration
export interface CaseScreeningConfig {
	// Minimum criteria for qualified lead
	minimumCriteria: {
		hasAtFaultParty: boolean; // Must have someone to sue
		withinStatute: boolean; // Within statute of limitations
		minimumSeverity: InjurySeverity; // At least 'moderate'
	};
	// Auto-decline reasons (still contact, but flag)
	autoDeclineReasons: string[]; // ['no-fault', 'statute-expired', 'minor-injury-only']
	// Hot lead triggers (immediate Slack alert)
	hotLeadTriggers: {
		severityThreshold: InjurySeverity; // 'severe' or 'catastrophic'
		accidentTypes: string[]; // ['wrongful-death', 'commercial-truck']
	};
}

// Contingency fee configuration
export interface ContingencyFeeConfig {
	standardRate: string; // "33.3%"
	trialRate?: string; // "40% if case goes to trial"
	noWinNoFee: boolean; // Always true for PI
	explanation: string; // "You pay nothing unless..."
}

// Enhanced workflow config for PI
export interface PIWorkflowConfig {
	clioIntakeWebhook?: string; // WORKWAY PI Intake → Clio
	slackUrgentChannel?: string; // #urgent-cases
	slackNewLeadChannel?: string; // #new-leads
	calendlyUrl?: string; // Free case review scheduling
	autoScreening: boolean; // Enable auto-qualify/decline
}

// Main config interface
export interface PersonalInjuryConfig {
	// Identity
	name: string;
	tagline: string; // "Maximum Compensation. No Fee Unless We Win."
	description: string;

	// Contact - 24/7 emphasis
	email: string;
	phone: string; // Primary number
	emergencyPhone?: string; // 24/7 hotline (can be same)
	available24_7: boolean; // Display 24/7 badge

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
		facebook?: string; // PI firms often use FB
		youtube?: string; // Video testimonials
	};

	// SEO
	url: string;
	locale: string;

	// Hero
	hero: {
		image: string;
		alt: string;
		headline?: string; // Override default
		subheadline?: string;
	};

	// Accident Types (replaces practiceAreas)
	accidentTypes: AccidentType[];

	// Attorneys
	attorneys: Attorney[];

	// Recovery Results (replaces results)
	recoveries: RecoveryResult[];

	// About the Firm
	firm: {
		headline: string;
		philosophy: string;
		values: string[];
		founded: number;
		totalRecovered?: string; // "$500M+ Recovered"
		casesWon?: number;
	};

	// Contingency Fee
	contingencyFee: ContingencyFeeConfig;

	// Case Screening
	screening: CaseScreeningConfig;

	// Workflows
	workflows: PIWorkflowConfig;

	// Ethics & Compliance
	disclaimer: string;
	barAssociations: string[];

	// Recognition
	recognition?: {
		award: string;
		year: number;
	}[];

	// Statistics (animated counters)
	statistics: {
		label: string;
		value: number;
		suffix?: string;
		prefix?: string;
	}[];

	// Testimonials
	testimonials: {
		quote: string;
		author: string; // First name only or "Former Client"
		caseType?: string; // "Auto Accident"
		rating?: number;
		image?: string;
	}[];

	// PI-specific FAQs
	faq: {
		question: string;
		answer: string;
		category?: 'fees' | 'process' | 'timeline' | 'general';
	}[];
}

/**
 * Demo Configuration: Martinez & Rivera Personal Injury Law
 * A fictional San Diego PI boutique firm
 * Images: Generated via Cloudflare Workers AI (Flux)
 */
export const siteConfig: PersonalInjuryConfig = {
	// Identity
	name: 'Martinez & Rivera',
	tagline: 'Maximum Compensation. No Fee Unless We Win.',
	description:
		'San Diego personal injury attorneys fighting for accident victims since 2008. $500M+ recovered for our clients.',

	// Contact - 24/7
	email: 'contact@martinezrivera.example',
	phone: '(619) 555-HURT',
	emergencyPhone: '(619) 555-HURT',
	available24_7: true,

	address: {
		street: '501 West Broadway, Suite 1200',
		city: 'San Diego',
		state: 'CA',
		zip: '92101',
		country: 'US'
	},

	// Social
	social: {
		facebook: 'https://facebook.com/martinezriveralaw',
		youtube: 'https://youtube.com/@martinezriveralaw',
		linkedin: 'https://linkedin.com/company/martinezriveralaw'
	},

	// SEO
	url: 'https://martinezrivera.example',
	locale: 'en_US',

	// Hero
	hero: {
		image: '/images/hero-justice.jpg',
		alt: 'San Diego skyline with scales of justice'
	},

	// Accident Types
	accidentTypes: [
		{
			slug: 'auto-accident',
			name: 'Car Accidents',
			description:
				'Collisions caused by distracted, drunk, or reckless drivers. We fight for maximum compensation for your injuries.',
			icon: 'car',
			averageSettlement: '$50,000 - $500,000',
			statuteOfLimitations: '2 years in California',
			commonInjuries: ['Whiplash', 'Back injuries', 'Broken bones', 'Traumatic brain injury'],
			keyFactors: ['Clear liability', 'Documented injuries', 'Insurance coverage']
		},
		{
			slug: 'commercial-truck',
			name: 'Truck Accidents',
			description:
				'18-wheelers and commercial vehicles cause catastrophic injuries. Multiple parties may be liable.',
			icon: 'truck',
			averageSettlement: '$100,000 - $2,000,000+',
			statuteOfLimitations: '2 years',
			commonInjuries: ['Spinal cord injuries', 'Amputations', 'Fatal injuries', 'Burns'],
			keyFactors: ['Driver logs', 'Maintenance records', 'Company negligence']
		},
		{
			slug: 'motorcycle',
			name: 'Motorcycle Accidents',
			description:
				'Riders face unique risks and deserve specialized representation. We understand motorcycle law.',
			icon: 'bike',
			averageSettlement: '$75,000 - $750,000',
			statuteOfLimitations: '2 years',
			commonInjuries: ['Road rash', 'Broken bones', 'Head injuries', 'Spinal injuries']
		},
		{
			slug: 'premises-liability',
			name: 'Slip & Fall',
			description:
				'Property owners must maintain safe conditions for visitors. Negligence has consequences.',
			icon: 'building',
			averageSettlement: '$25,000 - $300,000',
			statuteOfLimitations: '2 years',
			commonInjuries: ['Broken hips', 'Head injuries', 'Back injuries', 'Wrist fractures']
		},
		{
			slug: 'wrongful-death',
			name: 'Wrongful Death',
			description:
				'Compassionate representation for families who lost loved ones due to negligence.',
			icon: 'heart',
			averageSettlement: '$500,000 - $5,000,000+',
			statuteOfLimitations: '2 years from date of death',
			keyFactors: ['Lost income', 'Loss of consortium', 'Funeral expenses', 'Pain and suffering']
		},
		{
			slug: 'medical-malpractice',
			name: 'Medical Malpractice',
			description:
				'When healthcare providers fail to meet the standard of care, patients suffer. We hold them accountable.',
			icon: 'stethoscope',
			averageSettlement: '$250,000 - $2,000,000+',
			statuteOfLimitations: '1 year from discovery, 3 years max',
			commonInjuries: ['Surgical errors', 'Misdiagnosis', 'Birth injuries', 'Medication errors']
		}
	],

	// Attorneys
	attorneys: [
		{
			slug: 'carlos-martinez',
			name: 'Carlos Martinez',
			title: 'Founding Partner',
			barNumber: 'CA Bar #198765',
			admittedStates: ['California', 'Arizona'],
			education: [
				{ school: 'UCLA School of Law', degree: 'J.D.', year: 2003 },
				{ school: 'San Diego State University', degree: 'B.A. Criminal Justice', year: 2000 }
			],
			practiceAreas: ['commercial-truck', 'wrongful-death', 'auto-accident'],
			image: '/images/attorney-martinez.jpg',
			bio: "Carlos has dedicated his career to fighting for injury victims. He has recovered over $250 million for his clients and is recognized as one of California's top trial lawyers. A former insurance defense attorney, Carlos knows how the other side thinks."
		},
		{
			slug: 'elena-rivera',
			name: 'Elena Rivera',
			title: 'Managing Partner',
			barNumber: 'CA Bar #212345',
			admittedStates: ['California'],
			education: [
				{ school: 'Stanford Law School', degree: 'J.D.', year: 2008 },
				{ school: 'UC San Diego', degree: 'B.S. Biology', year: 2005 }
			],
			practiceAreas: ['medical-malpractice', 'auto-accident'],
			image: '/images/attorney-rivera.jpg',
			bio: 'Elena brings a scientific background to medical malpractice cases. Her pre-law biology degree and attention to detail have resulted in numerous seven-figure settlements. She is passionate about holding healthcare providers accountable.'
		},
		{
			slug: 'marcus-johnson',
			name: 'Marcus Johnson',
			title: 'Senior Associate',
			barNumber: 'CA Bar #287654',
			admittedStates: ['California'],
			education: [
				{ school: 'UC Hastings College of Law', degree: 'J.D.', year: 2015 },
				{ school: 'Howard University', degree: 'B.A. Political Science', year: 2012 }
			],
			practiceAreas: ['motorcycle', 'premises-liability'],
			image: '/images/attorney-johnson.jpg',
			bio: 'Marcus is an avid motorcycle rider who understands the unique challenges riders face. He has recovered millions for injured motorcyclists and is known for his aggressive litigation style.'
		}
	],

	// Recovery Results
	recoveries: [
		{
			title: 'Commercial Truck Collision',
			accidentType: 'commercial-truck',
			recoveryAmount: 4200000,
			recoveryDisplay: '$4.2 Million Settlement',
			year: 2024,
			description:
				'Family severely injured when 18-wheeler jackknifed on I-5. Settlement covered lifetime medical care, lost income, and pain and suffering.',
			injuryType: 'Spinal cord injury, multiple fractures',
			resolution: 'settlement'
		},
		{
			title: 'Surgical Error',
			accidentType: 'medical-malpractice',
			recoveryAmount: 2850000,
			recoveryDisplay: '$2.85 Million Verdict',
			year: 2024,
			description:
				'Surgeon left instrument inside patient during routine procedure, requiring multiple corrective surgeries and causing permanent damage.',
			injuryType: 'Internal injuries, chronic pain',
			resolution: 'verdict'
		},
		{
			title: 'Drunk Driver Head-On Collision',
			accidentType: 'auto-accident',
			recoveryAmount: 1750000,
			recoveryDisplay: '$1.75 Million Settlement',
			year: 2023,
			description:
				'Young professional suffered traumatic brain injury when drunk driver crossed median. Settlement included future medical care and lost earning capacity.',
			injuryType: 'Traumatic brain injury',
			resolution: 'settlement'
		},
		{
			title: 'Wrongful Death - Pedestrian',
			accidentType: 'wrongful-death',
			recoveryAmount: 3100000,
			recoveryDisplay: '$3.1 Million Settlement',
			year: 2023,
			description:
				'Father of three killed by distracted driver while crossing in crosswalk. Settlement provided for family and children education.',
			resolution: 'settlement'
		},
		{
			title: 'Motorcycle vs. Commercial Vehicle',
			accidentType: 'motorcycle',
			recoveryAmount: 950000,
			recoveryDisplay: '$950,000 Settlement',
			year: 2023,
			description:
				'Experienced rider hit by delivery truck making illegal turn. Multiple orthopedic surgeries required.',
			injuryType: 'Multiple fractures, road rash',
			resolution: 'settlement'
		},
		{
			title: 'Grocery Store Slip & Fall',
			accidentType: 'premises-liability',
			recoveryAmount: 425000,
			recoveryDisplay: '$425,000 Settlement',
			year: 2024,
			description:
				'Elderly customer fell on wet floor with no warning signs. Hip fracture required surgery and extensive rehabilitation.',
			injuryType: 'Hip fracture',
			resolution: 'settlement'
		}
	],

	// Firm
	firm: {
		headline: 'Fighting for San Diego Injury Victims Since 2008',
		philosophy:
			"We believe injured people deserve aggressive, compassionate representation. The insurance companies have teams of lawyers—you deserve a team too. We don't get paid unless you win, so our interests are aligned with yours.",
		values: [
			'Aggressive Advocacy',
			'Compassionate Service',
			'No Fee Unless We Win',
			'Results-Driven'
		],
		founded: 2008,
		totalRecovered: '$500M+',
		casesWon: 5000
	},

	// Contingency Fee
	contingencyFee: {
		standardRate: '33.3%',
		trialRate: '40%',
		noWinNoFee: true,
		explanation:
			"You pay nothing upfront—ever. We advance all costs and only get paid if we win your case. Our fee comes from the recovery, never from your pocket. If we don't win, you owe us nothing."
	},

	// Case Screening
	screening: {
		minimumCriteria: {
			hasAtFaultParty: true,
			withinStatute: true,
			minimumSeverity: 'moderate'
		},
		autoDeclineReasons: ['no-fault', 'statute-expired', 'minor-injury-only'],
		hotLeadTriggers: {
			severityThreshold: 'severe',
			accidentTypes: ['wrongful-death', 'commercial-truck', 'medical-malpractice']
		}
	},

	// Workflows
	workflows: {
		clioIntakeWebhook: '', // Configure with WORKWAY URL
		slackUrgentChannel: '#urgent-cases',
		slackNewLeadChannel: '#new-leads',
		calendlyUrl: '', // Configure with Calendly URL
		autoScreening: true
	},

	// Ethics & Compliance
	disclaimer:
		'Past results do not guarantee future outcomes. Each case is unique and must be evaluated on its own merits. This website is for informational purposes only and does not constitute legal advice. Contacting our firm does not create an attorney-client relationship until a written agreement is signed.',
	barAssociations: [
		'California State Bar',
		'San Diego County Bar Association',
		'American Association for Justice',
		'Consumer Attorneys of San Diego'
	],

	// Recognition
	recognition: [
		{ award: 'Super Lawyers - Rising Star', year: 2020 },
		{ award: 'Best Lawyers in America', year: 2023 },
		{ award: 'Top 100 Trial Lawyers', year: 2024 }
	],

	// Statistics
	statistics: [
		{ label: 'Years Experience', value: 16, suffix: '+' },
		{ label: 'Cases Won', value: 5000, suffix: '+' },
		{ label: 'Total Recovered', value: 500, prefix: '$', suffix: 'M+' },
		{ label: 'Success Rate', value: 98, suffix: '%' }
	],

	// Testimonials
	testimonials: [
		{
			quote: "After my truck accident, I was overwhelmed and didn't know where to turn. Martinez & Rivera took over and fought for me every step of the way. They got me $1.2 million when the insurance company offered $50,000.",
			author: 'Michael',
			caseType: 'Truck Accident',
			rating: 5
		},
		{
			quote: 'Elena Rivera is brilliant. Her medical background made all the difference in my malpractice case. She understood the medicine and translated it for the jury.',
			author: 'Sarah',
			caseType: 'Medical Malpractice',
			rating: 5
		},
		{
			quote: "They treated me like family, not just another case. Carlos personally called me every week with updates. I can't recommend them enough.",
			author: 'Roberto',
			caseType: 'Car Accident',
			rating: 5
		},
		{
			quote: 'As a fellow rider, Marcus understood exactly what I was going through. He fought hard and got me the compensation I needed to recover.',
			author: 'David',
			caseType: 'Motorcycle Accident',
			rating: 5
		}
	],

	// FAQ
	faq: [
		{
			question: 'How much does a consultation cost?',
			answer:
				'Nothing. Your initial case review is completely free, with no obligation. We only get paid if we win your case—period.',
			category: 'fees'
		},
		{
			question: "What if I can't afford a lawyer?",
			answer:
				"That's the beauty of contingency fees—you don't pay anything upfront. We advance all costs (expert witnesses, court fees, etc.) and our fee comes from the settlement or verdict. If we don't win, you owe us nothing.",
			category: 'fees'
		},
		{
			question: 'What is the contingency fee?',
			answer:
				'Our standard fee is 33.3% of the recovery. If your case goes to trial, the fee is 40% due to the additional work involved. You never pay anything out of pocket.',
			category: 'fees'
		},
		{
			question: 'How long do I have to file a claim?',
			answer:
				'In California, most personal injury claims must be filed within 2 years of the accident. Medical malpractice has special rules (1 year from discovery, 3 years max). Some cases have even shorter deadlines. Contact us immediately to protect your rights.',
			category: 'process'
		},
		{
			question: 'What is my case worth?',
			answer:
				'Every case is different. Value depends on injury severity, medical expenses, lost wages, pain and suffering, and who was at fault. We can give you an honest estimate after reviewing your case—no obligation.',
			category: 'general'
		},
		{
			question: 'How long will my case take?',
			answer:
				'Simple cases may settle in 3-6 months. Complex cases with serious injuries can take 1-2 years or more. We work efficiently but never rush a case that deserves more time.',
			category: 'timeline'
		},
		{
			question: 'Should I talk to the insurance company?',
			answer:
				'No. Insurance adjusters are trained to minimize payouts. Anything you say can be used against you. Contact us first, and we will handle all communication with the insurance companies.',
			category: 'process'
		},
		{
			question: 'What if the accident was partially my fault?',
			answer:
				'California follows "comparative negligence" rules. You can still recover damages even if you were partially at fault, though your recovery may be reduced by your percentage of fault. We can evaluate your situation.',
			category: 'general'
		}
	]
};

export type { PersonalInjuryConfig };
