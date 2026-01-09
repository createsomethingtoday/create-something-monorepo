export interface Product {
	id: string;
	name: string;
	price: number;
	category: string;
	image: string;
	description?: string;
}

export interface Category {
	id: string;
	name: string;
	slug: string;
}

export interface SiteConfig {
	// Branding
	name: string;
	tagline: string;

	// Content
	categories: Category[];
	products: {
		new: Product[];
		iconic: Product[];
	};
	gallery: string[];

	// Contact
	contact: {
		email: string;
		phone?: string;
		address?: string;
	};

	// Social
	social: {
		instagram?: string;
		pinterest?: string;
		twitter?: string;
	};

	// WORKWAY Integration
	workflows?: {
		orderNotification?: string;
		inventorySync?: string;
		emailCapture?: string;
	};
}

export const siteDefaults: SiteConfig = {
	name: 'Fashion Boutique',
	tagline: 'Timeless design, curated with care',
	categories: [
		{ id: '1', name: 'JEWELRY', slug: 'jewelry' },
		{ id: '2', name: 'SHOES', slug: 'shoes' },
		{ id: '3', name: 'READY TO WEAR', slug: 'ready-to-wear' },
		{ id: '4', name: 'BAGS', slug: 'bags' },
		{ id: '5', name: 'ACCESSORIES', slug: 'accessories' },
		{ id: '6', name: 'GARDEROB', slug: 'garderob' },
		{ id: '7', name: 'SIGNATURE PIECES', slug: 'signature-pieces' }
	],
	products: {
		new: [
			{
				id: '1',
				name: 'RELAXED WOOL COAT',
				price: 895,
				category: 'OUTERWEAR',
				image: '/images/product-wool-coat.png'
			},
			{
				id: '2',
				name: 'HIGH-WAIST TROUSERS',
				price: 425,
				category: 'PANTS',
				image: '/images/product-trousers.png'
			},
			{
				id: '3',
				name: 'SILK WRAP DRESS',
				price: 695,
				category: 'DRESSES',
				image: '/images/product-wrap-dress.png'
			},
			{
				id: '4',
				name: 'OVERSIZED SHIRT DRESS',
				price: 545,
				category: 'DRESSES',
				image: '/images/product-shirt-dress.png'
			}
		],
		iconic: [
			{
				id: '5',
				name: 'TAILORED BLAZER',
				price: 995,
				category: 'SIGNATURE',
				image: '/images/iconic-blazer.png'
			},
			{
				id: '6',
				name: 'CASHMERE SWEATER',
				price: 625,
				category: 'SIGNATURE',
				image: '/images/iconic-sweater.png'
			},
			{
				id: '7',
				name: 'LEATHER JACKET',
				price: 1895,
				category: 'SIGNATURE',
				image: '/images/iconic-leather-jacket.png'
			},
			{
				id: '8',
				name: 'MIDI SKIRT',
				price: 495,
				category: 'SIGNATURE',
				image: '/images/iconic-midi-skirt.png'
			}
		]
	},
	gallery: ['/images/gallery-1.png', '/images/gallery-2.png', '/images/gallery-3.png'],
	contact: {
		email: 'hello@fashionboutique.com'
	},
	social: {}
};
