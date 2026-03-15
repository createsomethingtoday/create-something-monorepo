/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				display: ['Manrope', 'system-ui', 'sans-serif']
			},
			colors: {
				outerfields: {
					primary: '#7c2bee',
					'primary-muted': 'rgba(124, 43, 238, 0.2)',
					'primary-glow': 'rgba(124, 43, 238, 0.3)',
					black: '#000000',
					white: '#ffffff',
					surface: 'rgba(255, 255, 255, 0.05)',
					'surface-hover': 'rgba(255, 255, 255, 0.1)',
					border: 'rgba(255, 255, 255, 0.1)',
					'border-emphasis': 'rgba(255, 255, 255, 0.2)',
					muted: 'rgba(255, 255, 255, 0.6)',
					subtle: 'rgba(255, 255, 255, 0.4)'
				}
			},
			borderRadius: {
				DEFAULT: '0.25rem',
				lg: '0.5rem',
				xl: '0.75rem',
				'2xl': '1rem',
				full: '9999px'
			},
			fontSize: {
				'display-xl': ['4rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
				display: ['3rem', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
				h1: ['2.5rem', { lineHeight: '1.1' }],
				h2: ['2rem', { lineHeight: '1.2' }],
				h3: ['1.5rem', { lineHeight: '1.3' }],
				h4: ['1.25rem', { lineHeight: '1.4' }],
				body: ['1rem', { lineHeight: '1.6' }],
				'body-sm': ['0.875rem', { lineHeight: '1.5' }],
				caption: ['0.75rem', { lineHeight: '1.4' }]
			},
			transitionTimingFunction: {
				outerfields: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
			},
			boxShadow: {
				glow: '0 0 20px rgba(124, 43, 238, 0.3)',
				'glow-lg': '0 0 30px rgba(124, 43, 238, 0.5)'
			}
		}
	},
	plugins: []
};
