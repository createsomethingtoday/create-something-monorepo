/**
 * Modern Med Site Configuration - Tufte Edition
 *
 * Voice: Clinical precision meets human warmth. Data-forward, trust-building.
 * Design: Tufte-inspired with serif headings, data visualizations, muted palette.
 */

export interface Physician {
	name: string;
	credentials: string;
	specialty: string;
	affiliation: string;
	focus: string;
	experience: number;
	fee: number;
	availability: 'Today' | 'Tomorrow' | string;
	image: string;
}

export interface Capability {
	name: string;
	description: string;
	icon: string;
	metric?: string;
	metricLabel?: string;
}

export interface MedicalPracticeConfig {
	name: string;
	tagline: string;
	description: string;

	// Contact
	phone: string;
	address: {
		street: string;
		suite: string;
		city: string;
		state: string;
		zip: string;
	};

	// Hours
	hours: {
		weekday: string;
		saturday: string;
		urgent: string;
	};

	// Hero
	hero: {
		headline: string;
		subheadline: string;
		ctaText: string;
		ctaSubtext: string;
		waitTime: string;
		satisfactionScore: string;
		satisfactionNote: string;
	};

	// Physicians
	physicians: Physician[];

	// Capabilities
	capabilities: Capability[];

	// Footer
	footer: {
		contactHeadline: string;
		contactDescription: string;
		links: { label: string; href: string }[];
	};
}

