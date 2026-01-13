import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if authenticated via session (hooks.server.ts sets locals.user)
	if (!locals.user) {
		redirect(302, '/login?redirect=/demo');
	}

	// Return demo content data - OUTERFIELDS team building the PCN
	// Uses locally generated Flux AI thumbnails
	return {
		user: {
			name: locals.user.name,
			avatar: null
		},
		categories: [
			{
				title: 'Continue Watching',
				items: [
					{
						id: '1',
						title: 'Building the Custom Video Player',
						thumbnail: '/thumbnails/dev-video-player.jpg',
						progress: 72,
						duration: '18 min',
						episode: 'Dev Log #14'
					},
					{
						id: '2',
						title: 'Designing the Admin Dashboard',
						thumbnail: '/thumbnails/design-dashboard.jpg',
						progress: 45,
						duration: '24 min',
						episode: 'Design #8'
					}
				]
			},
			{
				title: 'Platform Development',
				items: [
					{
						id: '3',
						title: 'Edge-First Architecture Deep Dive',
						thumbnail: '/thumbnails/architecture-edge.jpg',
						duration: '31 min',
						views: '2.4K'
					},
					{
						id: '4',
						title: 'Real-Time Analytics Pipeline',
						thumbnail: '/thumbnails/realtime-analytics.jpg',
						duration: '22 min',
						views: '1.8K'
					},
					{
						id: '5',
						title: 'Multi-Tenant Platform Design',
						thumbnail: '/thumbnails/multi-tenant.jpg',
						duration: '27 min',
						views: '3.1K'
					},
					{
						id: '6',
						title: 'Stripe Integration Deep Dive',
						thumbnail: '/thumbnails/stripe-integration.jpg',
						duration: '19 min',
						views: '2.9K'
					}
				]
			},
			{
				title: 'Design System',
				items: [
					{
						id: '7',
						title: 'Canon Design Tokens',
						thumbnail: '/thumbnails/canon-tokens.jpg',
						duration: '35 min',
						isNew: true
					},
					{
						id: '8',
						title: 'Motion Design System',
						thumbnail: '/thumbnails/motion-design.jpg',
						duration: '28 min',
						isNew: true
					},
					{
						id: '9',
						title: 'Svelte 5 Component Architecture',
						thumbnail: '/thumbnails/svelte-components.jpg',
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
						thumbnail: '/thumbnails/why-we-built.jpg',
						duration: '18 min'
					},
					{
						id: '11',
						title: 'The Problem with Uscreen',
						thumbnail: '/thumbnails/problem-uscreen.jpg',
						duration: '24 min'
					},
					{
						id: '12',
						title: 'Creator-First Philosophy',
						thumbnail: '/thumbnails/creator-first.jpg',
						duration: '15 min'
					}
				]
			}
		]
	};
};
