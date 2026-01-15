/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				primary: '#495a4c',
				'background-light': '#fdfdfc',
				'background-dark': '#1a1a1a'
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
