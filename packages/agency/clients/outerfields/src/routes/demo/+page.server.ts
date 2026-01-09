import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
	// Check if authenticated
	const accessToken = cookies.get('access_token');
	if (!accessToken) {
		redirect(302, '/login?redirect=/demo');
	}

	// Return demo content data - OUTERFIELDS team building the PCN
	return {
		user: {
			name: 'Demo User',
			avatar: null
		},
		categories: [
			{
				title: 'Continue Watching',
				items: [
					{
						id: '1',
						title: 'Building the Video Player',
						thumbnail:
							'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=225&fit=crop',
						progress: 72,
						duration: '28 min',
						episode: 'Dev Log #14'
					},
					{
						id: '2',
						title: 'Designing the Admin Dashboard',
						thumbnail:
							'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=225&fit=crop',
						progress: 45,
						duration: '42 min',
						episode: 'Design #8'
					}
				]
			},
			{
				title: 'Platform Development',
				items: [
					{
						id: '3',
						title: 'Architecture Deep Dive: Edge-First Design',
						thumbnail:
							'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=225&fit=crop',
						duration: '1h 15min',
						views: '2.4K'
					},
					{
						id: '4',
						title: 'Building Real-Time Analytics',
						thumbnail:
							'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=225&fit=crop',
						duration: '52 min',
						views: '1.8K'
					},
					{
						id: '5',
						title: 'Multi-Tenant Routing with Cloudflare',
						thumbnail:
							'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=225&fit=crop',
						duration: '38 min',
						views: '3.1K'
					},
					{
						id: '6',
						title: 'Stripe Integration: Subscriptions & Webhooks',
						thumbnail:
							'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=225&fit=crop',
						duration: '1h 05min',
						views: '2.9K'
					}
				]
			},
			{
				title: 'Design System',
				items: [
					{
						id: '7',
						title: 'Canon Tokens: Building a Design Language',
						thumbnail:
							'https://images.unsplash.com/photo-1561070791-36c11767b26a?w=400&h=225&fit=crop',
						duration: '35 min',
						isNew: true
					},
					{
						id: '8',
						title: 'Motion Design: Purposeful Animation',
						thumbnail:
							'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=225&fit=crop',
						duration: '28 min',
						isNew: true
					},
					{
						id: '9',
						title: 'Component Architecture in Svelte 5',
						thumbnail:
							'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=225&fit=crop',
						duration: '45 min',
						isNew: true
					}
				]
			},
			{
				title: 'Team Insights',
				items: [
					{
						id: '10',
						title: 'Why We Built OUTERFIELDS',
						thumbnail:
							'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=225&fit=crop',
						duration: '18 min'
					},
					{
						id: '11',
						title: 'The Problem with Uscreen',
						thumbnail:
							'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=225&fit=crop',
						duration: '24 min'
					},
					{
						id: '12',
						title: 'Creator-First Philosophy',
						thumbnail:
							'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop',
						duration: '15 min'
					}
				]
			}
		]
	};
};
