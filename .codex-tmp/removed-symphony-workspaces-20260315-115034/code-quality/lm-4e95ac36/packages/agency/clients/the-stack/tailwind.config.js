/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				display: ['Coolvetica Condensed', 'sans-serif'],
				sans: ['Satoshi', 'system-ui', 'sans-serif']
			},
			colors: {
				stack: {
					black: '#080808',
					white: '#ffffff',
					green: '#966e44',
					'dark-grey': '#a9a9a9',
					'light-grey': '#d8d8d8'
				}
			},
			borderRadius: {
				section: '3.125rem',
				player: '3.5rem',
				button: '5rem',
				input: '2.5rem',
				location: '1.5rem'
			},
			fontSize: {
				'display-xl': ['11.25rem', { lineHeight: '0.9', letterSpacing: '-0.02em' }],
				'display': ['4rem', { lineHeight: '1.04' }],
				'h3': ['2.25rem', { lineHeight: '1', letterSpacing: '0.02em' }],
				'h4': ['1.5rem', { lineHeight: '1.04', letterSpacing: '0.02em' }],
				'h5': ['1.375rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],
				'h6': ['1.25rem', { lineHeight: '1.3' }],
				'eyebrow': ['0.875rem', { lineHeight: '1', letterSpacing: '0.1em' }]
			},
			transitionTimingFunction: {
				stack: 'cubic-bezier(.215, .61, .355, 1)'
			},
			spacing: {
				'section': '7.5rem',
				'nav': '6rem'
			},
			maxWidth: {
				'container': '72.5rem',
				'440': '27.5rem',
				'700': '43.75rem',
				'250': '15.63rem'
			}
		}
	},
	plugins: []
};
