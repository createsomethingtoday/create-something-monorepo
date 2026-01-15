/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				primary: '#215453',
				accent: '#E9C46A',
				'background-light': '#fefdfb',
				'background-dark': '#191f1d',
				'surface-dark': '#2B2F2E'
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
	plugins: [require('@tailwindcss/forms')]
};
