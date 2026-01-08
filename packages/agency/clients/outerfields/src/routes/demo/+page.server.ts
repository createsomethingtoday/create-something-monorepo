import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
	// Check if authenticated
	const accessToken = cookies.get('access_token');
	if (!accessToken) {
		redirect(302, '/login?redirect=/demo');
	}

	// Return demo content data
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
						title: 'Advanced Photography Techniques',
						thumbnail: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&h=225&fit=crop',
						progress: 65,
						duration: '45 min',
						episode: 'Episode 3'
					},
					{
						id: '2',
						title: 'Digital Marketing Masterclass',
						thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop',
						progress: 30,
						duration: '1h 20min',
						episode: 'Episode 7'
					}
				]
			},
			{
				title: 'Popular This Week',
				items: [
					{
						id: '3',
						title: 'Landscape Photography: Iceland',
						thumbnail: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=225&fit=crop',
						duration: '2h 15min',
						views: '12.5K'
					},
					{
						id: '4',
						title: 'Portrait Lighting Workshop',
						thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=225&fit=crop',
						duration: '1h 45min',
						views: '8.2K'
					},
					{
						id: '5',
						title: 'Street Photography Essentials',
						thumbnail: 'https://images.unsplash.com/photo-1502759683299-cdcd6974244f?w=400&h=225&fit=crop',
						duration: '55 min',
						views: '15.3K'
					},
					{
						id: '6',
						title: 'Editing Workflow Pro Tips',
						thumbnail: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=400&h=225&fit=crop',
						duration: '1h 10min',
						views: '6.7K'
					}
				]
			},
			{
				title: 'Recently Added',
				items: [
					{
						id: '7',
						title: 'Night Photography Secrets',
						thumbnail: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=400&h=225&fit=crop',
						duration: '1h 30min',
						isNew: true
					},
					{
						id: '8',
						title: 'Drone Cinematography',
						thumbnail: 'https://images.unsplash.com/photo-1508138221679-760a23a2286b?w=400&h=225&fit=crop',
						duration: '2h 00min',
						isNew: true
					},
					{
						id: '9',
						title: 'Color Grading Fundamentals',
						thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=225&fit=crop',
						duration: '45 min',
						isNew: true
					}
				]
			},
			{
				title: 'Your Watchlist',
				items: [
					{
						id: '10',
						title: 'Macro Photography Deep Dive',
						thumbnail: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=225&fit=crop',
						duration: '1h 15min'
					},
					{
						id: '11',
						title: 'Studio Setup Guide',
						thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=225&fit=crop',
						duration: '50 min'
					}
				]
			}
		]
	};
};