export const siteConfig: MedicalPracticeConfig = {
	name: 'Modern Med',
	tagline: 'Tufte Edition',
	description: 'Care that starts with a conversation.',

	phone: '(415) 555-0198',
	address: {
		street: '1200 Modern Med Plaza',
		suite: 'Suite 450',
		city: 'San Francisco',
		state: 'CA',
		zip: '94102'
	},

	hours: {
		weekday: 'Monday – Friday: 08:00 – 20:00',
		saturday: 'Saturday: 10:00 – 16:00',
		urgent: 'Urgent care portal open 24/7.'
	},

	hero: {
		headline: 'Care that starts with a conversation.',
		subheadline:
			"Medicine is complex, but being seen shouldn't be. We combine clinical rigor with time to listen, ensuring every treatment plan is as unique as your biology.",
		ctaText: 'VIEW CLINIC OUTCOMES',
		ctaSubtext: 'Last updated: Today at 8:00 AM based on 4,200 patient interactions.',
		waitTime: '8m',
		satisfactionScore: '4.9/5.0',
		satisfactionNote:
			'Rolling 12-month average showing consistent improvement in communication scores.'
	},

	physicians: [
		{
			name: 'Dr. Sarah Chen',
			credentials: 'MD',
			specialty: 'Cardiology',
			affiliation: 'Stanford Medicine',
			focus: 'Vascular Imaging',
			experience: 14,
			fee: 210,
			availability: 'Today',
			image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBealknldlb61u4UmiTE7-4FrMD8C_TSej_LpMe7BrIKJGmvulWuskc_8AH8rMmKP9_S4kc0gumVzy77a8GveuIZ95oIuZy4W9t1V8vIEg6xxTssRxdL64RXsnvQGWttjBkOqIjbqtGKnXTmuNsEHItXi_s4DjlKIOhs_AigTUbLee1AYplvQsB1kb-9ua1CYCgL3JW4lTfIjF5UINc2moZG-8wulpK74NVWTTL2Pz54o3nDW6J7DkHzCbt4nEnfDGoQka6NXLLI14'
		},
		{
			name: 'Dr. Marcus Thorne',
			credentials: 'MD',
			specialty: 'Neurology',
			affiliation: 'Johns Hopkins',
			focus: 'Sleep Disorders',
			experience: 18,
			fee: 245,
			availability: 'Wed',
			image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDT6CWPdA3Bo7Unr1_XKGNypkpnv_XdHO8T47wYS5X1ZwrHnsKOvkeQ9J25sjkDOaoTiBueLDrRJowTa6ARnRn7qQ0B11lCD21Hn4BXtYOBtH4HvN6lntjj4ePuLkDh08uySz3Xp4Oo3NH4aFGorKpo1p8TyaSKYuZS7_Z0m0ATDj6rHPAVY24er3ATdwWFaXICh2e2hBF1Lr_WkuPaAaLVnuLCfW2xuHkGl2OE8B_MFYkPX4HtGRN6xouJ78Aj2beElFQAQs-H_Xw'
		},
		{
			name: 'Dr. Elena Rodriguez',
			credentials: 'MD',
			specialty: 'Pediatrics',
			affiliation: 'Harvard Medical',
			focus: 'Early Development',
			experience: 9,
			fee: 180,
			availability: 'Tomorrow',
			image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCt_Pn68Wl1PUqFX2AmVaSVaqrrTgSW9Wvr_YYGJ114bxCNS2s_o70aX4LpKKlwzwnLLmWl0t2CFhWc0QV5kAb567e871NejY889Pnxnwu4EM9_QOxpDTbOcd0cYejrpu-ZnMtliD-MceqgKlmJTtLAcFAD4bv5jA6kDGWq9ocNWpdpIVGB5eljonlcRXfkQ6CyFtkkCE5dWYFuEmdOErJJ36NFlFNYpPGt5hx5i0hRhOU-6DbRf5wKiHzz3UMXcn_33LJVXORdWvw'
		},
		{
			name: 'Dr. James Wilson',
			credentials: 'DO',
			specialty: 'Internal Medicine',
			affiliation: 'UCSF',
			focus: 'Metabolic Health',
			experience: 21,
			fee: 195,
			availability: 'Today',
			image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVJ-lpdyhk_tRFXfaiFPYkbd0SJ7S05M1jgvAS7wYogk6CbaITP_ULz27pQnn3m8hj827W0xbq0ogfGNgpet8U4WxGnuBaL8jPO7MzdZJdsHXG62D6ix2FRuiseDRjU1qsgXPrupi4jHCHiMKg-9V6CUhNxc1AoBqXv1FCctXqKkgLGIn0-sATTb76ayD2tRduMv3pO1JXilRmlwdYbuylbz3LG-ga0KuQnmh9gC62pV74Ksl4PboY7MfWNT-amMZlCh_VIIvbhCc'
		}
	],

	capabilities: [
		{
			name: 'Precise Diagnostics',
			description: 'In-house pathology and imaging. 94% of results are delivered within 24 hours.',
			icon: 'biotech',
			metric: '94%',
			metricLabel: 'Speed-to-Result Target'
		},
		{
			name: 'Remote Care',
			description: 'Secure video consultations for follow-ups and chronic management.',
			icon: 'schedule'
		},
		{
			name: 'Modern Surgery',
			description:
				'Minimally invasive techniques with 40% faster recovery times than standard protocol.',
			icon: 'precision_manufacturing',
			metric: '0.40',
			metricLabel: 'REL_EFFICIENCY'
		},
		{
			name: 'Longevity Plans',
			description: 'Proactive health tracking focused on healthspan and preventative screenings.',
			icon: 'monitoring',
			metric: '82.4',
			metricLabel: 'Avg. Patient Bio-Age'
		}
	],

	footer: {
		contactHeadline: 'Direct Inquiries',
		contactDescription:
			'We avoid automated phone trees. When you message us, a clinical coordinator reviews your note within two hours during business hours.',
		links: [
			{ label: 'Privacy & Ethics', href: '#' },
			{ label: 'Data Transparency', href: '#' },
			{ label: 'Institutional Billing', href: '#' },
			{ label: 'Clinical Trials', href: '#' },
			{ label: 'Faculty Login', href: '#' },
			{ label: 'Press Kit', href: '#' }
		]
	}
};
