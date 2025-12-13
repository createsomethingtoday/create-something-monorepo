// LithX Solutions Data
// Synced from React mocks - matches D1 content structure

export const lithxSolutionsHeader = {
	headline: 'Recover more from heaps, tailings, and low-grade ores across critical minerals'
};

export interface LithxSolution {
	id: string;
	name: string;
	symbol: string;
	description: string;
	details: string;
	image: string;
	features: string[];
	stats: Array<{ label: string; value: string }>;
}

export const lithxSolutions: LithxSolution[] = [
	{
		id: 'copper',
		name: 'Copper',
		symbol: 'Cu',
		description:
			'Target chalcopyrite, transition ores, and more with advanced chelation chemistry designed for complex copper mineralogy.',
		details:
			'LithX enhances copper dissolution by disrupting passivation layers that limit recovery from chalcopyrite and mixed oxide-sulfide ores. The technology also improves performance on high acid-consuming and transition ores with mixed oxide-sulfide mineralogy.',
		image: '/images/lithx-copper.jpg',
		features: [
			'Target chalcopyrite, transition ores, and more',
			'Breakthrough passivation barriers',
			'Improve recovery from low-grade ores',
			'Reduce acid consumption',
			'Works with existing heap leach infrastructure'
		],
		stats: [
			{ label: 'Recovery Improvement', value: '15-30%' },
			{ label: 'Acid Reduction', value: '20%+' },
			{ label: 'Leach Time', value: 'Faster' }
		]
	},
	{
		id: 'gold',
		name: 'Gold',
		symbol: 'Au',
		description:
			'Advanced recovery solutions for refractory gold ores and complex mineralogy that resist conventional processing.',
		details:
			'LithX Gold enables extraction from carbonaceous, preg-robbing, and double refractory ores using specialized chelation chemistry. The technology disrupts mineral matrices that trap gold, enabling higher recovery rates from challenging ore bodies.',
		image: '/images/lithx-mining.jpg',
		features: [
			'Enhanced gold dissolution',
			'Works on refractory ores',
			'Tailings reprocessing',
			'Lower reagent consumption',
			'Environmentally responsible'
		],
		stats: [
			{ label: 'Recovery Rate', value: '85-95%' },
			{ label: 'Refractory Ore', value: 'Effective' },
			{ label: 'Tailings', value: 'Viable' }
		]
	},
	{
		id: 'pgms',
		name: 'PGMs',
		symbol: 'PGMs',
		description:
			'Platinum group metals recovery from complex ores and recycling streams with ambient temperature processing.',
		details:
			'LithX PGM technology targets platinum, palladium, and rhodium from difficult-to-process sources including automotive catalysts and complex sulfide ores. The chelation chemistry operates at ambient conditions while achieving high selectivity.',
		image: '/images/lithx-mining.jpg',
		features: [
			'Selective PGM extraction',
			'High purity recovery',
			'Works on low-grade sources',
			'Industrial residue processing',
			'Closed-loop capable'
		],
		stats: [
			{ label: 'Pt Recovery', value: '90%+' },
			{ label: 'Pd Recovery', value: '90%+' },
			{ label: 'Selectivity', value: 'Excellent' }
		]
	},
	{
		id: 'rare-earths',
		name: 'Rare Earths',
		symbol: 'REE',
		description:
			'Extract rare earth elements and critical minerals from coal ash, industrial waste, and low-grade deposits.',
		details:
			'LithX Rare Earth technology recovers neodymium, dysprosium, and other critical elements from coal fly ash and industrial waste streams. The process transforms waste materials into valuable rare earth concentrates without traditional rare earth mining.',
		image: '/images/lithx-sustainable.jpg',
		features: [
			'Extract from diverse sources',
			'Selective separation',
			'Lower environmental impact',
			'Enables domestic supply',
			'Circular economy support'
		],
		stats: [
			{ label: 'Extraction Rate', value: 'High' },
			{ label: 'Purity', value: 'Battery Grade' },
			{ label: 'Sources', value: 'Multiple' }
		]
	},
	{
		id: 'custom',
		name: 'Custom',
		symbol: 'Custom',
		description:
			'Custom formulations designed to address your specific mineralogy and operational requirements.',
		details:
			"Our chemistry team works directly with your operations to develop tailored solutions for unique challenges. Whether you're dealing with complex mineralogy, unusual contaminants, or specific recovery targets, we create custom formulations optimized for your conditions.",
		image: '/images/lithx-sustainable.jpg',
		features: [
			'Custom formulation development',
			'Site-specific optimization',
			'Technical support included',
			'Pilot testing available',
			'Scalable solutions'
		],
		stats: [
			{ label: 'Customization', value: '100%' },
			{ label: 'Support', value: 'Dedicated' }
		]
	}
];

// Methods Section
export const lithxMethodsHeader = {
	headline: 'Powerful, versatile chemistry that seamlessly integrates into existing infrastructure'
};

export interface LithxMethod {
	id: string;
	name: string;
	description: string;
	details: string;
	image: string;
}

export const lithxMethods: LithxMethod[] = [
	{
		id: 'heap',
		name: 'Heap Leaching',
		description:
			'Powerful, versatile chemistry that seamlessly integrates into existing infrastructure',
		details:
			'Our chelation technology enhances heap leach operations by improving metal dissolution rates and recovery from low-grade ores. The chemistry works effectively across a wide range of ore types and pH conditions, making it suitable for diverse mining operations.',
		image: '/images/lithx-heap-leach.jpg'
	},
	{
		id: 'in-situ',
		name: 'In-Situ Recovery',
		description:
			'Direct extraction from ore bodies without traditional mining, reducing environmental impact',
		details:
			'In-situ recovery using LithX chemistry enables metal extraction directly from ore deposits through controlled injection and recovery wells. This approach minimizes surface disturbance while accessing resources that would be uneconomical with conventional mining.',
		image: '/images/lithx-sustainable.jpg'
	}
];
