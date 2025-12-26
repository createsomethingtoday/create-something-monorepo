/**
 * Site Configuration - Medical Practice
 *
 * Voice: Professional, trustworthy, compassionate
 * Structure: Services first, team credibility, easy contact
 * Images: Generated via Cloudflare Workers AI (Flux)
 */

export const siteConfig = {
	// Practice Identity
	name: 'Practice Name',
	tagline: 'Compassionate Care, Advanced Medicine',
	description:
		'Family medicine and primary care serving the community since 2015. Accepting new patients.',

	// Hero
	hero: {
		image: '/images/hero-clinic.jpg',
		alt: 'Modern medical clinic waiting room'
	},

	// Contact
	email: 'contact@practicename.com',
	phone: '+1 (555) 123-4567',
	fax: '+1 (555) 123-4568',
	address: {
		street: '1234 Medical Plaza Drive, Suite 200',
		city: 'Seattle',
		state: 'WA',
		zip: '98101',
		country: 'US'
	},

	// Hours
	hours: {
		monday: '8:00 AM - 5:00 PM',
		tuesday: '8:00 AM - 5:00 PM',
		wednesday: '8:00 AM - 5:00 PM',
		thursday: '8:00 AM - 5:00 PM',
		friday: '8:00 AM - 4:00 PM',
		saturday: 'Closed',
		sunday: 'Closed'
	},

	// After hours
	afterHours: {
		enabled: true,
		phone: '+1 (555) 999-8888',
		note: 'For urgent medical needs after hours, call our answering service.'
	},

	// Social
	social: {
		facebook: 'https://facebook.com/practicename',
		linkedin: 'https://linkedin.com/company/practicename'
	},

	// SEO
	url: 'https://example.com',
	locale: 'en_US',

	// Services - Core medical offerings
	services: [
		{
			slug: 'primary-care',
			title: 'Primary Care',
			description: 'Comprehensive adult and pediatric primary care. Annual physicals, chronic disease management, preventive medicine.',
			icon: 'medical'
		},
		{
			slug: 'urgent-care',
			title: 'Urgent Care',
			description: 'Same-day appointments for acute illness and minor injuries. No appointment necessary.',
			icon: 'urgent'
		},
		{
			slug: 'womens-health',
			title: "Women's Health",
			description: 'Well-woman exams, contraception counseling, prenatal care coordination.',
			icon: 'health'
		},
		{
			slug: 'pediatrics',
			title: 'Pediatrics',
			description: 'Newborn through adolescent care. Well-child visits, immunizations, sports physicals.',
			icon: 'pediatric'
		},
		{
			slug: 'chronic-care',
			title: 'Chronic Disease Management',
			description: 'Diabetes, hypertension, asthma, COPD. Care coordination and monitoring.',
			icon: 'chronic'
		},
		{
			slug: 'preventive',
			title: 'Preventive Medicine',
			description: 'Screenings, immunizations, health risk assessments, lifestyle counseling.',
			icon: 'preventive'
		}
	],

	// Medical Team
	providers: [
		{
			name: 'Dr. Sarah Chen',
			role: 'Family Medicine Physician',
			credentials: 'MD, FAAFP',
			image: '/images/provider-chen.jpg',
			bio: 'Board certified in Family Medicine. University of Washington School of Medicine 2012. Residency at Swedish Medical Center.',
			specialties: ['Primary Care', 'Preventive Medicine', 'Chronic Disease Management'],
			languages: ['English', 'Mandarin']
		},
		{
			name: 'Dr. Michael Rodriguez',
			role: 'Internal Medicine Physician',
			credentials: 'MD, FACP',
			image: '/images/provider-rodriguez.jpg',
			bio: 'Board certified in Internal Medicine. UCSF School of Medicine 2010. Fellowship in Hospital Medicine.',
			specialties: ['Internal Medicine', 'Hospital Medicine', 'Geriatrics'],
			languages: ['English', 'Spanish']
		},
		{
			name: 'Jessica Thompson',
			role: 'Nurse Practitioner',
			credentials: 'ARNP, FNP-C',
			image: '/images/provider-thompson.jpg',
			bio: 'Family Nurse Practitioner. Seattle University 2015. Focus on pediatric and adolescent care.',
			specialties: ['Pediatrics', 'Adolescent Health', 'Immunizations'],
			languages: ['English']
		}
	],

	// Insurance
	insurance: {
		accepted: [
			'Aetna',
			'Blue Cross Blue Shield',
			'Cigna',
			'Humana',
			'Kaiser Permanente',
			'Medicare',
			'Medicaid',
			'Premera',
			'Regence',
			'UnitedHealthcare'
		],
		note: 'We participate with most major insurance plans. Please contact our office to verify coverage.'
	},

	// Booking
	booking: {
		enabled: true,
		url: 'https://calendly.com/practicename/appointment',
		phone: '+1 (555) 123-4567',
		note: 'Book online or call our scheduling team'
	},

	// Patient Portal
	patientPortal: {
		enabled: true,
		url: 'https://portal.example.com',
		features: [
			'View test results',
			'Request prescription refills',
			'Message your care team',
			'Schedule appointments',
			'Pay bills online'
		]
	},

	// New Patients
	newPatients: {
		accepting: true,
		note: 'We are currently accepting new patients with most insurance plans.',
		forms: []
	}
} as const;

export type SiteConfig = typeof siteConfig;
