/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'../shared/**/*.{svelte,js,ts}',
		'../../components/src/**/*.{svelte,js,ts}'
	],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				primary: '#1a3a3a',
				accent: '#c2410c',
				'background-light': '#fdfdfb',
				'background-dark': '#121212',
				'tufte-gray': '#555555'
			},
			fontFamily: {
				serif: ['Libre Baskerville', 'Georgia', 'serif'],
				sans: ['Inter', 'system-ui', 'sans-serif']
			}
		}
	},
	plugins: []
};
