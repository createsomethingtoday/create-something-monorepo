/**
 * Seed Script for Maverick X CMS Content
 *
 * Generates JSON for bulk KV upload with all default content values.
 * This populates the CMS editor with editable content.
 *
 * Usage:
 *   pnpm --filter=maverick exec tsx scripts/seed-all-content.ts
 *
 * Then upload to KV:
 *   wrangler kv:bulk put --namespace-id=3842228f5d15483eb0fb2465afef24f5 seed-data.json
 */

const seedData = {
	// News Page Content
	'content:news': {
		title: 'Maverick In the News',
		articles: [
			{
				id: '1',
				date: 'July 29, 2025',
				title: 'Maverick Metals launches Direct Metal Extraction Technology',
				excerpt: 'Revolutionary DME platform enables recovery of critical metals from industrial wastewater streams, transforming waste into valuable resources for the energy transition.',
				image: '/images/news-pic-2.png',
				slug: 'maverick-metals-launches-dme-technology',
				featured: true,
				category: 'Product Launch'
			},
			{
				id: '2',
				date: 'August 6, 2025',
				title: 'Maverick Metals launches Direct Metal Extraction Technology',
				excerpt: 'Follow-up developments in our groundbreaking DME technology platform.',
				image: '/images/news-pic-3.jpg',
				slug: 'dme-technology-update',
				featured: false,
				category: 'Technology'
			},
			{
				id: '3',
				date: 'July 29, 2025',
				title: 'Critical Metals Startup Relocating HQ to Austin from San Antonio',
				excerpt: 'Maverick X expands operations to Austin, positioning for accelerated growth in the critical metals recovery sector.',
				image: '/images/news-pic-5.jpg',
				slug: 'relocating-hq-to-austin',
				featured: false,
				category: 'Company News'
			},
			{
				id: '4',
				date: 'July 29, 2025',
				title: 'Maverick Metals secures $19M to strengthen global copper supply chains',
				excerpt: 'Series A funding round led by prominent investors accelerates deployment of LithX technology for critical metals recovery.',
				image: '/images/content/news-pic-1.jpg',
				slug: 'secures-19m-series-a-funding',
				featured: false,
				category: 'Funding'
			},
			{
				id: '5',
				date: 'June 15, 2025',
				title: 'LithX Technology Achieves 99.9% Metal Recovery Rate in Pilot Testing',
				excerpt: 'Breakthrough results demonstrate commercial viability of ambient-temperature metal extraction from low-grade ores.',
				image: '/images/content/news-pic-2.jpg',
				slug: 'lithx-pilot-testing-results',
				featured: false,
				category: 'Research'
			},
			{
				id: '6',
				date: 'May 20, 2025',
				title: 'Partnership with Global Mining Consortium Announced',
				excerpt: 'Strategic alliance brings LithX technology to three major mining operations across North America.',
				image: '/images/content/news-pic-3.jpg',
				slug: 'global-mining-consortium-partnership',
				featured: false,
				category: 'Partnerships'
			}
		]
	},

	// About Page Content
	'content:about': {
		hero: {
			badge: 'Y Combinator Backed',
			headline: 'Chemistry That Outperforms',
			description: 'Maverick X develops next-generation chemical solutions that transform how industries extract, process, and recover valuable resources. Our proprietary formulations deliver breakthrough performance where it matters most.'
		},
		mission: {
			heading: 'Our Mission',
			body: "We believe the world's most critical challenges—energy security, critical mineral supply, and water sustainability—can be solved through better chemistry. Our mission is to develop targeted chemical solutions that enable more efficient, sustainable industrial operations."
		},
		approach: {
			heading: 'Our Approach',
			body: 'We combine deep domain expertise with cutting-edge research to create formulations that outperform conventional alternatives. Every product we develop is purpose-built for real-world conditions, tested rigorously, and optimized for both performance and sustainability.'
		},
		products: {
			heading: 'Our Products',
			petrox: {
				name: 'PetroX',
				tagline: 'Targeted Oilfield Chemistry',
				description: 'Advanced solutions for enhanced oil recovery and production optimization.'
			},
			lithx: {
				name: 'LithX',
				tagline: 'Next-Gen Metal Recovery',
				description: 'Revolutionary extraction chemistry for critical minerals.'
			},
			hydrox: {
				name: 'HydroX',
				tagline: 'Wastewater Valorization',
				description: 'Innovative treatment that recovers value from industrial wastewater.'
			}
		},
		cta: {
			heading: 'Ready to learn more?',
			description: 'Contact our team to discuss how Maverick X can help your operations.',
			buttonLabel: 'Get in Touch'
		}
	},

	// Global Content (Footer + Contact Modal)
	'content:global': {
		footer: {
			tagline: 'Engineering the future of chemistry for safer, more profitable natural resource production.',
			address: {
				line1: '444 E. St. Elmo Rd.',
				line2: 'Bldg. B',
				line3: 'Austin, TX 78745'
			}
		},
		contact: {
			title: 'Get in Touch',
			description: 'Ready to transform your industrial chemistry operations? Our technical team is here to help you optimize performance and drive results.',
			emails: [
				{ label: 'General Inquiries', address: 'info@maverickx.com' },
				{ label: 'Technical Support', address: 'support@maverickx.com' },
				{ label: 'Sales & Partnerships', address: 'sales@maverickx.com' }
			]
		}
	},

	// PetroX Page Content
	'content:petrox': {
		hero: {
			title: 'Targeted Non-Hazmat Chemistry',
			subtitle: 'Boost production and slash costs with PetroX—advanced chelation chemistry for enhanced oil recovery, sludge remediation, and water treatment',
			video: 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/082466515-oil-rig-pumpjack-working-natur.mp4',
			cta: 'Learn More'
		},
		why: {
			title: 'Why PetroX?',
			subtitle: 'Industry-leading oilfield chemistry that delivers results without the downsides of traditional treatments.'
		},
		whyFeatures: [
			{ icon: 'thermometer', title: 'Room Temperature Operation' },
			{ icon: 'shield-check', title: 'Non-Hazardous' },
			{ icon: 'wrench', title: 'Infrastructure-Safe' },
			{ icon: 'clock', title: 'Non-Disruptive' }
		],
		solutionsHeader: {
			headline: 'PetroX is a portfolio of chemical solutions matched to operational needs'
		},
		operationsHeader: {
			headline: 'Drive efficiency, safety, and production rates across the oilfield'
		}
	},

	// LithX Page Content
	'content:lithx': {
		hero: {
			title: 'Next Generation Recovery',
			subtitle: 'Valorize low-grade ores with LithX—advanced chelation technology for critical metals recovery from heaps, tailings, and complex mineralogy',
			video: 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/168384056-deep-open-pit-mine-copper-ore-.mp4',
			cta: 'Learn More'
		},
		why: {
			title: 'Advanced Chelation Technology',
			subtitle: 'Our proprietary chemistry platform enables efficient metal extraction with reduced environmental impact and operational complexity.'
		},
		whyFeatures: [
			{ icon: 'beaker', title: 'Ultra-Strong Chelators' },
			{ icon: 'thermometer', title: 'Ambient Temperature' },
			{ icon: 'leaf', title: 'Environmentally Friendly' },
			{ icon: 'plug', title: 'Drop-In Solution' }
		],
		solutionsHeader: {
			headline: 'Recover more from heaps, tailings, and low-grade ores across critical minerals'
		},
		methodsHeader: {
			headline: 'Powerful, versatile chemistry that seamlessly integrates into existing infrastructure'
		}
	},

	// Water Treatment (DME) Page Content
	'content:dme': {
		hero: {
			title: 'Introducing HydroX',
			subtitle: 'Unlocking new domestic sources of critical minerals and industrial water',
			video: 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/124452682-engineers-assessing-waste-wate.mp4',
			cta: 'Learn More'
		},
		statistics: {
			headline: 'HydroX is a process that cleans wastewater for industrial use while recovering and processing valuable byproducts',
			cta: 'Learn More'
		},
		metalsHeadline: 'Metals of interest',
		wasteHeadline: 'Recover From'
	}
};

// Generate JSON for bulk upload
const bulkData = Object.entries(seedData).map(([key, value]) => ({
	key,
	value: JSON.stringify(value)
}));

// Output JSON for wrangler kv:bulk put
console.log(JSON.stringify(bulkData, null, 2));
