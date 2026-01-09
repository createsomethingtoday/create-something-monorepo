import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
	// Check if authenticated
	const accessToken = cookies.get('access_token');
	if (!accessToken) {
		redirect(302, '/login?redirect=/admin-demo');
	}

	// Return demo admin data
	return {
		stats: {
			totalViews: '1.2M',
			viewsChange: '+12%',
			subscribers: '45.2K',
			subscribersChange: '+8%',
			revenue: '$52,400',
			revenueChange: '+23%',
			engagement: '68%',
			engagementChange: '+5%'
		},
		chartData: {
			labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
			views: [12000, 19000, 15000, 22000, 18000, 24000, 21000],
			engagement: [45, 52, 48, 62, 55, 68, 65]
		},
		recentActivity: [
			{
				type: 'subscription',
				message: 'New Premium subscription',
				user: 'sarah.m@email.com',
				time: '2 minutes ago'
			},
			{
				type: 'view',
				message: 'Video milestone reached',
				detail: '"Advanced Photography" hit 10K views',
				time: '15 minutes ago'
			},
			{
				type: 'comment',
				message: 'New comment on "Landscape Workshop"',
				user: 'john.d@email.com',
				time: '32 minutes ago'
			},
			{
				type: 'upload',
				message: 'Video processing complete',
				detail: '"Night Photography Secrets" is now live',
				time: '1 hour ago'
			}
		],
		uploads: [
			{
				id: '1',
				title: 'Canon Design Tokens',
				thumbnail: '/thumbnails/canon-tokens.jpg',
				status: 'published',
				views: '1.2K',
				uploadedAt: '2 hours ago'
			},
			{
				id: '2',
				title: 'Motion Design System',
				thumbnail: '/thumbnails/motion-design.jpg',
				status: 'processing',
				progress: 78,
				uploadedAt: '4 hours ago'
			},
			{
				id: '3',
				title: 'Svelte 5 Components',
				thumbnail: '/thumbnails/svelte-components.jpg',
				status: 'draft',
				views: '-',
				uploadedAt: '1 day ago'
			},
			{
				id: '4',
				title: 'Why We Built OUTERFIELDS',
				thumbnail: '/thumbnails/why-we-built.jpg',
				status: 'published',
				views: '8.5K',
				uploadedAt: '3 days ago'
			}
		]
	};
};
