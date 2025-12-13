/**
 * Site Configuration - Creative Portfolio
 *
 * Design Philosophy: Aletheia - Photography as unconcealment.
 * The image reveals what careful attention discloses.
 * Canon: Maximum work, minimum chrome. Nothing that doesn't earn its existence.
 */

export const siteConfig = {
	// Identity
	name: 'Your Name',
	role: 'Photographer',
	location: 'Brooklyn, NY',
	bio: 'Documentary photographer exploring thresholds, craft, and the traces that time leaves on things. The work asks what careful attention might reveal.',

	// Contact
	email: 'hello@yourname.com',

	// Social
	social: {
		instagram: 'https://instagram.com/yourname',
		twitter: '',
		linkedin: ''
	},

	// SEO
	url: 'https://yourname.com',
	locale: 'en_US',

	// Work - Four series exploring Heideggerian themes
	work: [
		{
			slug: 'threshold-dwelling',
			title: 'Threshold Dwelling',
			year: '2024',
			description: 'Liminal spaces where being transitions. Doorways, windows, passages. The moment between states.',
			coverImage: '/work/threshold-dwelling/cover.jpg',
			images: [
				'/work/threshold-dwelling/01.jpg',
				'/work/threshold-dwelling/02.jpg',
				'/work/threshold-dwelling/03.jpg',
				'/work/threshold-dwelling/04.jpg',
				'/work/threshold-dwelling/05.jpg',
				'/work/threshold-dwelling/06.jpg'
			]
		},
		{
			slug: 'hands-at-work',
			title: 'Hands at Work',
			year: '2024',
			description: 'The maker disappearing into the making. Tool-in-use, not tools displayed. The gesture that reveals.',
			coverImage: '/work/hands-at-work/cover.jpg',
			images: [
				'/work/hands-at-work/01.jpg',
				'/work/hands-at-work/02.jpg',
				'/work/hands-at-work/03.jpg',
				'/work/hands-at-work/04.jpg'
			]
		},
		{
			slug: 'material-studies',
			title: 'Material Studies',
			year: '2023',
			description: 'Light revealing the truth of materials. Concrete, wood, glass, water. The structure of things made visible.',
			coverImage: '/work/material-studies/cover.jpg',
			images: [
				'/work/material-studies/01.jpg',
				'/work/material-studies/02.jpg',
				'/work/material-studies/03.jpg',
				'/work/material-studies/04.jpg',
				'/work/material-studies/05.jpg'
			]
		},
		{
			slug: 'time-visible',
			title: 'Time Made Visible',
			year: '2023',
			description: 'Patina, weathering, wear patterns. Traces of human dwelling. How presence inscribes itself.',
			coverImage: '/work/time-visible/cover.jpg',
			images: [
				'/work/time-visible/01.jpg',
				'/work/time-visible/02.jpg',
				'/work/time-visible/03.jpg'
			]
		}
	],

	// Services (optional - for freelancers)
	services: [
		'Documentary Photography',
		'Editorial Work',
		'Material Studies'
	],

	// Press/Clients (optional)
	clients: ['The New York Times', 'The New Yorker', 'Monocle', 'Kinfolk'],

	// Availability
	availability: {
		accepting: true,
		message: 'Available for editorial and documentary work. Inquiries welcome.'
	}
} as const;

export type SiteConfig = typeof siteConfig;
export type Project = (typeof siteConfig.work)[number];
