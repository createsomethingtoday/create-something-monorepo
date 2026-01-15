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
				primary: '#007a8a',
				'background-light': '#f5f8f8',
				'background-dark': '#0f2123'
			},
			fontFamily: {
				display: ['Manrope', 'sans-serif'],
				sans: ['Manrope', 'sans-serif']
			},
			borderRadius: {
				DEFAULT: '0.25rem',
				lg: '0.5rem',
				xl: '0.75rem',
				'2xl': '1rem',
				'3xl': '1.5rem',
				full: '9999px'
			}
		}
	},
	plugins: []
};
