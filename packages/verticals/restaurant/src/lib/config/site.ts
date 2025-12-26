/**
 * Site Configuration - Restaurant
 *
 * Voice: Warm, inviting, sensory-rich
 * Structure: Menu first, ambiance, easy reservations
 * Images: Generated via Cloudflare Workers AI (Flux)
 */

export const siteConfig = {
	// Restaurant Identity
	name: 'Restaurant Name',
	tagline: 'Modern Cuisine, Timeless Hospitality',
	description:
		'Contemporary American dining featuring seasonal ingredients and artisanal techniques. Serving Seattle since 2018.',

	// Hero
	hero: {
		image: '/hero-interior.jpg',
		alt: 'Elegant restaurant interior with warm ambient lighting'
	},

	// Contact
	email: 'reservations@restaurantname.com',
	phone: '+1 (555) 123-4567',
	address: {
		street: '123 Market Street',
		city: 'Seattle',
		state: 'WA',
		zip: '98101',
		country: 'US'
	},

	// Hours
	hours: {
		monday: 'Closed',
		tuesday: 'Lunch: 11:30 AM - 2:30 PM, Dinner: 5:00 PM - 10:00 PM',
		wednesday: 'Lunch: 11:30 AM - 2:30 PM, Dinner: 5:00 PM - 10:00 PM',
		thursday: 'Lunch: 11:30 AM - 2:30 PM, Dinner: 5:00 PM - 10:00 PM',
		friday: 'Lunch: 11:30 AM - 2:30 PM, Dinner: 5:00 PM - 11:00 PM',
		saturday: 'Brunch: 10:00 AM - 3:00 PM, Dinner: 5:00 PM - 11:00 PM',
		sunday: 'Brunch: 10:00 AM - 3:00 PM, Dinner: 5:00 PM - 9:00 PM'
	},

	// Service Hours (structured for logic)
	serviceHours: {
		lunch: {
			days: ['tuesday', 'wednesday', 'thursday', 'friday'],
			start: '11:30',
			end: '14:30'
		},
		brunch: {
			days: ['saturday', 'sunday'],
			start: '10:00',
			end: '15:00'
		},
		dinner: {
			days: ['tuesday', 'wednesday', 'thursday'],
			start: '17:00',
			end: '22:00'
		},
		dinnerWeekend: {
			days: ['friday', 'saturday'],
			start: '17:00',
			end: '23:00'
		},
		dinnerSunday: {
			days: ['sunday'],
			start: '17:00',
			end: '21:00'
		}
	},

	// Social
	social: {
		instagram: 'https://instagram.com/restaurantname',
		facebook: 'https://facebook.com/restaurantname',
		yelp: 'https://yelp.com/biz/restaurantname'
	},

	// SEO
	url: 'https://example.com',
	locale: 'en_US',

	// Menu Categories
	menuCategories: [
		{
			slug: 'appetizers',
			title: 'Starters',
			description: 'Begin your meal with seasonal small plates',
			icon: 'appetizer'
		},
		{
			slug: 'salads',
			title: 'Salads & Soups',
			description: 'Fresh greens and house-made stocks',
			icon: 'salad'
		},
		{
			slug: 'entrees',
			title: 'Main Courses',
			description: 'Chef-driven plates featuring local purveyors',
			icon: 'entree'
		},
		{
			slug: 'sides',
			title: 'Sides',
			description: 'Seasonal accompaniments',
			icon: 'side'
		},
		{
			slug: 'desserts',
			title: 'Desserts',
			description: 'House-made pastries and confections',
			icon: 'dessert'
		},
		{
			slug: 'drinks',
			title: 'Beverages',
			description: 'Craft cocktails, curated wines, local beers',
			icon: 'drink'
		}
	],

	// Featured Dishes
	featuredDishes: [
		{
			name: 'Pan-Roasted Halibut',
			description:
				'Wild-caught Pacific halibut, heirloom tomato confit, summer squash, basil oil',
			category: 'entrees',
			price: 38,
			image: '/menu/halibut.jpg',
			dietary: ['gluten-free'],
			featured: true
		},
		{
			name: 'Wood-Fired Ribeye',
			description: '14oz dry-aged beef, roasted bone marrow, fingerling potatoes, red wine jus',
			category: 'entrees',
			price: 52,
			image: '/menu/ribeye.jpg',
			dietary: ['gluten-free'],
			featured: true
		},
		{
			name: 'Seasonal Tasting Menu',
			description:
				"Chef's selection of five courses showcasing the season's finest ingredients",
			category: 'tasting',
			price: 85,
			image: '/menu/tasting-menu.jpg',
			dietary: ['vegetarian-option', 'vegan-option'],
			featured: true
		}
	],

	// Full Menu Items
	menuItems: [
		// Appetizers
		{
			name: 'Oysters on the Half Shell',
			description: 'Daily selection, mignonette, cocktail sauce, lemon',
			category: 'appetizers',
			price: 18,
			dietary: ['gluten-free']
		},
		{
			name: 'Charcuterie Board',
			description: 'House-cured meats, artisan cheese, pickled vegetables, grilled bread',
			category: 'appetizers',
			price: 22,
			dietary: []
		},
		{
			name: 'Crispy Brussels Sprouts',
			description: 'Caramelized onions, hazelnuts, pomegranate, balsamic reduction',
			category: 'appetizers',
			price: 14,
			dietary: ['vegetarian', 'vegan', 'gluten-free']
		},
		{
			name: 'Tuna Tartare',
			description: 'Sushi-grade ahi, avocado, cucumber, sesame, wonton crisps',
			category: 'appetizers',
			price: 19,
			dietary: ['dairy-free']
		},
		// Salads & Soups
		{
			name: 'Caesar Salad',
			description: 'Romaine hearts, house-made dressing, parmesan, sourdough croutons',
			category: 'salads',
			price: 12,
			dietary: []
		},
		{
			name: 'Seasonal Greens',
			description: "Chef's selection of local greens, seasonal vegetables, citrus vinaigrette",
			category: 'salads',
			price: 14,
			dietary: ['vegetarian', 'vegan', 'gluten-free']
		},
		{
			name: 'French Onion Soup',
			description: 'Slow-cooked onions, beef stock, gruyere, toasted baguette',
			category: 'salads',
			price: 11,
			dietary: []
		},
		{
			name: 'Roasted Beet Salad',
			description: 'Golden and red beets, goat cheese, candied walnuts, arugula',
			category: 'salads',
			price: 15,
			dietary: ['vegetarian', 'gluten-free']
		},
		// Entrees
		{
			name: 'Pan-Roasted Halibut',
			description:
				'Wild-caught Pacific halibut, heirloom tomato confit, summer squash, basil oil',
			category: 'entrees',
			price: 38,
			dietary: ['gluten-free']
		},
		{
			name: 'Wood-Fired Ribeye',
			description: '14oz dry-aged beef, roasted bone marrow, fingerling potatoes, red wine jus',
			category: 'entrees',
			price: 52,
			dietary: ['gluten-free']
		},
		{
			name: 'Duck Confit',
			description: 'Crispy duck leg, white bean cassoulet, cherry gastrique, frisée',
			category: 'entrees',
			price: 34,
			dietary: ['dairy-free', 'gluten-free']
		},
		{
			name: 'Wild Mushroom Risotto',
			description: 'Arborio rice, seasonal mushrooms, parmesan, truffle oil, pea shoots',
			category: 'entrees',
			price: 28,
			dietary: ['vegetarian', 'gluten-free']
		},
		{
			name: 'Lamb Loin',
			description: 'Herb-crusted lamb, eggplant caponata, mint yogurt, crispy chickpeas',
			category: 'entrees',
			price: 42,
			dietary: ['gluten-free']
		},
		{
			name: 'Pan-Seared Scallops',
			description: 'Diver scallops, sweet corn puree, pancetta, microgreens',
			category: 'entrees',
			price: 36,
			dietary: ['gluten-free']
		},
		// Sides
		{
			name: 'Roasted Seasonal Vegetables',
			description: "Chef's selection of market vegetables",
			category: 'sides',
			price: 10,
			dietary: ['vegetarian', 'vegan', 'gluten-free']
		},
		{
			name: 'Truffle Fries',
			description: 'Hand-cut fries, truffle oil, parmesan, herbs',
			category: 'sides',
			price: 12,
			dietary: ['vegetarian']
		},
		{
			name: 'Creamed Spinach',
			description: 'Sautéed spinach, garlic cream, nutmeg',
			category: 'sides',
			price: 9,
			dietary: ['vegetarian', 'gluten-free']
		},
		{
			name: 'Mac and Cheese',
			description: 'Three-cheese blend, panko crust',
			category: 'sides',
			price: 11,
			dietary: ['vegetarian']
		},
		// Desserts
		{
			name: 'Chocolate Torte',
			description: 'Flourless dark chocolate, raspberry coulis, whipped cream',
			category: 'desserts',
			price: 12,
			dietary: ['gluten-free']
		},
		{
			name: 'Seasonal Fruit Tart',
			description: 'Vanilla pastry cream, fresh seasonal fruit, almond crust',
			category: 'desserts',
			price: 11,
			dietary: ['vegetarian']
		},
		{
			name: 'Crème Brûlée',
			description: 'Classic vanilla custard, caramelized sugar, fresh berries',
			category: 'desserts',
			price: 10,
			dietary: ['vegetarian', 'gluten-free']
		},
		{
			name: 'Affogato',
			description: 'Vanilla gelato, espresso, amaretti cookie',
			category: 'desserts',
			price: 9,
			dietary: ['vegetarian']
		},
		// Drinks
		{
			name: 'House Cocktail',
			description: 'Seasonal rotating selection - ask your server',
			category: 'drinks',
			price: 14,
			dietary: []
		},
		{
			name: 'Wine by the Glass',
			description: 'Curated selection of red, white, and sparkling wines',
			category: 'drinks',
			price: 12,
			dietary: []
		},
		{
			name: 'Craft Beer',
			description: 'Local and regional selections on tap',
			category: 'drinks',
			price: 8,
			dietary: []
		},
		{
			name: 'Non-Alcoholic Spritz',
			description: 'House-made botanical soda, fresh herbs, citrus',
			category: 'drinks',
			price: 6,
			dietary: ['vegan']
		}
	],

	// Dietary Options
	dietaryOptions: [
		{
			slug: 'vegetarian',
			title: 'Vegetarian',
			description: 'Plant-based dishes featuring seasonal vegetables',
			icon: 'vegetarian'
		},
		{
			slug: 'vegan',
			title: 'Vegan',
			description: 'Entirely plant-based, no animal products',
			icon: 'vegan'
		},
		{
			slug: 'gluten-free',
			title: 'Gluten-Free',
			description: 'Dishes prepared without gluten-containing ingredients',
			icon: 'gluten-free'
		},
		{
			slug: 'dairy-free',
			title: 'Dairy-Free',
			description: 'Options without milk, cheese, or butter',
			icon: 'dairy-free'
		}
	],

	// Reservations
	reservations: {
		enabled: true,
		provider: 'OpenTable',
		url: 'https://opentable.com/restaurantname',
		phone: '+1 (555) 123-4567',
		note: 'Reservations recommended. Walk-ins welcome based on availability.',
		policies: [
			'Reservations held for 15 minutes past scheduled time',
			'Parties of 8 or more require advance planning',
			'Cancellations appreciated 24 hours in advance'
		]
	},

	// Private Events
	privateEvents: {
		enabled: true,
		email: 'events@restaurantname.com',
		phone: '+1 (555) 123-4567',
		spaces: [
			{
				name: 'Chef\'s Table',
				capacity: 8,
				description: 'Intimate dining experience in the kitchen',
				features: ['Custom menu', 'Wine pairing', 'Chef interaction']
			},
			{
				name: 'Private Dining Room',
				capacity: 24,
				description: 'Dedicated space for gatherings and celebrations',
				features: ['AV equipment', 'Flexible menu options', 'Private entrance']
			},
			{
				name: 'Full Buyout',
				capacity: 80,
				description: 'Exclusive use of entire restaurant',
				features: ['Customized menu', 'Bar service', 'Event coordination']
			}
		]
	},

	// Team
	team: [
		{
			name: 'Chef Marcus Williams',
			role: 'Executive Chef',
			image: '/team/chef-williams.jpg',
			bio: 'Trained at Le Cordon Bleu Paris. Formerly sous chef at Canlis. James Beard Award nominee 2022.',
			specialties: ['Pacific Northwest Cuisine', 'Seasonal Menus', 'Butchery']
		},
		{
			name: 'Emma Chen',
			role: 'Pastry Chef',
			image: '/team/chef-chen.jpg',
			bio: 'Graduate of the Culinary Institute of America. Specializes in French pastry with Asian influences.',
			specialties: ['French Pastry', 'Artisan Bread', 'Plated Desserts']
		},
		{
			name: 'David Torres',
			role: 'Sommelier',
			image: '/team/sommelier-torres.jpg',
			bio: 'Advanced Sommelier (Court of Master Sommeliers). 15 years experience curating wine programs.',
			specialties: ['Pacific Northwest Wines', 'Natural Wine', 'Wine Pairing']
		}
	],

	// Location & Parking
	location: {
		neighborhood: 'Pike Place Market',
		landmarks: ['2 blocks from Pike Place Market', '5 minute walk from Seattle Waterfront'],
		parking: [
			'Street parking available (metered)',
			'Pacific Place Garage (validation available)',
			'Valet service Friday-Saturday evenings'
		],
		transit: ['Light Rail: Westlake Station (0.3 miles)', 'Multiple bus lines on 1st Avenue']
	},

	// Accolades
	accolades: [
		{
			title: 'Michelin Bib Gourmand',
			year: 2023,
			organization: 'Michelin Guide'
		},
		{
			title: 'Best New Restaurant',
			year: 2019,
			organization: 'Seattle Magazine'
		},
		{
			title: 'James Beard Semifinalist',
			year: 2022,
			organization: 'James Beard Foundation'
		}
	],

	// Gift Cards
	giftCards: {
		enabled: true,
		url: 'https://example.com/gift-cards',
		note: 'Available in any denomination. Perfect for any occasion.'
	}
} as const;

export type SiteConfig = typeof siteConfig;
