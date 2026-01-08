// PetroX Solutions Data
// Restored from Dec 29 monorepo state + Calvin's updates (Jan 2026)

export const petroxSolutionsHeader = {
	headline: 'PetroX is a portfolio of chemical solutions matched to operational needs'
};

export interface PetroxSolution {
	id: string;
	name: string;
	headline: string;
	description: string;
	details: string;
	image: string;
	youtubeId?: string;
	features: string[];
	stats: Array<{ label: string; value: string }>;
}

export const petroxSolutions: PetroxSolution[] = [
	{
		id: 'boost',
		name: 'Boost',
		headline: 'Boost production rates by over 20% with next-generation chemistry',
		description:
			'PetroX Boost is an advanced permeability enhancer for tight formations. It works by breaking down illite, smectite, and other silicate clays responsible for swelling and flow restriction in shale reservoirs.',
		details:
			'The proprietary industrial chemistry disrupts the crystal lattice of clays, reducing gel formation and increasing pore space connectivity. This enables higher hydrocarbon liberation during hydraulic fracturing and post-acidizing operations.',
		image: '/images/Production-&-EOR-LR-p-1080.png',
		youtubeId: '2OmLauEtNkg',
		features: [
			'Boost production rates by over 20%',
			'Non-hazmat chemistry',
			'Works at ambient temperature',
			'Compatible with existing workflows'
		],
		stats: [
			{ label: 'Production Boost', value: '20%+' },
			{ label: 'Safety Rating', value: 'Non-Hazmat' },
			{ label: 'Temperature', value: 'Ambient' }
		]
	},
	{
		id: 'iron',
		name: 'Iron',
		headline: 'Eliminate iron sulfide scale without heat, acids, or downtime',
		description:
			'Advanced iron sulfide dissolution chemistry for production equipment and flowlines.',
		details:
			'PetroX Iron removes iron sulfide scale and deposits that form in production tubing, separators, and tanks. The chelation-based formula works at ambient temperature, avoiding the hazards and costs of traditional acid treatments while protecting infrastructure integrity. Compatible with THPS-based biocide programs for comprehensive production system protection.',
		image: '/images/petrox-processing.jpg',
		features: [
			'Prevents iron precipitation',
			'Protects equipment from corrosion',
			'Maintains flow rates',
			'Environmentally safe formulation'
		],
		stats: [
			{ label: 'Iron Removal', value: '95%+' },
			{ label: 'Equipment Protection', value: 'Excellent' }
		]
	},
	{
		id: 'scale',
		name: 'Scale',
		headline: 'Prevent and remove mineral scale without corrosive acids',
		description:
			'Comprehensive scale removal for barium sulfate, calcium carbonate, and mineral deposits.',
		details:
			'Our scale inhibitor chemistry prevents and removes hard mineral deposits that restrict flow and reduce equipment efficiency. Effective on barite, calcite, and gypsum scale without the corrosive effects of conventional scale treatments.',
		image: '/images/petrox-scale.jpg',
		youtubeId: 'r5Q3GKRJF_s',
		features: [
			'Prevents scale formation',
			'Removes existing deposits',
			'Protects equipment',
			'Extends well life'
		],
		stats: [
			{ label: 'per lb scale removed', value: '90% Cheaper' },
			{ label: 'Scale Prevention', value: '99%+' }
		]
	},
	{
		id: 'wax',
		name: 'Wax',
		headline: 'Maintain flow assurance in cold weather operations',
		description: 'Paraffin wax dispersant and prevention system for cold weather operations.',
		details:
			'PetroX Wax prevents paraffin deposition in flowlines, wellbores, and surface equipment during low-temperature operations. The dispersant chemistry keeps wax crystals suspended, preventing buildup and maintaining flow assurance.',
		image: '/images/petrox-wax.jpg',
		features: [
			'Prevents wax crystallization',
			'Removes existing deposits',
			'Reduces maintenance downtime',
			'Cold flow improvement'
		],
		stats: [
			{ label: 'Wax Prevention', value: 'Excellent' },
			{ label: 'Flow Improvement', value: '30%+' }
		]
	},
	{
		id: 'clear',
		name: 'Clear',
		headline: 'Achieve rapid oil-water separation and reduce BS&W',
		description:
			'Water clarification chemistry for improved phase separation and reduced BS&W.',
		details:
			'PetroX Clear enhances oil-water separation in produced water systems, reducing basic sediment and water content. The chemistry promotes rapid phase separation, improving downstream treatment efficiency and reducing operational costs.',
		image: '/images/petrox-flow.jpg',
		features: [
			'Removes suspended solids',
			'Improves water clarity',
			'Enables water reuse',
			'Meets discharge standards'
		],
		stats: [
			{ label: 'Clarity Improvement', value: 'Excellent' },
			{ label: 'Reuse Ready', value: 'Yes' }
		]
	},
	{
		id: 'microbe',
		name: 'Microbe',
		headline: 'Control microbial souring and corrosion in production systems',
		description:
			'Microbiological control for sulfate-reducing bacteria and biofilm prevention.',
		details:
			'PetroX Biocide controls microbial activity that leads to souring, corrosion, and hydrogen sulfide generation. The THPS-based formulation provides broad-spectrum efficacy against sulfate-reducing bacteria while remaining compatible with production chemistry and safe for downhole equipment.',
		image: '/images/petrox-fracturing.jpg',
		features: [
			'Broad-spectrum efficacy',
			'Prevents souring',
			'Reduces corrosion',
			'Safe for personnel'
		],
		stats: [
			{ label: 'Kill Rate', value: '99.9%+' },
			{ label: 'Duration', value: 'Long-lasting' }
		]
	},
	{
		id: 'h2s',
		name: 'H₂S',
		headline: 'Neutralize H₂S safely and meet pipeline specifications',
		description: 'Hydrogen sulfide scavenger for sour gas and produced water treatment.',
		details:
			'PetroX H2S neutralizes hydrogen sulfide in gas streams and produced water, improving safety and meeting pipeline specifications. The non-toxic scavenger chemistry works rapidly at ambient conditions without forming hazardous byproducts.',
		image: '/images/petrox-eor.jpg',
		features: [
			'Rapid H₂S neutralization',
			'Non-toxic formulation',
			'Works at ambient conditions',
			'Meets pipeline specifications'
		],
		stats: [
			{ label: 'H₂S Removal', value: '99%+' },
			{ label: 'Safety', value: 'Non-Toxic' }
		]
	},
	{
		id: 'custom',
		name: 'Custom',
		headline: 'Tailored chemistry solutions for your unique challenges',
		description:
			'Custom formulations designed to address your specific operational requirements and field conditions.',
		details:
			"Our chemistry team works directly with your operations to develop tailored solutions for unique challenges. Whether you're dealing with complex mineralogy, unusual contaminants, or specific performance requirements, we create custom formulations optimized for your conditions.",
		image: '/images/petrox-production.jpg',
		features: [
			'Custom formulation development',
			'Field-specific optimization',
			'Technical support included',
			'Scalable solutions'
		],
		stats: [
			{ label: 'Customization', value: '100%' },
			{ label: 'Support', value: 'Dedicated' }
		]
	}
];

