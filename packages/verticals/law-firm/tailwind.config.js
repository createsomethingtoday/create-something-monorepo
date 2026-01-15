/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				primary: '#1c4a3e',
				'background-light': '#fafafa',
				'background-dark': '#121416',
				'accent-gold': '#A59C87'
			},
			fontFamily: {
				display: ['Epilogue', 'sans-serif']
			},
			borderRadius: {
				DEFAULT: '0.25rem',
				lg: '0.5rem',
				xl: '0.75rem',
				full: '9999px'
			}
		}
	},
	plugins: [require('@tailwindcss/forms'), require('@tailwindcss/container-queries')]
};
