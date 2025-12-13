/**
 * Seed KV with initial content
 *
 * Run with: npx wrangler kv:bulk put --namespace-id=3842228f5d15483eb0fb2465afef24f5 ./scripts/seed-data.json
 *
 * This script generates the seed-data.json file
 */

// Homepage content structure matching component defaults
const homeContent = {
	hero: {
		videoSrc: 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/089014528-smokestack-and-american-flag-o.mp4',
		title: 'Chemistry That Outperforms',
		subtitle: 'More oil. More metals. Smarter chemistry.',
		cta: 'Learn More'
	},
	introduction: {
		headline: 'Breakthrough chemical solutions across the most critical resource markets'
	},
	showcaseImages: [
		{
			href: '/oil-gas',
			image: '/images/oil-splash.png',
			title: 'Oil & Gas',
			accentColor: 'petrox'
		},
		{
			href: '/mining',
			image: '/images/metal-nuggets.png',
			title: 'Mining & Metals',
			accentColor: 'lithx'
		},
		{
			href: '/water-treatment',
			image: '/images/water-splash.png',
			title: 'Water Treatment',
			accentColor: 'dme'
		}
	],
	explainer: {
		headline: 'We are unlocking critical resources through precision chemistry.'
	},
	explainerPoints: [
		{
			title: 'Targeted Selectivity',
			description: 'Selective metal ion binding without harmful byproducts'
		},
		{
			title: 'Non-Hazardous Operation',
			description: 'Ambient temperature processing reducing energy and safety risks'
		},
		{
			title: 'Recyclable & Sustainable',
			description: 'Regenerable reagents enabling closed-loop systems'
		}
	],
	solutions: [
		{
			id: 'petrox',
			name: 'PetroX',
			tagline: 'Oilfield Chemistry',
			description: 'Advanced chemical solutions for enhanced oil recovery and production optimization.',
			href: '/oil-gas',
			videoSrc: 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/127063803-crude-oil-close-up.mp4',
			accentColor: 'petrox'
		},
		{
			id: 'lithx',
			name: 'LithX',
			tagline: 'Mining Chemistry',
			description: 'Next-generation metal recovery chemistry for critical minerals extraction.',
			href: '/mining',
			videoSrc: 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/168384056-deep-open-pit-mine-copper-ore-.mp4',
			accentColor: 'lithx'
		},
		{
			id: 'dme',
			name: 'DME',
			tagline: 'Water Chemistry',
			description: 'Sustainable wastewater valorization with metal recovery capabilities.',
			href: '/water-treatment',
			videoSrc: 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/104893836-water-being-released-from-dam-.mp4',
			accentColor: 'dme'
		}
	]
};

// Generate the JSON file format expected by wrangler kv:bulk put
const seedData = [
	{
		key: 'content:home',
		value: JSON.stringify(homeContent)
	}
];

// Write to stdout for piping to file
console.log(JSON.stringify(seedData, null, 2));
