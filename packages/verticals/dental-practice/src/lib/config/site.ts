/**
 * Modern Dental Practice Site Configuration
 *
 * Voice: Warm, professional, reassuring. Clinical excellence meets human comfort.
 * Design: Clean, modern, teal primary color scheme.
 */

export interface Service {
	name: string;
	description: string;
	icon: string;
}

export interface Testimonial {
	quote: string;
	author: string;
	title: string;
	image: string;
	rating: number;
}

export interface DentalPracticeConfig {
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
	};

	// SEO
	url: string;

	// Hero
	hero: {
		eyebrow: string;
		headline: string;
		highlightWord: string;
		subheadline: string;
		image: string;
		imageAlt: string;
		testimonial: {
			quote: string;
			author: string;
		};
		stats: {
			rating: string;
			count: string;
		};
	};

	// Services
	services: Service[];

	// Testimonials
	testimonials: Testimonial[];

	// CTA
	cta: {
		headline: string;
		subheadline: string;
	};

	// Footer
	footer: {
		tagline: string;
		links: {
			explore: { label: string; href: string }[];
			contact: { icon: string; text: string }[];
		};
		newsletter: {
			headline: string;
			description: string;
		};
	};
}

export const siteConfig: DentalPracticeConfig = {
	// Identity
	name: 'Modern Dental',
	tagline: 'Excellence in Care',
	description:
		'Experience modern dentistry where high-tech clinical excellence meets personalized patient comfort.',

	// Contact
	email: 'hello@moderndental.example',
	phone: '(555) 123-4567',
	address: {
		street: '123 Medical Plaza Drive, Suite 400',
		city: 'Modern City',
		state: 'NY',
		zip: '10001'
	},

	// SEO
	url: 'https://moderndental.example',

	// Hero
	hero: {
		eyebrow: 'Excellence in Care',
		headline: 'Your',
		highlightWord: 'Smile',
		subheadline:
			'Experience modern dentistry where high-tech clinical excellence meets personalized patient comfort.',
		image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxCyhvuiyjc32FH_32V3yz22BmBTgKRLNXqDZxkk5oXEnjlibAn193QfgjCPI1LvfhFDFuIBcy7ElTHBCM9C24DLQCBXzAC5C8Wi9kjp_AdaRXQqnVpJHrwhVfe0-b1kx3klY-ep4nEAsdu3VgP5SJW9R83ojuoLR46CntaF9pYDGPGGeefYZGvNrntqy_vApsR_XGdolVHx51cyHi2EGYMT_AuvZOSkIjFgFZqjz5yF8GlCDGPIf9OL58zk1jZnkG2m6xiC3Am9wa',
		imageAlt: 'Close up of a person with a bright, healthy smile',
		testimonial: {
			quote:
				"The most painless and professional dental experience I've ever had. Highly recommended!",
			author: 'Sarah J., Patient'
		},
		stats: {
			rating: '4.9/5 Rating',
			count: 'From 2,000+ happy patients'
		}
	},

	// Services
	services: [
		{
			name: 'General Dentistry',
			description:
				'Maintaining your oral health with routine cleanings, fillings, and preventive checkups.',
			icon: 'dentistry'
		},
		{
			name: 'Cosmetic Dental',
			description:
				'Transform your appearance with veneers, whitening, and aesthetic bonding.',
			icon: 'auto_fix_high'
		},
		{
			name: 'Orthodontics',
			description:
				'Straighten your smile discreetly with Invisalign and precision orthodontic care.',
			icon: 'align_horizontal_center'
		},
		{
			name: 'Emergency Care',
			description:
				'Same-day appointments for urgent dental issues, pain relief, and accidents.',
			icon: 'emergency'
		}
	],

	// Testimonials
	testimonials: [
		{
			quote:
				"The team here is incredible. I've always had dental anxiety, but they made me feel so at ease. My new veneers look completely natural!",
			author: 'Emma Wilson',
			title: 'Interior Designer',
			image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwa3solVlnnOWJBQgxOazZQXgqLQNSiTnW68nOPYMj_pyP6Aomm0P2HOh1Vw1U6uIqGpGYErAmfMvJzQkCxn3btkmM9Et6ccRIkavkV4BtH5PNqLWOvAUWH-aPhO2ZpYSEMaLbZpfin85nMPsr9pyrocVIoblteGWnleACl3sBZ-3TRhSdt21EGQN30_jIDs19w0k0QEB-_BPp0FjJvCMHR4TyM5xkJoIZe7qlNs2aIhf0R09KRdlxhEoAAOMfW--TlI_P4BTR48Cs',
			rating: 5
		},
		{
			quote:
				'Finally found a dentist that uses modern technology. The 3D imaging made the whole implant process so clear and transparent.',
			author: 'James Miller',
			title: 'Tech Lead',
			image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCtA9Z6gPz3lWWxOvA_2_ikf21f-CixJl7iSSMjupM-mn8QCDad3dMX3kOBpnRPKH6NPiJ5uthMPgwur7WBl04fLSpfDGoK4uPpm_hicpQxhi9sue_hnfGzFTQ3tmANkU06uKbY2lkcKBTtc7gN-GlY1Uf8eyFHewK7HkhcvJ4Kw2nJI6J2JjG17PULd8XGM-enAgrbh_NNYyXYNriPSMPpWLNzui-iR-RzICl27aWIilzJ1Y9Ds5S4iGSXOk8p8P91celsOqP_BYu',
			rating: 5
		},
		{
			quote:
				'Emergency appointment was handled with such care. They saw me within an hour and fixed my chipped tooth perfectly.',
			author: 'Sophia Garcia',
			title: 'Marketing Manager',
			image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGYo_vmhuO2M0zTL8qM1Rboz23w3aIu04Km3GNl3SmFygbqvPfWtIqRUTLNdSdSRYd86lGtbYJmL2hpdo6355FOmWaeiafT7pvWsZXnYl-lLUmNT14FJ5JDzIFwPnsCZmzWNZIx_J8i9YXicmtCy0mUcpr1i0cdqBTf8oRR7gT9pRnX6LSTp_C3hynQnwungbPEtqOYBrs_Vw9pq1EcE-pMs9IvwOOqnTC9_qdZ7FBIH1Ww3vXWBphsXtDagHeQIk9tTO5gr7SkExx',
			rating: 5
		}
	],

	// CTA
	cta: {
		headline: 'Ready for your transformation?',
		subheadline:
			'Join our family of happy patients and start your journey to a more confident smile today.'
	},

	// Footer
	footer: {
		tagline:
			"Where clinical mastery meets human warmth. We're dedicated to redefining the dental experience for everyone.",
		links: {
			explore: [
				{ label: 'Services', href: '#services' },
				{ label: 'Testimonials', href: '#testimonials' },
				{ label: 'About Us', href: '#about' },
				{ label: 'Patient Portal', href: '#portal' }
			],
			contact: [
				{
					icon: 'location_on',
					text: '123 Medical Plaza Drive, Suite 400\nModern City, NY 10001'
				},
				{ icon: 'phone', text: '(555) 123-4567' }
			]
		},
		newsletter: {
			headline: 'Newsletter',
			description: 'Stay updated with dental tips and practice news.'
		}
	}
};