// Operations Section
export const petroxOperationsHeader = {
	headline: 'Drive efficiency, safety, and production rates across the oilfield'
};

export interface PetroxOperation {
	id: string;
	title: string;
	description: string;
	icon: string;
	position: { top: string; left: string };
}

export const petroxOperations: PetroxOperation[] = [
	{
		id: 'production',
		title: 'Production',
		description: 'Reduces paraffin, iron sulfide, and H₂S to improve flow and oil quality.',
		icon: 'https://cdn.prod.website-files.com/6866bf5387f9167032e8ae4b/6867dbb53471708db0143040_Production.jpg',
		position: { top: '46%', left: '17%' }
	},
	{
		id: 'production-enhancement',
		title: 'Production Enhancement',
		description:
			'Destroys clay structures to unlock trapped oil and improve mobility in tight formations.',
		icon: 'https://cdn.prod.website-files.com/6866bf5387f9167032e8ae4b/6895074bb0419d8f6e939f16_eor_hero.jpg',
		position: { top: '73%', left: '19%' }
	},
	{
		id: 'fracking',
		title: 'Fracking',
		description:
			'Improves flowback and formation permeability without affecting proppant integrity.',
		icon: 'https://cdn.prod.website-files.com/6866bf5387f9167032e8ae4b/6895086da0ada6fb579082ad_fracturing_hero.jpg',
		position: { top: '65%', left: '61%' }
	},
	{
		id: 'processing',
		title: 'Production Processing',
		description:
			'Limits wax formation, breaks metal scales, decreases iron and sulfur content, increases crude value.',
		icon: 'https://cdn.prod.website-files.com/6866bf5387f9167032e8ae4b/68950905af4b75331186bfed_3b2327ae5e17d8a2317a7ce08e9e9320_processing_hero.jpg',
		position: { top: '25%', left: '74%' }
	},
	{
		id: 'saltwater',
		title: 'Saltwater Disposal',
		description:
			'Improves separation and reduces sludge, scale, and fouling across tanks, treaters and heater treaters. Lowers injection pressure by lowering solids.',
		icon: 'https://cdn.prod.website-files.com/6866bf5387f9167032e8ae4b/689506106ef66e6d2efadd8b_saltwater-hero.jpg',
		position: { top: '27%', left: '52%' }
	},
	{
		id: 'metal-recovery',
		title: 'Metal Recovery',
		description:
			'Extract value from enriched produced water. Extract lithium, gold, silver, and other valuable metals from your waste.',
		icon: 'https://cdn.prod.website-files.com/6866bf5387f9167032e8ae4b/689508063adbe545e5784435_metal_hero.jpg',
		position: { top: '37%', left: '32%' }
	},
	{
		id: 'offshore',
		title: 'Offshore Operations',
		description:
			'Handles wax, iron, and barium scale & sediment in offshore systems, without heat, corrosives, or hazmats.',
		icon: 'https://cdn.prod.website-files.com/6866bf5387f9167032e8ae4b/68950572deb07ae211c5e731_offshore_hero.jpg',
		position: { top: '10%', left: '26%' }
	},
	{
		id: 'refining',
		title: 'Refining',
		description:
			'Removes iron, sulfur, and other catalyst poisons to prevent fouling and improve desalter efficiency.',
		icon: 'https://cdn.prod.website-files.com/6866bf5387f9167032e8ae4b/689509fb7cd5bb0da3293195_refining_hero.jpg',
		position: { top: '22%', left: '13%' }
	}
];

// Operations illustration URLs
export const petroxOperationsImages = {
	desktop:
		'https://cdn.prod.website-files.com/6866bf5387f9167032e8ae4b/6895553e24867408b6852829_Maverick_O%26G_Operations_FINAL_rm.png',
	mobile:
		'https://images.squarespace-cdn.com/content/670d72d8dc75434c0342e79b/69186c6e-78d5-4b63-8bd0-13327499d3cd/O%26G.png?content-type=image%2Fpng'
};
